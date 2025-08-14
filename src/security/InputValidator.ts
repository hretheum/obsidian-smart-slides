/*
  InputValidator: central place for validating user-provided inputs.
  Keep functions pure, deterministic, and side-effect free.
*/

import { Result, ok, err } from "../types/Result";

export function validateNonEmptyString(input: unknown, fieldName: string): Result<string> {
  if (typeof input !== "string") {
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
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    return err(new Error("Path traversal is not allowed in file names"));
  }
  if (illegalPattern.test(name)) {
    return err(new Error("File name contains illegal characters"));
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return err(new Error("File name cannot be empty"));
  }
  return ok(trimmed);
}