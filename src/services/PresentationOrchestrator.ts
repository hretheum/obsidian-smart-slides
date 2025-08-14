import { AnalyzerService, ContentAnalysis } from './AnalyzerService';
import { createDefaultLayoutEngine, LayoutDecision, LayoutEngine } from './LayoutEngine';
import { StyleService, ThemeDecision } from './StyleService';
import { Result, ok, err } from '../types/Result';

export interface OrchestratorInput {
  rawMarkdown: string;
  abortSignal?: AbortSignal;
}

export interface OrchestratorProgress {
  phase: 'idle' | 'analyzing' | 'layouting' | 'styling' | 'composing' | 'done' | 'error';
  percent: number; // 0-100
  details?: string;
}

export interface OrchestratorOutput {
  analysis: ContentAnalysis;
  layoutDecisions: LayoutDecision[];
  theme: ThemeDecision;
  slides: string[]; // markdown per slide (placeholder for 5.2)
}

export interface OrchestratorMetrics {
  startedAt: number;
  finishedAt?: number;
  durationMs?: number;
  steps: Record<string, number>; // step name -> ms
}

export interface OrchestratorOptions {
  layoutEngine?: LayoutEngine;
  analyzer?: AnalyzerService;
  style?: StyleService;
  onProgress?: (p: OrchestratorProgress) => void;
  now?: () => number;
  logger?: { info(msg: string, ctx?: Record<string, unknown>): void };
}

export class PresentationOrchestrator {
  private readonly analyzer: AnalyzerService;
  private readonly layout: LayoutEngine;
  private readonly style: StyleService;
  private readonly emit?: (p: OrchestratorProgress) => void;
  private readonly now: () => number;
  private readonly logger?: { info(msg: string, ctx?: Record<string, unknown>): void };

  constructor(options: OrchestratorOptions = {}) {
    this.analyzer = options.analyzer ?? new AnalyzerService();
    this.layout = options.layoutEngine ?? createDefaultLayoutEngine();
    this.style = options.style ?? new StyleService();
    this.emit = options.onProgress;
    this.now = options.now ?? (() => Date.now());
    this.logger = options.logger;
  }

  async generate(input: OrchestratorInput): Promise<Result<OrchestratorOutput, Error>> {
    const metrics: OrchestratorMetrics = { startedAt: this.now(), steps: {} };
    const startStep = () => this.now();
    const endStep = (stepName: string, s: number) => (metrics.steps[stepName] = this.now() - s);

    const report = (phase: OrchestratorProgress['phase'], percent: number, details?: string) => {
      this.emit?.({ phase, percent, details });
    };

    if (input.abortSignal?.aborted) {
      report('error', 0, 'Aborted before start');
      return err(new Error('aborted'));
    }

    try {
      report('analyzing', 5, 'Analyzing content');
      let t = startStep();
      const analysis = this.analyzer.analyze(input.rawMarkdown);
      endStep('analyze', t);
      this.logger?.info('analyze completed', { ms: metrics.steps['analyze'] });
      this.checkAbort(input.abortSignal);

      report('layouting', 30, 'Selecting layouts');
      t = startStep();
      const paragraphs = splitIntoParagraphs(input.rawMarkdown);
      const layoutDecisions = this.layout.optimizeFlow(this.layout.decideBatch(paragraphs));
      endStep('layout', t);
      this.logger?.info('layout completed', {
        ms: metrics.steps['layout'],
        count: layoutDecisions.length,
      });
      this.checkAbort(input.abortSignal);

      report('styling', 55, 'Choosing theme');
      t = startStep();
      const theme = this.style.decideFromAnalysis({
        audience: analysis.audience,
        domain: analysis.domain,
        tone: analysis.tone,
      });
      endStep('style', t);
      this.logger?.info('style completed', { ms: metrics.steps['style'], theme: theme.name });
      this.checkAbort(input.abortSignal);

      // 5.1.1–5.1.2 pipeline stops here; composing is placeholder until 5.2
      report('composing', 80, 'Preparing slides');
      t = startStep();
      const slides = composePlaceholderSlides(paragraphs);
      endStep('compose', t);
      this.logger?.info('compose completed', {
        ms: metrics.steps['compose'],
        slides: slides.length,
      });

      report('done', 100, 'Completed');
      metrics.finishedAt = this.now();
      metrics.durationMs = metrics.finishedAt - metrics.startedAt;

      return ok({ analysis, layoutDecisions, theme, slides });
    } catch (e) {
      report('error', 100, (e as Error).message);
      return err(e as Error);
    }
  }

  private checkAbort(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new Error('aborted');
    }
  }
}

function splitIntoParagraphs(md: string): string[] {
  return md
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function composePlaceholderSlides(paragraphs: string[]): string[] {
  // One-paragraph-per-slide placeholder; proper composing will be implemented in 5.2
  return paragraphs.slice(0, 20).map((p) => p);
}
