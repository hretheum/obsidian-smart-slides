import { QualityAssuranceService } from '../QualityAssuranceService';

describe('QualityAssuranceService - 5.4', () => {
  test('validates, optimizes and reports metrics', () => {
    const slides = [
      '# Title\n\nShort',
      '![](/img.png)\n\nA very very long slide\n' + 'line\n'.repeat(30),
      'Duplicate\nContent',
      'Duplicate\nContent',
      'Some *markdown with `unbalanced` backticks',
    ];
    const qa = new QualityAssuranceService({ maxLinesPerSlide: 10, minLinesPerSlide: 2 });
    const res = qa.analyze(slides, { languageHints: ['pl', 'en'] });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const { slides: out, report } = res.value;
    // Should split long slide and remove duplicates
    expect(out.length).toBeGreaterThanOrEqual(4);
    expect(report.issues.some((i) => i.code === 'duplicate')).toBe(true);
    expect(report.metrics.totalSlides).toBe(out.length);
    expect(report.metrics.readability.avgFleschKincaid).toBeGreaterThanOrEqual(0);
    expect(report.suggestions.length).toBeGreaterThanOrEqual(1);
  });

  test('detects missing alt text and suggests fix', () => {
    const slides = ['![](/x.png)'];
    const qa = new QualityAssuranceService();
    const res = qa.analyze(slides, {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.report.issues.some((i) => i.code === 'a11y:image_alt_missing')).toBe(true);
    expect(res.value.report.suggestions.some((s) => /alt text/i.test(s))).toBe(true);
  });
});
