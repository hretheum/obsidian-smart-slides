import { StyleService, createDefaultThemeRules } from '../../services/StyleService';

describe('StyleService - 3.3.1', () => {
  test('returns a ThemeDecision object', () => {
    const svc = new StyleService(createDefaultThemeRules());
    const d = svc.decide({ domain: 'general', audience: 'general', tone: 'formal' });
    expect(typeof d.name).toBe('string');
    expect(d.colors.primary).toBeDefined();
    expect(d.fonts.heading).toBeDefined();
    expect(typeof d.rationale).toBe('string');
  });

  test('selects business theme for executive audience', () => {
    const svc = new StyleService();
    const d = svc.decide({ domain: 'business', audience: 'executives', tone: 'business' });
    expect(d.name.toLowerCase()).toContain('business');
  });

  test('selects developer dark for technical content', () => {
    const svc = new StyleService();
    const d = svc.decide({ domain: 'technology', audience: 'technical', tone: 'formal' });
    expect(d.name.toLowerCase()).toContain('developer');
  });

  test('selects academic classic for education/science', () => {
    const svc = new StyleService();
    const d = svc.decide({ domain: 'education', audience: 'students', tone: 'academic' });
    expect(d.name.toLowerCase()).toContain('academic');
  });

  test('selects creative vibrant for inspiring tone', () => {
    const svc = new StyleService();
    const d = svc.decide({ domain: 'general', audience: 'general', tone: 'inspire' });
    expect(d.name.toLowerCase()).toContain('creative');
  });
});
