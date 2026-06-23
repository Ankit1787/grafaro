import { logger } from './logger'

export type FetchOptions = RequestInit & { retry?: number }

function scrubUrl(url: string): string {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    if (parsed.searchParams.has('token')) parsed.searchParams.set('token', '[REDACTED]')
    if (parsed.searchParams.has('apiKey')) parsed.searchParams.set('apiKey', '[REDACTED]')
    if (parsed.searchParams.has('password')) parsed.searchParams.set('password', '[REDACTED]')
    return parsed.toString()
  } catch {
    return url
  }
}

export async function apiFetch(input: RequestInfo, init?: FetchOptions) {
  const opts = init || {}
  const method = opts.method || 'GET'
  const url = typeof input === 'string' ? input : (input as Request).url
  const cleanUrl = scrubUrl(url)

  // Log breadcrumb before initiating the network request
  logger.breadcrumb(`Fetch starting: ${method} ${cleanUrl}`, 'network', 'info', {
    method,
    url: cleanUrl,
  })

  try {
    const res = await fetch(input, opts as RequestInit)
    
    if (!res.ok) {
      let body: unknown = undefined
      try {
        const text = await res.text()
        try {
          body = JSON.parse(text)
        } catch {
          body = text
        }
      } catch {
        // failed to read response stream
      }

      const err: any = new Error(`API Error ${res.status} ${res.statusText}`)
      err.status = res.status
      err.statusText = res.statusText
      err.url = cleanUrl
      err.method = method
      err.body = body

      // Add a breadcrumb showing response failure
      logger.breadcrumb(`Fetch failed: ${method} ${cleanUrl} (Status: ${res.status})`, 'network', 'warn', {
        method,
        url: cleanUrl,
        status: res.status,
      })

      // Push error log to Faro
      logger.error(err, { origin: 'apiFetch', url: cleanUrl, status: res.status })
      throw err
    }

    // Add a breadcrumb showing response success
    logger.breadcrumb(`Fetch complete: ${method} ${cleanUrl} (Status: ${res.status})`, 'network', 'info', {
      method,
      url: cleanUrl,
      status: res.status,
    })

    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) return res.json()
    return res.text()
  } catch (err) {
    const e: any = err ?? new Error('Unknown connection error')
    e.url = e.url || cleanUrl
    e.method = e.method || method

    // Add a breadcrumb showing network connection error
    logger.breadcrumb(`Fetch error: ${method} ${cleanUrl} (${e.message || String(e)})`, 'network', 'error', {
      method,
      url: cleanUrl,
      error: e.message || String(e),
    })

    logger.error(e, { origin: 'apiFetch', isNetworkError: 'true' })
    throw e
  }
}

export default apiFetch
