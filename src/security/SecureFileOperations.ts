/*
  SecureFileOperations: wrappers for safe file path handling inside Obsidian vault.
  Actual IO should be performed via Obsidian APIs; this module focuses on validation.
*/

import { Result, ok, err } from "../types/Result";

export interface SafePath {
  path: string; // canonical, normalized, vault-relative path
}

export function normalizeVaultRelativePath(candidate: string): Result<SafePath> {
  const trimmed = candidate.trim();
  if (trimmed.length === 0) {
    return err(new Error("Path cannot be empty"));
  }
  if (trimmed.includes("..")) {
    return err(new Error("Path traversal is not allowed"));
  }
  if (trimmed.startsWith("/") || trimmed.startsWith("\\")) {
    return err(new Error("Absolute paths are not allowed; use vault-relative paths"));
  }
  const normalized = trimmed.replace(/\\+/g, "/");
  return ok({ path: normalized });
}
