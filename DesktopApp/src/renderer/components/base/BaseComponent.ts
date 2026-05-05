export abstract class BaseComponent<T = Record<string, never>> {
  protected element: HTMLElement | null = null
  protected props: T
  private eventListeners: Array<{
    element: Element
    event: string
    handler: EventListener
  }> = []

  constructor(props: T) {
    this.props = props
  }

  abstract render(): string

  mount(container: HTMLElement | string): void {
    const targetContainer = typeof container === 'string' 
      ? document.querySelector(container) 
      : container

    if (!targetContainer) {
      throw new Error('Container not found')
    }

    const html = this.render()
    targetContainer.innerHTML = html

    this.element = targetContainer.firstElementChild as HTMLElement
    this.setupImageErrorHandlers()
    this.afterMount()
  }

  protected afterMount(): void {
    // Override in subclasses for post-mount logic
  }

  protected setupImageErrorHandlers(): void {
    // Logo error handling is done globally via initLogoErrorHandling() in index.ts
    // No per-component setup needed
  }

  unmount(): void {
    this.beforeUnmount()
    this.removeAllListeners()
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
    this.element = null
  }

  protected beforeUnmount(): void {
    // Override in subclasses for cleanup
  }

  update(props: Partial<T>): void {
    this.props = { ...this.props, ...props }
    if (this.element && this.element.parentNode) {
      const parent = this.element.parentNode as HTMLElement
      this.unmount()
      this.mount(parent)
    }
  }

  protected querySelector<E extends Element = Element>(selector: string): E | null {
    if (!this.element) return null
    return this.element.querySelector<E>(selector)
  }

  protected querySelectorAll<E extends Element = Element>(selector: string): NodeListOf<E> {
    if (!this.element) return document.querySelectorAll<E>('nothing')
    return this.element.querySelectorAll<E>(selector)
  }

  protected on(element: Element | null, event: string, handler: EventListener): void {
    if (!element) return
    element.addEventListener(event, handler)
    this.eventListeners.push({ element, event, handler })
  }

  private removeAllListeners(): void {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler)
    })
    this.eventListeners = []
  }
}
