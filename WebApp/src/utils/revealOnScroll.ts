/**
 * Reveal-on-scroll — tiny wrapper around IntersectionObserver.
 *
 * Any element with class `.reveal` inside `.app-content` fades/slides
 * in the first time it intersects the viewport. We deliberately stop
 * observing after the first trigger so the animation never repeats.
 *
 * Safe to call repeatedly — it no-ops if the observer is already set up.
 */

let observer: IntersectionObserver | null = null

export function initRevealOnScroll(): void {
  if (observer) return
  if (typeof IntersectionObserver === 'undefined') {
    // Older browsers — just reveal everything immediately
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'))
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        observer?.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
  )

  // Observe on every route render — views create their DOM lazily, so we
  // re-scan when content changes.
  observeAll()

  // The main content scroller isn't window — it's `.app-content`. We use
  // a MutationObserver so freshly-rendered reveal elements (after route
  // changes) also get picked up.
  const content = document.querySelector<HTMLElement>('.app-content')
  if (content) {
    const mo = new MutationObserver(() => observeAll())
    mo.observe(content, { childList: true, subtree: true })
  }
}

function observeAll(): void {
  if (!observer) return
  document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => {
    observer!.observe(el)
  })
}
