// Netlify Edge Function — proxies a single signed signature POST to
// Shazam's internal API. Browsers cannot call amp.shazam.com directly
// (CORS rejects the preflight), so the renderer sends the body here and
// we forward it with the right headers.
//
// Usage from the app:   POST /api/shazam   body = JSON signature payload
// Response:             the raw JSON Shazam returns (or an error status)

const SHAZAM_HOST = 'https://amp.shazam.com'
const SHAZAM_PATH_TEMPLATE = '/discovery/v5/en/US/iphone/-/tag/{tag}/{session}?sync=true&webv3=true&sampling=true&connected=&shazamapiversion=v3&sharehub=true&hubv5minorversion=v5.1&hidelb=true&video=v3'

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  }).toUpperCase()
}

export default async (request: Request): Promise<Response> => {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
        'access-control-max-age': '86400',
      },
    })
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { 'access-control-allow-origin': '*' },
    })
  }

  const body = await request.text()
  if (!body) {
    return new Response('Empty body', {
      status: 400,
      headers: { 'access-control-allow-origin': '*' },
    })
  }

  const url = SHAZAM_HOST +
    SHAZAM_PATH_TEMPLATE.replace('{tag}', uuid()).replace('{session}', uuid())

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      body,
      headers: {
        'Content-Type':        'application/json',
        'X-Shazam-Platform':   'IPHONE',
        'X-Shazam-AppVersion': '14.1.0',
        'Accept':              '*/*',
        'Accept-Language':     'en-US',
        'User-Agent':          'Shazam/3685 CFNetwork/1485 Darwin/23.1.0',
      },
    })

    const text = await upstream.text()
    return new Response(text, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
      },
    })
  } catch (e) {
    return new Response(`Upstream error: ${(e as Error).message}`, {
      status: 502,
      headers: { 'access-control-allow-origin': '*' },
    })
  }
}

export const config = { path: '/api/shazam' }
