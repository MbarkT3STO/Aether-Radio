/**
 * Radio Browser mirror latency race.
 *
 * The stock DE/NL/AT mirrors are fine from Europe but add 200-300 ms for
 * users further away. Radio Browser also runs mirrors in the US and in
 * Asia-Pacific, but there is no official discovery endpoint we can call
 * from the browser that returns a full server list.
 *
 * Instead, we race a tiny JSON request against all known mirrors and
 * keep the order by response time. This runs once on app startup, in
 * parallel with UI rendering, so first-paint is never blocked.
 *
 * Source: https://api.radio-browser.info/#Server_mirrors
 */

// All public mirrors as of 2025-11 — https://api.radio-browser.info/
const CANDIDATE_MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
]

const PROBE_ENDPOINT = '/json/stats'
const PROBE_TIMEOUT_MS = 2500

/** Order of latency-ranked mirrors. Lower index = faster. */
export async function rankMirrorsByLatency(): Promise<string[]> {
  const probes = CANDIDATE_MIRRORS.map(async (baseUrl) => {
    const start = performance.now()
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS)
      // /json/stats is a small JSON blob (< 1 KB) — perfect latency probe
      const res = await fetch(`${baseUrl}${PROBE_ENDPOINT}`, {
        signal: ctrl.signal,
        cache: 'no-store',
      })
      clearTimeout(t)
      if (!res.ok) return { baseUrl, latency: Infinity }
      await res.arrayBuffer()
      return { baseUrl, latency: performance.now() - start }
    } catch {
      return { baseUrl, latency: Infinity }
    }
  })

  const results = await Promise.all(probes)
  const ranked = results
    .filter(r => Number.isFinite(r.latency))
    .sort((a, b) => a.latency - b.latency)
    .map(r => r.baseUrl)

  // If everything timed out, keep the hardcoded order as a last resort
  return ranked.length > 0 ? ranked : CANDIDATE_MIRRORS
}
