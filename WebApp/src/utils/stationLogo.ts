/**
 * Renders a station logo wrapper.
 * Uses event delegation for error handling — NO inline onerror attributes.
 */

export const RADIO_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="9" width="20" height="12" rx="2"/><path d="M8 15a2 2 0 1 0 0 .01"/><line x1="14" y1="13" x2="19" y2="13"/><line x1="14" y1="16" x2="17" y2="16"/><path d="M6.5 9 16 3.5"/></svg>`

export const FALLBACK_HTML = `<div class="station-logo-fallback">${RADIO_ICON_SVG}</div>`

/**
 * @param favicon  Station favicon URL (may be empty/null/undefined)
 * @param name     Station name for alt text
 * @param size     'card' | 'player'
 */
export function stationLogoHtml(
  favicon: string | undefined | null,
  name: string,
  size: 'card' | 'player' = 'card'
): string {
  const wrapClass = size === 'player' ? 'player-station-logo-wrap' : 'station-card-logo-wrap'

  // No favicon → show fallback immediately, no img element at all
  if (!favicon || favicon.trim() === '') {
    return `<div class="${wrapClass}">${FALLBACK_HTML}</div>`
  }

  // Sanitize the favicon URL — only allow http/https, strip everything else
  const safeSrc = sanitizeUrl(favicon)
  if (!safeSrc) {
    return `<div class="${wrapClass}">${FALLBACK_HTML}</div>`
  }

  // Use data-logo attribute so the global handler can identify these images
  // Double-quote the src attribute and encode any double quotes in the URL
  const encodedSrc = safeSrc.replace(/"/g, '%22')
  const encodedAlt = name.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<div class="${wrapClass}"><img src="${encodedSrc}" alt="${encodedAlt}" data-logo></div>`
}

function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim()
  // Only allow http and https URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  // Allow data URIs (some stations use them)
  if (trimmed.startsWith('data:image/')) {
    return trimmed
  }
  return null
}

/**
 * Install once at app startup.
 * Uses capture-phase delegation so it fires for all img[data-logo] errors,
 * even those added dynamically after page load.
 */
export function initLogoErrorHandling(): void {
  document.addEventListener('error', (e) => {
    const target = e.target as HTMLElement
    if (target instanceof HTMLImageElement && target.hasAttribute('data-logo')) {
      const wrap = target.parentElement
      if (wrap) {
        wrap.innerHTML = FALLBACK_HTML
      }
    }
  }, true)
}
