import { LayoutEngine, createDefaultLayoutEngine } from '../../services/LayoutEngine';

describe('LayoutEngine default rules (3.2.2–3.2.7)', () => {
  const engine: LayoutEngine = createDefaultLayoutEngine();

  test('title detected', () => {
    expect(engine.decide('# My Talk').type).toBe('title');
  });

  test('comparison detected (vs, pros/cons)', () => {
    expect(engine.decide('A vs B: which one?').type).toBe('comparison');
    expect(engine.decide('Pros: speed\nCons: cost').type).toBe('comparison');
  });

  test('quote detected', () => {
    expect(engine.decide('> The only limit is your mind').type).toBe('quote');
    expect(engine.decide('“Inspire and be inspired.”').type).toBe('quote');
  });

  test('list detected with columns heuristic', () => {
    const shortList = engine.decide('- a\n- b\n- c');
    expect(shortList.type).toBe('list');
    expect(shortList.params.columns).toBe(1);

    const longList = engine.decide(Array.from({ length: 10 }, (_, i) => `- item ${i}`).join('\n'));
    expect(longList.type).toBe('list');
    expect(longList.params.columns).toBe(2);
  });

  test('image detected and URLs extracted', () => {
    const d1 = engine.decide('![alt](https://example.com/pic.png)');
    expect(d1.type).toBe('image');
    expect(d1.params.images?.length).toBeGreaterThanOrEqual(1);

    const d2 = engine.decide('diagram: https://cdn.com/plot.jpg');
    expect(d2.type).toBe('image');
  });
});
