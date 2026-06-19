import { ref } from 'vue'
import { faro } from '@grafana/faro-web-sdk'
import { LogLevel } from '@grafana/faro-core'

type FaroLogContext = Record<string, string | number | boolean>

export type LocalFaroLog = {
  id: string
  level: string
  message: string
  timestamp: string
  details?: Record<string, unknown>
}

const logs = ref<LocalFaroLog[]>([])
const defaultContext: FaroLogContext = {}

function createLog(level: LogLevel | string, message: string, details?: Record<string, unknown>) {
  const log: LocalFaroLog = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    level: String(level).toLowerCase(),
    message,
    timestamp: new Date().toLocaleTimeString(),
    details,
  }
  logs.value.unshift(log)
  return log
}

function safeFaro(fn: () => void) {
  try {
    fn()
  } catch (error) {
    createLog('warn', 'Faro SDK call failed', { error: error instanceof Error ? error.message : String(error) })
  }
}

function parseContext(context?: FaroLogContext) {
  if (!context) return undefined
  return Object.fromEntries(Object.entries(context).map(([key, value]) => [key, String(value)]))
}

function mergeContext(context?: FaroLogContext) {
  return context ? { ...defaultContext, ...context } : defaultContext
}

export function useFaroLogger() {
  const isFaroReady = typeof faro !== 'undefined' && !!faro?.api

  const logDebug = (message: string, context?: FaroLogContext) => {
    const mergedContext = mergeContext(context)
    createLog('debug', message, mergedContext)
    safeFaro(() => {
      faro.api.pushLog([message], { level: LogLevel.DEBUG, context: parseContext(mergedContext) })
    })
  }

  const logInfo = (message: string, context?: FaroLogContext) => {
    const mergedContext = mergeContext(context)
    createLog('info', message, mergedContext)
    safeFaro(() => {
      faro.api.pushLog([message], { level: LogLevel.INFO, context: parseContext(mergedContext) })
    })
  }

  const logWarn = (message: string, context?: FaroLogContext) => {
    const mergedContext = mergeContext(context)
    createLog('warn', message, mergedContext)
    safeFaro(() => {
      faro.api.pushLog([message], { level: LogLevel.WARN, context: parseContext(mergedContext) })
    })
  }

  const logError = (error: unknown, context?: FaroLogContext) => {
    const mergedContext = mergeContext(context)
    const message = error instanceof Error ? error.message : String(error)
    createLog('error', message, { ...mergedContext, stack: error instanceof Error ? error.stack : undefined })
    safeFaro(() => {
      const err = error instanceof Error ? error : new Error(String(error))
      faro.api.pushError(err, { context: parseContext(mergedContext) })
    })
  }

  const captureException = (error: unknown, context?: FaroLogContext) => logError(error, context)

  const trackEvent = (eventName: string, context?: FaroLogContext) => {
    const mergedContext = mergeContext({ ...context, eventName })
    createLog('info', `event:${eventName}`, mergedContext)
    safeFaro(() => {
      faro.api.pushLog([`event:${eventName}`], { level: LogLevel.INFO, context: parseContext(mergedContext) })
    })
  }

  const setUser = (user: { id: string; email?: string; name?: string }) => {
    createLog('info', 'setUser called', user)
    safeFaro(() => {
      faro.api.setUser(user)
    })
  }

  const addContext = (context: FaroLogContext) => {
    Object.assign(defaultContext, context)
    createLog('info', 'addContext called', context)
  }

  const clearLogs = () => {
    logs.value = []
  }

  return {
    logs,
    logDebug,
    logInfo,
    logWarn,
    logError,
    captureException,
    trackEvent,
    setUser,
    addContext,
    clearLogs,
    isFaroReady,
  }
}
