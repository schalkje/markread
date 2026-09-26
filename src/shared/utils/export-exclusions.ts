/**
 * Export-only exclusion patterns.
 *
 * Patterns match a single file or folder *name* (never a path), case-insensitive,
 * with simple globs: `*` matches any run of characters and `?` a single one.
 * They complement (not replace) the browsing folder exclusions, so a folder
 * export skips the union of both lists. Single-file export ignores them.
 */

import type { FolderExclusionPattern } from '../types/entities';
import type { ExclusionPattern } from '../types/export';
import { DEFAULT_EXCLUDED_FOLDERS, shouldExcludeFolder } from '../constants/folderExclusions';

/** One-click presets offered in the settings UI */
export const EXPORT_EXCLUSION_PRESETS: readonly string[] = ['CLAUDE.md', 'COPILOT.md', 'AGENTS.md'];

/** Create a new enabled exclusion pattern with a unique id */
export function createExclusionPattern(pattern: string, description?: string): ExclusionPattern {
  const trimmed = pattern.trim();
  return {
    id: `export-exclusion-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    pattern: trimmed,
    isEnabled: true,
    description: description ?? `Exclude ${trimmed} from export`,
  };
}

/** Case-insensitive glob match of a file/folder name against one pattern */
export function matchesExclusionPattern(name: string, pattern: string): boolean {
  const trimmed = pattern.trim();
  if (!trimmed) return false;
  if (!/[*?]/.test(trimmed)) {
    return trimmed.toLowerCase() === name.toLowerCase();
  }
  const source = trimmed
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${source}$`, 'i').test(name);
}

/** True when any enabled pattern matches the name */
export function isExcludedFromExport(
  name: string,
  patterns: readonly ExclusionPattern[] | undefined
): boolean {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some((p) => p.isEnabled && matchesExclusionPattern(name, p.pattern));
}

export interface ExportExclusionFilter {
  /** Folder name is excluded by the browsing list or the export list */
  isFolderExcluded(name: string): boolean;
  /** File name is excluded by the export list */
  isFileExcluded(name: string): boolean;
}

export interface ExportExclusionSources {
  /** The user's browsing folder exclusions; defaults to the built-in folder list */
  browsingExclusions?: readonly FolderExclusionPattern[];
  /** The user's export-only exclusions */
  exportExclusions?: readonly ExclusionPattern[];
}

const DEFAULT_BROWSING_PATTERNS: FolderExclusionPattern[] = DEFAULT_EXCLUDED_FOLDERS.map(
  (folder) => ({ id: `default-${folder}`, pattern: folder, isEnabled: true })
);

/** Build the combined filter used by folder and repository exports */
export function createExportExclusionFilter(
  sources: ExportExclusionSources = {}
): ExportExclusionFilter {
  const folderPatterns = [...(sources.browsingExclusions ?? DEFAULT_BROWSING_PATTERNS)];
  const exportPatterns = sources.exportExclusions ?? [];
  return {
    isFolderExcluded: (name) =>
      shouldExcludeFolder(name, folderPatterns) || isExcludedFromExport(name, exportPatterns),
    isFileExcluded: (name) => isExcludedFromExport(name, exportPatterns),
  };
}
