import { Result, ok, err } from '../types/Result';

export interface SlideQualityIssue {
  slideIndex: number;
  code: string; // e.g. 'too_long', 'empty', 'duplicate', 'a11y:image_alt_missing'
  message: string;
  severity: 'info' | 'warn' | 'error';
}

export interface QualityMetrics {
  totalSlides: number;
  avgLinesPerSlide: number;
  duplicateSlideRatio: number; // 0..1
  readability: {
    avgFleschKincaid: number;
  };
  languages: Record<string, number>; // counts
  accessibility: {
    imagesWithoutAlt: number;
    headingsMissing: number;
  };
  issuesCount: number;
}

export interface QualityReport {
  issues: SlideQualityIssue[];
  metrics: QualityMetrics;
  suggestions: string[];
}

export interface OptimizeOptions {
  maxLinesPerSlide?: number; // default 20
  minLinesPerSlide?: number; // default 3
}

export interface QAOptions extends OptimizeOptions {
  languageHints?: string[]; // e.g. ['pl','en']
}

export interface QAResult {
  slides: string[];
  report: QualityReport;
}

export class QualityAssuranceService {
  private readonly maxLines: number;
  private readonly minLines: number;

  constructor(options: OptimizeOptions = {}) {
    this.maxLines = options.maxLinesPerSlide ?? 20;
    this.minLines = options.minLinesPerSlide ?? 3;
  }

  analyze(slides: string[], options: QAOptions = {}): Result<QAResult, Error> {
    try {
      const normalized = slides.map((s) => this.normalizeText(s));
      const { issues } = this.validateSlides(normalized, options);
      const optimized = this.optimizeSlideCount(normalized);
      const deduped = this.removeDuplicates(optimized.slides, issues);
      const metrics = this.computeMetrics(deduped, issues, options);
      const suggestions = this.buildSuggestions(metrics, issues);
      return ok({
        slides: deduped,
        report: {
          issues,
          metrics,
          suggestions,
        },
      });
    } catch (e) {
      return err(e as Error);
    }
  }

  // 5.4.1 Validation
  private validateSlides(
    slides: string[],
    _options: QAOptions,
  ): { issues: SlideQualityIssue[]; metricsBase: Partial<QualityMetrics> } {
    const issues: SlideQualityIssue[] = [];
    slides.forEach((s, i) => {
      const lines = this.splitLines(s).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        issues.push({
          slideIndex: i,
          code: 'empty',
          message: 'Slide has no content',
          severity: 'warn',
        });
      }
      if (lines.length > this.maxLines) {
        issues.push({
          slideIndex: i,
          code: 'too_long',
          message: `Slide exceeds ${this.maxLines} lines`,
          severity: 'warn',
        });
      }
      // basic markdown validation: unbalanced backticks
      const backticks = (s.match(/`/g) || []).length;
      if (backticks % 2 !== 0) {
        issues.push({
          slideIndex: i,
          code: 'md_unbalanced_backticks',
          message: 'Unbalanced inline code backticks',
          severity: 'info',
        });
      }
      // A11y (images without alt)
      const mdImages = s.match(/!\[[^\]]*\]\([^\)]+\)/g) || [];
      for (const img of mdImages) {
        if (/!\[\s*\]/.test(img)) {
          issues.push({
            slideIndex: i,
            code: 'a11y:image_alt_missing',
            message: 'Image without alt text',
            severity: 'warn',
          });
        }
      }
      // Heading presence for non-trivial slides
      if (lines.length >= 5 && !/^\s*#\s+/m.test(s)) {
        issues.push({
          slideIndex: i,
          code: 'a11y:missing_heading',
          message: 'Consider adding a heading',
          severity: 'info',
        });
      }
    });
    return { issues, metricsBase: {} };
  }

  // 5.4.2: Slide count optimization (split overly long slides; merge very short ones)
  private optimizeSlideCount(slides: string[]): { slides: string[] } {
    const result: string[] = [];
    const max = this.maxLines;
    const min = this.minLines;
    // Split long slides
    for (const s of slides) {
      const lines = this.splitLines(s);
      if (lines.length > max) {
        for (let i = 0; i < lines.length; i += max) {
          result.push(lines.slice(i, i + max).join('\n'));
        }
      } else {
        result.push(s);
      }
    }
    // Merge very short neighbors
    const merged: string[] = [];
    let buffer = '';
    const flush = () => {
      if (buffer.trim().length > 0) merged.push(buffer.trim());
      buffer = '';
    };
    for (const s of result) {
      const lines = this.splitLines(s);
      if (lines.length < min) {
        buffer = buffer ? buffer + '\n\n' + s : s;
        const totalLines = this.splitLines(buffer).length;
        if (totalLines >= min || totalLines >= max) {
          flush();
        }
      } else {
        if (buffer) flush();
        merged.push(s);
      }
    }
    if (buffer) flush();
    return { slides: merged };
  }

  // 5.4.3: Duplicate detection/removal
  private removeDuplicates(slides: string[], issues: SlideQualityIssue[]): string[] {
    const seen = new Map<string, number>();
    const out: string[] = [];
    slides.forEach((s, i) => {
      const key = this.hash(normalizeWhitespace(s));
      if (seen.has(key)) {
        const first = seen.get(key)!;
        issues.push({
          slideIndex: i,
          code: 'duplicate',
          message: `Duplicate of slide ${first + 1}`,
          severity: 'info',
        });
        // skip duplicate
      } else {
        seen.set(key, out.length);
        out.push(s);
      }
    });
    return out;
  }

  // 5.4.4 Readability scoring (rough Flesch-Kincaid for English, heuristic for others)
  private readabilityScore(text: string): number {
    const sentences = (text.match(/[.!?]+\s|$/g) || []).length || 1;
    const words = (text.match(/\b\w+\b/g) || []).length || 1;
    const syllables =
      (text.match(/[aeiouyąęóAEIOUYĄĘÓ]{1,2}/g) || []).length || Math.ceil(words * 1.5);
    // Flesch-Kincaid Reading Ease approximate
    const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    return Math.max(0, Math.min(100, score));
  }

  // 5.4.5 Consistency checks (merged into validate & suggestions for simplicity)

  // 5.4.6 Language detection (very rough)
  private detectLanguage(text: string): string {
    const sample = text.slice(0, 500).toLowerCase();
    const plHits = countMatches(
      sample,
      /( i | oraz | że | jest | się | nie | tak | na | po | do | dla )/g,
    );
    const enHits = countMatches(sample, /( the | and | is | are | of | to | for | with )/g);
    if (plHits > enHits * 1.2) return 'pl';
    if (enHits > plHits * 1.2) return 'en';
    return 'unknown';
  }

  // 5.4.7 Accessibility checks handled partly in validateSlides

  // 5.4.8 Post-processing cleanup
  private normalizeText(s: string): string {
    return s
      .normalize('NFC')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/\s+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // 5.4.9 Metrics and reporting
  private computeMetrics(
    slides: string[],
    issues: SlideQualityIssue[],
    _options: QAOptions,
  ): QualityMetrics {
    const totalSlides = slides.length;
    const lineCounts = slides.map((s) => this.splitLines(s).filter((l) => l.trim()).length);
    const avgLinesPerSlide = lineCounts.reduce((a, b) => a + b, 0) / Math.max(1, totalSlides);
    const duplicates = issues.filter((i) => i.code === 'duplicate').length;
    const duplicateSlideRatio =
      totalSlides === 0 ? 0 : duplicates / Math.max(1, totalSlides + duplicates);
    const scores = slides.map((s) => this.readabilityScore(s));
    const avgFleschKincaid = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
    const langCounts: Record<string, number> = {};
    for (const s of slides) {
      const lang = this.detectLanguage(s);
      langCounts[lang] = (langCounts[lang] ?? 0) + 1;
    }
    const imagesWithoutAlt = issues.filter((i) => i.code === 'a11y:image_alt_missing').length;
    const headingsMissing = issues.filter((i) => i.code === 'a11y:missing_heading').length;
    return {
      totalSlides,
      avgLinesPerSlide,
      duplicateSlideRatio,
      readability: { avgFleschKincaid },
      languages: langCounts,
      accessibility: { imagesWithoutAlt, headingsMissing },
      issuesCount: issues.length,
    };
  }

  private buildSuggestions(metrics: QualityMetrics, issues: SlideQualityIssue[]): string[] {
    const suggestions: string[] = [];
    if (metrics.avgLinesPerSlide > this.maxLines * 0.9) {
      suggestions.push('Reduce content density per slide for better readability');
    }
    if (metrics.readability.avgFleschKincaid < 50) {
      suggestions.push('Simplify wording to improve readability');
    }
    if (metrics.accessibility.imagesWithoutAlt > 0) {
      suggestions.push('Add alt text to all images for accessibility');
    }
    if (metrics.languages.unknown && metrics.languages.unknown > 0) {
      suggestions.push('Language could not be reliably detected for some slides; review wording');
    }
    if (issues.some((i) => i.code === 'duplicate')) {
      suggestions.push('Remove or consolidate duplicate slides');
    }
    return suggestions;
  }

  // Helpers
  private splitLines(s: string): string[] {
    return s.split(/\r?\n/);
  }

  private hash(s: string): string {
    let h = 2166136261;
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return (h >>> 0).toString(16);
  }
}

function normalizeWhitespace(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function countMatches(sample: string, re: RegExp): number {
  const m = sample.match(re);
  return m ? m.length : 0;
}
