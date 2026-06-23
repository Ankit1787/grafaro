import { defineNitroPlugin } from 'nitropack/runtime/plugin'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', async (error, { event }) => {
    // Capture and format server-side errors (SSR render crashes, Server Route API crashes)
    const timestamp = new Date().toISOString()
    const errorPayload = {
      timestamp,
      level: 'error',
      service: 'grafaro-nuxt-server',
      origin: 'nitro-server-error-hook',
      message: error.message || String(error),
      stack: error.stack,
      url: event?.path || 'unknown',
      method: event?.method || 'unknown',
      headers: event ? getSanitizedHeaders(event.headers) : undefined,
    }

    // Write structured JSON to stderr. 
    // In production, Loki / Promtail / Grafana Agent scrapes stdout/stderr to collect server errors.
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(errorPayload))
  })
})

function getSanitizedHeaders(headers: Headers | Record<string, string | string[] | undefined> | any): Record<string, string> {
  const sanitized: Record<string, string> = {}
  try {
    const rawHeaders = headers instanceof Headers ? Object.fromEntries(headers.entries()) : headers
    if (!rawHeaders) return sanitized
    
    const sensitive = ['authorization', 'cookie', 'set-cookie', 'x-api-key']
    for (const [key, value] of Object.entries(rawHeaders)) {
      if (sensitive.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]'
      } else if (value !== undefined) {
        sanitized[key] = String(value)
      }
    }
  } catch {
    // fallback if headers are not parseable
  }
  return sanitized
}
