import { EventBus } from '../store/EventBus';
import { PlayerStore } from '../store/PlayerStore';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
export class AudioService {
    constructor() {
        Object.defineProperty(this, "audio", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "eventBus", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: EventBus.getInstance()
        });
        Object.defineProperty(this, "playerStore", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: PlayerStore.getInstance()
        });
        Object.defineProperty(this, "retryCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "currentStationId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_onPlayStarted", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        this.audio = new Audio();
        this.audio.crossOrigin = 'anonymous';
        this.setupEventListeners();
    }
    static getInstance() {
        if (!AudioService.instance) {
            AudioService.instance = new AudioService();
        }
        return AudioService.instance;
    }
    getAudioElement() {
        return this.audio;
    }
    setOnPlayStarted(cb) {
        this._onPlayStarted = cb;
    }
    async play(station) {
        this.currentStationId = station.id;
        this.retryCount = 0;
        this.playerStore.setLoading(true);
        try {
            this.audio.src = station.urlResolved || station.url;
            this.audio.volume = this.playerStore.volume;
            await this.audio.play();
            if (this._onPlayStarted) {
                await this._onPlayStarted(this.audio);
            }
            this.playerStore.setLoading(false);
        }
        catch (error) {
            console.error('Playback error:', error);
            await this.handlePlaybackError(station);
        }
    }
    pause() {
        this.audio.pause();
    }
    stop() {
        this.audio.pause();
        this.audio.src = '';
        this.currentStationId = null;
    }
    setVolume(volume) {
        this.audio.volume = Math.max(0, Math.min(1, volume));
    }
    setupEventListeners() {
        this.audio.addEventListener('error', () => {
            const station = this.playerStore.currentStation;
            if (station && this.currentStationId === station.id) {
                this.handlePlaybackError(station);
            }
        });
        this.audio.addEventListener('playing', () => {
            this.playerStore.setLoading(false);
            this.retryCount = 0;
        });
        this.audio.addEventListener('waiting', () => {
            this.playerStore.setLoading(true);
        });
        this.audio.addEventListener('canplay', () => {
            this.playerStore.setLoading(false);
        });
    }
    async handlePlaybackError(station) {
        if (this.retryCount < MAX_RETRIES) {
            this.retryCount++;
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            if (this.currentStationId === station.id) {
                await this.play(station);
            }
        }
        else {
            this.playerStore.error('Failed to play station after multiple attempts');
            this.playerStore.setLoading(false);
            this.showToast('Unable to play this station. Please try another one.', 'error');
        }
    }
    showToast(message, type) {
        const event = new CustomEvent('show-toast', { detail: { message, type } });
        window.dispatchEvent(event);
    }
    setBufferSize(size) {
        switch (size) {
            case 'low':
                this.audio.preload = 'none';
                break;
            case 'balanced':
                this.audio.preload = 'metadata';
                break;
            case 'high':
                this.audio.preload = 'auto';
                break;
        }
    }
}
