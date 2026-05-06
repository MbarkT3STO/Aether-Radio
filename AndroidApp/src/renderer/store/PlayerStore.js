import { EventBus } from './EventBus';
export class PlayerStore {
    constructor() {
        Object.defineProperty(this, "eventBus", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: EventBus.getInstance()
        });
        Object.defineProperty(this, "_currentStation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_isPlaying", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_volume", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0.8
        });
        Object.defineProperty(this, "_volumeBeforeMute", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0.8
        });
        Object.defineProperty(this, "_isLoading", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_sleepTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
    }
    static getInstance() {
        if (!PlayerStore.instance) {
            PlayerStore.instance = new PlayerStore();
        }
        return PlayerStore.instance;
    }
    get currentStation() {
        return this._currentStation;
    }
    get isPlaying() {
        return this._isPlaying;
    }
    get volume() {
        return this._volume;
    }
    get volumeBeforeMute() {
        return this._volumeBeforeMute;
    }
    get isLoading() {
        return this._isLoading;
    }
    get sleepTimerMinutesLeft() {
        if (!this._sleepTimer)
            return null;
        const msLeft = this._sleepTimer.endsAt - Date.now();
        if (msLeft <= 0)
            return null;
        return Math.ceil(msLeft / 60000);
    }
    get hasSleepTimer() {
        return this._sleepTimer !== null;
    }
    play(station) {
        this._currentStation = station;
        this._isPlaying = true;
        this.eventBus.emit('player:play', { station });
    }
    pause() {
        this._isPlaying = false;
        this.eventBus.emit('player:pause', {});
    }
    stop() {
        this._isPlaying = false;
        this._currentStation = null;
        this.clearSleepTimer();
        this.eventBus.emit('player:stop', {});
    }
    setVolume(volume) {
        const newVolume = Math.max(0, Math.min(1, volume));
        if (this._volume > 0 && newVolume === 0) {
            this._volumeBeforeMute = this._volume;
        }
        this._volume = newVolume;
        this.eventBus.emit('player:volume', { volume: this._volume });
    }
    setLoading(loading) {
        this._isLoading = loading;
        this.eventBus.emit('player:loading', { loading });
    }
    error(message) {
        this._isPlaying = false;
        this._isLoading = false;
        this.eventBus.emit('player:error', { message });
    }
    // ── Sleep Timer (Feature 5) ───────────────────────────────────────────────
    setSleepTimer(minutes) {
        this.clearSleepTimer();
        const endsAt = Date.now() + minutes * 60000;
        const timeoutId = setTimeout(() => {
            this.stop();
        }, minutes * 60000);
        this._sleepTimer = { endsAt, timeoutId };
        this.eventBus.emit('player:sleep-timer', { minutesLeft: minutes, active: true });
    }
    clearSleepTimer() {
        if (this._sleepTimer) {
            clearTimeout(this._sleepTimer.timeoutId);
            this._sleepTimer = null;
            this.eventBus.emit('player:sleep-timer', { minutesLeft: null, active: false });
        }
    }
}
