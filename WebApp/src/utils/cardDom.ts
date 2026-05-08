/**
 * Surgical DOM updates for station cards so we don't have to re-render
 * the entire grid when the user toggles a single favorite or when the
 * currently-playing station changes.
 *
 * All selectors match the markup produced by renderStationCard().
 */

const FILLED_HEART = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
const EMPTY_HEART  = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`

/**
 * Update the heart button of a single station card without touching the
 * rest of the DOM. Accepts either the card element or the favorite button
 * element and finds the other.
 */
export function updateFavoriteButton(
  root: ParentNode,
  stationId: string,
  isFavorite: boolean
): void {
  const card = root.querySelector<HTMLElement>(`.station-card[data-station-id="${CSS.escape(stationId)}"]`)
  if (!card) return
  const btn = card.querySelector<HTMLElement>('[data-action="favorite"], [data-action="remove"]')
  if (!btn) return
  btn.classList.toggle('active', isFavorite)
  btn.title = isFavorite ? 'Remove from favorites' : 'Add to favorites'
  btn.setAttribute('aria-label', isFavorite ? 'Remove from favorites' : 'Add to favorites')
  btn.setAttribute('aria-pressed', String(isFavorite))
  btn.innerHTML = isFavorite ? FILLED_HEART : EMPTY_HEART
}

/**
 * Remove a single station card from the DOM with a subtle fade-out.
 * Used on the Favorites view when the user un-favorites while looking
 * at the list.
 */
export function removeCardWithFade(
  root: ParentNode,
  stationId: string,
  onDone?: () => void
): void {
  const card = root.querySelector<HTMLElement>(`.station-card[data-station-id="${CSS.escape(stationId)}"]`)
  if (!card) { onDone?.(); return }
  card.style.transition = 'opacity 180ms ease, transform 180ms ease'
  card.style.opacity = '0'
  card.style.transform = 'scale(0.96)'
  setTimeout(() => {
    card.remove()
    onDone?.()
  }, 200)
}

/**
 * Sync the "playing" class on every station card in a container against
 * the current player state. Cheaper than re-rendering.
 */
export function syncPlayingState(
  root: ParentNode,
  currentStationId: string | null,
  isPlaying: boolean
): void {
  root.querySelectorAll<HTMLElement>('.station-card').forEach(card => {
    const active = isPlaying && card.getAttribute('data-station-id') === currentStationId
    card.classList.toggle('playing', active)
  })
}
