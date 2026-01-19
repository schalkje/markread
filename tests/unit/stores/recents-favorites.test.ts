/**
 * Unit Tests: Recents & Favorites Zustand Store
 * Task: T038
 *
 * Tests verify:
 * - All store actions (loadAll, addRecent, removeRecent, addFavorite, etc.)
 * - State updates (recents, favorites, loading, error)
 * - Error handling
 * - Async operations
 *
 * Source: specs/001-home-recents-favorites/tasks.md
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ItemType } from '../../../src/shared/types/recents-favorites';

// Mock the service
vi.mock('../../../src/renderer/services/recents-favorites-service', () => ({
  recentsFavoritesService: {
    getRecents: vi.fn(),
    addRecent: vi.fn(),
    removeRecent: vi.fn(),
    clearRecents: vi.fn(),
    getFavorites: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    isFavorite: vi.fn(),
    getFavoritesCount: vi.fn(),
  },
}));

import { recentsFavoritesService } from '../../../src/renderer/services/recents-favorites-service';
import { useRecentsFavoritesStore } from '../../../src/renderer/stores/recents-favorites';

describe('Recents & Favorites Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useRecentsFavoritesStore.setState({
      recents: { file: [], folder: [], repo: [] },
      favorites: { file: [], folder: [], repo: [] },
      loading: false,
      error: null,
    });

    // Clear all mocks
    vi.clearAllMocks();

    // Suppress console.error during error tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Initial State', () => {
    it('should have empty recents and favorites initially', () => {
      const state = useRecentsFavoritesStore.getState();

      expect(state.recents).toEqual({ file: [], folder: [], repo: [] });
      expect(state.favorites).toEqual({ file: [], folder: [], repo: [] });
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadAll Action', () => {
    it('should load all recents and favorites', async () => {
      const mockRecents = {
        [ItemType.FILE]: [
          {
            path: '/test/file1.md',
            type: ItemType.FILE,
            lastOpened: Date.now(),
            displayName: 'file1.md',
          },
        ],
        [ItemType.FOLDER]: [],
        [ItemType.REPO]: [],
      };

      const mockFavorites = {
        [ItemType.FILE]: [
          {
            path: '/test/fav1.md',
            type: ItemType.FILE,
            dateAdded: Date.now(),
            displayName: 'fav1.md',
          },
        ],
        [ItemType.FOLDER]: [],
        [ItemType.REPO]: [],
      };

      (recentsFavoritesService.getRecents as Mock).mockImplementation(async (type) => {
        return mockRecents[type];
      });

      (recentsFavoritesService.getFavorites as Mock).mockImplementation(async (type) => {
        return mockFavorites[type];
      });

      const { loadAll } = useRecentsFavoritesStore.getState();
      await loadAll();

      const state = useRecentsFavoritesStore.getState();

      expect(state.recents.file).toHaveLength(1);
      expect(state.favorites.file).toHaveLength(1);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set loading state during load', async () => {
      (recentsFavoritesService.getRecents as Mock).mockImplementation(
        async () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      (recentsFavoritesService.getFavorites as Mock).mockResolvedValue([]);

      const { loadAll } = useRecentsFavoritesStore.getState();
      const loadPromise = loadAll();

      // Check loading state is true during load
      const stateDuringLoad = useRecentsFavoritesStore.getState();
      expect(stateDuringLoad.loading).toBe(true);

      await loadPromise;

      // Check loading state is false after load
      const stateAfterLoad = useRecentsFavoritesStore.getState();
      expect(stateAfterLoad.loading).toBe(false);
    });

    it('should handle errors during load', async () => {
      const errorMessage = 'Failed to load recents';
      (recentsFavoritesService.getRecents as Mock).mockRejectedValue(new Error(errorMessage));

      const { loadAll } = useRecentsFavoritesStore.getState();
      await loadAll();

      const state = useRecentsFavoritesStore.getState();

      expect(state.error).toContain(errorMessage);
      expect(state.loading).toBe(false);
    });
  });

  describe('addRecent Action', () => {
    it('should add a recent item', async () => {
      (recentsFavoritesService.addRecent as Mock).mockResolvedValue(undefined);
      (recentsFavoritesService.getRecents as Mock).mockResolvedValue([
        {
          path: '/test/file.md',
          type: ItemType.FILE,
          lastOpened: Date.now(),
          displayName: 'file.md',
        },
      ]);

      const { addRecent } = useRecentsFavoritesStore.getState();
      await addRecent({
        path: '/test/file.md',
        type: ItemType.FILE,
        displayName: 'file.md',
      });

      expect(recentsFavoritesService.addRecent).toHaveBeenCalled();
      expect(recentsFavoritesService.getRecents).toHaveBeenCalledWith(ItemType.FILE);

      const state = useRecentsFavoritesStore.getState();
      expect(state.recents.file).toHaveLength(1);
    });

    it('should handle errors when adding recent', async () => {
      (recentsFavoritesService.addRecent as Mock).mockRejectedValue(
        new Error('Failed to add recent')
      );

      const { addRecent } = useRecentsFavoritesStore.getState();
      await addRecent({
        path: '/test/file.md',
        type: ItemType.FILE,
        displayName: 'file.md',
      });

      const state = useRecentsFavoritesStore.getState();
      expect(state.error).toContain('Failed to add recent');
    });
  });

  describe('removeRecent Action', () => {
    it('should remove a recent item', async () => {
      (recentsFavoritesService.removeRecent as Mock).mockResolvedValue(undefined);
      (recentsFavoritesService.getRecents as Mock).mockResolvedValue([]);

      const { removeRecent } = useRecentsFavoritesStore.getState();
      await removeRecent('/test/file.md', ItemType.FILE);

      expect(recentsFavoritesService.removeRecent).toHaveBeenCalledWith(
        '/test/file.md',
        ItemType.FILE
      );
      expect(recentsFavoritesService.getRecents).toHaveBeenCalledWith(ItemType.FILE);

      const state = useRecentsFavoritesStore.getState();
      expect(state.recents.file).toHaveLength(0);
    });
  });

  describe('clearRecents Action', () => {
    it('should clear all recents for a type', async () => {
      (recentsFavoritesService.clearRecents as Mock).mockResolvedValue(undefined);

      const { clearRecents } = useRecentsFavoritesStore.getState();
      await clearRecents(ItemType.FILE);

      expect(recentsFavoritesService.clearRecents).toHaveBeenCalledWith(ItemType.FILE);

      const state = useRecentsFavoritesStore.getState();
      expect(state.recents.file).toHaveLength(0);
    });
  });

  describe('addFavorite Action', () => {
    it('should add a favorite item successfully', async () => {
      (recentsFavoritesService.addFavorite as Mock).mockResolvedValue({ success: true });
      (recentsFavoritesService.getFavorites as Mock).mockResolvedValue([
        {
          path: '/test/file.md',
          type: ItemType.FILE,
          dateAdded: Date.now(),
          displayName: 'file.md',
        },
      ]);

      const { addFavorite } = useRecentsFavoritesStore.getState();
      const result = await addFavorite({
        path: '/test/file.md',
        type: ItemType.FILE,
        displayName: 'file.md',
      });

      expect(result.success).toBe(true);
      expect(recentsFavoritesService.addFavorite).toHaveBeenCalled();
      expect(recentsFavoritesService.getFavorites).toHaveBeenCalledWith(ItemType.FILE);

      const state = useRecentsFavoritesStore.getState();
      expect(state.favorites.file).toHaveLength(1);
    });

    it('should return error when favorites limit reached', async () => {
      const limitError = new Error('Maximum 10 favorites per category');
      (recentsFavoritesService.addFavorite as Mock).mockRejectedValue(limitError);

      const { addFavorite } = useRecentsFavoritesStore.getState();
      const result = await addFavorite({
        path: '/test/file.md',
        type: ItemType.FILE,
        displayName: 'file.md',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum 10 favorites');
    });

    it('should handle generic errors when adding favorite', async () => {
      (recentsFavoritesService.addFavorite as Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const { addFavorite } = useRecentsFavoritesStore.getState();
      const result = await addFavorite({
        path: '/test/file.md',
        type: ItemType.FILE,
        displayName: 'file.md',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage error');
    });
  });

  describe('removeFavorite Action', () => {
    it('should remove a favorite item', async () => {
      (recentsFavoritesService.removeFavorite as Mock).mockResolvedValue(undefined);
      (recentsFavoritesService.getFavorites as Mock).mockResolvedValue([]);

      const { removeFavorite } = useRecentsFavoritesStore.getState();
      await removeFavorite('/test/file.md', ItemType.FILE);

      expect(recentsFavoritesService.removeFavorite).toHaveBeenCalledWith(
        '/test/file.md',
        ItemType.FILE
      );
      expect(recentsFavoritesService.getFavorites).toHaveBeenCalledWith(ItemType.FILE);

      const state = useRecentsFavoritesStore.getState();
      expect(state.favorites.file).toHaveLength(0);
    });
  });

  describe('isFavorite Action', () => {
    it('should check if item is in favorites', () => {
      // Set initial state with a favorite
      useRecentsFavoritesStore.setState({
        favorites: {
          file: [
            {
              path: '/test/file.md',
              type: ItemType.FILE,
              dateAdded: Date.now(),
              displayName: 'file.md',
            },
          ],
          folder: [],
          repo: [],
        },
      } as any);

      const { isFavorite } = useRecentsFavoritesStore.getState();

      expect(isFavorite('/test/file.md', ItemType.FILE)).toBe(true);
      expect(isFavorite('/other/file.md', ItemType.FILE)).toBe(false);
      expect(isFavorite('/test/file.md', ItemType.FOLDER)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should clear error when clearError is called', () => {
      useRecentsFavoritesStore.setState({ error: 'Some error' });

      const { clearError } = useRecentsFavoritesStore.getState();
      clearError();

      const state = useRecentsFavoritesStore.getState();
      expect(state.error).toBeNull();
    });

    it('should set error state when operations fail', async () => {
      (recentsFavoritesService.addRecent as Mock).mockRejectedValue(new Error('Test error'));

      const { addRecent } = useRecentsFavoritesStore.getState();
      await addRecent({
        path: '/test/file.md',
        type: ItemType.FILE,
        displayName: 'file.md',
      });

      const state = useRecentsFavoritesStore.getState();
      expect(state.error).toBeTruthy();
    });
  });

  describe('State Consistency', () => {
    it('should maintain separate state for each item type', async () => {
      (recentsFavoritesService.getRecents as Mock).mockImplementation(async (type) => {
        if (type === ItemType.FILE) {
          return [{ path: '/test/file.md', type: ItemType.FILE, lastOpened: Date.now(), displayName: 'file.md' }];
        }
        if (type === ItemType.FOLDER) {
          return [{ path: '/test/folder', type: ItemType.FOLDER, lastOpened: Date.now(), displayName: 'folder' }];
        }
        return [];
      });

      (recentsFavoritesService.getFavorites as Mock).mockResolvedValue([]);

      const { loadAll } = useRecentsFavoritesStore.getState();
      await loadAll();

      const state = useRecentsFavoritesStore.getState();

      expect(state.recents.file).toHaveLength(1);
      expect(state.recents.folder).toHaveLength(1);
      expect(state.recents.repo).toHaveLength(0);
    });

    it('should not affect other categories when updating one', async () => {
      // Set initial state
      useRecentsFavoritesStore.setState({
        recents: {
          file: [{ path: '/test/file1.md', type: ItemType.FILE, lastOpened: Date.now(), displayName: 'file1.md' }],
          folder: [{ path: '/test/folder1', type: ItemType.FOLDER, lastOpened: Date.now(), displayName: 'folder1' }],
          repo: [],
        },
      } as any);

      (recentsFavoritesService.addRecent as Mock).mockResolvedValue(undefined);
      (recentsFavoritesService.getRecents as Mock).mockImplementation(async (type) => {
        if (type === ItemType.FILE) {
          return [
            { path: '/test/file1.md', type: ItemType.FILE, lastOpened: Date.now(), displayName: 'file1.md' },
            { path: '/test/file2.md', type: ItemType.FILE, lastOpened: Date.now(), displayName: 'file2.md' },
          ];
        }
        return [];
      });

      const { addRecent } = useRecentsFavoritesStore.getState();
      await addRecent({
        path: '/test/file2.md',
        type: ItemType.FILE,
        displayName: 'file2.md',
      });

      const state = useRecentsFavoritesStore.getState();

      // File recents should be updated
      expect(state.recents.file).toHaveLength(2);

      // Folder recents should remain unchanged
      expect(state.recents.folder).toHaveLength(1);
    });
  });
});
