export type ThemeAudience = 'business' | 'technical' | 'academic' | 'creative' | 'general';

export interface ThemeModifiers {
  spacing: 'compact' | 'comfortable';
  emphasis: 'low' | 'medium' | 'high';
  animations: 'none' | 'subtle' | 'expressive';
}

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
  modifiers: ThemeModifiers;
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
    modifiers: { spacing: 'comfortable', emphasis: 'low', animations: 'subtle' },
  },
  developerDark: {
    name: 'Developer Dark',
    colors: { primary: '#5EDEA3', secondary: '#1E1E1E', background: '#121212', text: '#EAEAEA' },
    fonts: { heading: 'JetBrains Mono', body: 'Inter' },
    rationale: 'Dark theme for technical audiences and code snippets',
    modifiers: { spacing: 'compact', emphasis: 'medium', animations: 'none' },
  },
  academicClassic: {
    name: 'Academic Classic',
    colors: { primary: '#2B59C3', secondary: '#D9E1F2', background: '#FFFFFF', text: '#111111' },
    fonts: { heading: 'Merriweather', body: 'Inter' },
    rationale: 'Readable serif headings for lectures and papers',
    modifiers: { spacing: 'comfortable', emphasis: 'low', animations: 'none' },
  },
  creativeVibrant: {
    name: 'Creative Vibrant',
    colors: { primary: '#FF4D6D', secondary: '#FDE74C', background: '#FFFFFF', text: '#1A1A1A' },
    fonts: { heading: 'Poppins', body: 'Inter' },
    rationale: 'High-energy palette for inspirational content',
    modifiers: { spacing: 'comfortable', emphasis: 'high', animations: 'expressive' },
  },
  generalNeutral: {
    name: 'General Neutral',
    colors: { primary: '#4C7CF3', secondary: '#A3B1DA', background: '#FFFFFF', text: '#1A1A1A' },
    fonts: { heading: 'Inter', body: 'Inter' },
    rationale: 'Neutral, safe defaults for unspecified content',
    modifiers: { spacing: 'comfortable', emphasis: 'low', animations: 'none' },
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
        const choice = rule.decide(context);
        // Ensure accessibility before returning
        return ensureAccessibleTheme(choice);
      }
    }
    return ensureAccessibleTheme(THEMES.generalNeutral);
  }

  decideFromAnalysis(analysis: { domain: string; audience: string; tone: string }): ThemeDecision {
    return this.decide({
      domain: analysis.domain,
      audience: analysis.audience,
      tone: analysis.tone,
    });
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

// ---------- Accessibility (3.3.6, 3.3.7) ----------

export function getLuminance(hexColor: string): number {
  const [r, g, b] = hexToRgb(hexColor);
  const a = [r, g, b].map((v) => {
    const srgb = v / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

export function getContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const L1 = getLuminance(foregroundHex);
  const L2 = getLuminance(backgroundHex);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function ensureAccessibleTheme(theme: ThemeDecision): ThemeDecision {
  // Ensure text color passes AA (>= 4.5) on background; adjust to black/white fallback if needed
  const ratio = getContrastRatio(theme.colors.text, theme.colors.background);
  if (ratio < 4.5) {
    const whiteRatio = getContrastRatio('#FFFFFF', theme.colors.background);
    const blackRatio = getContrastRatio('#000000', theme.colors.background);
    const text = whiteRatio >= blackRatio ? '#FFFFFF' : '#000000';
    return {
      ...theme,
      colors: { ...theme.colors, text },
      rationale: `${theme.rationale}; adjusted text for WCAG`,
    };
  }
  return theme;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const parse =
    m.length === 3
      ? m.split('').map((c) => parseInt(c + c, 16))
      : [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
  return parse as [number, number, number];
}

export function recommendFonts(audience: string): { heading: string; body: string } {
  if (/technical|developer/i.test(audience)) return { heading: 'JetBrains Mono', body: 'Inter' };
  if (/academic|students|education/i.test(audience))
    return { heading: 'Merriweather', body: 'Inter' };
  if (/executive|business/i.test(audience)) return { heading: 'Inter', body: 'Inter' };
  return { heading: 'Inter', body: 'Inter' };
}
