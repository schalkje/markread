/**
 * Recents and Favorites Service
 *
 * Provides a typed wrapper around the window.electronAPI.recentsFavorites API.
 * This service layer adds error handling and type safety for IPC calls.
 *
 * Source: specs/001-home-recents-favorites/data-model.md
 */

import type {
  RecentItem,
  Favorite,
  ItemType,
  AddFavoriteResponse
} from '@shared/types/recents-favorites';

/**
 * Service for recents and favorites operations
 *
 * Wraps IPC calls to main process with type safety
 */
export class RecentsFavoritesService {
  // =========================================================================
  // Recents Operations
  // =========================================================================

  /**
   * Get all recent items for a specific type
   *
   * @param type - Item type (file, folder, or repo)
   * @returns Array of recent items, sorted by most recent first
   */
  async getRecents(type: ItemType): Promise<RecentItem[]> {
    try {
      return await window.electronAPI.recentsFavorites.getRecents(type);
    } catch (error) {
      console.error('[RecentsFavoritesService] Error getting recents:', error);
      return [];
    }
  }

  /**
   * Add or update a recent item
   *
   * @param item - Recent item to add
   */
  async addRecent(item: RecentItem): Promise<void> {
    try {
      await window.electronAPI.recentsFavorites.addRecent(item);
    } catch (error) {
      console.error('[RecentsFavoritesService] Error adding recent:', error);
      throw error;
    }
  }

  /**
   * Remove a recent item
   *
   * @param path - Path to the item to remove
   * @param type - Item type (file, folder, or repo)
   */
  async removeRecent(path: string, type: ItemType): Promise<void> {
    try {
      await window.electronAPI.recentsFavorites.removeRecent(path, type);
    } catch (error) {
      console.error('[RecentsFavoritesService] Error removing recent:', error);
      throw error;
    }
  }

  /**
   * Clear all recents for a specific type
   *
   * @param type - Item type (file, folder, or repo)
   */
  async clearRecents(type: ItemType): Promise<void> {
    try {
      await window.electronAPI.recentsFavorites.clearRecents(type);
    } catch (error) {
      console.error('[RecentsFavoritesService] Error clearing recents:', error);
      throw error;
    }
  }

  /**
   * Check if item exists in recents
   *
   * @param path - Path to check
   * @param type - Item type (file, folder, or repo)
   * @returns True if item is in recents
   */
  async hasRecent(path: string, type: ItemType): Promise<boolean> {
    try {
      return await window.electronAPI.recentsFavorites.hasRecent(path, type);
    } catch (error) {
      console.error('[RecentsFavoritesService] Error checking recent:', error);
      return false;
    }
  }

  // =========================================================================
  // Favorites Operations
  // =========================================================================

  /**
   * Get all favorites for a specific type
   *
   * @param type - Item type (file, folder, or repo)
   * @returns Array of favorites, sorted alphabetically
   */
  async getFavorites(type: ItemType): Promise<Favorite[]> {
    try {
      return await window.electronAPI.recentsFavorites.getFavorites(type);
    } catch (error) {
      console.error('[RecentsFavoritesService] Error getting favorites:', error);
      return [];
    }
  }

  /**
   * Add a favorite
   *
   * @param item - Favorite item to add
   * @returns Response with success status and optional error message
   */
  async addFavorite(item: Favorite): Promise<AddFavoriteResponse> {
    try {
      return await window.electronAPI.recentsFavorites.addFavorite(item);
    } catch (error) {
      console.error('[RecentsFavoritesService] Error adding favorite:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add favorite'
      };
    }
  }

  /**
   * Remove a favorite
   *
   * @param path - Path to the item to remove
   * @param type - Item type (file, folder, or repo)
   */
  async removeFavorite(path: string, type: ItemType): Promise<void> {
    try {
      await window.electronAPI.recentsFavorites.removeFavorite(path, type);
    } catch (error) {
      console.error('[RecentsFavoritesService] Error removing favorite:', error);
      throw error;
    }
  }

  /**
   * Check if item is favorited
   *
   * @param path - Path to check
   * @param type - Item type (file, folder, or repo)
   * @returns True if item is favorited
   */
  async isFavorite(path: string, type: ItemType): Promise<boolean> {
    try {
      return await window.electronAPI.recentsFavorites.isFavorite(path, type);
    } catch (error) {
      console.error('[RecentsFavoritesService] Error checking favorite:', error);
      return false;
    }
  }

  /**
   * Get count of favorites for a type
   *
   * @param type - Item type (file, folder, or repo)
   * @returns Number of favorites in this category
   */
  async getFavoritesCount(type: ItemType): Promise<number> {
    try {
      return await window.electronAPI.recentsFavorites.getFavoritesCount(type);
    } catch (error) {
      console.error('[RecentsFavoritesService] Error getting favorites count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const recentsFavoritesService = new RecentsFavoritesService();
