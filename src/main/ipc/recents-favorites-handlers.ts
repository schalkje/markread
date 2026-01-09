/**
 * Recents and Favorites IPC Handlers
 *
 * Electron IPC handlers for recents and favorites operations.
 * Provides error handling and response formatting.
 *
 * Source: specs/001-home-recents-favorites/contracts/storage-schema.ts
 */

import { ipcMain } from 'electron';
import { RecentsManager } from '../services/storage/recents-manager';
import { FavoritesManager } from '../services/storage/favorites-manager';
import { IPC_CHANNELS } from '@shared/types/recents-favorites';
import type {
  RecentItem,
  Favorite,
  ItemType,
  AddFavoriteResponse
} from '@shared/types/recents-favorites';

// Create singleton instances
const recentsManager = new RecentsManager();
const favoritesManager = new FavoritesManager();

/**
 * Register all Recents and Favorites IPC handlers
 */
export function registerRecentsFavoritesHandlers(): void {
  // =========================================================================
  // Recents Handlers
  // =========================================================================

  /**
   * Get recent items by type
   * Channel: recents:get
   */
  ipcMain.handle(IPC_CHANNELS.GET_RECENTS, async (_event, type: ItemType): Promise<RecentItem[]> => {
    try {
      return await recentsManager.getRecents(type);
    } catch (error: any) {
      console.error('[IPC] Error getting recents:', error);
      return [];
    }
  });

  /**
   * Add recent item
   * Channel: recents:add
   */
  ipcMain.handle(IPC_CHANNELS.ADD_RECENT, async (_event, item: RecentItem): Promise<void> => {
    try {
      await recentsManager.addRecent(item);
    } catch (error: any) {
      console.error('[IPC] Error adding recent:', error);
      throw error;
    }
  });

  /**
   * Remove recent item
   * Channel: recents:remove
   */
  ipcMain.handle(IPC_CHANNELS.REMOVE_RECENT, async (_event, path: string, type: ItemType): Promise<void> => {
    try {
      await recentsManager.removeRecent(path, type);
    } catch (error: any) {
      console.error('[IPC] Error removing recent:', error);
      throw error;
    }
  });

  /**
   * Clear all recents for a type
   * Channel: recents:clear
   */
  ipcMain.handle(IPC_CHANNELS.CLEAR_RECENTS, async (_event, type: ItemType): Promise<void> => {
    try {
      await recentsManager.clearRecents(type);
    } catch (error: any) {
      console.error('[IPC] Error clearing recents:', error);
      throw error;
    }
  });

  /**
   * Check if item exists in recents
   * Channel: recents:has
   */
  ipcMain.handle(IPC_CHANNELS.HAS_RECENT, async (_event, path: string, type: ItemType): Promise<boolean> => {
    try {
      return await recentsManager.hasRecent(path, type);
    } catch (error: any) {
      console.error('[IPC] Error checking recent:', error);
      return false;
    }
  });

  // =========================================================================
  // Favorites Handlers
  // =========================================================================

  /**
   * Get favorites by type
   * Channel: favorites:get
   */
  ipcMain.handle(IPC_CHANNELS.GET_FAVORITES, async (_event, type: ItemType): Promise<Favorite[]> => {
    try {
      return await favoritesManager.getFavorites(type);
    } catch (error: any) {
      console.error('[IPC] Error getting favorites:', error);
      return [];
    }
  });

  /**
   * Add favorite item
   * Channel: favorites:add
   */
  ipcMain.handle(IPC_CHANNELS.ADD_FAVORITE, async (_event, item: Favorite): Promise<AddFavoriteResponse> => {
    try {
      await favoritesManager.addFavorite(item);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] Error adding favorite:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Remove favorite item
   * Channel: favorites:remove
   */
  ipcMain.handle(IPC_CHANNELS.REMOVE_FAVORITE, async (_event, path: string, type: ItemType): Promise<void> => {
    try {
      await favoritesManager.removeFavorite(path, type);
    } catch (error: any) {
      console.error('[IPC] Error removing favorite:', error);
      throw error;
    }
  });

  /**
   * Check if item is favorited
   * Channel: favorites:is
   */
  ipcMain.handle(IPC_CHANNELS.IS_FAVORITE, async (_event, path: string, type: ItemType): Promise<boolean> => {
    try {
      return await favoritesManager.isFavorite(path, type);
    } catch (error: any) {
      console.error('[IPC] Error checking favorite:', error);
      return false;
    }
  });

  /**
   * Get favorites count for a type
   * Channel: favorites:count
   */
  ipcMain.handle(IPC_CHANNELS.GET_FAVORITES_COUNT, async (_event, type: ItemType): Promise<number> => {
    try {
      return await favoritesManager.getFavoritesCount(type);
    } catch (error: any) {
      console.error('[IPC] Error getting favorites count:', error);
      return 0;
    }
  });
}
