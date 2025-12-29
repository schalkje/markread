/**
 * GitHub API Client
 *
 * Direct REST API v3 calls to GitHub.
 * Provides repository operations: list branches, fetch files, fetch tree.
 *
 * Source: specs/001-git-repo-integration/research.md (Section 4)
 */

import { gitHttpClient } from './http-client';
import type { BranchInfo } from '@/shared/types/git-contracts';
import type { TreeNode } from '@/shared/types/repository';

/**
 * GitHub API client
 *
 * Features:
 * - Direct REST API v3 calls (no SDK dependency)
 * - Automatic rate limiting via http-client
 * - Base64 content decoding
 * - Recursive tree fetching
 */
export class GitHubClient {
  private readonly BASE_URL = 'https://api.github.com';

  /**
   * List all branches in a repository
   *
   * @param owner - Repository owner/organization
   * @param repo - Repository name
   * @returns Array of branch information
   */
  async listBranches(owner: string, repo: string): Promise<BranchInfo[]> {
    const url = `${this.BASE_URL}/repos/${owner}/${repo}/branches`;

    const response = await gitHttpClient.get<Array<{
      name: string;
      commit: { sha: string };
    }>>(url);

    return response.map(b => ({
      name: b.name,
      sha: b.commit.sha,
      isDefault: false, // Will be set by caller based on repository default branch
    }));
  }

  /**
   * Get default branch for a repository
   *
   * @param owner - Repository owner/organization
   * @param repo - Repository name
   * @returns Default branch name
   */
  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const url = `${this.BASE_URL}/repos/${owner}/${repo}`;

    const response = await gitHttpClient.get<{
      default_branch: string;
    }>(url);

    return response.default_branch;
  }

  /**
   * Get file content from repository
   *
   * @param owner - Repository owner/organization
   * @param repo - Repository name
   * @param path - File path relative to repository root
   * @param ref - Branch or commit SHA (optional, defaults to default branch)
   * @returns Decoded file content
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<{
    content: string;
    sha: string;
    size: number;
  }> {
    const url = `${this.BASE_URL}/repos/${owner}/${repo}/contents/${path}`;
    const params = ref ? { ref } : {};

    const response = await gitHttpClient.get<{
      content: string;
      sha: string;
      size: number;
      encoding: string;
    }>(url, { params });

    // GitHub returns base64-encoded content
    if (response.encoding === 'base64') {
      const content = Buffer.from(response.content, 'base64').toString('utf-8');
      return {
        content,
        sha: response.sha,
        size: response.size,
      };
    }

    return {
      content: response.content,
      sha: response.sha,
      size: response.size,
    };
  }

  /**
   * Get repository file tree (recursive)
   *
   * @param owner - Repository owner/organization
   * @param repo - Repository name
   * @param branch - Branch name (defaults to 'main')
   * @param markdownOnly - Filter to only include markdown files
   * @returns Tree structure with all files
   */
  async getRepositoryTree(
    owner: string,
    repo: string,
    branch: string = 'main',
    markdownOnly: boolean = false
  ): Promise<TreeNode[]> {
    const url = `${this.BASE_URL}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

    const response = await gitHttpClient.get<{
      tree: Array<{
        path: string;
        type: 'blob' | 'tree';
        sha: string;
        size?: number;
      }>;
    }>(url);

    // Build tree structure
    const nodes: TreeNode[] = [];
    const pathMap = new Map<string, TreeNode>();

    for (const item of response.tree) {
      const isMarkdown = item.path.match(/\.(md|markdown|mdown)$/i) !== null;

      // Skip if markdownOnly filter is enabled and file is not markdown
      if (markdownOnly && item.type === 'blob' && !isMarkdown) {
        continue;
      }

      const node: TreeNode = {
        path: item.path,
        type: item.type === 'blob' ? 'file' : 'directory',
        size: item.size || 0,
        sha: item.sha,
        isMarkdown,
        children: item.type === 'tree' ? [] : undefined,
      };

      pathMap.set(item.path, node);

      // Find parent directory
      const parentPath = item.path.substring(0, item.path.lastIndexOf('/'));
      if (parentPath) {
        const parent = pathMap.get(parentPath);
        if (parent && parent.children) {
          parent.children.push(node);
        }
      } else {
        // Top-level item
        nodes.push(node);
      }
    }

    return nodes;
  }

  /**
   * Check if a file exists at a specific path and branch
   *
   * @param owner - Repository owner/organization
   * @param repo - Repository name
   * @param path - File path
   * @param branch - Branch name
   * @returns True if file exists
   */
  async fileExists(
    owner: string,
    repo: string,
    path: string,
    branch: string
  ): Promise<boolean> {
    try {
      const url = `${this.BASE_URL}/repos/${owner}/${repo}/contents/${path}`;
      await gitHttpClient.get(url, { params: { ref: branch } });
      return true;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }
}

// Export singleton instance
export const githubClient = new GitHubClient();
