/**
 * Recents and Favorites Hook
 *
 * React hook for managing recents and favorites.
 * Provides a component-friendly interface to the Zustand store.
 *
 * Source: specs/001-home-recents-favorites/data-model.md
 */

import { useEffect } from 'react';
import { useRecentsFavoritesStore } from '../stores/recents-favorites';

/**
 * Recents and Favorites operations hook
 *
 * Usage:
 * ```typescript
 * const { recents, favorites, loadAll, addRecent, addFavorite } = useRecentsFavorites();
 *
 * // Load all data on mount
 * useEffect(() => {
 *   loadAll();
 * }, []);
 *
 * // Add recent item
 * await addRecent({
 *   path: '/path/to/file.md',
 *   type: 'file',
 *   displayName: 'file.md'
 * });
 *
 * // Add favorite
 * const result = await addFavorite({
 *   path: '/path/to/file.md',
 *   type: 'file',
 *   displayName: 'file.md'
 * });
 * if (!result.success) {
 *   console.error('Failed to add favorite:', result.error);
 * }
 * ```
 */
export const useRecentsFavorites = () => {
  const store = useRecentsFavoritesStore();

  return {
    // State
    recents: store.recents,
    favorites: store.favorites,
    loading: store.loading,
    error: store.error,

    // Actions
    loadAll: store.loadAll,
    addRecent: store.addRecent,
    removeRecent: store.removeRecent,
    clearRecents: store.clearRecents,
    addFavorite: store.addFavorite,
    removeFavorite: store.removeFavorite,
    isFavorite: store.isFavorite,
  };
};

/**
 * Hook that automatically loads recents and favorites on mount
 *
 * Usage:
 * ```typescript
 * const { recents, favorites, loading } = useRecentsFavoritesAutoLoad();
 * ```
 */
export const useRecentsFavoritesAutoLoad = () => {
  const hook = useRecentsFavorites();

  useEffect(() => {
    hook.loadAll();
  }, []);

  return hook;
};
