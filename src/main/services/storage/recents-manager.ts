/**
 * Recents Manager
 *
 * Manages recently accessed files, folders, and repositories with LRU eviction.
 * Uses electron-store for persistent storage across app sessions.
 *
 * Features:
 * - Automatic LRU (Least Recently Used) eviction when limit exceeded
 * - Max 10 items per category (files, folders, repos)
 * - Cross-platform path normalization
 * - Persistent storage in AppData/markread/recents.json
 *
 * Source: specs/001-home-recents-favorites/data-model.md
 */

import * as path from 'path';
import type Store from 'electron-store';
import type { RecentItem, ItemType, RecentsSchema } from '@shared/types/recents-favorites';
import { MAX_ITEMS_PER_CATEGORY, STORAGE_VERSION } from '@shared/types/recents-favorites';

/**
 * Service for managing recent items
 *
 * Implements LRU eviction and enforces 10-item limit per category
 */
export class RecentsManager {
  private store: Store<RecentsSchema> | null = null;
  private storePromise: Promise<Store<RecentsSchema>> | null = null;

  /**
   * @param cwd - Optional custom directory for storage (primarily for testing)
   */
  constructor(private cwd?: string) {}

  /**
   * Initialize the store (lazy loading with dynamic import)
   */
  private async getStore(): Promise<Store<RecentsSchema>> {
    if (this.store) {
      return this.store;
    }

    if (!this.storePromise) {
      this.storePromise = (async () => {
        const { default: ElectronStore } = await import('electron-store');
        this.store = new ElectronStore<RecentsSchema>({
          name: 'recents',
          cwd: this.cwd,
          defaults: {
            files: [],
            folders: [],
            repos: [],
            version: STORAGE_VERSION
          },
          schema: {
            files: {
              type: 'array',
              items: { type: 'object' },
              default: []
            },
            folders: {
              type: 'array',
              items: { type: 'object' },
              default: []
            },
            repos: {
              type: 'array',
              items: { type: 'object' },
              default: []
            },
            version: {
              type: 'number',
              default: STORAGE_VERSION
            }
          }
        });
        return this.store;
      })();
    }

    return this.storePromise;
  }

  /**
   * Get the storage key for an item type
   */
  private getTypeKey(type: ItemType): 'files' | 'folders' | 'repos' {
    switch (type) {
      case 'file':
        return 'files';
      case 'folder':
        return 'folders';
      case 'repo':
        return 'repos';
      default:
        return 'files';
    }
  }

  /**
   * Normalize path for cross-platform consistency
   * Skips normalization for URLs (repository paths)
   */
  private normalizePath(itemPath: string): string {
    // Don't normalize URLs - they should be kept as-is
    if (itemPath.startsWith('http://') || itemPath.startsWith('https://')) {
      return itemPath;
    }
    // Normalize separators and convert to forward slashes for cross-platform consistency
    return path.normalize(itemPath).replace(/\\/g, '/');
  }

  /**
   * Get all recent items for a specific type
   *
   * @param type - Item type (file, folder, or repo)
   * @returns Array of recent items, sorted by last opened (most recent first)
   */
  async getRecents(type: ItemType): Promise<RecentItem[]> {
    const store = await this.getStore();
    const key = this.getTypeKey(type);
    const items = store.get(key, []);

    // Sort by lastOpened descending (most recent first)
    return items.sort((a, b) => b.lastOpened - a.lastOpened);
  }

  /**
   * Add or update a recent item with LRU eviction
   *
   * If item already exists, updates its lastOpened timestamp and moves to front.
   * If adding new item exceeds limit, removes oldest item (LRU eviction).
   *
   * @param item - Recent item to add
   */
  async addRecent(item: RecentItem): Promise<void> {
    const store = await this.getStore();
    const key = this.getTypeKey(item.type);
    const items = store.get(key, []);

    // Normalize the path
    const normalizedPath = this.normalizePath(item.path);
    const normalizedItem: RecentItem = {
      ...item,
      path: normalizedPath
    };

    // Remove existing entry if updating
    const filtered = items.filter(r => r.path !== normalizedPath);

    // Add to front (most recent)
    const updated = [normalizedItem, ...filtered];

    // Apply LRU eviction if limit exceeded
    const limited = updated.slice(0, MAX_ITEMS_PER_CATEGORY);

    store.set(key, limited);
  }

  /**
   * Remove a specific recent item
   *
   * @param itemPath - Path to the item to remove
   * @param type - Item type (file, folder, or repo)
   */
  async removeRecent(itemPath: string, type: ItemType): Promise<void> {
    const store = await this.getStore();
    const key = this.getTypeKey(type);
    const items = store.get(key, []);

    const normalizedPath = this.normalizePath(itemPath);
    const filtered = items.filter(r => r.path !== normalizedPath);

    store.set(key, filtered);
  }

  /**
   * Clear all recents for a specific type
   *
   * @param type - Item type (file, folder, or repo)
   */
  async clearRecents(type: ItemType): Promise<void> {
    const store = await this.getStore();
    const key = this.getTypeKey(type);
    store.set(key, []);
  }

  /**
   * Check if path exists in recents
   *
   * @param itemPath - Path to check
   * @param type - Item type (file, folder, or repo)
   * @returns True if item exists in recents
   */
  async hasRecent(itemPath: string, type: ItemType): Promise<boolean> {
    const store = await this.getStore();
    const key = this.getTypeKey(type);
    const items = store.get(key, []);

    const normalizedPath = this.normalizePath(itemPath);
    return items.some(r => r.path === normalizedPath);
  }
}
