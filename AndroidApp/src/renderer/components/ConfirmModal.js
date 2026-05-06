/**
 * ConfirmModal — a modern, promise-based confirmation dialog.
 *
 * Usage:
 *   const confirmed = await ConfirmModal.show({
 *     title: 'Delete Station',
 *     message: 'Are you sure you want to delete "My Station"?',
 *     confirmLabel: 'Delete',
 *     danger: true
 *   })
 *   if (confirmed) { ... }
 */
export class ConfirmModal {
    static show(options) {
        return new Promise(resolve => {
            // Remove any existing modal
            this.remove();
            const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, icon } = options;
            const overlay = document.createElement('div');
            overlay.className = 'cm-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'cm-title');
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
      `;
            const cleanup = (result) => {
                const dialog = overlay.querySelector('.cm-dialog');
                if (dialog) {
                    dialog.style.animation = 'cmDialogOut 0.2s cubic-bezier(0.4,0,1,1) forwards';
                }
                overlay.style.animation = 'cmOverlayOut 0.25s ease forwards';
                setTimeout(() => {
                    this.remove();
                    resolve(result);
                }, 220);
            };
            // Confirm button
            overlay.querySelector('#cm-confirm')?.addEventListener('click', () => cleanup(true));
            // Cancel button
            overlay.querySelector('#cm-cancel')?.addEventListener('click', () => cleanup(false));
            // Backdrop click = cancel
            overlay.querySelector('.cm-backdrop')?.addEventListener('click', () => cleanup(false));
            // Escape key = cancel
            const onKeyDown = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', onKeyDown);
                    cleanup(false);
                }
                if (e.key === 'Enter') {
                    document.removeEventListener('keydown', onKeyDown);
                    cleanup(true);
                }
            };
            document.addEventListener('keydown', onKeyDown);
            document.body.appendChild(overlay);
            this.overlay = overlay;
            // Focus the cancel button by default (safer for destructive actions)
            requestAnimationFrame(() => {
                const cancelBtn = overlay.querySelector('#cm-cancel');
                cancelBtn?.focus();
            });
        });
    }
    static remove() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
    static esc(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
Object.defineProperty(ConfirmModal, "overlay", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: null
});
