export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  halfOpenAfterMs?: number;
  onStateChange?: (previous: CircuitBreakerState, next: CircuitBreakerState) => void;
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureThreshold: number;
  halfOpenAfterMs: number;
  consecutiveFailures: number;
  successCount: number;
  failureCount: number;
  openedCount: number;
  lastOpenedAt?: number;
  lastFailureAt?: number;
  lastSuccessAt?: number;
  lastStateChangeAt?: number;
}

/**
 * Simple, dependency-free Circuit Breaker implementation.
 *
 * - CLOSED: all calls pass through; consecutive failures increment until threshold
 * - OPEN: calls are rejected until the open timeout elapses
 * - HALF_OPEN: allows a probe call; success closes the circuit, failure opens it again
 */
export class CircuitBreaker {
  private consecutiveFailures = 0;
  private state: CircuitBreakerState = 'CLOSED';
  private lastOpenedAt = 0;
  private lastFailureAt?: number;
  private lastSuccessAt?: number;
  private lastStateChangeAt?: number;
  private successCount = 0;
  private failureCount = 0;
  private openedCount = 0;

  private readonly failureThreshold: number;
  private readonly halfOpenAfterMs: number;
  private readonly onStateChange?: (previous: CircuitBreakerState, next: CircuitBreakerState) => void;

  /**
   * Create a CircuitBreaker.
   * Accepts either legacy numeric params or an options object.
   */
  constructor(failureThreshold?: number, halfOpenAfterMs?: number);
  constructor(options?: CircuitBreakerOptions);
  constructor(
    arg1?: number | CircuitBreakerOptions,
    arg2?: number
  ) {
    if (typeof arg1 === 'object') {
      const opts = arg1 as CircuitBreakerOptions;
      this.failureThreshold = opts.failureThreshold ?? 3;
      this.halfOpenAfterMs = opts.halfOpenAfterMs ?? 5000;
      this.onStateChange = opts.onStateChange;
    } else {
      this.failureThreshold = (arg1 as number | undefined) ?? 3;
      this.halfOpenAfterMs = arg2 ?? 5000;
    }
  }

  /** Execute a function under circuit control. */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastOpenedAt < this.halfOpenAfterMs) {
        throw new Error('Circuit is OPEN');
      }
      this.transitionTo('HALF_OPEN');
    }

    try {
      const result = await fn();
      this.successCount += 1;
      this.lastSuccessAt = Date.now();
      this.consecutiveFailures = 0;
      this.transitionTo('CLOSED');
      return result;
    } catch (error) {
      this.failureCount += 1;
      this.lastFailureAt = Date.now();
      this.consecutiveFailures += 1;
      if (this.consecutiveFailures >= this.failureThreshold) {
        this.open();
      }
      throw error;
    }
  }

  /** Returns current state. */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /** Returns current metrics snapshot. */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureThreshold: this.failureThreshold,
      halfOpenAfterMs: this.halfOpenAfterMs,
      consecutiveFailures: this.consecutiveFailures,
      successCount: this.successCount,
      failureCount: this.failureCount,
      openedCount: this.openedCount,
      lastOpenedAt: this.lastOpenedAt || undefined,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      lastStateChangeAt: this.lastStateChangeAt,
    };
  }

  /** Manually open the circuit. */
  open(): void {
    this.consecutiveFailures = 0;
    this.lastOpenedAt = Date.now();
    this.openedCount += 1;
    this.transitionTo('OPEN');
  }

  /** Manually close the circuit and reset failures. */
  close(): void {
    this.consecutiveFailures = 0;
    this.transitionTo('CLOSED');
  }

  private transitionTo(next: CircuitBreakerState): void {
    if (this.state === next) {
      return;
    }
    const previous = this.state;
    this.state = next;
    this.lastStateChangeAt = Date.now();
    if (this.onStateChange) {
      try {
        this.onStateChange(previous, next);
      } catch {
        // ignore user callback errors
      }
    }
  }
}
