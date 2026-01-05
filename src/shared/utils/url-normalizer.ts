/**
 * URL Normalization Utilities
 *
 * Standardizes repository URLs to prevent duplicates and ensure consistent formatting.
 *
 * Source: specs/001-git-repo-integration/data-model.md (Helper Functions section)
 */

/**
 * Normalizes a repository URL to a standard format
 *
 * Normalization rules:
 * - Ensures HTTPS protocol
 * - Removes trailing slashes
 * - Removes .git suffix
 * - Trims whitespace
 *
 * @param rawUrl - Raw repository URL provided by user
 * @returns Normalized HTTPS URL without trailing slashes or .git suffix
 *
 * @example
 * normalizeRepositoryUrl('https://github.com/user/repo.git/') → 'https://github.com/user/repo'
 * normalizeRepositoryUrl('http://github.com/user/repo/') → 'https://github.com/user/repo'
 * normalizeRepositoryUrl('  https://github.com/user/repo  ') → 'https://github.com/user/repo'
 */
export function normalizeRepositoryUrl(rawUrl: string): string {
  let normalized = rawUrl.trim();

  // Ensure HTTPS
  if (normalized.startsWith('http://')) {
    normalized = normalized.replace('http://', 'https://');
  }

  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, '');

  // Remove .git suffix
  if (normalized.endsWith('.git')) {
    normalized = normalized.slice(0, -4);
  }

  return normalized;
}
