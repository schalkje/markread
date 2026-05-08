/**
 * Default Folder Exclusion Patterns
 * These folders are excluded from folder tree reading by default
 */

import type { FolderExclusionPattern } from '../types/entities';

/**
 * Default folders to exclude when reading folder trees
 * These are common development/build folders that typically don't contain
 * user-relevant markdown files
 */
export const DEFAULT_EXCLUDED_FOLDERS: readonly string[] = [
  '.git',
  'node_modules',
  'bin',
  'obj',
  'dist',
  'build',
  'out',
  'venv',
  '.venv',
  'env',
  '.env',
  '__pycache__',
  'logs',
  'tmp',
  'temp',
  '.cache',
  '.vscode',
  '.idea',
  'coverage',
  'target',
  '.vs',
  '.tmp',
  'packages',
  '.yarn',
] as const;

/**
 * Generate unique ID for folder exclusion pattern
 */
function generatePatternId(): string {
  return `pattern-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create default folder exclusion patterns with proper structure
 */
export function createDefaultExclusionPatterns(): FolderExclusionPattern[] {
  return DEFAULT_EXCLUDED_FOLDERS.map((folder) => ({
    id: generatePatternId(),
    pattern: folder,
    isEnabled: true,
    description: `Exclude ${folder} folder`,
  }));
}

/**
 * Check if a folder name matches any enabled exclusion pattern
 * @param folderName The folder name to check (not the full path)
 * @param patterns The list of exclusion patterns
 * @returns true if the folder should be excluded
 */
export function shouldExcludeFolder(
  folderName: string,
  patterns: FolderExclusionPattern[]
): boolean {
  return patterns.some(
    (pattern) =>
      pattern.isEnabled &&
      (pattern.pattern === folderName ||
        // Support glob-like patterns with * wildcard
        (pattern.pattern.includes('*') &&
          new RegExp(
            `^${pattern.pattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`
          ).test(folderName)))
  );
}
