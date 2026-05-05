import type { RadioStation } from '../../domain/entities/RadioStation'
import type { Favorite } from '../../domain/entities/Favorite'
import type { PlayHistory } from '../../domain/entities/PlayHistory'

export type EventMap = {
  'player:play': { station: RadioStation }
  'player:pause': Record<string, never>
  'player:stop': Record<string, never>
  'player:volume': { volume: number }
  'player:error': { message: string }
  'player:loading': { loading: boolean }
  'stations:loaded': { stations: RadioStation[]; total: number }
  'favorites:changed': { favorites: Favorite[] }
  'history:changed': { history: PlayHistory[] }
  'route:changed': { route: string }
  'theme:changed': { theme: 'dark' | 'light' }
}

type EventHandler<K extends keyof EventMap> = (data: EventMap[K]) => void

export class EventBus {
  private static instance: EventBus
  private handlers: Map<keyof EventMap, Set<EventHandler<never>>> = new Map()

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  on<K extends keyof EventMap>(event: K, handler: EventHandler<K>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as EventHandler<never>)

    // Return unsubscribe function
    return () => this.off(event, handler)
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<K>): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.delete(handler as EventHandler<never>)
    }
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }

  clear(): void {
    this.handlers.clear()
  }
}
