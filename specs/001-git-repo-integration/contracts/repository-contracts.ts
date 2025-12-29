/**
 * Repository Contracts: Git Repository Integration
 *
 * IPC contracts for repository connection, branch management, and repository operations.
 * Aligns with FR-001 through FR-012, and User Stories 1, 3, 4, 5.
 */

import { z } from 'zod';
import type { IPCResponse } from './error-contracts';

// ============================================================================
// Connect to Repository
// ============================================================================

/**
 * Request to connect to a Git repository (GitHub or Azure DevOps)
 * Aligns with FR-001, FR-002, FR-009
 */
export interface ConnectRepositoryRequest {
  /** Repository URL (will be normalized) */
  url: string;

  /** Authentication method to use */
  authMethod: 'oauth' | 'pat';

  /** Initial branch to open (optional, defaults to repository default branch) */
  initialBranch?: string;
}

export const ConnectRepositoryRequestSchema = z.object({
  url: z.string()
    .url('Must be a valid URL')
    .startsWith('https://', 'Only HTTPS URLs are supported')
    .refine(
      (url) => {
        const hostname = new URL(url).hostname;
        return hostname === 'github.com' || hostname === 'dev.azure.com';
      },
      { message: 'Only GitHub and Azure DevOps repositories are supported' }
    ),
  authMethod: z.enum(['oauth', 'pat'], {
    errorMap: () => ({ message: 'Authentication method must be either "oauth" or "pat"' })
  }),
  initialBranch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/).optional(),
});

/**
 * Response from connecting to a repository
 * Aligns with FR-012, SC-001
 */
export interface ConnectRepositoryResponse {
  /** Unique repository identifier (UUID) */
  repositoryId: string;

  /** Normalized repository URL */
  url: string;

  /** Repository display name */
  displayName: string;

  /** Default branch name */
  defaultBranch: string;

  /** Currently active branch name */
  currentBranch: string;

  /** List of all available branches */
  branches: BranchInfo[];

  /** Git provider type */
  provider: 'github' | 'azure';
}

export type ConnectRepositoryIPCResponse = IPCResponse<ConnectRepositoryResponse>;

// ============================================================================
// List Branches
// ============================================================================

/**
 * Request to list all branches in a repository
 * Aligns with FR-010
 */
export interface ListBranchesRequest {
  /** Repository identifier */
  repositoryId: string;
}

export const ListBranchesRequestSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID format'),
});

/**
 * Information about a single branch
 */
export interface BranchInfo {
  /** Branch name */
  name: string;

  /** Latest commit SHA */
  sha: string;

  /** Whether this is the default branch */
  isDefault: boolean;

  /** Last time this branch was accessed in MarkRead */
  lastAccessed?: number;
}

/**
 * Response from listing branches
 */
export interface ListBranchesResponse {
  /** List of all branches */
  branches: BranchInfo[];

  /** Currently active branch */
  currentBranch: string;
}

export type ListBranchesIPCResponse = IPCResponse<ListBranchesResponse>;

// ============================================================================
// Switch Branch
// ============================================================================

/**
 * Request to switch to a different branch
 * Aligns with FR-010, User Story 3, SC-003
 */
export interface SwitchBranchRequest {
  /** Repository identifier */
  repositoryId: string;

  /** Branch name to switch to */
  branchName: string;

  /** Whether to preserve currently opened file path (if it exists on new branch) */
  preserveFilePath?: boolean;
}

export const SwitchBranchRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  branchName: z.string()
    .min(1, 'Branch name cannot be empty')
    .regex(/^[a-zA-Z0-9\-_./]+$/, 'Invalid branch name format'),
  preserveFilePath: z.boolean().optional(),
});

/**
 * Response from switching branches
 */
export interface SwitchBranchResponse {
  /** New current branch */
  currentBranch: string;

  /** Latest commit SHA on new branch */
  sha: string;

  /** Whether the previously viewed file exists on this branch */
  fileExistsOnNewBranch?: boolean;
}

export type SwitchBranchIPCResponse = IPCResponse<SwitchBranchResponse>;

// ============================================================================
// Disconnect Repository
// ============================================================================

/**
 * Request to disconnect from a repository
 * This does not delete cached files unless explicitly requested
 */
export interface DisconnectRepositoryRequest {
  /** Repository identifier */
  repositoryId: string;

  /** Whether to clear cached files for this repository */
  clearCache?: boolean;
}

export const DisconnectRepositoryRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  clearCache: z.boolean().optional(),
});

/**
 * Response from disconnecting a repository
 */
export interface DisconnectRepositoryResponse {
  /** Whether the repository was successfully disconnected */
  disconnected: boolean;

  /** Number of cached files cleared (if clearCache was true) */
  filesCleared?: number;
}

export type DisconnectRepositoryIPCResponse = IPCResponse<DisconnectRepositoryResponse>;

// ============================================================================
// Open Multiple Branches
// ============================================================================

/**
 * Request to open the same repository with a different branch in a new tab
 * Aligns with FR-011, User Story 5
 */
export interface OpenBranchInNewTabRequest {
  /** Repository identifier */
  repositoryId: string;

  /** Branch name to open in new tab */
  branchName: string;
}

export const OpenBranchInNewTabRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  branchName: z.string().regex(/^[a-zA-Z0-9\-_./]+$/),
});

/**
 * Response from opening a branch in a new tab
 */
export interface OpenBranchInNewTabResponse {
  /** Unique tab identifier */
  tabId: string;

  /** Repository identifier (same as request) */
  repositoryId: string;

  /** Branch name (same as request) */
  branchName: string;
}

export type OpenBranchInNewTabIPCResponse = IPCResponse<OpenBranchInNewTabResponse>;

// ============================================================================
// Get Repository Info
// ============================================================================

/**
 * Request to get current repository information
 */
export interface GetRepositoryInfoRequest {
  /** Repository identifier */
  repositoryId: string;
}

export const GetRepositoryInfoRequestSchema = z.object({
  repositoryId: z.string().uuid(),
});

/**
 * Response with detailed repository information
 */
export interface GetRepositoryInfoResponse {
  /** Repository identifier */
  id: string;

  /** Repository URL */
  url: string;

  /** Display name */
  displayName: string;

  /** Git provider */
  provider: 'github' | 'azure';

  /** Current branch */
  currentBranch: string;

  /** Default branch */
  defaultBranch: string;

  /** Authentication method used */
  authMethod: 'oauth' | 'pat';

  /** Whether currently online */
  isOnline: boolean;

  /** Last accessed timestamp */
  lastAccessed: number;

  /** Number of cached files */
  cachedFileCount: number;

  /** Total cache size in bytes */
  cacheSize: number;
}

export type GetRepositoryInfoIPCResponse = IPCResponse<GetRepositoryInfoResponse>;
