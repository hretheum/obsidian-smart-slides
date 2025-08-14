import { LayoutDecision } from './LayoutEngine';
import { ThemeDecision } from './StyleService';
import { Result, ok, err } from '../types/Result';

export type LayoutKind = 'title' | 'content' | 'split' | 'image-focus' | 'comparison';

export interface SlideComposerOptions {
  maxLinesPerSlide?: number;
}

export class SlideComposer {
  private readonly maxLines: number;

  constructor(options: SlideComposerOptions = {}) {
    this.maxLines = options.maxLinesPerSlide ?? 20;
  }

  composeSlides(
    paragraphs: string[],
    decisions: LayoutDecision[],
    theme: ThemeDecision,
  ): Result<string[], Error> {
    try {
      const slides: string[] = [];
      for (let i = 0; i < paragraphs.length; i += 1) {
        const p = safeText(paragraphs[i]);
        const d = decisions[i] ?? {
          type: 'default',
          params: { columns: 1, variant: 'center' },
          rationale: 'fallback',
          score: 0,
        };
        slides.push(this.renderSlide(p, d, theme));
      }
      return ok(slides);
    } catch (e) {
      return err(e as Error);
    }
  }

  private renderSlide(text: string, decision: LayoutDecision, theme: ThemeDecision): string {
    const header = this.renderHeader(theme);
    switch (decision.type) {
      case 'title':
        return `${header}\n---\n# ${extractTitle(text)}`;
      case 'comparison':
        return `${header}\n---\n${renderComparison(text)}`;
      case 'quote':
        return `${header}\n---\n${renderQuote(text)}`;
      case 'image':
        return `${header}\n---\n${renderImage(text, decision)}`;
      case 'list':
        return `${header}\n---\n${renderList(text, this.maxLines)}`;
      default:
        return `${header}\n---\n${renderContent(text, this.maxLines)}`;
    }
  }

  private renderHeader(theme: ThemeDecision): string {
    const cls = `theme-${slug(theme.name)}`;
    return `<!-- slide:class=${cls} -->`;
  }
}

function safeText(s: string): string {
  return s.replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

function extractTitle(text: string): string {
  const m = /^\s*#\s+(.+)/m.exec(text);
  if (m) return escapeMd(m[1]).slice(0, 120);
  return escapeMd(text.split(/\n/)[0]).slice(0, 120);
}

function renderComparison(text: string): string {
  const left: string[] = [];
  const right: string[] = [];
  const lines = text.split(/\n/).map((l) => l.trim());
  for (const l of lines) {
    if (/^pros\s*:?-?/i.test(l)) left.push(`- ${escapeMd(l.replace(/^pros\s*:?-?/i, '').trim())}`);
    else if (/^cons\s*:?-?/i.test(l))
      right.push(`- ${escapeMd(l.replace(/^cons\s*:?-?/i, '').trim())}`);
  }
  const leftCol = left.length ? left.join('\n') : '- —';
  const rightCol = right.length ? right.join('\n') : '- —';
  return `::: split\n${leftCol}\n:::\n${rightCol}\n:::`;
}

function renderQuote(text: string): string {
  const m = /^\s*>\s+(.+)/m.exec(text);
  const content = m ? m[1] : text;
  return `> ${escapeMd(content)}`;
}

function renderImage(text: string, decision: LayoutDecision): string {
  const images = (decision.params.images ?? []).filter(Boolean);
  if (images.length > 0) {
    return images.map((src) => `![](${src})`).join('\n');
  }
  const firstUrl = (/(https?:\/\/\S+\.(?:png|jpe?g|gif|svg))/i.exec(text) || [])[0];
  return firstUrl ? `![](${firstUrl})` : renderContent(text, 10);
}

function renderList(text: string, maxLines: number): string {
  const lines = text.split(/\n/).filter((l) => /^\s*([-*+]\s+|\d+\.\s+)/.test(l));
  const normalized = lines.map((l) => l.replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/, '- '));
  return normalized.slice(0, maxLines).join('\n');
}

function renderContent(text: string, maxLines: number): string {
  const lines = text.split(/\n/).filter((l) => l.trim().length > 0);
  return lines.slice(0, maxLines).map(escapeMd).join('\n');
}

function escapeMd(s: string): string {
  return s.replace(/[\*_`\[\]<>]/g, (c) => `\\${c}`);
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
