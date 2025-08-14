import { LayoutEngine, LayoutRule, optimizeVisualFlow } from '../../services/LayoutEngine';

describe('LayoutEngine - 3.2.1', () => {
  const titleRule: LayoutRule = {
    id: 'title-rule',
    priority: 100,
    matches: (text) => /^\s*#\s+/.test(text) || /\btitle\b/i.test(text),
    decide: (text) => ({
      type: 'title',
      params: { variant: 'center' },
      rationale: 'title detected',
    }),
  };

  test('returns default decision when no rule matches', () => {
    const engine = new LayoutEngine([]);
    const d = engine.decide('plain paragraph without hints');
    expect(d.type).toBe('default');
    expect(d.params).toBeDefined();
    expect(typeof d.rationale).toBe('string');
    expect(typeof d.score).toBe('number');
  });

  test('applies highest priority matching rule', () => {
    const low: LayoutRule = {
      id: 'low',
      priority: 1,
      matches: () => true,
      decide: () => ({ type: 'list', params: {} }),
    };
    const high: LayoutRule = titleRule;
    const engine = new LayoutEngine([low, high]);
    const d = engine.decide('# My Deck');
    expect(d.type).toBe('title');
    expect(d.rationale).toContain('title');
  });

  test('decideBatch maps inputs deterministically', () => {
    const engine = new LayoutEngine([titleRule]);
    const ds = engine.decideBatch(['Hello', '# Heading']);
    expect(ds).toHaveLength(2);
    expect(ds[0].type).toBe('default');
    expect(ds[1].type).toBe('title');
  });

  test('optimizeFlow alternates left/right for non-centered slides', () => {
    const engine = new LayoutEngine([titleRule]);
    const decs = [
      { type: 'list', params: { variant: 'left' }, rationale: 'a', score: 1 },
      { type: 'list', params: { variant: 'left' }, rationale: 'b', score: 1 },
      { type: 'title', params: { variant: 'center' }, rationale: 'c', score: 1 },
      { type: 'list', params: { variant: 'left' }, rationale: 'd', score: 1 },
    ] as const;
    const out = optimizeVisualFlow(decs as any);
    expect(out[0].params.variant).toBe('left');
    expect(out[1].params.variant).toBe('right');
    expect(out[2].params.variant).toBe('center');
  });
});
