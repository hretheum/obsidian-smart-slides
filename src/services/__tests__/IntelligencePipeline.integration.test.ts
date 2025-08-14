import { AnalyzerService } from '../../services/AnalyzerService';
import { createDefaultLayoutEngine } from '../../services/LayoutEngine';
import { StyleService, getContrastRatio } from '../../services/StyleService';

describe('EPIC 3 integration pipeline (3.0)', () => {
  const analyzer = new AnalyzerService();
  const layout = createDefaultLayoutEngine();
  const style = new StyleService();

  test('analyze -> layout -> style end-to-end under 100ms', () => {
    const content = `# Building Reliable Systems\n\nPros: resilience\nCons: latency\n\nWe will therefore outline the architecture and API.`;
    const start = performance.now();

    const analysis = analyzer.analyze(content);
    const decisions = layout.decideBatch([content, '- item 1\n- item 2\n- item 3']);
    const theme = style.decideFromAnalysis({
      domain: analysis.domain,
      audience: analysis.audience,
      tone: analysis.tone,
    });

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
    expect(decisions.length).toBe(2);
    expect(['title', 'comparison', 'quote', 'list', 'image', 'default']).toContain(
      decisions[0].type,
    );
    expect(getContrastRatio(theme.colors.text, theme.colors.background)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
