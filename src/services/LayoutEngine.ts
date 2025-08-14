export type LayoutType = 'title' | 'comparison' | 'quote' | 'list' | 'image' | 'default';

export interface LayoutParams {
  columns?: number;
  variant?: 'left' | 'right' | 'center' | 'full';
  images?: string[];
}

export interface LayoutDecision {
  type: LayoutType;
  params: LayoutParams;
  rationale: string;
  score: number;
}

export interface LayoutRule {
  id: string;
  priority: number; // higher wins
  matches: (text: string) => boolean;
  decide: (text: string) => Omit<LayoutDecision, 'score'> & { score?: number };
}

/**
 * Rule-based layout engine that maps analyzed content to slide layouts.
 */
export class LayoutEngine {
  private readonly rules: LayoutRule[];

  constructor(rules: LayoutRule[] = []) {
    this.rules = [...rules].sort((a, b) => b.priority - a.priority);
  }

  addRule(rule: LayoutRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  decide(text: string): LayoutDecision {
    for (const rule of this.rules) {
      if (rule.matches(text)) {
        const dec = rule.decide(text);
        return {
          type: dec.type,
          params: dec.params ?? {},
          rationale: dec.rationale ?? rule.id,
          score: dec.score ?? rule.priority,
        };
      }
    }
    return {
      type: 'default',
      params: { columns: 1, variant: 'center' },
      rationale: 'fallback-default',
      score: 0,
    };
  }

  decideBatch(texts: string[]): LayoutDecision[] {
    // Simple map to preserve determinism and performance
    return texts.map((t) => this.decide(t));
  }

  optimizeFlow(decisions: LayoutDecision[]): LayoutDecision[] {
    return optimizeVisualFlow(decisions);
  }
}

// -------- Default rules (3.2.2–3.2.7) --------

function detectListItems(text: string): number {
  const bulletCount = (text.match(/^\s*[-*+]\s+/gm) || []).length;
  const numberedCount = (text.match(/^\s*\d+\.\s+/gm) || []).length;
  return bulletCount + numberedCount;
}

function extractImageUrls(text: string): string[] {
  const urls: string[] = [];
  const mdImg = /!\[[^\]]*\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = mdImg.exec(text))) {
    urls.push(m[1]);
  }
  const raw = /(https?:\/\/\S+\.(?:png|jpe?g|gif|svg))/gi;
  while ((m = raw.exec(text))) {
    urls.push(m[1]);
  }
  return urls;
}

export function createDefaultLayoutRules(): LayoutRule[] {
  const titleRule: LayoutRule = {
    id: 'rule:title',
    priority: 100,
    matches: (text) => /^\s*#\s+.+/m.test(text) || /\btitle\b/i.test(text),
    decide: () => ({ type: 'title', params: { variant: 'center' }, rationale: 'title detected' }),
  };

  const comparisonRule: LayoutRule = {
    id: 'rule:comparison',
    priority: 80,
    matches: (text) => /\b(vs|versus)\b/i.test(text) || /(pros\s*[:-]|cons\s*[:-])/i.test(text),
    decide: () => ({
      type: 'comparison',
      params: { columns: 2, variant: 'full' },
      rationale: 'comparison language detected',
    }),
  };

  const quoteRule: LayoutRule = {
    id: 'rule:quote',
    priority: 70,
    matches: (text) => /^\s*>\s+.+/m.test(text) || /“.+”|".+"/s.test(text),
    decide: () => ({ type: 'quote', params: { variant: 'center' }, rationale: 'quote detected' }),
  };

  const listRule: LayoutRule = {
    id: 'rule:list',
    priority: 60,
    matches: (text) => detectListItems(text) >= 2,
    decide: (text) => {
      const items = detectListItems(text);
      return {
        type: 'list',
        params: { columns: items > 8 ? 2 : 1, variant: 'left' },
        rationale: `list with ${items} items`,
      };
    },
  };

  const imageRule: LayoutRule = {
    id: 'rule:image',
    priority: 65,
    matches: (text) =>
      extractImageUrls(text).length > 0 ||
      /\b(diagram|figure|screenshot|chart|graph|image)\b/i.test(text),
    decide: (text) => ({
      type: 'image',
      params: { variant: 'full', images: extractImageUrls(text) },
      rationale: 'image content detected',
    }),
  };

  // Priority order: title > comparison > image > quote > list
  return [titleRule, comparisonRule, imageRule, quoteRule, listRule];
}

/**
 * Convenience builder that instantiates LayoutEngine with default rules.
 */
export function createDefaultLayoutEngine(): LayoutEngine {
  return new LayoutEngine(createDefaultLayoutRules());
}

// -------- Flow optimization (3.2.8) --------

export function optimizeVisualFlow(decisions: LayoutDecision[]): LayoutDecision[] {
  let lastSide: 'left' | 'right' = 'right';
  return decisions.map((d) => {
    if (d.type === 'title' || d.params.variant === 'center' || d.params.variant === 'full') {
      return d;
    }
    const nextSide: 'left' | 'right' = lastSide === 'left' ? 'right' : 'left';
    lastSide = nextSide;
    return { ...d, params: { ...d.params, variant: nextSide } };
  });
}
