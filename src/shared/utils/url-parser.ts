/**
 * Repository URL Parser
 *
 * Parses and extracts metadata from GitHub and Azure DevOps repository URLs.
 *
 * Source: specs/001-git-repo-integration/data-model.md (Helper Functions section)
 */

import { normalizeRepositoryUrl } from './url-normalizer';

/**
 * Parsed GitHub repository URL
 */
export interface ParsedGitHubUrl {
  provider: 'github';
  owner: string;
  name: string;
}

/**
 * Parsed Azure DevOps repository URL
 */
export interface ParsedAzureUrl {
  provider: 'azure';
  organization: string;
  project: string;
  repositoryId: string;
}

/**
 * Union type for parsed repository URLs
 */
export type ParsedRepositoryUrl = ParsedGitHubUrl | ParsedAzureUrl;

/**
 * Parses a repository URL and extracts provider-specific metadata
 *
 * @param url - Repository URL to parse
 * @returns Parsed URL with provider-specific fields
 * @throws {Error} If URL is invalid or from an unsupported provider
 *
 * @example
 * // GitHub
 * parseRepositoryUrl('https://github.com/facebook/react')
 * → { provider: 'github', owner: 'facebook', name: 'react' }
 *
 * // Azure DevOps
 * parseRepositoryUrl('https://dev.azure.com/myorg/myproject/_git/myrepo')
 * → { provider: 'azure', organization: 'myorg', project: 'myproject', repositoryId: 'myrepo' }
 */
export function parseRepositoryUrl(url: string): ParsedRepositoryUrl {
  const normalized = normalizeRepositoryUrl(url);
  const urlObj = new URL(normalized);

  // GitHub
  if (urlObj.hostname === 'github.com') {
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length < 2) {
      throw new Error('Invalid GitHub URL');
    }
    return {
      provider: 'github',
      owner: parts[0],
      name: parts[1],
    };
  }

  // Azure DevOps
  if (urlObj.hostname === 'dev.azure.com') {
    // Format: https://dev.azure.com/{organization}/{project}/_git/{repositoryId}
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length < 4 || parts[2] !== '_git') {
      throw new Error('Invalid Azure DevOps URL');
    }
    return {
      provider: 'azure',
      organization: parts[0],
      project: parts[1],
      repositoryId: parts[3],
    };
  }

  throw new Error('Unsupported Git provider');
}
