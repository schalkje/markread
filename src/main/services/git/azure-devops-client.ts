/**
 * Azure DevOps API Client
 *
 * Direct REST API v7.0 calls to Azure DevOps.
 * Provides repository operations: list branches, fetch files, fetch tree.
 */

import { gitHttpClient } from './http-client';
import type { BranchInfo } from '../../../shared/types/git-contracts';
import type { TreeNode } from '../../../shared/types/repository';

/**
 * Azure DevOps API client
 *
 * Features:
 * - Direct REST API v7.0 calls (no SDK dependency)
 * - Automatic rate limiting via http-client
 * - Base64 content decoding
 * - Recursive tree fetching
 */
export class AzureDevOpsClient {
  /**
   * List all branches (refs) in a repository
   *
   * @param organization - Azure DevOps organization
   * @param project - Project name
   * @param repositoryId - Repository ID or name
   * @returns Array of branch information
   */
  async listBranches(
    organization: string,
    project: string,
    repositoryId: string
  ): Promise<BranchInfo[]> {
    const baseUrl = this.getBaseUrl(organization);
    const url = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/refs`;

    console.log('[AzureDevOpsClient] Fetching branches from:', url);
    console.log('[AzureDevOpsClient] Parameters:', { organization, project, repositoryId });

    const response = await gitHttpClient.get<{
      value: Array<{
        name: string;
        objectId: string;
      }>;
    }>(url, {
      params: {
        filter: 'heads/',
        'api-version': '7.0',
      },
    });

    console.log('[AzureDevOpsClient] Branches response type:', typeof response);

    // Detect HTML sign-in page (Azure DevOps returns HTML instead of 401)
    if (typeof response === 'string' && response.includes('<!DOCTYPE html')) {
      throw {
        code: 'AUTH_FAILED',
        message: 'Authentication required. Please sign in to access this repository.',
        statusCode: 401,
        retryable: false,
      };
    }

    // Azure DevOps returns refs in format "refs/heads/main"
    // We need to strip the "refs/heads/" prefix
    return response.value.map(ref => ({
      name: ref.name.replace('refs/heads/', ''),
      sha: ref.objectId,
      isDefault: false, // Will be set by caller based on repository default branch
    }));
  }

  /**
   * Get default branch for a repository
   *
   * @param organization - Azure DevOps organization
   * @param project - Project name
   * @param repositoryId - Repository ID or name
   * @returns Default branch name
   */
  async getDefaultBranch(
    organization: string,
    project: string,
    repositoryId: string
  ): Promise<string> {
    const baseUrl = this.getBaseUrl(organization);
    const url = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}`;

    console.log('[AzureDevOpsClient] Fetching default branch from:', url);

    const response = await gitHttpClient.get<{
      defaultBranch?: string;
      name?: string;
      id?: string;
    }>(url, {
      params: {
        'api-version': '7.0',
      },
    });

    console.log('[AzureDevOpsClient] Repository response type:', typeof response);

    // Detect HTML sign-in page (Azure DevOps returns HTML instead of 401)
    if (typeof response === 'string' && response.includes('<!DOCTYPE html')) {
      throw {
        code: 'AUTH_FAILED',
        message: 'Authentication required. Please sign in to access this repository.',
        statusCode: 401,
        retryable: false,
      };
    }

    if (!response.defaultBranch) {
      throw new Error(
        `Repository found but no default branch. Response: ${JSON.stringify(response)}`
      );
    }

    // Azure DevOps returns default branch in format "refs/heads/main"
    // Strip the "refs/heads/" prefix
    return response.defaultBranch.replace('refs/heads/', '');
  }

  /**
   * Get file content from repository
   *
   * @param organization - Azure DevOps organization
   * @param project - Project name
   * @param repositoryId - Repository ID or name
   * @param path - File path relative to repository root
   * @param branch - Branch name (optional, defaults to default branch)
   * @returns Decoded file content
   */
  async getFileContent(
    organization: string,
    project: string,
    repositoryId: string,
    path: string,
    branch?: string
  ): Promise<{
    content: string;
    sha: string;
    size: number;
  }> {
    const baseUrl = this.getBaseUrl(organization);
    const url = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/items`;

    const params: Record<string, string> = {
      path: path.startsWith('/') ? path : `/${path}`,
      'api-version': '7.0',
      includeContent: 'true',
    };

    if (branch) {
      params['versionDescriptor.version'] = branch;
      params['versionDescriptor.versionType'] = 'branch';
    }

    console.log('[AzureDevOpsClient] Fetching file content from:', url, 'with params:', params);

    // Azure DevOps returns the file content directly as a string when includeContent=true
    const response = await gitHttpClient.get<string>(url, { params });

    console.log('[AzureDevOpsClient] File content received:', {
      responseType: typeof response,
      contentLength: typeof response === 'string' ? response.length : 0,
    });

    // Azure DevOps returns content as plain text (not base64) directly as string
    // We don't get objectId or size in this response, so we'll compute size
    const content = typeof response === 'string' ? response : '';
    return {
      content,
      sha: '', // Not provided in this API call
      size: Buffer.byteLength(content, 'utf-8'),
    };
  }

  /**
   * Get repository file tree (recursive)
   *
   * @param organization - Azure DevOps organization
   * @param project - Project name
   * @param repositoryId - Repository ID or name
   * @param branch - Branch name (defaults to 'main')
   * @param markdownOnly - Filter to only include markdown files
   * @returns Tree structure with all files
   */
  async getRepositoryTree(
    organization: string,
    project: string,
    repositoryId: string,
    branch: string = 'main',
    markdownOnly: boolean = false
  ): Promise<TreeNode[]> {
    console.log('[AzureDevOpsClient] Fetching tree for:', { organization, project, repositoryId, branch });

    // First, get the commit for the branch
    const baseUrl = this.getBaseUrl(organization);
    const refsUrl = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/refs`;

    console.log('[AzureDevOpsClient] Fetching refs from:', refsUrl);

    try {
      const refsResponse = await gitHttpClient.get<{
        value: Array<{
          name: string;
          objectId: string;
        }>;
      }>(refsUrl, {
        params: {
          filter: `heads/${branch}`,
          'api-version': '7.0',
        },
      });

      console.log('[AzureDevOpsClient] Refs response:', JSON.stringify(refsResponse, null, 2));

      if (!refsResponse.value || refsResponse.value.length === 0) {
        throw new Error(`Branch not found: ${branch}`);
      }

      const commitId = refsResponse.value[0].objectId;
      console.log('[AzureDevOpsClient] Found commit:', commitId);

      // Use /items endpoint with recursionLevel=Full to get all files
      // This endpoint accepts commit SHA and returns all items in the tree
      const itemsUrl = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/items`;

      console.log('[AzureDevOpsClient] Fetching items from:', itemsUrl);

      const itemsResponse = await gitHttpClient.get<{
        value: Array<{
          path: string;
          gitObjectType: 'blob' | 'tree';
          objectId: string;
          size?: number;
        }>;
      }>(itemsUrl, {
        params: {
          recursionLevel: 'Full',
          versionDescriptor: JSON.stringify({
            versionType: 'commit',
            version: commitId,
          }),
          'api-version': '7.0',
        },
      });

      console.log('[AzureDevOpsClient] Items response count:', itemsResponse.value?.length || 0);

      // Log first few items for debugging
      console.log('[AzureDevOpsClient] Sample items:', JSON.stringify(itemsResponse.value.slice(0, 5), null, 2));

      // Build tree structure
      const nodes: TreeNode[] = [];
      const pathMap = new Map<string, TreeNode>();

      // Skip the root folder (path: "/")
      const items = itemsResponse.value.filter(item => item.path !== '/');

      // First pass: Create all nodes and add them to pathMap
      for (const item of items) {
        // Remove leading slash from path
        const relativePath = item.path.startsWith('/') ? item.path.substring(1) : item.path;
        const isMarkdown = relativePath.match(/\.(md|markdown|mdown)$/i) !== null;

        // Skip if markdownOnly filter is enabled and file is not markdown
        if (markdownOnly && item.gitObjectType === 'blob' && !isMarkdown) {
          continue;
        }

        const node: TreeNode = {
          path: relativePath,
          type: item.gitObjectType === 'blob' ? 'file' : 'directory',
          size: item.size || 0,
          sha: item.objectId,
          isMarkdown,
          children: item.gitObjectType === 'tree' ? [] : undefined,
        };

        pathMap.set(relativePath, node);
      }

      console.log('[AzureDevOpsClient] pathMap size after first pass:', pathMap.size);
      console.log('[AzureDevOpsClient] All paths in pathMap:', Array.from(pathMap.keys()));

      // Second pass: Build parent-child relationships
      for (const [relativePath, node] of pathMap.entries()) {
        const parentPath = relativePath.substring(0, relativePath.lastIndexOf('/'));
        if (parentPath) {
          const parent = pathMap.get(parentPath);
          console.log('[AzureDevOpsClient] Processing:', relativePath, '-> parent:', parentPath, 'found:', !!parent);
          if (parent && parent.children) {
            parent.children.push(node);
            console.log('[AzureDevOpsClient] Added child to parent. Parent now has', parent.children.length, 'children');
          } else if (parent) {
            console.warn('[AzureDevOpsClient] Parent found but has no children array:', parentPath);
          } else {
            console.warn('[AzureDevOpsClient] Parent not found for:', relativePath, 'parent:', parentPath);
          }
        } else {
          // Top-level item
          nodes.push(node);
          console.log('[AzureDevOpsClient] Added top-level node:', relativePath);
        }
      }

      console.log('[AzureDevOpsClient] Built tree with', nodes.length, 'top-level nodes');

      // Log tree with limited depth to avoid too much output
      console.log('[AzureDevOpsClient] Tree structure (first 3 nodes):');
      nodes.slice(0, 3).forEach((node, i) => {
        console.log(`  [${i}] ${node.path} (${node.type}) - ${node.children?.length || 0} children`);
        if (node.children && node.children.length > 0) {
          node.children.slice(0, 3).forEach((child, j) => {
            console.log(`    [${j}] ${child.path} (${child.type})`);
          });
        }
      });

      return nodes;
    } catch (error: any) {
      console.error('[AzureDevOpsClient] Error fetching tree:', {
        message: error.message,
        statusCode: error.statusCode || error.response?.status,
        code: error.code,
        details: error.details,
        responseData: error.response?.data || error._originalError?.response?.data,
        responseStatus: error.response?.status || error._originalError?.response?.status,
        responseHeaders: error.response?.headers || error._originalError?.response?.headers,
        config: {
          url: error.config?.url || error._originalError?.config?.url,
          method: error.config?.method || error._originalError?.config?.method,
          params: error.config?.params || error._originalError?.config?.params,
        },
      });
      throw error;
    }
  }

  /**
   * Check if a file exists at a specific path and branch
   *
   * @param organization - Azure DevOps organization
   * @param project - Project name
   * @param repositoryId - Repository ID or name
   * @param path - File path
   * @param branch - Branch name
   * @returns True if file exists
   */
  async fileExists(
    organization: string,
    project: string,
    repositoryId: string,
    path: string,
    branch: string
  ): Promise<boolean> {
    try {
      const baseUrl = this.getBaseUrl(organization);
      const url = `${baseUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/items`;

      await gitHttpClient.get(url, {
        params: {
          path: path.startsWith('/') ? path : `/${path}`,
          'versionDescriptor.version': branch,
          'versionDescriptor.versionType': 'branch',
          'api-version': '7.0',
        },
      });
      return true;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get base URL for Azure DevOps API
   * Supports both dev.azure.com and visualstudio.com formats
   *
   * @param organization - Azure DevOps organization
   * @returns Base URL for API calls
   */
  private getBaseUrl(organization: string): string {
    // Use modern dev.azure.com format for all API calls
    return `https://dev.azure.com/${organization}`;
  }
}

// Export singleton instance
export const azureDevOpsClient = new AzureDevOpsClient();
