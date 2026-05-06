import { EventBus } from '../store/EventBus';
export class VisualizerService {
    constructor() {
        Object.defineProperty(this, "audioContext", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "analyser", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "dataArray", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "source", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "animationId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "activeCanvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "themeUnsubscribe", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
    }
    // Expose for shared-canvas use by a secondary VisualizerService instance
    get sharedAnalyser() { return this.analyser; }
    get sharedDataArray() { return this.dataArray; }
    async initialize(audioElement) {
        if (this.audioContext) {
            // Resume if suspended (e.g. browser blocked autoplay before user gesture)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            return;
        }
        this.audioContext = new AudioContext();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.82;
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        this.source = this.audioContext.createMediaElementSource(audioElement);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        // Listen for theme changes and re-draw the gradient with the new accent color
        const eventBus = EventBus.getInstance();
        this.themeUnsubscribe = eventBus.on('theme:changed', () => {
            if (this.activeCanvas) {
                this.stopVisualization();
                this.startVisualization(this.activeCanvas);
            }
        });
    }
    startVisualization(canvas) {
        if (!this.analyser || !this.dataArray)
            return;
        this.stopVisualization();
        this.activeCanvas = canvas;
        this.drawLoop(canvas);
    }
    /**
     * Start visualization on a second canvas by borrowing the analyser from
     * another VisualizerService instance that already owns the AudioContext.
     * This avoids the "HTMLMediaElement already connected" DOMException.
     */
    startVisualizationShared(canvas, source) {
        this.analyser = source.sharedAnalyser;
        this.dataArray = source.sharedDataArray;
        if (!this.analyser || !this.dataArray)
            return;
        this.stopVisualization();
        this.activeCanvas = canvas;
        this.drawLoop(canvas);
    }
    /**
     * Ambient gradient visualizer — full-bleed canvas behind the expanded player.
     * Draws slow-moving radial blobs that pulse with audio frequency data.
     */
    startAmbientVisualization(canvas, source, large = false, centered = false) {
        this.analyser = source.sharedAnalyser;
        this.dataArray = source.sharedDataArray;
        this.stopVisualization();
        this.activeCanvas = canvas;
        this.ambientLoop(canvas, large, centered);
    }
    ambientLoop(canvas, large = false, centered = false) {
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        // CSS accent hue/sat
        const style = getComputedStyle(document.documentElement);
        const h = parseFloat(style.getPropertyValue('--h').trim()) || 258;
        const s = style.getPropertyValue('--s').trim() || '85%';
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        // Three blobs with different hue offsets, positions, and phase speeds
        const blobs = [
            { hueOff: 0, x: centered ? 0.40 : 0.25, y: 0.40, phase: 0, speed: 0.0007, freqBin: 2 },
            { hueOff: 40, x: centered ? 0.60 : 0.72, y: 0.35, phase: 2.1, speed: 0.0011, freqBin: 8 },
            { hueOff: -20, x: 0.50, y: 0.70, phase: 4.3, speed: 0.0009, freqBin: 14 },
        ];
        let t = 0;
        const draw = () => {
            this.animationId = requestAnimationFrame(draw);
            t++;
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            const pw = Math.round(rect.width * dpr);
            const ph = Math.round(rect.height * dpr);
            if (canvas.width !== pw || canvas.height !== ph) {
                canvas.width = pw;
                canvas.height = ph;
            }
            const w = canvas.width;
            const hh = canvas.height;
            // Apply blur via shadowBlur on each blob instead of CSS filter
            ctx.clearRect(0, 0, w, hh);
            // Pull fresh frequency data every frame
            if (this.analyser && this.dataArray) {
                this.analyser.getByteFrequencyData(this.dataArray);
            }
            const freqData = this.dataArray;
            const getEnergy = (bin) => freqData ? (freqData[bin] ?? 0) / 255 : 0.3;
            for (const blob of blobs) {
                const energy = getEnergy(blob.freqBin);
                const phase = blob.phase + t * blob.speed;
                const cx = (blob.x + Math.sin(phase * 1.3) * (centered ? 0.05 : 0.12)) * w;
                const cy = (blob.y + Math.cos(phase * 0.9) * 0.10) * hh;
                const baseR = Math.min(w, hh) * (large ? 1.8 : 0.45);
                const radius = baseR * (0.7 + energy * 0.6 + Math.sin(phase * 2) * 0.08);
                const blobHue = (h + blob.hueOff + 360) % 360;
                const alpha = isDark
                    ? (large ? 0.30 + energy * 0.35 : 0.22 + energy * 0.28)
                    : (large ? 0.18 + energy * 0.22 : 0.12 + energy * 0.16);
                // Use shadowBlur for the soft glow — no CSS filter needed
                ctx.save();
                ctx.shadowColor = `hsla(${blobHue}, ${s}, ${isDark ? '65%' : '55%'}, ${alpha})`;
                ctx.shadowBlur = Math.min(w, hh) * 0.35;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
                grad.addColorStop(0, `hsla(${blobHue}, ${s}, ${isDark ? '65%' : '55%'}, ${alpha})`);
                grad.addColorStop(0.5, `hsla(${blobHue}, ${s}, ${isDark ? '55%' : '50%'}, ${alpha * 0.5})`);
                grad.addColorStop(1, `hsla(${blobHue}, ${s}, ${isDark ? '45%' : '45%'}, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(cx, cy, radius, radius * 0.85, phase * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        };
        draw();
    }
    drawLoop(canvas) {
        if (!this.analyser || !this.dataArray)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        // Read accent color from CSS variables so it always matches the current theme
        const style = getComputedStyle(document.documentElement);
        const h = style.getPropertyValue('--h').trim();
        const s = style.getPropertyValue('--s').trim();
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const l = isDark ? '65%' : '55%';
        const accentColor = `hsl(${h}, ${s}, ${l})`;
        const accentColorFaded = `hsla(${h}, ${s}, ${l}, 0.4)`;
        const width = canvas.width;
        const height = canvas.height;
        const barCount = 24;
        const barWidth = width / barCount;
        const gap = 2;
        // Pre-compute a single full-height gradient — reused every frame
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, accentColor);
        gradient.addColorStop(1, accentColorFaded);
        ctx.fillStyle = gradient;
        const draw = () => {
            this.animationId = requestAnimationFrame(draw);
            if (!this.analyser || !this.dataArray)
                return;
            this.analyser.getByteFrequencyData(this.dataArray);
            ctx.clearRect(0, 0, width, height);
            for (let i = 0; i < barCount; i++) {
                const value = this.dataArray[i * 4] ?? 0;
                const barHeight = (value / 255) * height * 0.85;
                const x = i * barWidth;
                const y = height - barHeight;
                ctx.fillRect(x, y, barWidth - gap, barHeight);
            }
        };
        draw();
    }
    stopVisualization() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    destroy() {
        this.stopVisualization();
        this.activeCanvas = null;
        if (this.themeUnsubscribe) {
            this.themeUnsubscribe();
            this.themeUnsubscribe = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
    }
}
