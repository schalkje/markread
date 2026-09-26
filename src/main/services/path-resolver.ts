/**
 * Resolves a markdown link destination (relative href) against the file that
 * contains it. Used by the `file:resolvePath` IPC handler; free of Electron
 * imports so it can be unit tested.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { decodeLinkPath } from '../../shared/utils/link-paths';

export interface ResolvedLinkPath {
  success: boolean;
  absolutePath?: string;
  exists?: boolean;
  isDirectory?: boolean;
  error?: string;
}

async function statPath(absolutePath: string): Promise<{ exists: boolean; isDirectory: boolean }> {
  try {
    const stats = await fs.stat(absolutePath);
    return { exists: true, isDirectory: stats.isDirectory() };
  } catch {
    return { exists: false, isDirectory: false };
  }
}

/**
 * Resolve `relativePath` (as written in an href) against the directory of
 * `basePath`. The href is percent-decoded first (`My%20File.md` -> `My File.md`);
 * if the decoded path does not exist but the raw one does (a file literally
 * named with `%XX`), the raw path wins.
 *
 * Directories resolve to their README.md when present; otherwise the
 * directory itself is returned with `isDirectory: true` so the caller can
 * show a generated listing.
 */
export async function resolveLinkPath(basePath: string, relativePath: string): Promise<ResolvedLinkPath> {
  const baseDir = path.dirname(basePath);

  const decoded = decodeLinkPath(relativePath);
  const candidates = decoded === relativePath ? [relativePath] : [decoded, relativePath];

  let chosen: { absolutePath: string; exists: boolean; isDirectory: boolean } | null = null;

  for (const candidate of candidates) {
    const absolutePath = path.normalize(path.resolve(baseDir, candidate));

    // Basic traversal guard (kept from the original handler)
    if (absolutePath.includes('..')) {
      return {
        success: false,
        error: 'Path traversal detected - relative paths with ".." are not allowed',
      };
    }

    const info = await statPath(absolutePath);
    if (info.exists) {
      chosen = { absolutePath, ...info };
      break;
    }
    if (!chosen) {
      chosen = { absolutePath, ...info };
    }
  }

  if (!chosen) {
    return { success: false, error: 'Empty path' };
  }

  if (chosen.exists && chosen.isDirectory) {
    const readmePath = path.join(chosen.absolutePath, 'README.md');
    try {
      await fs.access(readmePath);
      return { success: true, absolutePath: readmePath, exists: true, isDirectory: false };
    } catch {
      return { success: true, absolutePath: chosen.absolutePath, exists: true, isDirectory: true };
    }
  }

  return {
    success: true,
    absolutePath: chosen.absolutePath,
    exists: chosen.exists,
    isDirectory: chosen.isDirectory,
  };
}
