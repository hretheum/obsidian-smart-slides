import {
  sanitizePlainText,
  validateContentType,
  validateMaxLength,
  validateSafeFilename,
} from '../../security/InputValidator';

describe('InputValidator security', () => {
  test('sanitizePlainText removes tags and dangerous patterns (XSS prevention)', () => {
    const input = '<img src=x onerror=alert(1)>javascript:alert(2)<script>alert(3)</script>ok';
    const out = sanitizePlainText(input);
    expect(out).toContain('ok');
    expect(out).not.toMatch(/<|>|onerror|javascript:|script|srcdoc|data:text\/html/);
  });

  test('validateSafeFilename blocks traversal and illegal chars', () => {
    expect(validateSafeFilename('../evil').ok).toBe(false);
    expect(validateSafeFilename('a/b').ok).toBe(false);
    expect(validateSafeFilename('con*fig').ok).toBe(false);
    expect(validateSafeFilename(' good.txt ').ok).toBe(true);
  });

  test('validateMaxLength enforces maximum length', () => {
    expect(validateMaxLength('12345', 4).ok).toBe(false);
    expect(validateMaxLength('1234', 4).ok).toBe(true);
  });

  test('validateContentType accepts only allowed mime types', () => {
    const allowed = ['text/plain', 'application/json'];
    expect(validateContentType(allowed, 'text/plain').ok).toBe(true);
    expect(validateContentType(allowed, 'image/png').ok).toBe(false);
  });
});
