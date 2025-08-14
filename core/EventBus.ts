export interface DomainEvent {
    id: string;
    type: string;
    timestamp: Date;
    data: any;
}

export type EventHandler = (event: DomainEvent) => Promise<void> | void;

export class EventBus {
    private handlers: Map<string, EventHandler[]> = new Map();
    
    subscribe(eventType: string, handler: EventHandler): void {
        const existingHandlers = this.handlers.get(eventType) || [];
        existingHandlers.push(handler);
        this.handlers.set(eventType, existingHandlers);
    }
    
    unsubscribe(eventType: string, handler: EventHandler): void {
        const handlers = this.handlers.get(eventType) || [];
        const filteredHandlers = handlers.filter(h => h !== handler);
        this.handlers.set(eventType, filteredHandlers);
    }
    
    async publish(event: DomainEvent): Promise<void> {
        const handlers = this.handlers.get(event.type) || [];
        
        // Execute handlers in parallel
        const promises = handlers.map(handler => {
            try {
                return Promise.resolve(handler(event));
            } catch (error) {
                console.error(`[EventBus] Handler failed for ${event.type}:`, error);
                return Promise.resolve();
            }
        });
        
        await Promise.all(promises);
    }
    
    // Utility method for typed events
    publishTyped<T>(eventType: string, data: T): Promise<void> {
        return this.publish({
            id: crypto.randomUUID(),
            type: eventType,
            timestamp: new Date(),
            data
        });
    }
}

// Domain Event Types
export const DomainEvents = {
    // Presentation lifecycle
    PRESENTATION_GENERATION_STARTED: 'PresentationGenerationStarted',
    PRESENTATION_GENERATION_COMPLETED: 'PresentationGenerationCompleted',
    PRESENTATION_GENERATION_FAILED: 'PresentationGenerationFailed',
    
    // Analysis events
    CONTENT_ANALYSIS_COMPLETED: 'ContentAnalysisCompleted',
    LAYOUT_DECISION_MADE: 'LayoutDecisionMade',
    STYLE_DECISION_MADE: 'StyleDecisionMade',
    
    // Generation events
    SLIDE_GENERATED: 'SlideGenerated',
    IMAGE_GENERATION_STARTED: 'ImageGenerationStarted',
    IMAGE_GENERATION_COMPLETED: 'ImageGenerationCompleted',
    IMAGE_GENERATION_FAILED: 'ImageGenerationFailed',
    
    // System events
    ADAPTER_INITIALIZATION_FAILED: 'AdapterInitializationFailed',
    CIRCUIT_BREAKER_OPENED: 'CircuitBreakerOpened',
    CIRCUIT_BREAKER_CLOSED: 'CircuitBreakerClosed'
} as const;