/**
 * Tab ID Utilities
 *
 * Generates deterministic tab IDs based on file path and context.
 * This ensures the same file in different contexts (direct file, folder, repo)
 * gets different tab IDs, allowing multiple tabs for the same file.
 */

/**
 * Simple hash function for creating short, unique identifiers
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate a deterministic tab ID for a direct file
 */
export function generateDirectFileTabId(filePath: string): string {
  const pathHash = simpleHash(filePath);
  return `direct-${pathHash}`;
}

/**
 * Generate a deterministic tab ID for a file within a folder
 */
export function generateFolderFileTabId(folderId: string, filePath: string): string {
  const pathHash = simpleHash(filePath);
  return `folder-${folderId}-${pathHash}`;
}

/**
 * Generate a deterministic tab ID for a file within a repository
 */
export function generateRepoFileTabId(repoId: string, branch: string, filePath: string): string {
  const pathHash = simpleHash(filePath);
  return `repo-${repoId}-${branch}-${pathHash}`;
}

/**
 * Generate a tab ID based on context
 */
export function generateTabId(
  filePath: string,
  context: {
    isDirectFile?: boolean;
    folderId?: string | null;
    repoId?: string;
    branch?: string;
  }
): string {
  const { folderId, repoId, branch } = context;

  // Repository file
  if (repoId && branch) {
    return generateRepoFileTabId(repoId, branch, filePath);
  }

  // Folder file
  if (folderId) {
    return generateFolderFileTabId(folderId, filePath);
  }

  // Direct file (default)
  return generateDirectFileTabId(filePath);
}
