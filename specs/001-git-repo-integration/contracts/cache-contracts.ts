/**
 * Cache Contracts: Git Repository Integration
 *
 * IPC contracts for cache management operations.
 * Aligns with FR-015, FR-020, SC-005, SC-009.
 */

import { z } from 'zod';
import type { IPCResponse } from './error-contracts';

// ============================================================================
// Get Cache Statistics
// ============================================================================

/**
 * Request to get cache statistics
 */
export interface GetCacheStatsRequest {
  /** Repository identifier (optional, gets stats for all repos if not specified) */
  repositoryId?: string;
}

export const GetCacheStatsRequestSchema = z.object({
  repositoryId: z.string().uuid().optional(),
});

/**
 * Cache statistics for a single repository
 */
export interface RepositoryCacheStats {
  /** Repository identifier */
  repositoryId: string;

  /** Number of cached files */
  fileCount: number;

  /** Total cache size in bytes */
  totalSize: number;

  /** Human-readable size (e.g., "45.2 MB") */
  humanReadableSize: string;

  /** Percentage of max repository cache size used (0-100) */
  percentageUsed: number;

  /** Oldest cached file timestamp */
  oldestEntry?: number;

  /** Newest cached file timestamp */
  newestEntry?: number;
}

/**
 * Response from getting cache statistics
 */
export interface GetCacheStatsResponse {
  /** Per-repository statistics */
  repositories: RepositoryCacheStats[];

  /** Total statistics across all repositories */
  total: {
    /** Total number of cached files */
    fileCount: number;

    /** Total cache size in bytes */
    totalSize: number;

    /** Human-readable size */
    humanReadableSize: string;

    /** Percentage of total cache limit used (0-100) */
    percentageUsed: number;

    /** Number of repositories with cached files */
    repositoryCount: number;
  };

  /** Cache limits */
  limits: {
    /** Maximum size per repository (bytes) */
    maxRepositorySize: number;

    /** Maximum total cache size (bytes) */
    maxTotalSize: number;
  };
}

export type GetCacheStatsIPCResponse = IPCResponse<GetCacheStatsResponse>;

// ============================================================================
// Clear Cache
// ============================================================================

/**
 * Request to clear cached files
 * Aligns with FR-020
 */
export interface ClearCacheRequest {
  /** Repository identifier (optional, clears all if not specified) */
  repositoryId?: string;

  /** Specific branch to clear (optional, clears all branches if not specified) */
  branch?: string;

  /** Specific file path to clear (optional, clears all files if not specified) */
  filePath?: string;
}

export const ClearCacheRequestSchema = z.object({
  repositoryId: z.string().uuid().optional(),
  branch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/).optional(),
  filePath: z.string()
    .regex(/^[a-zA-Z0-9\-_./]+$/)
    .refine((path) => !path.includes('..'))
    .optional(),
});

/**
 * Response from clearing cache
 */
export interface ClearCacheResponse {
  /** Number of files cleared */
  filesCleared: number;

  /** Total bytes freed */
  bytesFreed: number;

  /** Human-readable freed size */
  humanReadableFreed: string;

  /** Number of repositories affected */
  repositoriesAffected: number;
}

export type ClearCacheIPCResponse = IPCResponse<ClearCacheResponse>;

// ============================================================================
// Check Cache Entry
// ============================================================================

/**
 * Request to check if a specific file is cached
 */
export interface CheckCacheEntryRequest {
  /** Repository identifier */
  repositoryId: string;

  /** File path */
  filePath: string;

  /** Branch */
  branch: string;
}

export const CheckCacheEntryRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  filePath: z.string()
    .min(1)
    .regex(/^[a-zA-Z0-9\-_./]+$/)
    .refine((path) => !path.includes('..')),
  branch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/),
});

/**
 * Response from checking cache entry
 */
export interface CheckCacheEntryResponse {
  /** Whether file is cached */
  isCached: boolean;

  /** Cache entry metadata (if cached) */
  entry?: {
    /** File size */
    size: number;

    /** When file was fetched */
    fetchedAt: number;

    /** When file was last accessed */
    lastAccessedAt: number;

    /** Age of cache entry in seconds */
    ageSeconds: number;
  };
}

export type CheckCacheEntryIPCResponse = IPCResponse<CheckCacheEntryResponse>;

// ============================================================================
// Invalidate Cache Entry
// ============================================================================

/**
 * Request to invalidate a specific cache entry (mark as stale)
 * This doesn't delete the entry but marks it for refresh on next access
 */
export interface InvalidateCacheEntryRequest {
  /** Repository identifier */
  repositoryId: string;

  /** File path */
  filePath: string;

  /** Branch */
  branch: string;
}

export const InvalidateCacheEntryRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  filePath: z.string()
    .min(1)
    .regex(/^[a-zA-Z0-9\-_./]+$/)
    .refine((path) => !path.includes('..')),
  branch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/),
});

/**
 * Response from invalidating cache entry
 */
export interface InvalidateCacheEntryResponse {
  /** Whether entry was invalidated */
  invalidated: boolean;
}

export type InvalidateCacheEntryIPCResponse = IPCResponse<InvalidateCacheEntryResponse>;

// ============================================================================
// Prewarm Cache
// ============================================================================

/**
 * Request to prewarm cache by fetching commonly accessed files
 * This is useful for improving offline experience
 */
export interface PrewarmCacheRequest {
  /** Repository identifier */
  repositoryId: string;

  /** Branch to prewarm */
  branch: string;

  /** Maximum number of files to prewarm (default: 20) */
  maxFiles?: number;

  /** Only prewarm markdown files */
  markdownOnly?: boolean;
}

export const PrewarmCacheRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  branch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/),
  maxFiles: z.number().positive().int().max(100).optional(),
  markdownOnly: z.boolean().optional(),
});

/**
 * Response from prewarming cache
 */
export interface PrewarmCacheResponse {
  /** Number of files prewarmed */
  filesPrewarmed: number;

  /** Total bytes cached */
  bytesCached: number;

  /** File paths that were cached */
  cachedPaths: string[];

  /** Duration of prewarm operation in milliseconds */
  durationMs: number;
}

export type PrewarmCacheIPCResponse = IPCResponse<PrewarmCacheResponse>;
