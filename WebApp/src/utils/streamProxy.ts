/**
 * Web CORS workaround: route every radio stream through our Netlify Edge
 * Function so the <audio> element can set crossOrigin='anonymous' safely
 * (required for the visualizer and song recognition to tap the graph).
 *
 * In development, `/api/stream` is proxied by Vite to a running
 * `netlify dev` on :8888. In production, Netlify serves the Edge Function
 * on the same origin.
 */

export function proxiedStreamUrl(streamUrl: string): string {
  if (!streamUrl) return ''
  // Only proxy http/https URLs — data URIs etc. pass through unchanged
  if (!/^https?:\/\//i.test(streamUrl)) return streamUrl
  return `/api/stream?url=${encodeURIComponent(streamUrl)}`
}
