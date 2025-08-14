import { EventBus, DomainEvents } from '../../events/EventBus';
import type { DomainEvent } from '../../events/DomainEvent';

type TestEvents = {
  Foo: { value: number };
  Bar: { text: string };
};

describe('EventBus', () => {
  test('subscribes and publishes typed events', async () => {
    const bus = new EventBus<TestEvents>({ historyCapacity: 10 });
    const seen: Array<DomainEvent<'Foo', { value: number }>> = [];

    bus.subscribe('Foo', (e) => {
      seen.push(e);
    });

    await bus.publishTyped('Foo', { value: 42 });

    expect(seen).toHaveLength(1);
    expect(seen[0].type).toBe('Foo');
    expect(seen[0].data.value).toBe(42);
    expect(bus.getHistory()).toHaveLength(1);
  });

  test('error isolation: one failing handler does not block others', async () => {
    const bus = new EventBus<TestEvents>();
    const calls: string[] = [];

    bus.subscribe('Bar', () => {
      calls.push('ok');
    });
    bus.subscribe('Bar', () => {
      calls.push('will-throw');
      throw new Error('boom');
    });
    bus.subscribe('Bar', () => {
      calls.push('ok-2');
    });

    await bus.publish({ id: '1', type: 'Bar', timestamp: new Date(), data: { text: 'x' } });

    expect(calls).toContain('ok');
    expect(calls).toContain('ok-2');
  });

  test('unsubscribe removes handler', async () => {
    const bus = new EventBus<TestEvents>();
    const calls: string[] = [];

    const handler = () => calls.push('hit');
    bus.subscribe('Foo', handler);
    bus.unsubscribe('Foo', handler);

    await bus.publishTyped('Foo', { value: 1 });
    expect(calls).toHaveLength(0);
  });

  test('history capacity bounds stored events', async () => {
    const bus = new EventBus<TestEvents>({ historyCapacity: 2 });
    await bus.publishTyped('Foo', { value: 1 });
    await bus.publishTyped('Foo', { value: 2 });
    await bus.publishTyped('Foo', { value: 3 });
    const hist = bus.getHistory();
    expect(hist).toHaveLength(2);
    expect((hist[0] as any).data.value).toBe(2);
    expect((hist[1] as any).data.value).toBe(3);
  });

  test('async handler rejection is isolated and recorded in error history', async () => {
    const onErrors: Array<{ error: unknown; eventType: string }> = [];
    const bus = new EventBus<TestEvents>({ errorCapacity: 5, onError: (e) => onErrors.push(e) });

    const calls: string[] = [];
    bus.subscribe('Bar', async () => {
      calls.push('ok-async-1');
    });
    bus.subscribe('Bar', async () => {
      calls.push('will-reject');
      return Promise.reject(new Error('async-boom'));
    });
    bus.subscribe('Bar', async () => {
      calls.push('ok-async-2');
    });

    await bus.publishTyped('Bar', { text: 'hello' });

    expect(calls).toEqual(expect.arrayContaining(['ok-async-1', 'will-reject', 'ok-async-2']));
    const errHist = bus.getErrorHistory();
    expect(errHist.length).toBeGreaterThanOrEqual(1);
    expect(errHist[errHist.length - 1].eventType).toBe('Bar');
    expect(onErrors.length).toBeGreaterThanOrEqual(1);
    expect(onErrors[0].eventType).toBe('Bar');
  });

  test('invokes onError callback for sync throw and async rejection', async () => {
    const errors: Array<{ error: unknown; eventType: string }> = [];
    const bus = new EventBus<TestEvents>({ onError: (e) => errors.push(e) });

    bus.subscribe('Foo', () => {
      throw new Error('sync-error');
    });
    bus.subscribe('Foo', async () => {
      return Promise.reject(new Error('async-error'));
    });

    await bus.publish({ id: 'x', type: 'Foo', timestamp: new Date(), data: { value: 0 } });

    expect(errors.length).toBeGreaterThanOrEqual(2);
    expect(errors.every((e) => e.eventType === 'Foo')).toBe(true);
  });

  test('error history capacity bounds stored error entries', async () => {
    const bus = new EventBus<TestEvents>({ errorCapacity: 1 });

    bus.subscribe('Bar', () => {
      throw new Error('first');
    });
    await bus.publish({ id: '1', type: 'Bar', timestamp: new Date(), data: { text: 'a' } });

    bus.subscribe('Bar', async () => {
      return Promise.reject(new Error('second'));
    });
    await bus.publish({ id: '2', type: 'Bar', timestamp: new Date(), data: { text: 'b' } });

    const errHist = bus.getErrorHistory();
    expect(errHist).toHaveLength(1);
    expect(errHist[0].eventType).toBe('Bar');
  });

  test('clearHistory removes all stored events', async () => {
    const bus = new EventBus<TestEvents>({ historyCapacity: 10 });
    await bus.publishTyped('Foo', { value: 1 });
    await bus.publishTyped('Foo', { value: 2 });
    expect(bus.getHistory().length).toBe(2);
    bus.clearHistory();
    expect(bus.getHistory().length).toBe(0);
  });

  test('publish waits for async handlers to complete', async () => {
    const bus = new EventBus<TestEvents>();
    let completed = false;
    bus.subscribe('Foo', async () => {
      await new Promise((r) => setTimeout(r, 5));
      completed = true;
    });
    await bus.publishTyped('Foo', { value: 7 });
    expect(completed).toBe(true);
  });

  test('getHistory returns a shallow copy, not a live reference', async () => {
    const bus = new EventBus<TestEvents>({ historyCapacity: 5 });
    await bus.publishTyped('Foo', { value: 10 });
    const hist = bus.getHistory();
    const lengthBefore = hist.length;
    (hist as any).push({ bogus: true });
    expect(bus.getHistory().length).toBe(lengthBefore);
  });
});
