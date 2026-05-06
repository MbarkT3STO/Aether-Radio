/**
 * Handles image loading errors by hiding the image or showing a fallback
 * This avoids inline onerror handlers which violate CSP
 */
export function setupImageErrorHandlers(container: HTMLElement): void {
  const images = container.querySelectorAll('img.station-card-logo, img.player-station-logo')
  
  images.forEach(img => {
    const imageElement = img as HTMLImageElement
    
    // Remove any existing error listeners to avoid duplicates
    imageElement.onerror = null
    
    // Add error handler
    imageElement.addEventListener('error', function(this: HTMLImageElement) {
      // Try fallback SVG first
      if (!this.src.includes('data:image/svg+xml')) {
        this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%239090B0' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='2'/%3E%3Cpath d='M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49'/%3E%3C/svg%3E"
      } else {
        // If fallback also fails, hide the image
        this.style.display = 'none'
      }
    }, { once: true }) // Use once to prevent multiple triggers
  })
}
