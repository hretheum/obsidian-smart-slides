import { AnalyzerService, ContentAnalysis } from './AnalyzerService';
import { createDefaultLayoutEngine, LayoutDecision, LayoutEngine } from './LayoutEngine';
import { StyleService, ThemeDecision } from './StyleService';
import { Result, ok, err } from '../types/Result';
import { SlideComposer } from './SlideComposer';

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
  metrics: OrchestratorMetrics;
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
  logger?: {
    info(msg: string, ctx?: Record<string, unknown>): void;
    warn?(msg: string, ctx?: Record<string, unknown>): void;
    error?(msg: string, ctx?: Record<string, unknown>): void;
  };
}

export class PresentationOrchestrator {
  private readonly analyzer: AnalyzerService;
  private readonly layout: LayoutEngine;
  private readonly style: StyleService;
  private readonly emit?: (p: OrchestratorProgress) => void;
  private readonly now: () => number;
  private readonly logger?: {
    info(msg: string, ctx?: Record<string, unknown>): void;
    warn?(msg: string, ctx?: Record<string, unknown>): void;
    error?(msg: string, ctx?: Record<string, unknown>): void;
  };
  private readonly analysisCache = new Map<string, ContentAnalysis>();
  private readonly layoutsCache = new Map<string, LayoutDecision[]>();
  // reserved for future external cancel API usage

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
      const hash = hashString(input.rawMarkdown);
      let analysis = this.analysisCache.get(hash);
      if (!analysis) {
        try {
          analysis = this.analyzer.analyze(input.rawMarkdown);
          this.analysisCache.set(hash, analysis);
        } catch (e) {
          this.logger?.warn?.('analyze failed, using fallback', { error: String(e) });
          analysis = fallbackAnalysis(input.rawMarkdown);
        }
      }
      endStep('analyze', t);
      this.logger?.info('analyze completed', { ms: metrics.steps['analyze'] });
      this.checkAbort(input.abortSignal);

      report('layouting', 30, 'Selecting layouts');
      t = startStep();
      const paragraphs = splitIntoParagraphs(input.rawMarkdown);
      let layoutDecisions = this.layoutsCache.get(hash);
      if (!layoutDecisions) {
        const perParagraph: LayoutDecision[] = [];
        for (let i = 0; i < paragraphs.length; i += 1) {
          this.checkAbort(input.abortSignal);
          const p = paragraphs[i];
          try {
            perParagraph.push(this.layout.decide(p));
          } catch (e) {
            this.logger?.warn?.('layout decide failed, using default', {
              index: i,
              error: String(e),
            });
            perParagraph.push({
              type: 'default',
              params: { columns: 1, variant: 'center' },
              rationale: 'fallback-default',
              score: 0,
            });
          }
        }
        layoutDecisions = this.layout.optimizeFlow(perParagraph);
        this.layoutsCache.set(hash, layoutDecisions);
      }
      endStep('layout', t);
      this.logger?.info('layout completed', {
        ms: metrics.steps['layout'],
        count: layoutDecisions.length,
      });
      this.checkAbort(input.abortSignal);

      report('styling', 55, 'Choosing theme');
      t = startStep();
      let theme: ThemeDecision;
      try {
        theme = this.style.decideFromAnalysis({
          audience: analysis.audience,
          domain: analysis.domain,
          tone: analysis.tone,
        });
      } catch (e) {
        this.logger?.warn?.('style decide failed, using fallback theme', { error: String(e) });
        theme = {
          name: 'General Neutral',
          colors: {
            primary: '#4C7CF3',
            secondary: '#A3B1DA',
            background: '#FFFFFF',
            text: '#1A1A1A',
          },
          fonts: { heading: 'Inter', body: 'Inter' },
          rationale: 'fallback',
          modifiers: { spacing: 'comfortable', emphasis: 'low', animations: 'none' },
        };
      }
      endStep('style', t);
      this.logger?.info('style completed', { ms: metrics.steps['style'], theme: theme.name });
      this.checkAbort(input.abortSignal);

      // 5.2: Compose slides using SlideComposer (basic)
      report('composing', 80, 'Preparing slides');
      t = startStep();
      const composer = new SlideComposer({ maxLinesPerSlide: 20 });
      const composed = composer.composeSlides(paragraphs, layoutDecisions, theme);
      if (!composed.ok) {
        throw composed.error;
      }
      const slides = composed.value;
      endStep('compose', t);
      this.logger?.info('compose completed', {
        ms: metrics.steps['compose'],
        slides: slides.length,
      });

      report('done', 100, 'Completed');
      metrics.finishedAt = this.now();
      metrics.durationMs = metrics.finishedAt - metrics.startedAt;

      return ok({ analysis, layoutDecisions, theme, slides, metrics });
    } catch (e) {
      this.logger?.error?.('orchestrator failed', { error: String(e) });
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

function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash.toString(16);
}

function fallbackAnalysis(text: string): ContentAnalysis {
  return {
    audience: 'general',
    formalityScore: 5,
    domain: 'general',
    purpose: 'inform',
    complexity: 'beginner',
    suggestedSlideCount: Math.max(3, Math.min(40, Math.round(text.split(/\s+/).length / 120))),
    keyTopics: [],
    tone: 'formal',
  };
}
