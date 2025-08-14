import { DomainEvent, EventHandler } from './DomainEvent';

/**
 * EventBus provides simple in-memory publish/subscribe mechanics with
 * error isolation between handlers and parallel dispatch.
 */
export interface EventBusOptions {
  historyCapacity?: number;
  errorCapacity?: number;
  onError?: (params: { error: unknown; eventType: string }) => void;
}

export interface EventBusErrorEntry {
  readonly eventType: string;
  readonly error: unknown;
  readonly timestamp: Date;
}

export class EventBus<TEvents extends Record<string, unknown> = Record<string, unknown>> {
  private readonly typeToHandlers: Map<keyof TEvents & string, EventHandler[]> = new Map();
  private readonly eventHistory: DomainEvent<keyof TEvents & string, unknown>[] = [];
  private readonly errorHistory: EventBusErrorEntry[] = [];
  private readonly historyCapacity: number;
  private readonly errorCapacity: number;
  private readonly onError?: (params: { error: unknown; eventType: string }) => void;

  constructor(options?: EventBusOptions) {
    this.historyCapacity = Math.max(0, options?.historyCapacity ?? 200);
    this.errorCapacity = Math.max(0, options?.errorCapacity ?? 100);
    this.onError = options?.onError;
  }

  subscribe<TType extends keyof TEvents & string, TPayload extends TEvents[TType]>(
    eventType: TType,
    handler: EventHandler<DomainEvent<TType, TPayload>>,
  ): void {
    const handlers = this.typeToHandlers.get(eventType) ?? [];
    handlers.push(handler as EventHandler);
    this.typeToHandlers.set(eventType, handlers);
  }

  unsubscribe<TType extends keyof TEvents & string, TPayload extends TEvents[TType]>(
    eventType: TType,
    handler: EventHandler<DomainEvent<TType, TPayload>>,
  ): void {
    const handlers = this.typeToHandlers.get(eventType) ?? [];
    const filtered = handlers.filter((h) => h !== (handler as unknown as EventHandler));
    this.typeToHandlers.set(eventType, filtered);
  }

  async publish<TType extends keyof TEvents & string, TPayload extends TEvents[TType]>(
    event: DomainEvent<TType, TPayload>,
  ): Promise<void> {
    // Track history (bounded)
    if (this.historyCapacity > 0) {
      this.eventHistory.push(event as DomainEvent<keyof TEvents & string, unknown>);
      if (this.eventHistory.length > this.historyCapacity) {
        this.eventHistory.shift();
      }
    }
    const handlers = this.typeToHandlers.get(event.type) ?? [];
    const executions = handlers.map((h) => {
      try {
        return Promise.resolve(h(event)).catch((error) => {
          this.recordHandlerError(event.type as string, error);
        });
      } catch (error) {
        this.recordHandlerError(event.type as string, error);
        return Promise.resolve();
      }
    });
    await Promise.all(executions);
  }

  publishTyped<TType extends keyof TEvents & string>(
    type: TType,
    data: TEvents[TType],
  ): Promise<void> {
    const event: DomainEvent<TType, TEvents[TType]> = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      type,
      timestamp: new Date(),
      data,
    };
    return this.publish(event);
  }

  /** Returns a shallow copy of the recent event history (most recent last). */
  getHistory(): ReadonlyArray<DomainEvent<keyof TEvents & string, unknown>> {
    return [...this.eventHistory];
  }

  /** Clears the stored event history. */
  clearHistory(): void {
    this.eventHistory.length = 0;
  }

  /** Returns a shallow copy of the recent handler error entries (most recent last). */
  getErrorHistory(): ReadonlyArray<EventBusErrorEntry> {
    return [...this.errorHistory];
  }

  private recordHandlerError(eventType: string, error: unknown): void {
    // Log and store
    // Do not allow this method to throw
    try {
      // eslint-disable-next-line no-console
      console.error(`[EventBus] Handler error for ${eventType}:`, error);
      if (this.errorCapacity > 0) {
        this.errorHistory.push({ eventType, error, timestamp: new Date() });
        if (this.errorHistory.length > this.errorCapacity) {
          this.errorHistory.shift();
        }
      }
      if (this.onError) {
        try {
          this.onError({ error, eventType });
        } catch {
          // Never propagate onError failures
        }
      }
    } catch {
      // Swallow any unexpected issues to preserve isolation
    }
  }
}

/**
 * Enumerates known event names for the presentation domain.
 */
export const DomainEvents = {
  PRESENTATION_GENERATION_STARTED: 'PresentationGenerationStarted',
  PRESENTATION_GENERATION_COMPLETED: 'PresentationGenerationCompleted',
  PRESENTATION_GENERATION_FAILED: 'PresentationGenerationFailed',

  CONTENT_ANALYSIS_COMPLETED: 'ContentAnalysisCompleted',
  LAYOUT_DECISION_MADE: 'LayoutDecisionMade',
  STYLE_DECISION_MADE: 'StyleDecisionMade',

  SLIDE_GENERATED: 'SlideGenerated',
  IMAGE_GENERATION_STARTED: 'ImageGenerationStarted',
  IMAGE_GENERATION_COMPLETED: 'ImageGenerationCompleted',
  IMAGE_GENERATION_FAILED: 'ImageGenerationFailed',

  ADAPTER_INITIALIZATION_FAILED: 'AdapterInitializationFailed',
  CIRCUIT_BREAKER_OPENED: 'CircuitBreakerOpened',
  CIRCUIT_BREAKER_CLOSED: 'CircuitBreakerClosed',
} as const;

export type DomainEventNames = (typeof DomainEvents)[keyof typeof DomainEvents];
