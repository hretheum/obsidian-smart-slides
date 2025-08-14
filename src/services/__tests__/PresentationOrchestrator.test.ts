import { PresentationOrchestrator } from '../PresentationOrchestrator';
import { AnalyzerService } from '../AnalyzerService';
import { LayoutEngine, createDefaultLayoutEngine } from '../LayoutEngine';
import { StyleService } from '../StyleService';

describe('PresentationOrchestrator - 5.1', () => {
  const text = `# Title\n\nThis is an intro paragraph.\n\n- item one\n- item two\n- item three\n\nConclusion section.`;

  test('pipeline: analyze → layout → style → compose (placeholder)', async () => {
    const events: Array<{ phase: string; percent: number }> = [];
    const orch = new PresentationOrchestrator({
      onProgress: (p) => events.push({ phase: p.phase, percent: p.percent }),
      now: () => 1000 + events.length * 5,
    });
    const result = await orch.generate({ rawMarkdown: text });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.analysis.suggestedSlideCount).toBeGreaterThan(0);
    expect(result.value.layoutDecisions.length).toBeGreaterThan(0);
    expect(result.value.theme.name.length).toBeGreaterThan(0);
    expect(result.value.slides.length).toBeGreaterThan(0);

    // progress events roughly monotonic
    const percents = events.map((e) => e.percent);
    expect(Math.min(...percents)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...percents)).toBe(100);
  });

  test('abort signal stops early', async () => {
    const controller = new AbortController();
    controller.abort();
    const orch = new PresentationOrchestrator();
    const result = await orch.generate({ rawMarkdown: text, abortSignal: controller.signal });
    expect(result.ok).toBe(false);
  });

  test('uses injected services when provided', async () => {
    class FastAnalyzer extends AnalyzerService {
      analyze(t: string): any {
        const base = super.analyze(t);
        return { ...base, suggestedSlideCount: 3 };
      }
    }
    const customLayout = createDefaultLayoutEngine();
    const customStyle = new StyleService();
    const orch = new PresentationOrchestrator({
      analyzer: new FastAnalyzer(),
      layoutEngine: customLayout,
      style: customStyle,
    });
    const res = await orch.generate({ rawMarkdown: text });
    expect(res.ok).toBe(true);
  });
});
