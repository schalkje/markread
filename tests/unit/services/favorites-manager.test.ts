/**
 * Unit Tests: FavoritesManager
 * Task: T037
 *
 * Tests verify:
 * - Limit enforcement (max 10 items per category)
 * - Alphabetical sorting (case-insensitive)
 * - Duplicate prevention
 * - Basic CRUD operations
 *
 * Source: specs/001-home-recents-favorites/tasks.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { FavoritesManager } from '../../../src/main/services/storage/favorites-manager';
import { ItemType, ERROR_MESSAGES } from '../../../src/shared/types/recents-favorites';

describe('FavoritesManager', () => {
  let favoritesManager: FavoritesManager;
  let testStorePath: string;

  beforeEach(() => {
    // Create a temporary directory for test storage
    testStorePath = path.join(os.tmpdir(), `test-favorites-${Date.now()}`);
    if (!fs.existsSync(testStorePath)) {
      fs.mkdirSync(testStorePath, { recursive: true });
    }

    favoritesManager = new FavoritesManager(testStorePath);
  });

  afterEach(async () => {
    // Clean up test storage
    if (fs.existsSync(testStorePath)) {
      fs.rmSync(testStorePath, { recursive: true, force: true });
    }
  });

  describe('Basic Operations', () => {
    it('should add a favorite item', async () => {
      const item = {
        path: '/test/file.md',
        type: ItemType.FILE,
        dateAdded: Date.now(),
        displayName: 'file.md',
      };

      await favoritesManager.addFavorite(item);

      const favorites = await favoritesManager.getFavorites(ItemType.FILE);
      expect(favorites).toHaveLength(1);
      expect(favorites[0]).toMatchObject({
        path: item.path,
        displayName: item.displayName,
      });
    });

    it('should get favorites by type', async () => {
      await favoritesManager.addFavorite({
        path: '/test/file.md',
        type: ItemType.FILE,
        dateAdded: Date.now(),
        displayName: 'file.md',
      });

      await favoritesManager.addFavorite({
        path: '/test/folder',
        type: ItemType.FOLDER,
        dateAdded: Date.now(),
        displayName: 'folder',
      });

      const fileFavorites = await favoritesManager.getFavorites(ItemType.FILE);
      const folderFavorites = await favoritesManager.getFavorites(ItemType.FOLDER);

      expect(fileFavorites).toHaveLength(1);
      expect(folderFavorites).toHaveLength(1);
      expect(fileFavorites[0].type).toBe(ItemType.FILE);
      expect(folderFavorites[0].type).toBe(ItemType.FOLDER);
    });

    it('should remove a favorite item', async () => {
      const item = {
        path: '/test/file.md',
        type: ItemType.FILE,
        dateAdded: Date.now(),
        displayName: 'file.md',
      };

      await favoritesManager.addFavorite(item);
      await favoritesManager.removeFavorite(item.path, item.type);

      const favorites = await favoritesManager.getFavorites(ItemType.FILE);
      expect(favorites).toHaveLength(0);
    });

    it('should check if item is in favorites', async () => {
      const item = {
        path: '/test/file.md',
        type: ItemType.FILE,
        dateAdded: Date.now(),
        displayName: 'file.md',
      };

      await favoritesManager.addFavorite(item);

      const isFav = await favoritesManager.isFavorite(item.path, item.type);
      expect(isFav).toBe(true);

      const notFav = await favoritesManager.isFavorite('/other/file.md', ItemType.FILE);
      expect(notFav).toBe(false);
    });

    it('should get favorites count', async () => {
      for (let i = 0; i < 5; i++) {
        await favoritesManager.addFavorite({
          path: `/test/file${i}.md`,
          type: ItemType.FILE,
          dateAdded: Date.now(),
          displayName: `file${i}.md`,
        });
      }

      const count = await favoritesManager.getFavoritesCount(ItemType.FILE);
      expect(count).toBe(5);
    });
  });

  describe('Limit Enforcement', () => {
    it('should enforce 10-item limit per category', async () => {
      // Try to add 11 items
      for (let i = 0; i < 10; i++) {
        await favoritesManager.addFavorite({
          path: `/test/file${i}.md`,
          type: ItemType.FILE,
          dateAdded: Date.now(),
          displayName: `file${i}.md`,
        });
      }

      // 11th item should throw error
      await expect(
        favoritesManager.addFavorite({
          path: '/test/file11.md',
          type: ItemType.FILE,
          dateAdded: Date.now(),
          displayName: 'file11.md',
        })
      ).rejects.toThrow(ERROR_MESSAGES.FAVORITES_LIMIT_REACHED);

      const favorites = await favoritesManager.getFavorites(ItemType.FILE);
      expect(favorites).toHaveLength(10);
    });

    it('should allow 10 items per category independently', async () => {
      // Add 10 files
      for (let i = 0; i < 10; i++) {
        await favoritesManager.addFavorite({
          path: `/test/file${i}.md`,
          type: ItemType.FILE,
          dateAdded: Date.now(),
          displayName: `file${i}.md`,
        });
      }

      // Add 10 folders
      for (let i = 0; i < 10; i++) {
        await favoritesManager.addFavorite({
          path: `/test/folder${i}`,
          type: ItemType.FOLDER,
          dateAdded: Date.now(),
          displayName: `folder${i}`,
        });
      }

      const fileFavorites = await favoritesManager.getFavorites(ItemType.FILE);
      const folderFavorites = await favoritesManager.getFavorites(ItemType.FOLDER);

      expect(fileFavorites).toHaveLength(10);
      expect(folderFavorites).toHaveLength(10);
    });

    it('should allow re-adding existing favorite without error', async () => {
      const item = {
        path: '/test/file.md',
        type: ItemType.FILE,
        dateAdded: Date.now(),
        displayName: 'file.md',
      };

      await favoritesManager.addFavorite(item);

      // Re-adding should not throw error
      await expect(favoritesManager.addFavorite(item)).resolves.not.toThrow();

      const favorites = await favoritesManager.getFavorites(ItemType.FILE);
      expect(favorites).toHaveLength(1);
    });
  });

  describe('Alphabetical Sorting', () => {
    it('should sort favorites alphabetically by display name', async () => {
      const items = [
        { path: '/test/zebra.md', displayName: 'Zebra' },
        { path: '/test/apple.md', displayName: 'Apple' },
        { path: '/test/banana.md', displayName: 'Banana' },
        { path: '/test/mango.md', displayName: 'Mango' },
      ];

      for (const item of items) {
        await favoritesManager.addFavorite({
          ...item,
          type: ItemType.FILE,
          dateAdded: Date.now(),
        });
      }

      const favorites = await favoritesManager.getFavorites(ItemType.FILE);

      expect(favorites[0].displayName).toBe('Apple');
      expect(favorites[1].displayName).toBe('Banana');
      expect(favorites[2].displayName).toBe('Mango');
      expect(favorites[3].displayName).toBe('Zebra');
    });

    it('should sort case-insensitively', async () => {
      const items = [
        { path: '/test/zebra.md', displayName: 'zebra' },
        { path: '/test/Apple.md', displayName: 'Apple' },
        { path: '/test/banana.md', displayName: 'BANANA' },
      ];

      for (const item of items) {
        await favoritesManager.addFavorite({
          ...item,
          type: ItemType.FILE,
          dateAdded: Date.now(),
        });
      }

      const favorites = await favoritesManager.getFavorites(ItemType.FILE);

      expect(favorites[0].displayName).toBe('Apple');
      expect(favorites[1].displayName).toBe('BANANA');
      expect(favorites[2].displayName).toBe('zebra');
    });

    it('should maintain alphabetical order when removing items', async () => {
      const items = [
        { path: '/test/a.md', displayName: 'A' },
        { path: '/test/b.md', displayName: 'B' },
        { path: '/test/c.md', displayName: 'C' },
        { path: '/test/d.md', displayName: 'D' },
      ];

      for (const item of items) {
        await favoritesManager.addFavorite({
          ...item,
          type: ItemType.FILE,
          dateAdded: Date.now(),
        });
      }

      // Remove middle item
      await favoritesManager.removeFavorite('/test/b.md', ItemType.FILE);

      const favorites = await favoritesManager.getFavorites(ItemType.FILE);

      expect(favorites).toHaveLength(3);
      expect(favorites[0].displayName).toBe('A');
      expect(favorites[1].displayName).toBe('C');
      expect(favorites[2].displayName).toBe('D');
    });
  });

  describe('Duplicate Prevention', () => {
    it('should not add duplicate favorites', async () => {
      const item = {
        path: '/test/file.md',
        type: ItemType.FILE,
        dateAdded: Date.now(),
        displayName: 'file.md',
      };

      await favoritesManager.addFavorite(item);
      await favoritesManager.addFavorite(item); // Attempt duplicate

      const favorites = await favoritesManager.getFavorites(ItemType.FILE);
      expect(favorites).toHaveLength(1);
    });

    it('should identify duplicates by path and type', async () => {
      await favoritesManager.addFavorite({
        path: '/test/item',
        type: ItemType.FILE,
        dateAdded: Date.now(),
        displayName: 'item.md',
      });

      // Different type, same path - should be allowed
      await favoritesManager.addFavorite({
        path: '/test/item',
        type: ItemType.FOLDER,
        dateAdded: Date.now(),
        displayName: 'item',
      });

      const fileFavorites = await favoritesManager.getFavorites(ItemType.FILE);
      const folderFavorites = await favoritesManager.getFavorites(ItemType.FOLDER);

      expect(fileFavorites).toHaveLength(1);
      expect(folderFavorites).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty favorites list', async () => {
      const favorites = await favoritesManager.getFavorites(ItemType.FILE);
      expect(favorites).toEqual([]);
    });

    it('should return 0 for empty favorites count', async () => {
      const count = await favoritesManager.getFavoritesCount(ItemType.FILE);
      expect(count).toBe(0);
    });

    it('should handle removing non-existent favorite gracefully', async () => {
      await expect(
        favoritesManager.removeFavorite('/non/existent/file.md', ItemType.FILE)
      ).resolves.not.toThrow();
    });

    it('should handle special characters in display names', async () => {
      const items = [
        { path: '/test/file1.md', displayName: 'File (Copy)' },
        { path: '/test/file2.md', displayName: 'File [Draft]' },
        { path: '/test/file3.md', displayName: 'File & More' },
      ];

      for (const item of items) {
        await favoritesManager.addFavorite({
          ...item,
          type: ItemType.FILE,
          dateAdded: Date.now(),
        });
      }

      const favorites = await favoritesManager.getFavorites(ItemType.FILE);
      expect(favorites).toHaveLength(3);

      // Should be sorted alphabetically using localeCompare (parentheses/brackets before symbols)
      expect(favorites[0].displayName).toBe('File (Copy)');
      expect(favorites[1].displayName).toBe('File [Draft]');
      expect(favorites[2].displayName).toBe('File & More');
    });
  });

  describe('Path Normalization', () => {
    it('should normalize paths consistently', async () => {
      const normalizedPath = path.normalize('/test/file.md');

      await favoritesManager.addFavorite({
        path: normalizedPath,
        type: ItemType.FILE,
        dateAdded: Date.now(),
        displayName: 'file.md',
      });

      const isFav = await favoritesManager.isFavorite(normalizedPath, ItemType.FILE);
      expect(isFav).toBe(true);
    });
  });
});
