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
    // Placeholder: identity until 3.2.8
    return decisions;
  }
}
