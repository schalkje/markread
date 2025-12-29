/**
 * Git IPC Contracts
 *
 * Consolidated IPC contracts for Git repository operations.
 * Source: specs/001-git-repo-integration/contracts/
 */

import { z } from 'zod';
import type { IPCResponse } from './ipc';
import type { TreeNode } from './repository';

// ============================================================================
// Repository Connection (T029)
// ============================================================================

/**
 * Request to connect to a Git repository
 * Aligns with FR-001, FR-002, FR-009
 */
export interface ConnectRepositoryRequest {
  url: string;
  authMethod: 'oauth' | 'pat';
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
  authMethod: z.enum(['oauth', 'pat']),
  initialBranch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/).optional(),
});

/**
 * Branch information
 */
export interface BranchInfo {
  name: string;
  sha: string;
  isDefault: boolean;
  lastAccessed?: number;
}

/**
 * Response from connecting to a repository
 */
export interface ConnectRepositoryResponse {
  repositoryId: string;
  url: string;
  displayName: string;
  defaultBranch: string;
  currentBranch: string;
  branches: BranchInfo[];
  provider: 'github' | 'azure';
}

export type ConnectRepositoryIPCResponse = IPCResponse<ConnectRepositoryResponse>;

// ============================================================================
// List Branches
// ============================================================================

export interface ListBranchesRequest {
  repositoryId: string;
}

export const ListBranchesRequestSchema = z.object({
  repositoryId: z.string().uuid(),
});

export interface ListBranchesResponse {
  branches: BranchInfo[];
  currentBranch: string;
}

export type ListBranchesIPCResponse = IPCResponse<ListBranchesResponse>;

// ============================================================================
// Switch Branch
// ============================================================================

export interface SwitchBranchRequest {
  repositoryId: string;
  branchName: string;
  preserveFilePath?: boolean;
}

export const SwitchBranchRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  branchName: z.string().min(1).regex(/^[a-zA-Z0-9\-_./]+$/),
  preserveFilePath: z.boolean().optional(),
});

export interface SwitchBranchResponse {
  currentBranch: string;
  sha: string;
  fileExistsOnNewBranch?: boolean;
}

export type SwitchBranchIPCResponse = IPCResponse<SwitchBranchResponse>;

// ============================================================================
// File Operations (T030)
// ============================================================================

/**
 * Request to fetch a file from repository
 * Aligns with FR-012, FR-013, FR-015
 */
export interface FetchFileRequest {
  repositoryId: string;
  filePath: string;
  branch?: string;
  forceRefresh?: boolean;
}

export const FetchFileRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  filePath: z.string()
    .min(1)
    .max(1024)
    .regex(/^[a-zA-Z0-9\-_./]+$/)
    .refine((path) => !path.includes('..'), 'Path traversal not allowed'),
  branch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/).optional(),
  forceRefresh: z.boolean().optional(),
});

/**
 * Response from fetching a file
 */
export interface FetchFileResponse {
  filePath: string;
  content: string;
  size: number;
  sha: string;
  isMarkdown: boolean;
  cached: boolean;
  fetchedAt: number;
  branch: string;
}

export type FetchFileIPCResponse = IPCResponse<FetchFileResponse>;

// ============================================================================
// Repository Tree
// ============================================================================

/**
 * Request to fetch repository file tree
 * Aligns with FR-012, User Story 1 (AS #2)
 */
export interface FetchRepositoryTreeRequest {
  repositoryId: string;
  branch?: string;
  markdownOnly?: boolean;
  maxDepth?: number;
}

export const FetchRepositoryTreeRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  branch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/).optional(),
  markdownOnly: z.boolean().optional(),
  maxDepth: z.number().positive().int().optional(),
});

/**
 * Response from fetching repository tree
 */
export interface FetchRepositoryTreeResponse {
  tree: TreeNode[];
  fileCount: number;
  markdownFileCount: number;
  branch: string;
  fetchedAt: number;
}

export type FetchRepositoryTreeIPCResponse = IPCResponse<FetchRepositoryTreeResponse>;

// ============================================================================
// Refresh File
// ============================================================================

export interface RefreshFileRequest {
  repositoryId: string;
  filePath: string;
  branch?: string;
}

export const RefreshFileRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  filePath: z.string()
    .min(1)
    .max(1024)
    .regex(/^[a-zA-Z0-9\-_./]+$/)
    .refine((path) => !path.includes('..')),
  branch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/).optional(),
});

export interface RefreshFileResponse {
  filePath: string;
  contentChanged: boolean;
  content?: string;
  sha?: string;
  refreshedAt: number;
}

export type RefreshFileIPCResponse = IPCResponse<RefreshFileResponse>;

// ============================================================================
// Connectivity (T031)
// ============================================================================

/**
 * Request to check connectivity to Git providers
 * Aligns with FR-027, FR-029
 */
export interface CheckConnectivityRequest {
  provider?: 'github' | 'azure';
  timeoutMs?: number;
}

export const CheckConnectivityRequestSchema = z.object({
  provider: z.enum(['github', 'azure']).optional(),
  timeoutMs: z.number().positive().int().max(30000).optional(),
});

/**
 * Provider connectivity status
 */
export interface ProviderConnectivityStatus {
  provider: 'github' | 'azure';
  isReachable: boolean;
  responseTimeMs?: number;
  lastSuccessfulConnection?: number;
  error?: string;
}

/**
 * Response from checking connectivity
 */
export interface CheckConnectivityResponse {
  isOnline: boolean;
  navigatorOnline: boolean;
  providers: ProviderConnectivityStatus[];
  checkedAt: number;
}

export type CheckConnectivityIPCResponse = IPCResponse<CheckConnectivityResponse>;

// ============================================================================
// Get Connectivity Status (cached)
// ============================================================================

export interface GetConnectivityStatusRequest {
  // No parameters
}

export const GetConnectivityStatusRequestSchema = z.object({});

export interface GetConnectivityStatusResponse {
  isOnline: boolean;
  navigatorOnline: boolean;
  providers: ProviderConnectivityStatus[];
  lastChecked: number;
  ageSeconds: number;
}

export type GetConnectivityStatusIPCResponse = IPCResponse<GetConnectivityStatusResponse>;
