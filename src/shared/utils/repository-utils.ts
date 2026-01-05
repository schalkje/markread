/**
 * Repository Utilities
 * Helper functions for repository ID generation and multi-branch management
 */

import type { Folder } from '@shared/types/entities.d.ts';

/**
 * Generate a deterministic folder ID for a repository branch
 * Format: repo:${repositoryId}:${branchName}
 *
 * @param repositoryId - Repository identifier (e.g., 'github.com/user/repo')
 * @param branchName - Branch name (e.g., 'main', 'develop')
 * @returns Deterministic folder ID
 */
export function generateRepoFolderId(repositoryId: string, branchName: string): string {
  return `repo:${repositoryId}:${branchName}`;
}

/**
 * Parse a repository folder ID to extract repositoryId and branch
 *
 * @param folderId - Folder ID to parse
 * @returns Object with repositoryId and branchName, or null if not a repo folder
 */
export function parseRepoFolderId(folderId: string): { repositoryId: string; branchName: string } | null {
  const match = folderId.match(/^repo:(.+):([^:]+)$/);
  if (!match) return null;

  return {
    repositoryId: match[1],
    branchName: match[2],
  };
}

/**
 * Check if a folder ID is a repository folder ID
 *
 * @param folderId - Folder ID to check
 * @returns True if the folder ID is a repository folder ID
 */
export function isRepoFolderId(folderId: string): boolean {
  return folderId.startsWith('repo:');
}

/**
 * Get the repository ID from a folder (if it's a repository folder)
 *
 * @param folder - Folder to extract repository ID from
 * @returns Repository ID or null if not a repository folder
 */
export function getRepositoryId(folder: Folder): string | null {
  if (folder.type !== 'repository') return null;

  // Try parsing from ID first (new format)
  const parsed = parseRepoFolderId(folder.id);
  if (parsed) return parsed.repositoryId;

  // Fall back to repositoryId field (old format)
  return folder.repositoryId || null;
}

/**
 * Get the branch name from a folder (if it's a repository folder)
 *
 * @param folder - Folder to extract branch name from
 * @returns Branch name or null if not a repository folder
 */
export function getBranchName(folder: Folder): string | null {
  if (folder.type !== 'repository') return null;

  // Try parsing from ID first (new format)
  const parsed = parseRepoFolderId(folder.id);
  if (parsed) return parsed.branchName;

  // Fall back to currentBranch field (old format)
  return folder.currentBranch || null;
}

/**
 * Group folders by repository
 * Returns a map of repositoryId -> array of folders (branches)
 *
 * @param folders - Array of folders to group
 * @returns Map of repositoryId to folder arrays
 */
export function groupFoldersByRepository(folders: Folder[]): Map<string, Folder[]> {
  const grouped = new Map<string, Folder[]>();

  for (const folder of folders) {
    if (folder.type !== 'repository') continue;

    const repoId = getRepositoryId(folder);
    if (!repoId) continue;

    const existing = grouped.get(repoId) || [];
    existing.push(folder);
    grouped.set(repoId, existing);
  }

  return grouped;
}

/**
 * Migrate old repository folder IDs to new deterministic format
 *
 * @param folder - Folder to migrate
 * @returns Migrated folder with new ID format
 */
export function migrateRepositoryFolder(folder: Folder): Folder {
  // Already using new format
  if (isRepoFolderId(folder.id)) {
    return folder;
  }

  // Not a repository folder
  if (folder.type !== 'repository' || !folder.repositoryId || !folder.currentBranch) {
    return folder;
  }

  // Migrate to new format
  return {
    ...folder,
    id: generateRepoFolderId(folder.repositoryId, folder.currentBranch),
  };
}

/**
 * Migrate all repository folders in an array to new format
 *
 * @param folders - Array of folders to migrate
 * @returns Array of migrated folders
 */
export function migrateRepositoryFolders(folders: Folder[]): Folder[] {
  return folders.map(migrateRepositoryFolder);
}

/**
 * Sort branch names by priority: main > master > development > alphabetical
 *
 * @param branches - Array of branch names to sort
 * @returns Sorted array of branch names
 */
export function sortBranchesByPriority(branches: string[]): string[] {
  const priorityOrder = ['main', 'master', 'development'];

  return [...branches].sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a.toLowerCase());
    const bIndex = priorityOrder.indexOf(b.toLowerCase());

    // Both are priority branches
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // Only a is a priority branch
    if (aIndex !== -1) {
      return -1;
    }

    // Only b is a priority branch
    if (bIndex !== -1) {
      return 1;
    }

    // Neither are priority branches, sort alphabetically
    return a.localeCompare(b);
  });
}

/**
 * Get the default branch from a list of branches using priority rules
 * Priority: main > master > development > first alphabetically
 *
 * @param branches - Array of branch names
 * @returns Default branch name or null if array is empty
 */
export function getDefaultBranch(branches: string[]): string | null {
  if (branches.length === 0) return null;

  const sorted = sortBranchesByPriority(branches);
  return sorted[0];
}
