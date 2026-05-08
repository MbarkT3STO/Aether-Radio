/**
 * AboutModal — shown when the user clicks the app logo in the sidebar.
 * Self-contained: injects itself into document.body, cleans up on close.
 */
import { LOGO_URL } from '../utils/assets'
import { BridgeService } from '../services/BridgeService'

export class AboutModal {
  private static overlay: HTMLElement | null = null

  static show(): void {
    if (this.overlay) return
    this.mount()
  }

  private static mount(): void {
    const overlay = document.createElement('div')
    overlay.className = 'am-overlay'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-labelledby', 'am-title')

    overlay.innerHTML = `
      <div class="am-backdrop"></div>
      <div class="am-dialog">

        <button class="am-close" id="am-close" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div class="am-logo-wrap">
          <img src="${LOGO_URL}" alt="Aether Radio" class="am-logo">
          <div class="am-logo-glow"></div>
        </div>

        <div class="am-identity">
          <h2 class="am-name" id="am-title">Aether Radio</h2>
          <span class="am-version-badge">v1.1.0</span>
        </div>

        <p class="am-tagline">Your world, your frequency.</p>

        <div class="am-divider"></div>

        <div class="am-info">
          <div class="am-info-row">
            <span class="am-info-label">Developer</span>
            <span class="am-info-value">MBVRK</span>
          </div>
          <div class="am-info-row">
            <span class="am-info-label">GitHub</span>
            <button class="am-info-value am-accent am-link" id="am-github-link">MbarkT3STO/Aether-Radio</button>
          </div>
          <div class="am-info-row">
            <span class="am-info-label">Edition</span>
            <span class="am-info-value">Web</span>
          </div>
        </div>

        <div class="am-divider"></div>

      </div>
    `

    const close = (): void => this.dismiss()
    const bridge = BridgeService.getInstance()

    overlay.querySelector('#am-close')?.addEventListener('click', close)
    overlay.querySelector('.am-backdrop')?.addEventListener('click', close)
    overlay.querySelector('#am-github-link')?.addEventListener('click', (e) => {
      e.stopPropagation()
      bridge.openExternal('https://github.com/MbarkT3STO/Aether-Radio')
    })

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onKey)
        close()
      }
    }
    document.addEventListener('keydown', onKey)

    document.body.appendChild(overlay)
    this.overlay = overlay

    requestAnimationFrame(() => {
      overlay.querySelector<HTMLElement>('#am-close')?.focus()
    })
  }

  private static dismiss(): void {
    if (!this.overlay) return
    const dialog = this.overlay.querySelector<HTMLElement>('.am-dialog')
    if (dialog) dialog.style.animation = 'amDialogOut 0.2s cubic-bezier(0.4,0,1,1) forwards'
    this.overlay.style.animation = 'amOverlayOut 0.25s ease forwards'
    const ref = this.overlay
    setTimeout(() => {
      ref.remove()
      if (this.overlay === ref) this.overlay = null
    }, 240)
  }
}
