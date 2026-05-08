// Netlify Edge Function — proxies live radio streams through our origin
// so the browser can tap the audio graph (needed for visualizer + song
// recognition) without hitting CORS on the upstream Icecast/Shoutcast server.
//
// Usage from the app:   /api/stream?url=<encoded upstream URL>
//
// The function streams bytes straight from the upstream response — no
// buffering, no timeout. Icy metadata is stripped by setting Icy-MetaData: 0.

// deno-lint-ignore-file no-explicit-any
export default async (request: Request): Promise<Response> => {
  const url = new URL(request.url)
  const target = url.searchParams.get('url')

  if (!target) {
    return new Response('Missing ?url parameter', { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return new Response('Invalid URL', { status: 400 })
  }

  // Only allow http/https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return new Response('Protocol not allowed', { status: 400 })
  }

  // Build upstream request — forward Range header so HLS/seeking works
  const forwardHeaders = new Headers()
  forwardHeaders.set('User-Agent', 'AetherRadio/1.1 (+https://aether-radio.app)')
  forwardHeaders.set('Accept', '*/*')
  forwardHeaders.set('Icy-MetaData', '0')
  const range = request.headers.get('Range')
  if (range) forwardHeaders.set('Range', range)

  let upstream: Response
  try {
    upstream = await fetch(parsed.toString(), {
      method: 'GET',
      headers: forwardHeaders,
      redirect: 'follow',
    })
  } catch (e) {
    return new Response(`Upstream fetch failed: ${(e as Error).message}`, { status: 502 })
  }

  // Build response headers — CORS + pass through content type and range info
  const headers = new Headers()
  const contentType = upstream.headers.get('content-type') ?? 'audio/mpeg'
  headers.set('content-type', contentType)
  headers.set('access-control-allow-origin', '*')
  headers.set('access-control-expose-headers', 'content-length, content-range, accept-ranges, content-type')
  headers.set('cache-control', 'no-store')
  const contentLength = upstream.headers.get('content-length')
  if (contentLength) headers.set('content-length', contentLength)
  const contentRange = upstream.headers.get('content-range')
  if (contentRange) headers.set('content-range', contentRange)
  const acceptRanges = upstream.headers.get('accept-ranges')
  if (acceptRanges) headers.set('accept-ranges', acceptRanges)

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  })
}

export const config = { path: '/api/stream' }
