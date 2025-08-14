import { createDefaultLayoutEngine } from '../../services/LayoutEngine';

describe('LayoutEngine performance (3.2.9–3.2.10)', () => {
  const engine = createDefaultLayoutEngine();

  test('batch layout selection under 50ms for 200 slides', () => {
    const inputs = Array.from({ length: 200 }, (_, i) =>
      i % 10 === 0
        ? `# Title ${i}`
        : i % 10 === 1
        ? `A vs B ${i}`
        : i % 10 === 2
        ? `![alt](https://example.com/${i}.png)`
        : i % 10 === 3
        ? `> Quote line ${i}`
        : `- item 1\n- item 2\n- item 3\npara ${i}`,
    );
    const start = performance.now();
    const decisions = engine.decideBatch(inputs);
    const elapsed = performance.now() - start;
    expect(decisions.length).toBe(200);
    expect(elapsed).toBeLessThan(50);
  });
});
