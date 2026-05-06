export class Toast {
    static show(optionsOrMessage, type, duration) {
        const opts = typeof optionsOrMessage === 'string'
            ? { message: optionsOrMessage, type: type ?? 'info', duration }
            : optionsOrMessage;
        if (!this.container)
            this.createContainer();
        const toast = this.createToast(opts);
        this.container.appendChild(toast);
        this.toasts.add(toast);
        setTimeout(() => this.remove(toast), opts.duration ?? 4000);
    }
    static createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    }
    static createToast(opts) {
        const toast = document.createElement('div');
        toast.className = `toast ${opts.type}`;
        toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">${this.getIcon(opts.type)}</div>
        <div class="toast-message">${this.escapeHtml(opts.message)}</div>
      </div>
    `;
        return toast;
    }
    static remove(toast) {
        toast.classList.add('removing');
        setTimeout(() => {
            toast.parentNode?.removeChild(toast);
            this.toasts.delete(toast);
        }, 280);
    }
    static getIcon(type) {
        const icons = {
            success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>`,
            error: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>`,
            info: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>`
        };
        return icons[type];
    }
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
Object.defineProperty(Toast, "container", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: null
});
Object.defineProperty(Toast, "toasts", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: new Set()
});
// Global listener
window.addEventListener('show-toast', ((e) => {
    Toast.show(e.detail);
}));
