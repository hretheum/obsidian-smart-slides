export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
    failureThreshold: number;
    resetTimeout: number; // milliseconds
    monitoringPeriod: number; // milliseconds
}

export interface CircuitBreakerStats {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureTime?: Date;
    nextAttemptTime?: Date;
}

export class CircuitBreaker {
    private state: CircuitState = 'CLOSED';
    private failureCount = 0;
    private successCount = 0;
    private lastFailureTime?: Date;
    private nextAttemptTime?: Date;
    
    constructor(private config: CircuitBreakerConfig = {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        monitoringPeriod: 10000 // 10 seconds
    }) {}
    
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.state === 'OPEN') {
            if (this.shouldAttemptReset()) {
                this.state = 'HALF_OPEN';
                console.log('[CircuitBreaker] Transitioning to HALF_OPEN');
            } else {
                throw new Error('Circuit breaker is OPEN - operation blocked');
            }
        }
        
        try {
            const result = await operation();
            this.onSuccess();
            return result;
            
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    private shouldAttemptReset(): boolean {
        if (!this.nextAttemptTime) return false;
        return Date.now() >= this.nextAttemptTime.getTime();
    }
    
    private onSuccess(): void {
        this.successCount++;
        
        if (this.state === 'HALF_OPEN') {
            // Reset after success in half-open state
            this.reset();
            console.log('[CircuitBreaker] Reset to CLOSED after success');
        }
    }
    
    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = new Date();
        
        if (this.state === 'HALF_OPEN') {
            // Go back to open immediately on failure in half-open
            this.trip();
        } else if (this.failureCount >= this.config.failureThreshold) {
            // Trip the circuit if threshold exceeded
            this.trip();
        }
    }
    
    private trip(): void {
        this.state = 'OPEN';
        this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeout);
        console.log(`[CircuitBreaker] TRIPPED - next attempt at ${this.nextAttemptTime.toISOString()}`);
    }
    
    private reset(): void {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = undefined;
        this.nextAttemptTime = undefined;
    }
    
    getStats(): CircuitBreakerStats {
        return {
            state: this.state,
            failures: this.failureCount,
            successes: this.successCount,
            lastFailureTime: this.lastFailureTime,
            nextAttemptTime: this.nextAttemptTime
        };
    }
    
    // Manual controls for emergency situations
    forceOpen(): void {
        this.state = 'OPEN';
        this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeout);
        console.log('[CircuitBreaker] Manually forced OPEN');
    }
    
    forceClose(): void {
        this.reset();
        console.log('[CircuitBreaker] Manually forced CLOSED');
    }
}