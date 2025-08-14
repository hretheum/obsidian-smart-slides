export type Audience = 'students' | 'executives' | 'technical' | 'general';
export type Domain = 'technology' | 'business' | 'medicine' | 'education' | 'science' | 'general';
export type Purpose = 'inform' | 'persuade' | 'educate' | 'inspire';
export type Complexity = 'beginner' | 'intermediate' | 'advanced';
export type Tone = 'formal' | 'casual' | 'academic' | 'business';

export interface KeyTopic {
  term: string;
  count: number;
}

export interface ContentAnalysis {
  audience: Audience;
  formalityScore: number; // 1-10
  domain: Domain;
  purpose: Purpose;
  complexity: Complexity;
  suggestedSlideCount: number;
  keyTopics: KeyTopic[];
  tone: Tone;
}

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'on',
  'for',
  'with',
  'by',
  'is',
  'are',
  'was',
  'were',
  'be',
  'this',
  'that',
  'it',
  'as',
  'at',
  'from',
  'we',
  'you',
  'they',
  'i',
  'about',
  'into',
  'over',
  'under',
  'between',
  'your',
  'our',
  'their',
  'but',
  'not',
  'can',
  'will',
  'just',
  'so',
  'if',
  'then',
  'than',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function countWords(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tokens) {
    if (STOPWORDS.has(t) || t.length < 3) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return counts;
}

function detectAudience(text: string): Audience {
  const lc = text.toLowerCase();
  if (/(class|lecture|students|exam|homework|course)\b/.test(lc)) return 'students';
  if (/(roi|stakeholders|kpi|board|executive|strategy)\b/.test(lc)) return 'executives';
  if (/(api|code|developer|sdk|architecture|runtime|algorithm)\b/.test(lc)) return 'technical';
  return 'general';
}

function scoreFormality(text: string): number {
  const lc = text.toLowerCase();
  let score = 5;
  // formal cues
  score += (lc.match(/therefore|however|moreover|furthermore|hence|thus/g) || []).length;
  // casual cues reduce
  score -= (lc.match(/gonna|wanna|kinda|sorta|lol|btw|hey|cool/g) || []).length;
  // contractions lower formality
  score -= (lc.match(/\b(\w+)'(re|s|ve|d|ll|t)\b/g) || []).length * 0.5;
  // clamp 1-10
  return Math.min(10, Math.max(1, Math.round(score)));
}

function detectDomain(text: string): Domain {
  const lc = text.toLowerCase();
  if (/(api|cloud|microservices|runtime|compiler|frontend|backend|database)/.test(lc))
    return 'technology';
  if (/(market|revenue|profit|roi|kpi|customer|sales|marketing|strategy)/.test(lc))
    return 'business';
  if (/(patient|clinical|therapy|symptom|diagnosis|medicine|surgery)/.test(lc)) return 'medicine';
  if (/(curriculum|lesson|teacher|student|pedagogy|education)/.test(lc)) return 'education';
  if (/(experiment|hypothesis|physics|biology|chemistry|research)/.test(lc)) return 'science';
  return 'general';
}

function detectPurpose(text: string): Purpose {
  const lc = text.toLowerCase();
  if (/(how to|tutorial|guide|step by step|learn)/.test(lc)) return 'educate';
  if (/(recommend|should|must|convince|why)/.test(lc)) return 'persuade';
  if (/(inspire|motivate|vision|aspire|story)/.test(lc)) return 'inspire';
  return 'inform';
}

function assessComplexity(text: string): Complexity {
  const lc = text.toLowerCase();
  if (/(\bbeginner\b|\bintroduction\b|\bintro\b|\boverview\b|\bbasics\b|\bsimple\b)/.test(lc)) {
    return 'beginner';
  }
  const tokens = tokenize(text);
  const avgLen = tokens.length ? tokens.reduce((s, t) => s + t.length, 0) / tokens.length : 0;
  const jargonHits = tokens.filter((t) =>
    /ization|ality|ivity|ology|metric|module|async|neural|quantum/.test(t),
  ).length;
  if (jargonHits >= 3 || avgLen > 6.5) return 'advanced';
  if (jargonHits >= 1 || avgLen > 5.5) return 'intermediate';
  return 'beginner';
}

function suggestSlideCount(text: string, complexity: Complexity): number {
  const words = tokenize(text).length;
  const base = Math.ceil(words / 120); // ~120 words per slide
  const factor = complexity === 'advanced' ? 1.3 : complexity === 'intermediate' ? 1.1 : 1.0;
  return Math.max(3, Math.min(40, Math.round(base * factor)));
}

function extractKeyTopics(text: string, topN = 7): KeyTopic[] {
  const counts = countWords(tokenize(text));
  const entries = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([term, count]) => ({ term, count }));
  return entries;
}

function detectTone(text: string): Tone {
  const lc = text.toLowerCase();
  if (/(therefore|hence|consequently|notwithstanding|whereas)/.test(lc)) return 'academic';
  if (/(profit|market|roi|stakeholder|synergy|roadmap)/.test(lc)) return 'business';
  if (/(lol|hey|cool|awesome|guys|gonna|wanna)/.test(lc)) return 'casual';
  return 'formal';
}

export class AnalyzerService {
  analyze(text: string): ContentAnalysis {
    const audience = detectAudience(text);
    const formalityScore = scoreFormality(text);
    const domain = detectDomain(text);
    const purpose = detectPurpose(text);
    const complexity = assessComplexity(text);
    const suggestedSlideCount = suggestSlideCount(text, complexity);
    const keyTopics = extractKeyTopics(text);
    const tone = detectTone(text);
    return {
      audience,
      formalityScore,
      domain,
      purpose,
      complexity,
      suggestedSlideCount,
      keyTopics,
      tone,
    };
  }
}
