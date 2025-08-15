import { TemplateService, createDefaultTemplateSet } from '../TemplateService';

describe('TemplateService - 5.3', () => {
  test('validates default set and renders title', () => {
    const set = createDefaultTemplateSet();
    const svc = new TemplateService(set);
    const valid = svc.validateSet();
    expect(valid.ok).toBe(true);
    const res = svc.render({ templateId: 'slide:title', values: { title: 'Hello' } });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.text).toMatch(/# Hello/);
  });

  test('supports inheritance and partial includes', () => {
    const set = createDefaultTemplateSet();
    // add a child that overrides content and includes base
    set.templates['slide:custom'] = {
      id: 'slide:custom',
      version: '1.0.0',
      layout: 'default',
      extends: 'base:common',
      content: '{{> base:common}}\nNote: {{note}}',
    } as any; // relax test typing intentionally

    const svc = new TemplateService(set);
    const valid = svc.validateSet();
    expect(valid.ok).toBe(true);
    const res = svc.render({ templateId: 'slide:custom', values: { content: 'Body', note: 'OK' } });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.text).toMatch(/Body/);
    expect(res.value.text).toMatch(/Note: OK/);
  });

  test('detects inheritance cycle', () => {
    const set = createDefaultTemplateSet();
    set.templates['a'] = {
      id: 'a',
      version: '1.0.0',
      layout: 'x',
      content: 'A',
      extends: 'b',
    } as any;
    set.templates['b'] = {
      id: 'b',
      version: '1.0.0',
      layout: 'x',
      content: 'B',
      extends: 'a',
    } as any;
    const svc = new TemplateService(set);
    const valid = svc.validateSet();
    expect(valid.ok).toBe(false);
  });

  test('escapes markdown on variables', () => {
    const set = createDefaultTemplateSet();
    const svc = new TemplateService(set);
    const res = svc.render({ templateId: 'slide:title', values: { title: 'A*B<C>' } });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.text).toContain('A\\*B\\<C\\>');
  });

  test('engine version compatibility check', () => {
    const set = createDefaultTemplateSet();
    // require higher engine
    set.templates['slide:title'].engineRange = '>=100.0.0';
    const svc = new TemplateService(set);
    const valid = svc.validateSet();
    expect(valid.ok).toBe(false);
  });
});
