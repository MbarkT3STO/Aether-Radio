export type ToastType = 'success' | 'error' | 'info'

interface ToastOptions {
  message: string
  type: ToastType
  duration?: number
}

export class Toast {
  private static container: HTMLElement | null = null
  private static toasts: Set<HTMLElement> = new Set()

  static show(options: ToastOptions): void
  static show(message: string, type: ToastType, duration?: number): void
  static show(optionsOrMessage: ToastOptions | string, type?: ToastType, duration?: number): void {
    const opts: ToastOptions = typeof optionsOrMessage === 'string'
      ? { message: optionsOrMessage, type: type ?? 'info', duration }
      : optionsOrMessage

    if (!this.container) this.createContainer()

    const toast = this.createToast(opts)
    this.container!.appendChild(toast)
    this.toasts.add(toast)

    setTimeout(() => this.remove(toast), opts.duration ?? 4000)
  }

  private static createContainer(): void {
    this.container = document.createElement('div')
    this.container.className = 'toast-container'
    this.container.setAttribute('role', 'status')
    this.container.setAttribute('aria-live', 'polite')
    this.container.setAttribute('aria-atomic', 'false')
    document.body.appendChild(this.container)
  }

  private static createToast(opts: ToastOptions): HTMLElement {
    const toast = document.createElement('div')
    toast.className = `toast ${opts.type}`
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">${this.getIcon(opts.type)}</div>
        <div class="toast-message">${this.escapeHtml(opts.message)}</div>
      </div>
    `
    return toast
  }

  private static remove(toast: HTMLElement): void {
    toast.classList.add('removing')
    setTimeout(() => {
      toast.parentNode?.removeChild(toast)
      this.toasts.delete(toast)
    }, 280)
  }

  private static getIcon(type: ToastType): string {
    const icons: Record<ToastType, string> = {
      success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>`,
      error: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="m15 9-6 6"/><path d="m9 9 6 6"/>
      </svg>`,
      info: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4"/><path d="M12 8h.01"/>
      </svg>`
    }
    return icons[type]
  }

  private static escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

// Global listener
window.addEventListener('show-toast', ((e: CustomEvent<ToastOptions>) => {
  Toast.show(e.detail)
}) as EventListener)
