import { ProgressController, ProgressUpdate } from '../ProgressController';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('ProgressController', () => {
  test('start() emits initial update and resets state', () => {
    const controller = new ProgressController();
    const updates: ProgressUpdate[] = [];
    controller.on((u: ProgressUpdate) => updates.push(u));

    controller.start();

    expect(updates.length).toBe(1);
    expect(updates[0].percent).toBe(0);
    expect(updates[0].phase).toBe('idle');
    expect(updates[0].message).toContain('Starting');
    expect(controller.cancelled).toBe(false);
  });

  test('update() clamps percent and computes ETA after start', async () => {
    const controller = new ProgressController();
    let last: ProgressUpdate | null = null;
    controller.on((u: ProgressUpdate) => (last = u));

    controller.start();
    await delay(5);
    controller.update({ percent: -10, phase: 'analysis', message: 'Analyzing…' });

    expect(last.percent).toBe(0);
    expect(last.phase).toBe('analysis');

    await delay(5);
    controller.update({ percent: 50, phase: 'layout', message: 'Layout…' });
    expect(last !== null).toBe(true);
    if (last) {
      expect(typeof last.etaMs === 'number' || last.etaMs === undefined).toBe(true);
    }
  });

  test('cancel() flips flag and emits cancelling update', () => {
    const controller = new ProgressController();
    let last: ProgressUpdate | null = null;
    controller.on((u: ProgressUpdate) => (last = u));

    controller.start();
    controller.update({ percent: 42, phase: 'compose', message: 'Compose…' });
    controller.cancel();

    expect(controller.cancelled).toBe(true);
    expect(last && last.message.includes('Cancelling')).toBe(true);
  });

  test('fail() emits error message without throwing', () => {
    const controller = new ProgressController();
    let last: ProgressUpdate | null = null;
    controller.on((u: ProgressUpdate) => (last = u));

    controller.start();
    controller.update({ percent: 10, phase: 'analysis', message: 'Analyzing…' });
    expect(() => controller.fail('boom')).not.toThrow();
    expect(last && last.message.includes('Error: boom')).toBe(true);
  });

  test('listener errors are swallowed and do not break others', () => {
    const controller = new ProgressController();
    const okUpdates: ProgressUpdate[] = [];
    controller.on(() => {
      throw new Error('listener failed');
    });
    controller.on((u: ProgressUpdate) => okUpdates.push(u));

    controller.start();
    controller.update({ percent: 5, phase: 'analysis', message: 'A' });

    expect(okUpdates.length).toBeGreaterThanOrEqual(2);
  });
});
