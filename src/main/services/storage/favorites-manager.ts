/**
 * Favorites Manager
 *
 * Manages user-favorited files, folders, and repositories.
 * Uses electron-store for persistent storage across app sessions.
 *
 * Features:
 * - Max 10 favorites per category (files, folders, repos)
 * - Alphabetical sorting by display name
 * - Limit enforcement with clear error messages
 * - Cross-platform path normalization
 * - Persistent storage in AppData/markread/favorites.json
 *
 * Source: specs/001-home-recents-favorites/data-model.md
 */

import * as path from 'path';
import type Store from 'electron-store';
import type { Favorite, ItemType, FavoritesSchema } from '@shared/types/recents-favorites';
import { MAX_ITEMS_PER_CATEGORY, STORAGE_VERSION, ERROR_MESSAGES } from '@shared/types/recents-favorites';

/**
 * Service for managing favorites
 *
 * Enforces 10-item limit per category and alphabetical sorting
 */
export class FavoritesManager {
  private store: Store<FavoritesSchema> | null = null;
  private storePromise: Promise<Store<FavoritesSchema>> | null = null;

  /**
   * @param cwd - Optional custom directory for storage (primarily for testing)
   */
  constructor(private cwd?: string) {}

  /**
   * Initialize the store (lazy loading with dynamic import)
   */
  private async getStore(): Promise<Store<FavoritesSchema>> {
    if (this.store) {
      return this.store;
    }

    if (!this.storePromise) {
      this.storePromise = (async () => {
        const { default: ElectronStore } = await import('electron-store');
        this.store = new ElectronStore<FavoritesSchema>({
          name: 'favorites',
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
   */
  private normalizePath(itemPath: string): string {
    // Normalize separators and convert to forward slashes for cross-platform consistency
    return path.normalize(itemPath).replace(/\\/g, '/');
  }

  /**
   * Sort favorites alphabetically by display name (case-insensitive)
   */
  private sortAlphabetically(favorites: Favorite[]): Favorite[] {
    return favorites.sort((a, b) =>
      a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
    );
  }

  /**
   * Normalize paths and remove duplicates (same path with different separators)
   * Keeps the most recently added version when duplicates are found
   */
  private normalizeAndDeduplicate(items: Favorite[]): Favorite[] {
    const seen = new Map<string, Favorite>();

    for (const item of items) {
      const normalizedPath = this.normalizePath(item.path);
      const existing = seen.get(normalizedPath);

      // Keep the entry with the most recent dateAdded timestamp
      if (!existing || item.dateAdded > existing.dateAdded) {
        seen.set(normalizedPath, {
          ...item,
          path: normalizedPath
        });
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Get all favorites for a specific type
   *
   * @param type - Item type (file, folder, or repo)
   * @returns Array of favorites, sorted alphabetically by display name
   */
  async getFavorites(type: ItemType): Promise<Favorite[]> {
    const store = await this.getStore();
    const key = this.getTypeKey(type);
    const items = store.get(key, []);

    // Normalize all paths and deduplicate (handles legacy data with backslashes)
    const normalizedItems = this.normalizeAndDeduplicate(items);

    // If we found duplicates, update storage
    if (normalizedItems.length !== items.length) {
      store.set(key, normalizedItems);
    }

    return this.sortAlphabetically(normalizedItems);
  }

  /**
   * Add a new favorite (enforces 10-item limit)
   *
   * @param item - Favorite item to add
   * @throws {Error} If favorites limit is reached for this category
   */
  async addFavorite(item: Favorite): Promise<void> {
    const store = await this.getStore();
    const key = this.getTypeKey(item.type);
    const items = store.get(key, []);

    // Normalize the path
    const normalizedPath = this.normalizePath(item.path);

    // Check if already favorited (update if exists) - check both exact and normalized paths
    const existingIndex = items.findIndex(f => {
      const normalizedStoredPath = this.normalizePath(f.path);
      return f.path === item.path || normalizedStoredPath === normalizedPath;
    });

    if (existingIndex >= 0) {
      // Update existing favorite (also normalize the stored path)
      items[existingIndex] = {
        ...item,
        path: normalizedPath
      };
    } else {
      // Check limit before adding new favorite
      if (items.length >= MAX_ITEMS_PER_CATEGORY) {
        throw new Error(ERROR_MESSAGES.FAVORITES_LIMIT_REACHED);
      }

      // Add new favorite
      items.push({
        ...item,
        path: normalizedPath
      });
    }

    // Sort alphabetically and save
    const sorted = this.sortAlphabetically(items);
    store.set(key, sorted);
  }

  /**
   * Remove a specific favorite
   *
   * @param itemPath - Path to the item to remove
   * @param type - Item type (file, folder, or repo)
   */
  async removeFavorite(itemPath: string, type: ItemType): Promise<void> {
    const store = await this.getStore();
    const key = this.getTypeKey(type);
    const items = store.get(key, []);

    const normalizedInputPath = this.normalizePath(itemPath);

    // Filter out items matching either:
    // - The exact path as provided (handles backslash paths in storage)
    // - The normalized version of the stored path (handles forward slash comparison)
    const filtered = items.filter(f => {
      const normalizedStoredPath = this.normalizePath(f.path);
      return f.path !== itemPath && normalizedStoredPath !== normalizedInputPath;
    });

    store.set(key, filtered);
  }

  /**
   * Check if path exists in favorites
   *
   * @param itemPath - Path to check
   * @param type - Item type (file, folder, or repo)
   * @returns True if item is favorited
   */
  async isFavorite(itemPath: string, type: ItemType): Promise<boolean> {
    const store = await this.getStore();
    const key = this.getTypeKey(type);
    const items = store.get(key, []);

    const normalizedInputPath = this.normalizePath(itemPath);
    // Check against both exact match and normalized version
    return items.some(f => {
      const normalizedStoredPath = this.normalizePath(f.path);
      return f.path === itemPath || normalizedStoredPath === normalizedInputPath;
    });
  }

  /**
   * Get count of favorites for a specific type
   *
   * @param type - Item type (file, folder, or repo)
   * @returns Number of favorites in this category
   */
  async getFavoritesCount(type: ItemType): Promise<number> {
    const store = await this.getStore();
    const key = this.getTypeKey(type);
    const items = store.get(key, []);
    return items.length;
  }
}
