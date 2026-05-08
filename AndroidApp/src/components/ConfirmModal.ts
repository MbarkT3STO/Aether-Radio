/**
 * ConfirmModal — promise-based confirmation dialog for mobile.
 *
 * Usage:
 *   const ok = await ConfirmModal.show({
 *     title: 'Delete Station',
 *     message: 'Are you sure you want to delete "My Station"?',
 *     confirmLabel: 'Delete',
 *     danger: true
 *   })
 *   if (ok) { ... }
 */

export interface ConfirmModalOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Renders the confirm button in red/danger style */
  danger?: boolean
  /** Optional icon HTML string rendered above the title */
  icon?: string
}

export class ConfirmModal {
  private static overlay: HTMLElement | null = null

  static show(options: ConfirmModalOptions): Promise<boolean> {
    return new Promise(resolve => {
      this.remove()

      const {
        title,
        message,
        confirmLabel = 'Confirm',
        cancelLabel  = 'Cancel',
        danger       = false,
        icon
      } = options

      const overlay = document.createElement('div')
      overlay.className = 'cm-overlay'
      overlay.setAttribute('role', 'dialog')
      overlay.setAttribute('aria-modal', 'true')
      overlay.setAttribute('aria-labelledby', 'cm-title')

      overlay.innerHTML = `
        <div class="cm-backdrop"></div>
        <div class="cm-dialog">
          ${icon ? `<div class="cm-icon ${danger ? 'cm-icon--danger' : ''}">${icon}</div>` : ''}
          <div class="cm-body">
            <h2 class="cm-title" id="cm-title">${this.esc(title)}</h2>
            <p class="cm-message">${this.esc(message)}</p>
          </div>
          <div class="cm-actions">
            <button class="cm-btn cm-btn--cancel" id="cm-cancel">${this.esc(cancelLabel)}</button>
            <button class="cm-btn ${danger ? 'cm-btn--danger' : 'cm-btn--confirm'}" id="cm-confirm">
              ${danger ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>` : ''}
              ${this.esc(confirmLabel)}
            </button>
          </div>
        </div>
      `

      const cleanup = (result: boolean) => {
        const dialog = overlay.querySelector('.cm-dialog') as HTMLElement | null
        if (dialog) {
          dialog.style.animation = 'cmDialogOut 0.2s cubic-bezier(0.4,0,1,1) forwards'
        }
        overlay.style.animation = 'cmOverlayOut 0.25s ease forwards'
        setTimeout(() => {
          this.remove()
          resolve(result)
        }, 220)
      }

      overlay.querySelector('#cm-confirm')?.addEventListener('click', () => cleanup(true))
      overlay.querySelector('#cm-cancel')?.addEventListener('click', () => cleanup(false))
      overlay.querySelector('.cm-backdrop')?.addEventListener('click', () => cleanup(false))

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') { document.removeEventListener('keydown', onKeyDown); cleanup(false) }
        if (e.key === 'Enter')  { document.removeEventListener('keydown', onKeyDown); cleanup(true) }
      }
      document.addEventListener('keydown', onKeyDown)

      document.body.appendChild(overlay)
      this.overlay = overlay

      requestAnimationFrame(() => {
        const cancelBtn = overlay.querySelector<HTMLElement>('#cm-cancel')
        cancelBtn?.focus()
      })
    })
  }

  private static remove(): void {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
  }

  private static esc(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
