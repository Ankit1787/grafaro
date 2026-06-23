import { ref } from 'vue'
import { LogLevel } from '@grafana/faro-core'

export interface Breadcrumb {
  id: string
  message: string
  category: string
  level: string
  timestamp: string
  metadata?: Record<string, any>
}

// Reactive store to display live captured events/breadcrumbs on the UI dashboard
export const breadcrumbsStore = ref<Breadcrumb[]>([])

let faroSdk: any = null
if (process.client) {
  import('@grafana/faro-web-sdk')
    .then((m) => {
      faroSdk = m.faro
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.warn('[Faro SDK] client-side import deferred or failed:', e)
    })
}

const defaultContext: Record<string, string> = {}

function getFaroApi() {
  if (!process.client) return null
  return faroSdk?.api || (window as any)?.__faro_instance__?.api || (window as any)?.__faro__?.api || (window as any)?.faro?.api
}

function addLocalBreadcrumb(message: string, category: string, level: string, metadata?: Record<string, any>) {
  if (!process.client) return
  const breadcrumb: Breadcrumb = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    message,
    category,
    level,
    timestamp: new Date().toLocaleTimeString(),
    metadata,
  }
  // Limit to last 50 logs/breadcrumbs in local history
  breadcrumbsStore.value = [breadcrumb, ...breadcrumbsStore.value].slice(0, 50)
}

function toStringContext(context?: Record<string, any>) {
  if (!context) return undefined
  const stringified: Record<string, string> = {}
  for (const [key, val] of Object.entries(context)) {
    stringified[key] = typeof val === 'object' ? JSON.stringify(val) : String(val)
  }
  return stringified
}

export const logger = {
  debug(message: string, context?: Record<string, any>) {
    const merged = { ...defaultContext, ...context }
    addLocalBreadcrumb(message, 'console', 'debug', merged)
    if (process.client) {
      // Print to local console so developer tools catch it too
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] ${message}`, merged)
      const api = getFaroApi()
      if (api) {
        api.pushLog([message], { level: LogLevel.DEBUG, context: toStringContext(merged) })
      }
    } else {
      // Server-side logging fallback
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ level: 'debug', message, ...merged }))
    }
  },

  info(message: string, context?: Record<string, any>) {
    const merged = { ...defaultContext, ...context }
    addLocalBreadcrumb(message, 'console', 'info', merged)
    if (process.client) {
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}`, merged)
      const api = getFaroApi()
      if (api) {
        api.pushLog([message], { level: LogLevel.INFO, context: toStringContext(merged) })
      }
    } else {
      // Server-side logging fallback
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ level: 'info', message, ...merged }))
    }
  },

  warn(message: string, context?: Record<string, any>) {
    const merged = { ...defaultContext, ...context }
    addLocalBreadcrumb(message, 'console', 'warn', merged)
    if (process.client) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}`, merged)
      const api = getFaroApi()
      if (api) {
        api.pushLog([message], { level: LogLevel.WARN, context: toStringContext(merged) })
      }
    } else {
      // Server-side logging fallback
      // eslint-disable-next-line no-console
      console.warn(JSON.stringify({ level: 'warn', message, ...merged }))
    }
  },

  error(error: unknown, context?: Record<string, any>) {
    const merged = { ...defaultContext, ...context }
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    
    addLocalBreadcrumb(message, 'error', 'error', { ...merged, stack })
    
    if (process.client) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`, error, merged)
      const api = getFaroApi()
      if (api) {
        const err = error instanceof Error ? error : new Error(String(error))
        api.pushError(err, { context: toStringContext(merged) })
      }
    } else {
      // Server-side logging fallback
      // eslint-disable-next-line no-console
      console.error(JSON.stringify({ level: 'error', message, stack, ...merged }))
    }
  },

  captureException(error: unknown, context?: Record<string, any>) {
    this.error(error, context)
  },

  breadcrumb(message: string, category = 'manual', level = 'info', metadata?: Record<string, any>) {
    const merged = { ...defaultContext, ...metadata }
    addLocalBreadcrumb(message, category, level, merged)
    if (process.client) {
      const api = getFaroApi()
      if (api) {
        api.pushBreadcrumb({
          message,
          category,
          type: 'default',
          level,
          metadata: toStringContext(merged),
        })
      }
    }
  },

  pushEvent(eventName: string, context?: Record<string, any>) {
    const merged = { ...defaultContext, ...context, eventName }
    addLocalBreadcrumb(`Event: ${eventName}`, 'event', 'info', merged)
    if (process.client) {
      const api = getFaroApi()
      if (api) {
        // Faro registers custom telemetry via pushEvent or custom logs
        api.pushLog([`event:${eventName}`], { 
          level: LogLevel.INFO, 
          context: toStringContext(merged) 
        })
      }
    }
  },

  setUser(user: { id: string; email?: string; name?: string }) {
    addLocalBreadcrumb(`User Identity Set: ${user.id}`, 'user', 'info', user)
    if (process.client) {
      const api = getFaroApi()
      if (api) {
        api.setUser(user)
      }
    }
  },

  addContext(context: Record<string, string | number | boolean>) {
    const stringContext = toStringContext(context) || {}
    Object.assign(defaultContext, stringContext)
    addLocalBreadcrumb('Global Context Added', 'context', 'info', context)
  },

  isReady() {
    return process.client ? Boolean(getFaroApi()) : false
  },

  clearLocalBreadcrumbs() {
    breadcrumbsStore.value = []
  }
}
