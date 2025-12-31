/**
 * Repository Service
 *
 * Orchestrates Git repository operations: connect, fetch files, fetch tree.
 * Integrates GitHub client, credential store, cache manager, and rate limiter.
 */

import { v4 as uuidv4 } from 'uuid';
import { githubClient } from './github-client';
import { credentialStore } from '../storage/credential-store';
import { cacheManager } from '../storage/cache-manager';
import { gitHttpClient } from './http-client';
import { parseRepositoryUrl } from '../../../shared/utils/url-parser';
import { normalizeRepositoryUrl } from '../../../shared/utils/url-normalizer';
import type {
  ConnectRepositoryRequest,
  ConnectRepositoryResponse,
  FetchFileRequest,
  FetchFileResponse,
  FetchRepositoryTreeRequest,
  FetchRepositoryTreeResponse,
} from '../../../shared/types/git-contracts';
import type { Repository } from '../../../shared/types/repository';

/**
 * Repository service
 *
 * Features:
 * - Repository connection with authentication
 * - File fetching with caching
 * - Tree fetching with markdown filtering
 * - OAuth and PAT support
 */
export class RepositoryService {
  private repositories: Map<string, Repository> = new Map();
  private tokenProviderInitialized = false;

  constructor() {
    // Initialize token provider for HTTP client
    this.initializeTokenProvider();
  }

  /**
   * Initialize the token provider for the HTTP client
   * This provides authentication tokens for all GitHub API requests
   */
  private initializeTokenProvider(): void {
    if (this.tokenProviderInitialized) return;

    gitHttpClient.setTokenProvider(async (url: string) => {
      try {
        // Determine provider from URL
        const urlObj = new URL(url);
        let provider: 'github' | 'azure' | null = null;

        if (urlObj.hostname.includes('github')) {
          provider = 'github';
        } else if (urlObj.hostname.includes('azure')) {
          provider = 'azure';
        }

        if (!provider) return null;

        // Get stored token for this provider
        const token = await credentialStore.getToken(provider);
        return token;
      } catch (error) {
        // If token retrieval fails, proceed without authentication
        return null;
      }
    });

    this.tokenProviderInitialized = true;
  }

  /**
   * Connect to a Git repository
   *
   * @param request - Connection request
   * @returns Repository information with branches
   */
  async connect(request: ConnectRepositoryRequest): Promise<ConnectRepositoryResponse> {
    // Normalize and parse URL
    const normalizedUrl = normalizeRepositoryUrl(request.url);
    const parsed = parseRepositoryUrl(normalizedUrl);

    if (parsed.provider !== 'github') {
      throw {
        code: 'INVALID_URL',
        message: 'Only GitHub repositories are supported in this phase',
        retryable: false,
      };
    }

    // Get or create repository ID
    const repositoryId = uuidv4();

    // Fetch repository information
    const defaultBranch = await githubClient.getDefaultBranch(parsed.owner, parsed.name);
    const allBranches = await githubClient.listBranches(parsed.owner, parsed.name);

    // Mark default branch
    const branches = allBranches.map(b => ({
      ...b,
      isDefault: b.name === defaultBranch,
    }));

    const currentBranch = request.initialBranch || defaultBranch;

    // Create repository entity
    const repository: Repository = {
      id: repositoryId,
      provider: 'github',
      url: normalizedUrl,
      rawUrl: request.url,
      displayName: `${parsed.owner}/${parsed.name}`,
      owner: parsed.owner,
      name: parsed.name,
      defaultBranch,
      currentBranch,
      authMethod: request.authMethod,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
      isOnline: true,
    };

    // Store repository
    this.repositories.set(repositoryId, repository);

    return {
      repositoryId,
      url: normalizedUrl,
      displayName: repository.displayName,
      defaultBranch,
      currentBranch,
      branches,
      provider: 'github',
    };
  }

  /**
   * Fetch a file from repository
   *
   * @param request - File fetch request
   * @returns File content and metadata
   */
  async fetchFile(request: FetchFileRequest): Promise<FetchFileResponse> {
    const repository = this.repositories.get(request.repositoryId);
    if (!repository) {
      throw {
        code: 'REPOSITORY_NOT_FOUND',
        message: 'Repository not found. Please connect first.',
        retryable: false,
      };
    }

    const branch = request.branch || repository.currentBranch;

    // Check cache first (unless force refresh)
    if (!request.forceRefresh) {
      const cachedContent = await cacheManager.get(
        request.repositoryId,
        request.filePath,
        branch
      );

      if (cachedContent) {
        const isMarkdown = request.filePath.match(/\.(md|markdown|mdown)$/i) !== null;
        return {
          filePath: request.filePath,
          content: cachedContent,
          size: Buffer.byteLength(cachedContent, 'utf-8'),
          sha: '', // SHA not stored in cache metadata for now
          isMarkdown,
          cached: true,
          fetchedAt: Date.now(),
          branch,
        };
      }
    }

    // Fetch from GitHub
    if (!repository.owner || !repository.name) {
      throw {
        code: 'INVALID_URL',
        message: 'Repository missing owner or name',
        retryable: false,
      };
    }

    try {
      const fileData = await githubClient.getFileContent(
        repository.owner,
        repository.name,
        request.filePath,
        branch
      );

      const isMarkdown = request.filePath.match(/\.(md|markdown|mdown)$/i) !== null;

      // Store in cache
      await cacheManager.set(
        request.repositoryId,
        request.filePath,
        branch,
        fileData.content
      );

      return {
        filePath: request.filePath,
        content: fileData.content,
        size: fileData.size,
        sha: fileData.sha,
        isMarkdown,
        cached: false,
        fetchedAt: Date.now(),
        branch,
      };
    } catch (error: any) {
      // Provide a more specific error message for file 404s
      if (error.statusCode === 404) {
        throw {
          code: 'FILE_NOT_FOUND',
          message: `File not found: ${request.filePath}`,
          details: 'This file may have been moved, renamed, or deleted. Please refresh the file tree to see the latest files.',
          statusCode: 404,
          retryable: false,
        };
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Fetch repository file tree
   *
   * @param request - Tree fetch request
   * @returns File tree structure (from cache if available, then fresh from GitHub)
   */
  async fetchTree(request: FetchRepositoryTreeRequest): Promise<FetchRepositoryTreeResponse> {
    const repository = this.repositories.get(request.repositoryId);
    if (!repository) {
      throw {
        code: 'REPOSITORY_NOT_FOUND',
        message: 'Repository not found. Please connect first.',
        retryable: false,
      };
    }

    const branch = request.branch || repository.currentBranch;

    if (!repository.owner || !repository.name) {
      throw {
        code: 'INVALID_URL',
        message: 'Repository missing owner or name',
        retryable: false,
      };
    }

    // Try to get from cache first
    const cachedTree = await cacheManager.getTree(request.repositoryId, branch);

    // Fetch fresh tree from GitHub
    const tree = await githubClient.getRepositoryTree(
      repository.owner,
      repository.name,
      branch,
      request.markdownOnly
    );

    // Count files
    let fileCount = 0;
    let markdownFileCount = 0;

    const countFiles = (nodes: typeof tree) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          fileCount++;
          if (node.isMarkdown) {
            markdownFileCount++;
          }
        }
        if (node.children) {
          countFiles(node.children);
        }
      }
    };

    countFiles(tree);

    const response: FetchRepositoryTreeResponse = {
      tree,
      fileCount,
      markdownFileCount,
      branch,
      fetchedAt: Date.now(),
      fromCache: false,
    };

    // Cache the tree for future use (fire and forget)
    cacheManager.setTree(request.repositoryId, branch, response).catch(() => {
      // Ignore cache errors
    });

    return response;
  }

  /**
   * Get cached repository file tree if available
   *
   * @param request - Tree fetch request
   * @returns Cached file tree structure, or null if not cached
   */
  async getCachedTree(request: FetchRepositoryTreeRequest): Promise<FetchRepositoryTreeResponse | null> {
    const repository = this.repositories.get(request.repositoryId);
    if (!repository) {
      return null;
    }

    const branch = request.branch || repository.currentBranch;
    const cachedTree = await cacheManager.getTree(request.repositoryId, branch);

    if (cachedTree) {
      return {
        ...cachedTree,
        fromCache: true,
      };
    }

    return null;
  }

  /**
   * Get repository by ID
   *
   * @param repositoryId - Repository identifier
   * @returns Repository or undefined
   */
  getRepository(repositoryId: string): Repository | undefined {
    return this.repositories.get(repositoryId);
  }

  /**
   * List all connected repositories
   *
   * @returns Array of repositories
   */
  listRepositories(): Repository[] {
    return Array.from(this.repositories.values());
  }
}

// Export singleton instance
export const repositoryService = new RepositoryService();
