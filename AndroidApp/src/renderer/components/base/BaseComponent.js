export class BaseComponent {
    constructor(props) {
        Object.defineProperty(this, "element", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "props", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "eventListeners", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this.props = props;
    }
    async mount(container) {
        const targetContainer = typeof container === 'string'
            ? document.querySelector(container)
            : container;
        if (!targetContainer) {
            throw new Error('Container not found');
        }
        const html = this.render();
        targetContainer.innerHTML = html;
        this.element = targetContainer.firstElementChild;
        this.setupImageErrorHandlers();
        await this.afterMount();
    }
    afterMount() {
        // Override in subclasses for post-mount logic
    }
    setupImageErrorHandlers() {
        // Logo error handling is done globally via initLogoErrorHandling() in index.ts
        // No per-component setup needed
    }
    unmount() {
        this.beforeUnmount();
        this.removeAllListeners();
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
    beforeUnmount() {
        // Override in subclasses for cleanup
    }
    update(props) {
        this.props = { ...this.props, ...props };
        if (this.element && this.element.parentNode) {
            const parent = this.element.parentNode;
            this.unmount();
            void this.mount(parent);
        }
    }
    querySelector(selector) {
        if (!this.element)
            return null;
        return this.element.querySelector(selector);
    }
    querySelectorAll(selector) {
        if (!this.element)
            return document.querySelectorAll('nothing');
        return this.element.querySelectorAll(selector);
    }
    on(element, event, handler) {
        if (!element)
            return;
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }
    removeAllListeners() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }
}
