import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

export interface DomainEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: Date;
}

@Injectable()
export class EventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emit<T>(type: string, payload: T): void {
    const event: DomainEvent<T> = { type, payload, timestamp: new Date() };
    this.emitter.emit(type, event);
    this.emitter.emit('*', event);
  }

  on<T>(type: string, handler: (event: DomainEvent<T>) => void): () => void {
    this.emitter.on(type, handler as (event: unknown) => void);
    return () => this.emitter.off(type, handler as (event: unknown) => void);
  }

  once<T>(type: string, handler: (event: DomainEvent<T>) => void): void {
    this.emitter.once(type, handler as (event: unknown) => void);
  }

  onAll(handler: (event: DomainEvent) => void): () => void {
    this.emitter.on('*', handler as (event: unknown) => void);
    return () => this.emitter.off('*', handler as (event: unknown) => void);
  }
}
