/**
 * Recents and Favorites Store
 *
 * Zustand store for managing recents and favorites state in the renderer process.
 * Provides actions for loading, adding, removing items with automatic state updates.
 *
 * Source: specs/001-home-recents-favorites/data-model.md
 */

import { create } from 'zustand';
import { recentsFavoritesService } from '../services/recents-favorites-service';
import type {
  RecentItem,
  Favorite
} from '@shared/types/recents-favorites';
import { ItemType } from '@shared/types/recents-favorites';

/**
 * Recents and Favorites store state interface
 */
interface RecentsFavoritesState {
  // State
  recents: Record<ItemType, RecentItem[]>;
  favorites: Record<ItemType, Favorite[]>;
  loading: boolean;
  error: string | null;

  // Actions
  loadAll: () => Promise<void>;
  addRecent: (item: Omit<RecentItem, 'lastOpened'>) => Promise<void>;
  removeRecent: (path: string, type: ItemType) => Promise<void>;
  clearRecents: (type?: ItemType) => Promise<void>;

  addFavorite: (item: Omit<Favorite, 'dateAdded'>) => Promise<{ success: boolean; error?: string }>;
  removeFavorite: (path: string, type: ItemType) => Promise<void>;
  isFavorite: (path: string, type: ItemType) => boolean;

  // Internal setters
  setRecents: (type: ItemType, items: RecentItem[]) => void;
  setFavorites: (type: ItemType, items: Favorite[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const initialState = {
  recents: {
    file: [],
    folder: [],
    repo: []
  } as Record<ItemType, RecentItem[]>,
  favorites: {
    file: [],
    folder: [],
    repo: []
  } as Record<ItemType, Favorite[]>,
  loading: false,
  error: null,
};

/**
 * Recents and Favorites state store
 *
 * Usage in components:
 * ```typescript
 * const { recents, favorites, loadAll, addRecent, addFavorite } = useRecentsFavoritesStore();
 * ```
 */
export const useRecentsFavoritesStore = create<RecentsFavoritesState>((set, get) => ({
  ...initialState,

  /**
   * Load all recents and favorites from storage
   */
  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [
        filesRecents,
        foldersRecents,
        reposRecents,
        filesFavorites,
        foldersFavorites,
        reposFavorites
      ] = await Promise.all([
        recentsFavoritesService.getRecents(ItemType.FILE),
        recentsFavoritesService.getRecents(ItemType.FOLDER),
        recentsFavoritesService.getRecents(ItemType.REPO),
        recentsFavoritesService.getFavorites(ItemType.FILE),
        recentsFavoritesService.getFavorites(ItemType.FOLDER),
        recentsFavoritesService.getFavorites(ItemType.REPO)
      ]);

      set({
        recents: {
          file: filesRecents,
          folder: foldersRecents,
          repo: reposRecents
        },
        favorites: {
          file: filesFavorites,
          folder: foldersFavorites,
          repo: reposFavorites
        },
        loading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load recents and favorites',
        loading: false
      });
    }
  },

  /**
   * Add a recent item (auto-generates lastOpened timestamp)
   */
  addRecent: async (item) => {
    const recentItem: RecentItem = {
      ...item,
      lastOpened: Date.now()
    };

    try {
      await recentsFavoritesService.addRecent(recentItem);
      const updated = await recentsFavoritesService.getRecents(item.type);
      get().setRecents(item.type, updated);
    } catch (error) {
      console.error('[RecentsFavoritesStore] Error adding recent:', error);
      throw error;
    }
  },

  /**
   * Remove a recent item
   */
  removeRecent: async (path, type) => {
    try {
      await recentsFavoritesService.removeRecent(path, type);
      const updated = await recentsFavoritesService.getRecents(type);
      get().setRecents(type, updated);
    } catch (error) {
      console.error('[RecentsFavoritesStore] Error removing recent:', error);
      throw error;
    }
  },

  /**
   * Clear all recents for a type (or all types if not specified)
   */
  clearRecents: async (type) => {
    try {
      if (type) {
        await recentsFavoritesService.clearRecents(type);
        get().setRecents(type, []);
      } else {
        // Clear all categories
        await Promise.all([
          recentsFavoritesService.clearRecents(ItemType.FILE),
          recentsFavoritesService.clearRecents(ItemType.FOLDER),
          recentsFavoritesService.clearRecents(ItemType.REPO)
        ]);
        set({
          recents: {
            file: [],
            folder: [],
            repo: []
          }
        });
      }
    } catch (error) {
      console.error('[RecentsFavoritesStore] Error clearing recents:', error);
      throw error;
    }
  },

  /**
   * Add a favorite (auto-generates dateAdded timestamp)
   * Returns success status and error message if limit reached
   */
  addFavorite: async (item) => {
    const favorite: Favorite = {
      ...item,
      dateAdded: Date.now()
    };

    try {
      const result = await recentsFavoritesService.addFavorite(favorite);
      if (result.success) {
        const updated = await recentsFavoritesService.getFavorites(item.type);
        get().setFavorites(item.type, updated);
      }
      return result;
    } catch (error) {
      console.error('[RecentsFavoritesStore] Error adding favorite:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add favorite'
      };
    }
  },

  /**
   * Remove a favorite
   */
  removeFavorite: async (path, type) => {
    try {
      await recentsFavoritesService.removeFavorite(path, type);
      const updated = await recentsFavoritesService.getFavorites(type);
      get().setFavorites(type, updated);
    } catch (error) {
      console.error('[RecentsFavoritesStore] Error removing favorite:', error);
      throw error;
    }
  },

  /**
   * Check if item is in favorites (synchronous)
   */
  isFavorite: (path, type) => {
    const favorites = get().favorites[type];
    return favorites.some(fav => fav.path === path);
  },

  // Internal setters
  setRecents: (type, items) => set((state) => ({
    recents: { ...state.recents, [type]: items }
  })),

  setFavorites: (type, items) => set((state) => ({
    favorites: { ...state.favorites, [type]: items }
  })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error })
}));
