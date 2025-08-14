import { SlideComposer } from '../SlideComposer';
import { createDefaultLayoutEngine } from '../LayoutEngine';
import { StyleService } from '../StyleService';

describe('SlideComposer - 5.2', () => {
  const md = `# Big Title\n\nIntro paragraph with some text.\n\nPros: fast\nCons: complex\n\n> a famous quote\n\n![alt](https://example.com/img.png)\n\n- a\n- b\n- c`;

  test('composes slides for multiple layout types', () => {
    const paragraphs = md.split(/\n{2,}/);
    const layout = createDefaultLayoutEngine();
    const decisions = layout.decideBatch(paragraphs);
    const theme = new StyleService().decideFromAnalysis({
      audience: 'general',
      domain: 'general',
      tone: 'formal',
    });

    const composer = new SlideComposer({ maxLinesPerSlide: 10 });
    const res = composer.composeSlides(paragraphs, decisions, theme);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const slides = res.value;
    expect(slides.length).toBe(paragraphs.length);
    expect(slides[0]).toMatch(/# Big Title/);
    expect(slides.join('\n')).toMatch(/<!-- slide:class=theme-/);
    expect(slides.join('\n')).toMatch(/::: split|> |!\[\]|- /);
  });

  test('escapes markdown and limits lines', () => {
    const paragraphs = ['- a*b', '- c[d]e', '- f<g>'];
    const layout = createDefaultLayoutEngine();
    const decisions = layout.decideBatch(paragraphs);
    const theme = new StyleService().decideFromAnalysis({
      audience: 'general',
      domain: 'general',
      tone: 'formal',
    });
    const composer = new SlideComposer({ maxLinesPerSlide: 2 });
    const res = composer.composeSlides(paragraphs, decisions, theme);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value[0]).toContain('\\*');
  });
});
