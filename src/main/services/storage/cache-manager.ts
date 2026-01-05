/**
 * Cache Manager
 *
 * Implements LRU (Least Recently Used) cache strategy with file system persistence.
 * Meets requirements of <1s cached file load time and size limits per repository.
 *
 * Cache Limits:
 * - 100MB per repository (SC-009)
 * - 5GB total across all repositories
 *
 * Source: specs/001-git-repo-integration/research.md (Section 7)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import type { CacheEntry } from '@/shared/types/cache';

interface CacheMetadata {
  entries: Map<string, CacheEntry>;
  totalSize: number;
  repositorySizes: Map<string, number>;
}

/**
 * Cache manager with LRU eviction
 *
 * Features:
 * - File system persistence for offline access
 * - LRU eviction when limits exceeded
 * - Per-repository and total size limits
 * - Fast access (<1s for cached files)
 */
export class CacheManager {
  private CACHE_DIR!: string;
  private readonly MAX_TOTAL_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
  private readonly MAX_REPO_SIZE = 100 * 1024 * 1024; // 100MB
  private metadata: CacheMetadata;

  constructor() {
    this.metadata = {
      entries: new Map(),
      totalSize: 0,
      repositorySizes: new Map(),
    };
  }

  /**
   * Initialize cache directory and load metadata
   * MUST be called after Electron app is ready
   */
  async initialize(): Promise<void> {
    this.CACHE_DIR = path.join(app.getPath('userData'), 'git-cache');
    await fs.mkdir(this.CACHE_DIR, { recursive: true });
    await this.loadMetadata();
  }

  /**
   * Get cached file content
   *
   * @param repositoryId - Repository identifier
   * @param filePath - File path relative to repository root
   * @param branch - Branch name
   * @returns File content, or null if not cached
   */
  async get(
    repositoryId: string,
    filePath: string,
    branch: string
  ): Promise<string | null> {
    const key = this.generateKey(repositoryId, filePath, branch);
    const entry = this.metadata.entries.get(key);

    if (!entry) return null;

    // Update last accessed timestamp (LRU tracking)
    entry.lastAccessedAt = Date.now();
    this.metadata.entries.set(key, entry);
    await this.saveMetadata();

    // Read from file system
    const cacheFilePath = this.getCacheFilePath(key);
    try {
      const content = await fs.readFile(cacheFilePath, 'utf-8');
      return content;
    } catch (error) {
      // Cache file missing, remove from metadata
      this.metadata.entries.delete(key);
      return null;
    }
  }

  /**
   * Store file content in cache
   *
   * @param repositoryId - Repository identifier
   * @param filePath - File path relative to repository root
   * @param branch - Branch name
   * @param content - File content to cache
   */
  async set(
    repositoryId: string,
    filePath: string,
    branch: string,
    content: string
  ): Promise<void> {
    const key = this.generateKey(repositoryId, filePath, branch);
    const size = Buffer.byteLength(content, 'utf-8');

    // Check if adding this file would exceed limits
    await this.ensureSpace(repositoryId, size);

    // Write to file system
    const cacheFilePath = this.getCacheFilePath(key);
    await fs.mkdir(path.dirname(cacheFilePath), { recursive: true });
    await fs.writeFile(cacheFilePath, content, 'utf-8');

    // Update metadata
    const existingEntry = this.metadata.entries.get(key);
    const oldSize = existingEntry?.size || 0;

    const entry: CacheEntry = {
      key,
      repositoryId,
      filePath,
      branch,
      size,
      fetchedAt: existingEntry?.fetchedAt || Date.now(),
      lastAccessedAt: Date.now(),
      diskPath: cacheFilePath,
    };

    this.metadata.entries.set(key, entry);
    this.metadata.totalSize += (size - oldSize);

    const repoSize = this.metadata.repositorySizes.get(repositoryId) || 0;
    this.metadata.repositorySizes.set(repositoryId, repoSize + (size - oldSize));

    await this.saveMetadata();
  }

  /**
   * Clear cache for a repository or specific branch
   *
   * @param repositoryId - Repository identifier
   * @param branch - Optional branch name (clears all branches if not specified)
   */
  async clear(repositoryId: string, branch?: string): Promise<void> {
    const entriesToDelete = Array.from(this.metadata.entries.entries())
      .filter(([_, entry]) => {
        if (entry.repositoryId !== repositoryId) return false;
        if (branch && entry.branch !== branch) return false;
        return true;
      });

    for (const [key, entry] of entriesToDelete) {
      // Delete cache file
      const cacheFilePath = this.getCacheFilePath(key);
      await fs.unlink(cacheFilePath).catch(() => {}); // Ignore errors

      // Update metadata
      this.metadata.entries.delete(key);
      this.metadata.totalSize -= entry.size;

      const repoSize = this.metadata.repositorySizes.get(entry.repositoryId) || 0;
      this.metadata.repositorySizes.set(entry.repositoryId, repoSize - entry.size);
    }

    await this.saveMetadata();
  }

  /**
   * Get cached tree structure
   *
   * @param repositoryId - Repository identifier
   * @param branch - Branch name
   * @returns Cached tree structure, or null if not cached
   */
  async getTree(
    repositoryId: string,
    branch: string
  ): Promise<any | null> {
    const key = this.generateTreeKey(repositoryId, branch);
    const entry = this.metadata.entries.get(key);

    if (!entry) return null;

    // Update last accessed timestamp (LRU tracking)
    entry.lastAccessedAt = Date.now();
    this.metadata.entries.set(key, entry);
    await this.saveMetadata();

    // Read from file system
    const cacheFilePath = this.getCacheFilePath(key);
    try {
      const content = await fs.readFile(cacheFilePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // Cache file missing or corrupt, remove from metadata
      this.metadata.entries.delete(key);
      return null;
    }
  }

  /**
   * Store tree structure in cache
   *
   * @param repositoryId - Repository identifier
   * @param branch - Branch name
   * @param tree - Tree structure to cache
   */
  async setTree(
    repositoryId: string,
    branch: string,
    tree: any
  ): Promise<void> {
    const key = this.generateTreeKey(repositoryId, branch);
    const content = JSON.stringify(tree);
    const size = Buffer.byteLength(content, 'utf-8');

    // Check if adding this tree would exceed limits
    await this.ensureSpace(repositoryId, size);

    // Write to file system
    const cacheFilePath = this.getCacheFilePath(key);
    await fs.mkdir(path.dirname(cacheFilePath), { recursive: true });
    await fs.writeFile(cacheFilePath, content, 'utf-8');

    // Update metadata
    const existingEntry = this.metadata.entries.get(key);
    const oldSize = existingEntry?.size || 0;

    const entry: CacheEntry = {
      key,
      repositoryId,
      filePath: '__TREE__',
      branch,
      size,
      fetchedAt: existingEntry?.fetchedAt || Date.now(),
      lastAccessedAt: Date.now(),
      diskPath: cacheFilePath,
    };

    this.metadata.entries.set(key, entry);
    this.metadata.totalSize += (size - oldSize);

    const repoSize = this.metadata.repositorySizes.get(repositoryId) || 0;
    this.metadata.repositorySizes.set(repositoryId, repoSize + (size - oldSize));

    await this.saveMetadata();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      totalSize: this.metadata.totalSize,
      totalEntries: this.metadata.entries.size,
      repositorySizes: Object.fromEntries(this.metadata.repositorySizes),
    };
  }

  /**
   * Ensure sufficient space for new cache entry
   * Evicts LRU entries if needed
   */
  private async ensureSpace(repositoryId: string, neededSize: number): Promise<void> {
    const repoSize = this.metadata.repositorySizes.get(repositoryId) || 0;

    // Check repository limit
    if (repoSize + neededSize > this.MAX_REPO_SIZE) {
      await this.evictLRU(repositoryId, repoSize + neededSize - this.MAX_REPO_SIZE);
    }

    // Check total limit
    if (this.metadata.totalSize + neededSize > this.MAX_TOTAL_SIZE) {
      await this.evictLRU(null, this.metadata.totalSize + neededSize - this.MAX_TOTAL_SIZE);
    }
  }

  /**
   * Evict least recently used entries
   *
   * @param repositoryId - Optional repository to evict from (evicts from all if null)
   * @param bytesToFree - Number of bytes to free
   */
  private async evictLRU(repositoryId: string | null, bytesToFree: number): Promise<void> {
    // Get entries sorted by last accessed (oldest first)
    const entries = Array.from(this.metadata.entries.entries())
      .filter(([_, entry]) => !repositoryId || entry.repositoryId === repositoryId)
      .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);

    let freedBytes = 0;
    for (const [key, entry] of entries) {
      if (freedBytes >= bytesToFree) break;

      // Delete cache file
      const cacheFilePath = this.getCacheFilePath(key);
      await fs.unlink(cacheFilePath).catch(() => {}); // Ignore errors

      // Update metadata
      this.metadata.entries.delete(key);
      this.metadata.totalSize -= entry.size;

      const repoSize = this.metadata.repositorySizes.get(entry.repositoryId) || 0;
      this.metadata.repositorySizes.set(entry.repositoryId, repoSize - entry.size);

      freedBytes += entry.size;
    }

    await this.saveMetadata();
  }

  /**
   * Generate cache key from repository, file path, and branch
   */
  private generateKey(repositoryId: string, filePath: string, branch: string): string {
    return `${repositoryId}/${branch}/${filePath}`;
  }

  /**
   * Generate cache key for tree structure
   */
  private generateTreeKey(repositoryId: string, branch: string): string {
    return `${repositoryId}/${branch}/__TREE__`;
  }

  /**
   * Get safe file path for cache entry
   * Sanitizes key to prevent path traversal
   */
  private getCacheFilePath(key: string): string {
    // Create a safe file path from the key
    const safeKey = key.replace(/[^a-zA-Z0-9\-_\/]/g, '_');
    return path.join(this.CACHE_DIR, safeKey);
  }

  /**
   * Load metadata from disk
   */
  private async loadMetadata(): Promise<void> {
    const metadataPath = path.join(this.CACHE_DIR, 'metadata.json');
    try {
      const data = await fs.readFile(metadataPath, 'utf-8');
      const parsed = JSON.parse(data);
      this.metadata = {
        entries: new Map(parsed.entries),
        totalSize: parsed.totalSize,
        repositorySizes: new Map(parsed.repositorySizes),
      };
    } catch (error) {
      // Metadata doesn't exist yet, start fresh
      this.metadata = {
        entries: new Map(),
        totalSize: 0,
        repositorySizes: new Map(),
      };
    }
  }

  /**
   * Save metadata to disk
   */
  private async saveMetadata(): Promise<void> {
    const metadataPath = path.join(this.CACHE_DIR, 'metadata.json');
    const data = JSON.stringify({
      entries: Array.from(this.metadata.entries.entries()),
      totalSize: this.metadata.totalSize,
      repositorySizes: Array.from(this.metadata.repositorySizes.entries()),
    });
    await fs.writeFile(metadataPath, data, 'utf-8');
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
