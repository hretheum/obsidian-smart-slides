export interface DomainEvent<Type extends string = string, Payload = unknown> {
  readonly type: Type;
  readonly occurredAt: Date;
  readonly payload: Payload;
}

export type EventHandler<E extends DomainEvent = DomainEvent> = (event: E) => void | Promise<void>;
