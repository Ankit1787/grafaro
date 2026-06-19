import { faro } from '@grafana/faro-web-sdk'

export type FaroLogLevel = 'debug' | 'info' | 'warn' | 'error'
export type FaroLogContext = Record<string, string | number | boolean>

function isFaroReady() {
  return Boolean(faro?.api?.pushLog && faro?.api?.pushError)
}

function safeCall(fn: () => void) {
  try {
    fn()
  } catch (error) {
    // Keep the app stable if Faro is not available.
    // eslint-disable-next-line no-console
    console.warn('[Faro Logger] failed', error)
  }
}

function buildLogPayload(message: string, context?: FaroLogContext, level?: FaroLogLevel) {
  const payload: { context?: FaroLogContext; level?: FaroLogLevel } = {}
  if (context) payload.context = context
  if (level) payload.level = level
  return payload
}

export const logger = {
  debug(message: string, context?: FaroLogContext) {
    safeCall(() => faro.api.pushLog([message], buildLogPayload(context ? context : undefined, 'debug')))
  },

  info(message: string, context?: FaroLogContext) {
    safeCall(() => faro.api.pushLog([message], buildLogPayload(context ? context : undefined, 'info')))
  },

  warn(message: string, context?: FaroLogContext) {
    safeCall(() => faro.api.pushLog([message], buildLogPayload(context ? context : undefined, 'warn')))
  },

  error(error: unknown, context?: FaroLogContext) {
    safeCall(() => {
      const err = error instanceof Error ? error : new Error(String(error))
      faro.api.pushError(err, { context })
    })
  },

  captureException(error: unknown, context?: FaroLogContext) {
    this.error(error, context)
  },

  pushEvent(eventName: string, context?: FaroLogContext) {
    safeCall(() => {
      faro.api.pushLog([`event:${eventName}`], buildLogPayload({ ...context, eventName }, 'info'))
    })
  },

  setUser(user: { id: string; email?: string; name?: string }) {
    safeCall(() => faro.api.setUser(user))
  },

  addContext(context: FaroLogContext) {
    safeCall(() => faro.api.addContext(context))
  },

  isReady() {
    return isFaroReady()
  },
}
