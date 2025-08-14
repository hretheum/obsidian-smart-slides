import { CircuitBreaker } from '../../utils/CircuitBreaker';

describe('CircuitBreaker', () => {
  test('CLOSED -> OPEN after threshold failures, then HALF_OPEN after timeout, then CLOSED on success', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, halfOpenAfterMs: 50 });

    const failing = jest.fn(async () => {
      throw new Error('fail');
    });
    const success = jest.fn(async () => 'ok');

    // two failures should open the circuit
    await expect(cb.execute(failing)).rejects.toThrow('fail');
    await expect(cb.execute(failing)).rejects.toThrow('fail');
    expect(cb.getState()).toBe('OPEN');

    // still within open window
    await expect(cb.execute(success)).rejects.toThrow('Circuit is OPEN');

    // advance time to allow HALF_OPEN
    await new Promise((r) => setTimeout(r, 60));

    // probe succeeds -> CLOSED
    await expect(cb.execute(success)).resolves.toBe('ok');
    expect(cb.getState()).toBe('CLOSED');
  });

  test('HALF_OPEN fails -> back to OPEN', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, halfOpenAfterMs: 10 });

    const failing = jest.fn(async () => {
      throw new Error('boom');
    });

    // one failure opens due to threshold 1
    await expect(cb.execute(failing)).rejects.toThrow('boom');
    expect(cb.getState()).toBe('OPEN');

    // wait to probe
    await new Promise((r) => setTimeout(r, 15));

    // probe fails -> OPEN again
    await expect(cb.execute(failing)).rejects.toThrow('boom');
    expect(cb.getState()).toBe('OPEN');
  });

  test('metrics and onStateChange callback are updated', async () => {
    const transitions: Array<[string, string]> = [];
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      halfOpenAfterMs: 5,
      onStateChange: (prev, next) => transitions.push([prev, next]),
    });

    // failure opens
    await expect(cb.execute(async () => {
      throw new Error('x');
    })).rejects.toThrow('x');

    const m1 = cb.getMetrics();
    expect(m1.state).toBe('OPEN');
    expect(m1.failureCount).toBe(1);
    expect(m1.openedCount).toBe(1);
    expect(transitions.some(([p, n]) => p === 'CLOSED' && n === 'OPEN')).toBe(true);

    // wait and succeed to close
    await new Promise((r) => setTimeout(r, 6));
    await expect(cb.execute(async () => 'ok')).resolves.toBe('ok');
    const m2 = cb.getMetrics();
    expect(m2.state).toBe('CLOSED');
    expect(m2.successCount).toBeGreaterThanOrEqual(1);
    expect(transitions.some(([p, n]) => p === 'OPEN' && n === 'HALF_OPEN')).toBe(true);
    expect(transitions.some(([p, n]) => p === 'HALF_OPEN' && n === 'CLOSED')).toBe(true);
  });
});
