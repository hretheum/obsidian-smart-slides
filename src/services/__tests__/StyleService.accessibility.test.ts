import { ensureAccessibleTheme, getContrastRatio, StyleService } from '../../services/StyleService';

describe('StyleService accessibility (3.3.6–3.3.7)', () => {
  test('adjusts text color for insufficient contrast', () => {
    const svc = new StyleService([]);
    const badTheme = {
      name: 'Bad',
      colors: { primary: '#FFFFFF', secondary: '#EEEEEE', background: '#FFFFFF', text: '#F0F0F0' },
      fonts: { heading: 'Inter', body: 'Inter' },
      modifiers: { spacing: 'comfortable', emphasis: 'low', animations: 'none' },
      rationale: 'test',
    } as const;
    const fixed = ensureAccessibleTheme(badTheme as any);
    const ratio = getContrastRatio(fixed.colors.text, fixed.colors.background);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
