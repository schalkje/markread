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
// Fetch Repository Info (for branch selection before connecting)
// ============================================================================

/**
 * Request to fetch repository metadata without creating a connection
 * Used for branch selection before connecting
 */
export interface FetchRepositoryInfoRequest {
  url: string;
  authMethod: 'oauth' | 'pat';
}

export const FetchRepositoryInfoRequestSchema = z.object({
  url: z.string()
    .url('Must be a valid URL')
    .startsWith('https://', 'Only HTTPS URLs are supported'),
  authMethod: z.enum(['oauth', 'pat']),
});

/**
 * Response containing repository metadata
 */
export interface FetchRepositoryInfoResponse {
  displayName: string;
  defaultBranch: string;
  branches: BranchInfo[];
  provider: 'github' | 'azure';
}

export type FetchRepositoryInfoIPCResponse = IPCResponse<FetchRepositoryInfoResponse>;

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
  fromCache?: boolean; // Indicates if tree was loaded from cache
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

// ============================================================================
// Authentication - Personal Access Token
// ============================================================================

/**
 * Request to authenticate using a Personal Access Token
 * Aligns with FR-004, User Story 2
 */
export interface AuthenticateWithPATRequest {
  /** Git provider */
  provider: 'github' | 'azure';

  /** Personal Access Token */
  token: string;

  /** Repository URL (optional, for testing token validity) */
  testRepository?: string;
}

export const AuthenticateWithPATRequestSchema = z.object({
  provider: z.enum(['github', 'azure']),
  token: z.string()
    .min(1, 'Token cannot be empty')
    .max(500, 'Token too long'),
  testRepository: z.string().url().startsWith('https://').optional(),
});

/**
 * Response from PAT authentication
 */
export interface AuthenticateWithPATResponse {
  /** Whether token was successfully stored */
  tokenStored: boolean;

  /** Whether token was validated (if testRepository was provided) */
  validated: boolean;

  /** User information (if available from token validation) */
  user?: {
    username: string;
    email?: string;
  };

  /** Token scopes (if detectable) */
  scopes?: string[];
}

export type AuthenticateWithPATIPCResponse = IPCResponse<AuthenticateWithPATResponse>;

// ============================================================================
// Authentication - Device Flow (GitHub)
// ============================================================================

/**
 * Request to initiate GitHub Device Flow authentication
 * No client secret required - perfect for desktop applications
 */
export interface InitiateDeviceFlowRequest {
  /** Git provider to authenticate with */
  provider: 'github' | 'azure';

  /** OAuth scopes to request (optional, uses defaults if not provided) */
  scopes?: string[];
}

export const InitiateDeviceFlowRequestSchema = z.object({
  provider: z.enum(['github', 'azure']),
  scopes: z.array(z.string()).optional(),
});

/**
 * Response from initiating Device Flow
 */
export interface InitiateDeviceFlowResponse {
  /** Device Flow session ID (for tracking) */
  sessionId: string;

  /** User code to display to the user (e.g., "ABCD-1234") */
  userCode: string;

  /** URL where user should enter the code (e.g., "https://github.com/login/device") */
  verificationUri: string;

  /** Seconds until the user_code and device_code expire */
  expiresIn: number;

  /** Minimum seconds between polling requests */
  interval: number;

  /** Whether browser was successfully opened */
  browserOpened: boolean;
}

export type InitiateDeviceFlowIPCResponse = IPCResponse<InitiateDeviceFlowResponse>;

/**
 * Request to check Device Flow completion status
 */
export interface CheckDeviceFlowStatusRequest {
  /** Device Flow session ID */
  sessionId: string;
}

export const CheckDeviceFlowStatusRequestSchema = z.object({
  sessionId: z.string().uuid(),
});

/**
 * Response from checking Device Flow status
 */
export interface CheckDeviceFlowStatusResponse {
  /** Whether Device Flow is complete */
  isComplete: boolean;

  /** Whether authentication was successful */
  isSuccess: boolean;

  /** Current polling interval in seconds (may increase if GitHub requests slowdown) */
  interval?: number;

  /** User information (if successful) */
  user?: {
    username: string;
    email?: string;
    avatarUrl?: string;
  };

  /** Error message (if failed) */
  error?: string;
}

export type CheckDeviceFlowStatusIPCResponse = IPCResponse<CheckDeviceFlowStatusResponse>;
