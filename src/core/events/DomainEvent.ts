/**
 * DomainEvent represents an occurrence within the system along with its context.
 *
 * TType is a string literal type naming the event, for example "ContentAnalysisCompleted".
 * TData is the shape of the event payload associated with the given event type.
 */
export interface DomainEvent<TType extends string = string, TData = unknown> {
  id: string;
  type: TType;
  timestamp: Date;
  data: TData;
}

/**
 * Defines the mapping between event type names and their payload shapes.
 * Example: type PresentationEvents = { PresentationGenerationStarted: { inputPath: string } }
 */
export type EventTypeToPayloadMap = Record<string, unknown>;

export type EventHandler<E extends DomainEvent = DomainEvent> = (event: E) => void | Promise<void>;
