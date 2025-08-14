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
});
