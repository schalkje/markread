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
    }
  }

  /**
   * Normalize path for cross-platform consistency
   */
  private normalizePath(itemPath: string): string {
    return path.normalize(path.resolve(itemPath));
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
   * Get all favorites for a specific type
   *
   * @param type - Item type (file, folder, or repo)
   * @returns Array of favorites, sorted alphabetically by display name
   */
  async getFavorites(type: ItemType): Promise<Favorite[]> {
    const store = await this.getStore();
    const key = this.getTypeKey(type);
    const items = store.get(key, []);

    return this.sortAlphabetically(items);
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

    // Check if already favorited (update if exists)
    const existingIndex = items.findIndex(f => f.path === normalizedPath);
    if (existingIndex >= 0) {
      // Update existing favorite
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

    const normalizedPath = this.normalizePath(itemPath);
    const filtered = items.filter(f => f.path !== normalizedPath);

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

    const normalizedPath = this.normalizePath(itemPath);
    return items.some(f => f.path === normalizedPath);
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
