// Toast notification — listens for 'show-toast' custom events
export function initToast(): void {
  const container = document.createElement('div')
  container.className = 'toast-container'
  document.body.appendChild(container)

  window.addEventListener('show-toast', (e: Event) => {
    const { message, type = 'info' } = (e as CustomEvent<{ message: string; type: string }>).detail
    const toast = document.createElement('div')
    toast.className = `toast toast--${type}`
    toast.textContent = message
    container.appendChild(toast)
    requestAnimationFrame(() => toast.classList.add('toast--visible'))
    setTimeout(() => {
      toast.classList.remove('toast--visible')
      toast.addEventListener('transitionend', () => toast.remove(), { once: true })
    }, 3000)
  })
}
