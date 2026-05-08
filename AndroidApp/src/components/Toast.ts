/**
 * Toast — Apple HIG notification capsule (mobile).
 * Listens for 'show-toast' events dispatched via window.dispatchEvent.
 */

export type ToastType = 'success' | 'error' | 'info'

interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
}

const ICONS: Record<ToastType, string> = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="m15 9-6 6"/><path d="m9 9 6 6"/>
  </svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4"/><path d="M12 8h.01"/>
  </svg>`
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function ensureContainer(): HTMLElement {
  let container = document.querySelector<HTMLElement>('.toast-container')
  if (!container) {
    container = document.createElement('div')
    container.className = 'toast-container'
    container.setAttribute('role', 'status')
    container.setAttribute('aria-live', 'polite')
    container.setAttribute('aria-atomic', 'false')
    document.body.appendChild(container)
  }
  return container
}

function renderToast(opts: ToastOptions): void {
  const type = opts.type ?? 'info'
  const container = ensureContainer()
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.setAttribute('role', 'status')
  toast.innerHTML = `
    <div class="toast-icon">${ICONS[type]}</div>
    <div class="toast-message">${escapeHtml(opts.message)}</div>
  `
  container.appendChild(toast)

  const duration = opts.duration ?? 3200
  setTimeout(() => {
    toast.classList.add('removing')
    toast.addEventListener('animationend', () => toast.remove(), { once: true })
    setTimeout(() => toast.remove(), 320)
  }, duration)
}

export function initToast(): void {
  // ensure container exists eagerly
  ensureContainer()
  window.addEventListener('show-toast', (e: Event) => {
    const detail = (e as CustomEvent<ToastOptions>).detail
    if (!detail || !detail.message) return
    renderToast(detail)
  })
}

export const Toast = {
  show(message: string | ToastOptions, type: ToastType = 'info', duration?: number): void {
    if (typeof message === 'string') {
      renderToast({ message, type, duration: duration ?? undefined })
    } else {
      renderToast(message)
    }
  }
}
