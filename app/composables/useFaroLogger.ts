import { computed } from 'vue'
import { logger, breadcrumbsStore } from '~/utils/logger'

export function useFaroLogger() {
  // Map reactive logs to the global breadcrumbs Store
  const logs = computed(() => breadcrumbsStore.value)

  const logDebug = (message: string, context?: Record<string, any>) => {
    logger.debug(message, context)
  }

  const logInfo = (message: string, context?: Record<string, any>) => {
    logger.info(message, context)
  }

  const logWarn = (message: string, context?: Record<string, any>) => {
    logger.warn(message, context)
  }

  const logError = (error: unknown, context?: Record<string, any>) => {
    logger.error(error, context)
  }

  const captureException = (error: unknown, context?: Record<string, any>) => {
    logger.captureException(error, context)
  }

  const trackEvent = (eventName: string, context?: Record<string, any>) => {
    logger.pushEvent(eventName, context)
  }

  const setUser = (user: { id: string; email?: string; name?: string }) => {
    logger.setUser(user)
  }

  const addContext = (context: Record<string, string | number | boolean>) => {
    logger.addContext(context)
  }

  const clearLogs = () => {
    logger.clearLocalBreadcrumbs()
  }

  const isFaroReady = computed(() => logger.isReady())

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
