import { AnalyzerService } from '../../services/AnalyzerService';

describe('AnalyzerService', () => {
  const svc = new AnalyzerService();

  test('3.1.1: returns ContentAnalysis structure', () => {
    const analysis = svc.analyze(
      'This is a simple introduction to algorithms and data structures.',
    );
    expect(typeof analysis.formalityScore).toBe('number');
    expect(analysis.keyTopics.length).toBeGreaterThanOrEqual(1);
  });

  test('3.1.2: audience detection patterns', () => {
    expect(svc.analyze('The students have an exam and homework').audience).toBe('students');
    expect(svc.analyze('Our executive strategy will improve ROI').audience).toBe('executives');
    expect(svc.analyze('This SDK and API are for developer architecture').audience).toBe(
      'technical',
    );
  });

  test('3.1.3: formality scoring 1-10', () => {
    const f1 = svc.analyze("hey guys, i'm gonna show you").formalityScore;
    const f2 = svc.analyze('Therefore, we shall consequently derive the result').formalityScore;
    expect(f1).toBeGreaterThanOrEqual(1);
    expect(f1).toBeLessThanOrEqual(10);
    expect(f2).toBeGreaterThan(f1);
  });

  test('3.1.4: domain detection', () => {
    expect(svc.analyze('microservices runtime and database').domain).toBe('technology');
    expect(svc.analyze('revenue and market strategy KPI').domain).toBe('business');
    expect(svc.analyze('clinical patient diagnosis').domain).toBe('medicine');
    expect(svc.analyze('lesson plan for teacher and student').domain).toBe('education');
    expect(svc.analyze('physics hypothesis experiment').domain).toBe('science');
  });

  test('3.1.5: purpose detection', () => {
    expect(svc.analyze('How to set up the project step by step').purpose).toBe('educate');
    expect(svc.analyze('You should adopt this approach because...').purpose).toBe('persuade');
    expect(svc.analyze('An inspiring story to motivate you').purpose).toBe('inspire');
    expect(svc.analyze('This document describes the architecture').purpose).toBe('inform');
  });

  test('3.1.6: complexity assessment', () => {
    expect(svc.analyze('Simple overview for beginners').complexity).toBe('beginner');
    expect(['intermediate', 'advanced']).toContain(
      svc.analyze('Optimization of algorithmic complexity and neural quantization').complexity,
    );
  });

  test('3.1.7: slide count suggestion range', () => {
    const n = svc.analyze('word '.repeat(800)).suggestedSlideCount;
    expect(n).toBeGreaterThanOrEqual(3);
    expect(n).toBeLessThanOrEqual(40);
  });

  test('3.1.8: key topic extraction', () => {
    const kt = svc.analyze('api api api database database algorithm').keyTopics;
    expect(kt[0].term).toBe('api');
    expect(kt[0].count).toBeGreaterThanOrEqual(2);
  });

  test('3.1.9: tone detection', () => {
    expect(svc.analyze('therefore hence notwithstanding').tone).toBe('academic');
    expect(svc.analyze('lol guys this is awesome').tone).toBe('casual');
  });

  test('3.1.10: comprehensive cases and edges', () => {
    // empty input
    const empty = svc.analyze('');
    expect(empty.audience).toBe('general');
    expect(empty.domain).toBe('general');
    expect(empty.purpose).toBe('inform');
    expect(empty.complexity).toBe('beginner');
    expect(empty.suggestedSlideCount).toBe(3);
    expect(empty.keyTopics.length).toBe(0);
    expect(['formal', 'academic', 'business', 'casual']).toContain(empty.tone);

    // stopwords are filtered out of key topics
    const topics = svc.analyze('the the of of and and data data data science').keyTopics;
    expect(topics[0].term).toBe('data');
    expect(topics.find((t) => t.term === 'the')).toBeUndefined();

    // business tone signal
    expect(svc.analyze('Our ROI and stakeholder synergy align with the market roadmap').tone).toBe(
      'business',
    );

    // domain defaults to general for non-domain text
    expect(svc.analyze('Weather is nice today and birds sing').domain).toBe('general');

    // slide suggestion clamps to max
    const longAdvanced = svc.analyze(
      'quantum neural optimization metric algorithm '.repeat(900),
    ).suggestedSlideCount;
    expect(longAdvanced).toBe(40);

    // formality clamped 1..10
    const veryFormal = svc.analyze(
      'therefore thus hence moreover furthermore '.repeat(10),
    ).formalityScore;
    const veryCasual = svc.analyze(
      "hey lol i'm gonna wanna kinda sorta ".repeat(10),
    ).formalityScore;
    expect(veryFormal).toBeLessThanOrEqual(10);
    expect(veryCasual).toBeGreaterThanOrEqual(1);
  });
});
