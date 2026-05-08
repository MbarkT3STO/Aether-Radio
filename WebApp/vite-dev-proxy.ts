import type { Plugin } from 'vite'
import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Vite dev plugin — implements the same two endpoints the Netlify Edge
 * Functions provide in production, so `npm run dev` alone gives a working
 * stream proxy + Shazam relay. No need to run `netlify dev` in parallel.
 *
 *   GET  /api/stream?url=<encoded upstream URL>
 *   POST /api/shazam   (body = signature JSON)
 */
export function devApiProxy(): Plugin {
  return {
    name: 'aether-dev-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/stream', (req, res) => {
        handleStreamProxy(req, res)
      })

      server.middlewares.use('/api/shazam', (req, res) => {
        handleShazamProxy(req, res)
      })
    },
  }
}

// ── /api/stream ──────────────────────────────────────────────────────────────

function handleStreamProxy(req: IncomingMessage, res: ServerResponse): void {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, HEAD, OPTIONS',
      'access-control-allow-headers': 'range',
    })
    res.end()
    return
  }

  const incoming = new URL(req.url ?? '', 'http://localhost')
  const target = incoming.searchParams.get('url')
  if (!target) {
    res.writeHead(400, { 'content-type': 'text/plain' })
    res.end('Missing ?url parameter')
    return
  }

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain' })
    res.end('Invalid URL')
    return
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    res.writeHead(400, { 'content-type': 'text/plain' })
    res.end('Protocol not allowed')
    return
  }

  proxyStream(parsed, req, res, 0)
}

/**
 * Performs the upstream GET and pipes bytes straight back to the client.
 * Handles redirects (Icecast mount-points often redirect) up to 3 hops.
 */
function proxyStream(
  target: URL,
  clientReq: IncomingMessage,
  clientRes: ServerResponse,
  hop: number
): void {
  if (hop > 3) {
    clientRes.writeHead(508, { 'content-type': 'text/plain' })
    clientRes.end('Too many redirects')
    return
  }

  const lib = target.protocol === 'https:' ? https : http

  const headers: Record<string, string> = {
    'User-Agent': 'AetherRadio/1.1 (dev)',
    Accept: '*/*',
    'Icy-MetaData': '0',
  }
  const range = clientReq.headers.range
  if (typeof range === 'string') headers['Range'] = range

  const upstream = lib.request(
    {
      method: 'GET',
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: (target.pathname || '/') + (target.search || ''),
      headers,
      // Node's http parser is tolerant of ICY / non-Latin-1 headers
      timeout: 15_000,
    },
    (upstreamRes) => {
      const status = upstreamRes.statusCode ?? 502

      // Follow redirects
      if (status >= 300 && status < 400 && upstreamRes.headers.location) {
        upstreamRes.resume()
        let next: URL
        try {
          next = new URL(upstreamRes.headers.location, target)
        } catch {
          clientRes.writeHead(502, { 'content-type': 'text/plain' })
          clientRes.end('Invalid redirect target')
          return
        }
        proxyStream(next, clientReq, clientRes, hop + 1)
        return
      }

      const outHeaders: Record<string, string> = {
        'access-control-allow-origin': '*',
        'access-control-expose-headers':
          'content-length, content-range, accept-ranges, content-type',
        'cache-control': 'no-store',
      }
      const contentType = upstreamRes.headers['content-type']
      outHeaders['content-type'] =
        (typeof contentType === 'string' ? contentType : undefined) ?? 'audio/mpeg'

      const contentLength = upstreamRes.headers['content-length']
      if (typeof contentLength === 'string') outHeaders['content-length'] = contentLength
      const contentRange = upstreamRes.headers['content-range']
      if (typeof contentRange === 'string') outHeaders['content-range'] = contentRange
      const acceptRanges = upstreamRes.headers['accept-ranges']
      if (typeof acceptRanges === 'string') outHeaders['accept-ranges'] = acceptRanges

      clientRes.writeHead(status, outHeaders)
      upstreamRes.pipe(clientRes)

      // If the client disconnects, close the upstream too — don't keep
      // pulling bytes from a radio stream nobody's listening to.
      clientRes.on('close', () => {
        upstreamRes.destroy()
        upstream.destroy()
      })
    }
  )

  upstream.on('timeout', () => {
    upstream.destroy()
    if (!clientRes.headersSent) {
      clientRes.writeHead(504, { 'content-type': 'text/plain' })
      clientRes.end('Upstream timeout')
    }
  })

  upstream.on('error', (e) => {
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'content-type': 'text/plain' })
      clientRes.end(`Upstream error: ${(e as Error).message}`)
    } else {
      clientRes.end()
    }
  })

  upstream.end()
}

// ── /api/shazam ──────────────────────────────────────────────────────────────

const SHAZAM_HOST = 'https://amp.shazam.com'
const SHAZAM_PARAMS =
  'sync=true&webv3=true&sampling=true&connected=&shazamapiversion=v3&sharehub=true&hubv5minorversion=v5.1&hidelb=true&video=v3'

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
    .toUpperCase()
}

function handleShazamProxy(req: IncomingMessage, res: ServerResponse): void {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
    })
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'access-control-allow-origin': '*' })
    res.end('Method not allowed')
    return
  }

  // Read the incoming body
  const chunks: Buffer[] = []
  req.on('data', (chunk: Buffer) => chunks.push(chunk))
  req.on('end', async () => {
    const body = Buffer.concat(chunks).toString('utf-8')
    if (!body) {
      res.writeHead(400, { 'access-control-allow-origin': '*' })
      res.end('Empty body')
      return
    }

    const target = new URL(
      `${SHAZAM_HOST}/discovery/v5/en/US/iphone/-/tag/${uuid()}/${uuid()}?${SHAZAM_PARAMS}`
    )

    const reqOptions = {
      method: 'POST',
      protocol: target.protocol,
      hostname: target.hostname,
      port: 443,
      path: target.pathname + target.search,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body).toString(),
        'X-Shazam-Platform': 'IPHONE',
        'X-Shazam-AppVersion': '14.1.0',
        Accept: '*/*',
        'Accept-Language': 'en-US',
        'User-Agent': 'Shazam/3685 CFNetwork/1485 Darwin/23.1.0',
      },
    }

    const upstream = https.request(reqOptions, (upstreamRes) => {
      const outHeaders: Record<string, string> = {
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
      }
      const ct = upstreamRes.headers['content-type']
      outHeaders['content-type'] = (typeof ct === 'string' ? ct : 'application/json')

      res.writeHead(upstreamRes.statusCode ?? 502, outHeaders)
      upstreamRes.pipe(res)
    })

    upstream.on('error', (e) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'access-control-allow-origin': '*' })
        res.end(`Upstream error: ${(e as Error).message}`)
      } else {
        res.end()
      }
    })

    upstream.write(body)
    upstream.end()
  })

  req.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(400, { 'access-control-allow-origin': '*' })
      res.end('Bad request')
    }
  })
}
