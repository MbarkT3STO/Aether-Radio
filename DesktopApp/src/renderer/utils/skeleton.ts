/**
 * Skeleton loading utilities — generates placeholder HTML
 * that matches station card dimensions for zero layout shift.
 */

/**
 * Generate a single skeleton card HTML.
 */
export function skeletonCard(): string {
  return `<div class="skeleton-card">
  <div class="skeleton-card-header">
    <div class="skeleton-bone skeleton-logo"></div>
    <div class="skeleton-info">
      <div class="skeleton-bone skeleton-name"></div>
      <div class="skeleton-bone skeleton-country"></div>
    </div>
  </div>
  <div class="skeleton-tags">
    <div class="skeleton-bone skeleton-tag"></div>
    <div class="skeleton-bone skeleton-tag"></div>
    <div class="skeleton-bone skeleton-tag"></div>
  </div>
  <div class="skeleton-footer">
    <div class="skeleton-bone skeleton-meta"></div>
    <div class="skeleton-bone skeleton-heart"></div>
  </div>
</div>`
}

/**
 * Generate a grid of skeleton cards for loading state.
 * @param count Number of skeleton cards to render (default 12)
 */
export function skeletonGrid(count = 12): string {
  return `<div class="grid grid-cols-auto skeleton-grid">
    ${Array.from({ length: count }, () => skeletonCard()).join('')}
  </div>`
}
