import { Browser } from '@capacitor/browser';
export class AboutModal {
    static show() {
        if (this.overlay)
            return;
        this.mount();
    }
    static mount() {
        const overlay = document.createElement('div');
        overlay.className = 'am-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = `
      <div class="am-backdrop"></div>
      <div class="am-dialog">
        <button class="am-close" id="am-close" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div class="am-logo-wrap">
          <img src="./assets/logo.png" alt="Aether Radio" class="am-logo">
          <div class="am-logo-glow"></div>
        </div>
        <div class="am-identity">
          <h2 class="am-name" id="am-title">Aether Radio</h2>
          <span class="am-version-badge">v1.0.0</span>
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
        </div>
        <div class="am-divider"></div>
      </div>
    `;
        const close = () => this.dismiss();
        overlay.querySelector('#am-close')?.addEventListener('click', close);
        overlay.querySelector('.am-backdrop')?.addEventListener('click', close);
        overlay.querySelector('#am-github-link')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await Browser.open({ url: 'https://github.com/MbarkT3STO/Aether-Radio' });
        });
        document.body.appendChild(overlay);
        this.overlay = overlay;
    }
    static dismiss() {
        if (!this.overlay)
            return;
        const ref = this.overlay;
        ref.style.animation = 'amOverlayOut 0.25s ease forwards';
        setTimeout(() => { ref.remove(); if (this.overlay === ref)
            this.overlay = null; }, 240);
    }
}
Object.defineProperty(AboutModal, "overlay", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: null
});
