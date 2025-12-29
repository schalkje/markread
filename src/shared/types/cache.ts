/**
 * Cache Type Definitions
 *
 * Types for cache entries and cache management.
 * Supports LRU eviction and size limits.
 *
 * Source: specs/001-git-repo-integration/data-model.md
 */

import { z } from 'zod';

/**
 * Cache Entry entity
 * Represents cached file content with metadata for LRU eviction.
 *
 * Cache Limits (from FR-020, SC-009):
 * - Maximum 100MB per repository
 * - Maximum 5GB total across all repositories
 * - LRU eviction when limits are exceeded
 */
export interface CacheEntry {
  /** Cache key (format: {repositoryId}/{branch}/{filePath}) */
  key: string;

  /** Associated repository ID */
  repositoryId: string;

  /** File path relative to repo root */
  filePath: string;

  /** Branch containing this file */
  branch: string;

  /** Content size in bytes */
  size: number;

  /** Timestamp of original fetch */
  fetchedAt: number;

  /** Timestamp of last access (LRU tracking) */
  lastAccessedAt: number;

  /** Path to cached file on disk (absolute) */
  diskPath: string;
}

/**
 * Zod schema for CacheEntry validation
 */
export const CacheEntrySchema = z.object({
  key: z.string().min(1),
  repositoryId: z.string().uuid(),
  filePath: z.string().min(1).max(1024),
  branch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/),
  size: z.number().nonnegative(),
  fetchedAt: z.number().positive(),
  lastAccessedAt: z.number().positive(),
  diskPath: z.string().min(1),
});

/**
 * Cache limits configuration
 */
export const CACHE_LIMITS = {
  /** Maximum size per repository (100MB) */
  MAX_REPOSITORY_SIZE: 100 * 1024 * 1024,

  /** Maximum total cache size (5GB) */
  MAX_TOTAL_SIZE: 5 * 1024 * 1024 * 1024,
} as const;
