export type ThemeAudience = 'business' | 'technical' | 'academic' | 'creative' | 'general';

export interface ThemeDecision {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  rationale: string;
}

export interface ThemeRule {
  id: string;
  priority: number;
  matches: (context: { domain: string; audience: string; tone: string }) => boolean;
  decide: (context: { domain: string; audience: string; tone: string }) => ThemeDecision;
}

const THEMES: Record<string, ThemeDecision> = {
  businessProfessional: {
    name: 'Business Professional',
    colors: { primary: '#0B5FFF', secondary: '#0A2E5C', background: '#FFFFFF', text: '#111111' },
    fonts: { heading: 'Inter', body: 'Inter' },
    rationale: 'Crisp corporate palette with strong contrast',
  },
  developerDark: {
    name: 'Developer Dark',
    colors: { primary: '#5EDEA3', secondary: '#1E1E1E', background: '#121212', text: '#EAEAEA' },
    fonts: { heading: 'JetBrains Mono', body: 'Inter' },
    rationale: 'Dark theme for technical audiences and code snippets',
  },
  academicClassic: {
    name: 'Academic Classic',
    colors: { primary: '#2B59C3', secondary: '#D9E1F2', background: '#FFFFFF', text: '#111111' },
    fonts: { heading: 'Merriweather', body: 'Inter' },
    rationale: 'Readable serif headings for lectures and papers',
  },
  creativeVibrant: {
    name: 'Creative Vibrant',
    colors: { primary: '#FF4D6D', secondary: '#FDE74C', background: '#FFFFFF', text: '#1A1A1A' },
    fonts: { heading: 'Poppins', body: 'Inter' },
    rationale: 'High-energy palette for inspirational content',
  },
  generalNeutral: {
    name: 'General Neutral',
    colors: { primary: '#4C7CF3', secondary: '#A3B1DA', background: '#FFFFFF', text: '#1A1A1A' },
    fonts: { heading: 'Inter', body: 'Inter' },
    rationale: 'Neutral, safe defaults for unspecified content',
  },
};

export class StyleService {
  private readonly rules: ThemeRule[];

  constructor(rules: ThemeRule[] = []) {
    this.rules = [...rules].sort((a, b) => b.priority - a.priority);
    if (this.rules.length === 0) {
      this.rules = createDefaultThemeRules();
    }
  }

  decide(context: { domain: string; audience: string; tone: string }): ThemeDecision {
    for (const rule of this.rules) {
      if (rule.matches(context)) {
        return rule.decide(context);
      }
    }
    return THEMES.generalNeutral;
  }
}

export function createDefaultThemeRules(): ThemeRule[] {
  const businessRule: ThemeRule = {
    id: 'theme:business',
    priority: 100,
    matches: ({ audience, domain, tone }) =>
      /executive|business/i.test(audience) ||
      /business|marketing|sales/i.test(domain) ||
      /business/i.test(tone),
    decide: () => THEMES.businessProfessional,
  };
  const technicalRule: ThemeRule = {
    id: 'theme:technical',
    priority: 90,
    matches: ({ audience, domain }) =>
      /technical|developer/i.test(audience) || /technology/i.test(domain),
    decide: () => THEMES.developerDark,
  };
  const academicRule: ThemeRule = {
    id: 'theme:academic',
    priority: 80,
    matches: ({ audience, domain }) =>
      /students|education/i.test(audience) || /education|science|medicine/i.test(domain),
    decide: () => THEMES.academicClassic,
  };
  const creativeRule: ThemeRule = {
    id: 'theme:creative',
    priority: 70,
    matches: ({ tone }) => /inspire|creative|casual/i.test(tone),
    decide: () => THEMES.creativeVibrant,
  };
  return [businessRule, technicalRule, academicRule, creativeRule];
}
