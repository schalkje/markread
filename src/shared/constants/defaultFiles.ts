/**
 * Default Files to Open Configuration
 * These files are checked in priority order when opening a folder
 */

import type { DefaultFileEntry } from '../types/entities';

/**
 * Default files to look for when opening a folder (in priority order)
 */
export const DEFAULT_FILES_TO_OPEN: readonly string[] = [
  'README.md',
  'index.md',
  'home.md',
  'overview.md',
] as const;

/**
 * Generate unique ID for default file entry
 */
function generateEntryId(): string {
  return `default-file-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create default file entries with proper structure
 */
export function createDefaultFileEntries(): DefaultFileEntry[] {
  return DEFAULT_FILES_TO_OPEN.map((filename) => ({
    id: generateEntryId(),
    filename,
    isEnabled: true,
  }));
}

/**
 * Find the first matching file from a list of filenames using the priority list
 * @param availableFiles Array of file names in the folder (root level)
 * @param entries Priority-ordered list of default file entries
 * @returns The matching filename (original case) or null if no match
 */
export function findDefaultFile(
  availableFiles: string[],
  entries: DefaultFileEntry[]
): string | null {
  // Create lowercase map for case-insensitive matching
  const lowerCaseMap = new Map<string, string>();
  for (const file of availableFiles) {
    lowerCaseMap.set(file.toLowerCase(), file);
  }

  // Check each enabled entry in priority order
  for (const entry of entries) {
    if (!entry.isEnabled) continue;

    const lowerFilename = entry.filename.toLowerCase();
    const matchedFile = lowerCaseMap.get(lowerFilename);
    if (matchedFile) {
      return matchedFile;
    }
  }

  return null;
}
