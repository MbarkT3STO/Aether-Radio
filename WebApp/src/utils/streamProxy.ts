/**
 * Stream URL strategy on the web.
 *
 * Many radio stations already send permissive CORS headers (or are hosted
 * on CDNs that do). Routing every byte through our Netlify Edge Function
 * is wasteful when it isn't needed — it adds latency and consumes Netlify
 * bandwidth. So we try the upstream URL first, and only fall back to
 * `/api/stream` when the direct play errors out.
 *
 * The AudioService coordinates the retry: the first `play(station)` call
 * uses `directStreamUrl()`, and if the <audio> element fires 'error', the
 * service retries with `proxiedStreamUrl()`.
 */

/** Route through the same-origin proxy. Guaranteed CORS but adds a hop. */
export function proxiedStreamUrl(streamUrl: string): string {
  if (!streamUrl) return ''
  if (!/^https?:\/\//i.test(streamUrl)) return streamUrl
  return `/api/stream?url=${encodeURIComponent(streamUrl)}`
}

/** Original upstream URL. Plays direct when the upstream sends CORS. */
export function directStreamUrl(streamUrl: string): string {
  return streamUrl || ''
}

/**
 * Mixed-content rule: an HTTPS page cannot play an HTTP stream without a
 * reverse proxy. Catch those up front and always route them through the
 * proxy so Netlify can upgrade the request.
 */
export function needsProxy(streamUrl: string): boolean {
  if (!streamUrl) return false
  if (window.location.protocol !== 'https:') return false
  return streamUrl.startsWith('http://')
}
