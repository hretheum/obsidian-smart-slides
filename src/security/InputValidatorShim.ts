import { Result, ok, err } from '../types/Result';

export function validateSafeFilename(name: string): Result<string> {
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
