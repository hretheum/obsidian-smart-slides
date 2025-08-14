import { DomainEvent, EventHandler } from './DomainEvent';

export class EventBus<TEvt extends DomainEvent = DomainEvent> {
  private readonly typeToHandlers: Map<string, Set<EventHandler<TEvt>>> = new Map();

  subscribe<Type extends TEvt['type']>(
    type: Type,
    handler: EventHandler<Extract<TEvt, { type: Type }>>,
  ): () => void {
    const handlers = this.typeToHandlers.get(type) ?? new Set();
    // @ts-expect-error: internal storage is untyped by design
    handlers.add(handler);
    this.typeToHandlers.set(type as string, handlers as Set<EventHandler<TEvt>>);
    return () => {
      // @ts-expect-error: internal storage is untyped by design
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.typeToHandlers.delete(type as string);
      }
    };
  }

  async publish(event: TEvt): Promise<void> {
    const handlers = this.typeToHandlers.get(event.type) ?? new Set();
    for (const handler of handlers) {
      try {
        // Run each handler sequentially to preserve order determinism.
        // Users can internally fork async work if needed.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (handler as any)(event);
      } catch (error) {
        // Error isolation: do not stop other handlers
        // In production, replace with structured logger if available
        console.error(
          `[EventBus] Handler error for type="${event.type}":`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }
}
