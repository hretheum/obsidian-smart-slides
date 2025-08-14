/*
  InputValidator: central place for validating user-provided inputs.
  Keep functions pure, deterministic, and side-effect free.
*/

import { Result, ok, err } from '../types/Result';

export function validateNonEmptyString(input: unknown, fieldName: string): Result<string> {
  if (typeof input !== 'string') {
    return err(new Error(`${fieldName} must be a string`));
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return err(new Error(`${fieldName} cannot be empty`));
  }
  return ok(trimmed);
}

export function validateSafeFilename(name: string): Result<string> {
  // Disallow path traversal and illegal characters for common filesystems
  const illegalPattern = /[\\/:*?"<>|]/g;
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    return err(new Error('Path traversal is not allowed in file names'));
  }
  if (illegalPattern.test(name)) {
    return err(new Error('File name contains illegal characters'));
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return err(new Error('File name cannot be empty'));
  }
  return ok(trimmed);
}

/**
 * Very small and strict HTML sanitizer: strips all HTML tags and dangerous sequences.
 * This is NOT a full HTML sanitizer, but is sufficient for plugin text inputs.
 */
export function sanitizePlainText(input: string): string {
  // Remove HTML tags
  let out = input.replace(/<[^>]*>/g, '');
  // Neutralize common script protocol and event handler patterns
  out = out
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/srcdoc=/gi, '')
    .replace(/data:text\/html/gi, '');
  return out;
}

export function validateMaxLength(
  input: string,
  maxLen: number,
  fieldName = 'input',
): Result<string> {
  const value = input ?? '';
  if (value.length > maxLen) {
    return err(new Error(`${fieldName} exceeds maximum length of ${maxLen}`));
  }
  return ok(value);
}

export function validateContentType(
  allowedMimeTypes: ReadonlyArray<string>,
  mimeType: string,
): Result<string> {
  if (!allowedMimeTypes.includes(mimeType)) {
    return err(new Error(`Unsupported content type: ${mimeType}`));
  }
  return ok(mimeType);
}
