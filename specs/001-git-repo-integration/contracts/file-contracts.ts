/**
 * File Contracts: Git Repository Integration
 *
 * IPC contracts for fetching files, directory trees, and file refresh operations.
 * Aligns with FR-012 through FR-016, FR-023 through FR-025, and User Story 1.
 */

import { z } from 'zod';
import type { IPCResponse } from './error-contracts';

// ============================================================================
// Fetch File
// ============================================================================

/**
 * Request to fetch a file from a repository
 * Aligns with FR-012, FR-013, FR-015, SC-005
 */
export interface FetchFileRequest {
  /** Repository identifier */
  repositoryId: string;

  /** File path relative to repository root */
  filePath: string;

  /** Branch to fetch from (defaults to current branch) */
  branch?: string;

  /** Force fetch from remote (bypass cache) */
  forceRefresh?: boolean;
}

export const FetchFileRequestSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID'),
  filePath: z.string()
    .min(1, 'File path cannot be empty')
    .max(1024, 'File path too long')
    .regex(/^[a-zA-Z0-9\-_./]+$/, 'Invalid file path characters')
    .refine((path) => !path.includes('..'), 'Path traversal not allowed'),
  branch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/).optional(),
  forceRefresh: z.boolean().optional(),
});

/**
 * Response from fetching a file
 */
export interface FetchFileResponse {
  /** File path (same as request) */
  filePath: string;

  /** File content (UTF-8) */
  content: string;

  /** File size in bytes */
  size: number;

  /** Content SHA (for change detection) */
  sha: string;

  /** Whether file is markdown */
  isMarkdown: boolean;

  /** Whether content was served from cache */
  cached: boolean;

  /** Timestamp of when file was fetched */
  fetchedAt: number;

  /** Branch the file was fetched from */
  branch: string;
}

export type FetchFileIPCResponse = IPCResponse<FetchFileResponse>;

// ============================================================================
// Fetch Repository Tree
// ============================================================================

/**
 * Request to fetch the entire file tree of a repository
 * Aligns with FR-012, User Story 1 (AS #2)
 */
export interface FetchRepositoryTreeRequest {
  /** Repository identifier */
  repositoryId: string;

  /** Branch to fetch tree from */
  branch?: string;

  /** Filter to only include markdown files */
  markdownOnly?: boolean;

  /** Maximum depth to fetch (undefined = unlimited) */
  maxDepth?: number;
}

export const FetchRepositoryTreeRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  branch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/).optional(),
  markdownOnly: z.boolean().optional(),
  maxDepth: z.number().positive().int().optional(),
});

/**
 * A single node in the file tree
 */
export interface TreeNode {
  /** File or directory path */
  path: string;

  /** Node type */
  type: 'file' | 'directory';

  /** File size in bytes (0 for directories) */
  size: number;

  /** Content SHA (files only) */
  sha?: string;

  /** Whether this is a markdown file */
  isMarkdown: boolean;

  /** Nested children (for directories) */
  children?: TreeNode[];
}

/**
 * Response from fetching repository tree
 */
export interface FetchRepositoryTreeResponse {
  /** Root tree nodes */
  tree: TreeNode[];

  /** Total number of files */
  fileCount: number;

  /** Total number of markdown files */
  markdownFileCount: number;

  /** Branch the tree was fetched from */
  branch: string;

  /** Timestamp of fetch */
  fetchedAt: number;
}

export type FetchRepositoryTreeIPCResponse = IPCResponse<FetchRepositoryTreeResponse>;

// ============================================================================
// Refresh File
// ============================================================================

/**
 * Request to refresh a specific file from remote
 * Aligns with FR-016, FR-025
 */
export interface RefreshFileRequest {
  /** Repository identifier */
  repositoryId: string;

  /** File path to refresh */
  filePath: string;

  /** Branch to refresh from */
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

/**
 * Response from refreshing a file
 */
export interface RefreshFileResponse {
  /** File path */
  filePath: string;

  /** Whether the file content changed */
  contentChanged: boolean;

  /** New content (if changed) */
  content?: string;

  /** New SHA (if changed) */
  sha?: string;

  /** Timestamp of refresh */
  refreshedAt: number;
}

export type RefreshFileIPCResponse = IPCResponse<RefreshFileResponse>;

// ============================================================================
// Check File Exists
// ============================================================================

/**
 * Request to check if a file exists on a branch
 * Useful for User Story 3 (AS #3) - checking file existence after branch switch
 */
export interface CheckFileExistsRequest {
  /** Repository identifier */
  repositoryId: string;

  /** File path to check */
  filePath: string;

  /** Branch to check on */
  branch: string;
}

export const CheckFileExistsRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  filePath: z.string()
    .min(1)
    .max(1024)
    .regex(/^[a-zA-Z0-9\-_./]+$/)
    .refine((path) => !path.includes('..')),
  branch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/),
});

/**
 * Response from checking file existence
 */
export interface CheckFileExistsResponse {
  /** Whether the file exists */
  exists: boolean;

  /** File SHA (if exists) */
  sha?: string;

  /** File size (if exists) */
  size?: number;
}

export type CheckFileExistsIPCResponse = IPCResponse<CheckFileExistsResponse>;

// ============================================================================
// Resolve Image Path
// ============================================================================

/**
 * Request to resolve an image path referenced in markdown
 * Aligns with FR-013, FR-014
 */
export interface ResolveImagePathRequest {
  /** Repository identifier */
  repositoryId: string;

  /** Current markdown file path (for relative path resolution) */
  currentFilePath: string;

  /** Image path from markdown (could be relative or absolute) */
  imagePath: string;

  /** Branch */
  branch: string;
}

export const ResolveImagePathRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  currentFilePath: z.string()
    .min(1)
    .regex(/^[a-zA-Z0-9\-_./]+$/),
  imagePath: z.string().min(1),
  branch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/),
});

/**
 * Response from resolving an image path
 */
export interface ResolveImagePathResponse {
  /** Resolved absolute path within repository */
  resolvedPath: string;

  /** Data URL for the image (base64-encoded) */
  dataUrl: string;

  /** Whether image was served from cache */
  cached: boolean;
}

export type ResolveImagePathIPCResponse = IPCResponse<ResolveImagePathResponse>;
