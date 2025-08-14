/*
  Core module public API re-exports.
  Keep this file limited to explicit exports to maintain clean boundaries.
*/

// Export core domain types, services, and utilities here as they are implemented.
export type { DomainEvent, EventHandler } from './events/DomainEvent';
export { EventBus, DomainEvents, type DomainEventNames } from './events/EventBus';
