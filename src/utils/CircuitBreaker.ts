export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private failures = 0;
  private state: CircuitBreakerState = 'CLOSED';
  private lastOpenedAt = 0;

  constructor(private readonly failureThreshold = 3, private readonly halfOpenAfterMs = 5000) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastOpenedAt < this.halfOpenAfterMs) {
        throw new Error('Circuit is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.failures = 0;
      this.state = 'CLOSED';
      return result;
    } catch (e) {
      this.failures += 1;
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        this.lastOpenedAt = Date.now();
      }
      throw e;
    }
  }
}
