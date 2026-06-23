import { logger } from './logger'

export function normalizeError(err: unknown) {
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: err.stack,
      name: err.name,
    }
  }
  if (typeof err === 'object' && err !== null) {
    try {
      return JSON.parse(JSON.stringify(err))
    } catch {
      return { value: String(err) }
    }
  }
  return { value: String(err) }
}

export function normalizeApiError(error: unknown): Record<string, unknown> {
  const normalized = normalizeError(error)
  const maybe = error as any
  if (maybe?.status) normalized.status = maybe.status
  if (maybe?.statusText) normalized.statusText = maybe.statusText
  if (maybe?.url) normalized.url = maybe.url
  if (maybe?.method) normalized.method = maybe.method
  if (maybe?.body) normalized.body = maybe.body
  return normalized
}

export function handleApiError(error: unknown, context?: Record<string, any>) {
  const details = normalizeApiError(error)
  
  // Create flat context to prevent nesting issues in Loki labels
  const mergedContext: Record<string, any> = {}
  if (context) {
    for (const [k, v] of Object.entries(context)) {
      mergedContext[k] = typeof v === 'object' ? JSON.stringify(v) : String(v)
    }
  }
  
  // Attach API details
  mergedContext.api_url = String(details.url || '')
  mergedContext.api_method = String(details.method || '')
  mergedContext.api_status = String(details.status || '')
  if (details.body) {
    mergedContext.api_body = typeof details.body === 'object' 
      ? JSON.stringify(details.body) 
      : String(details.body)
  }

  const errorMessage = details.message ? String(details.message) : `API Failure: ${details.status || 'Unknown'}`
  const err = error instanceof Error ? error : new Error(errorMessage)
  
  logger.error(err, {
    origin: 'api-error-handler',
    ...mergedContext,
  })
}

export function initGlobalErrorHandlers(nuxtApp?: any) {
  if (!process.client) return

  // Hook into Vue errors if not already done by plugin
  if (nuxtApp?.vueApp) {
    const existingHandler = nuxtApp.vueApp.config.errorHandler
    nuxtApp.vueApp.config.errorHandler = (err: unknown, instance: any, info: string) => {
      const compName = instance?.$options?.name || instance?.$options?.__name || 'Anonymous'
      logger.error(err, {
        origin: 'vue-errorHandler',
        component: compName,
        lifecycleInfo: info,
      })
      if (typeof existingHandler === 'function') {
        existingHandler(err, instance, info)
      }
    }
  }

  // Window listeners for uncaught errors
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('unhandledrejection', (ev) => {
      logger.error(ev?.reason ?? 'Unhandled promise rejection', {
        origin: 'window-unhandledrejection',
      })
    })

    window.addEventListener('error', (ev: ErrorEvent) => {
      logger.error(ev.error ?? ev.message ?? 'Script run-time error', {
        origin: 'window-error',
        filename: ev.filename,
        lineno: ev.lineno,
        colno: ev.colno,
      })
    })
  }
}

export default {
  normalizeError,
  normalizeApiError,
  handleApiError,
  initGlobalErrorHandlers,
}
