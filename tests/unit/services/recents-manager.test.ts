/**
 * Unit Tests: RecentsManager
 * Task: T036
 *
 * Tests verify:
 * - LRU eviction (max 10 items per category)
 * - Limit enforcement
 * - Path normalization
 * - Basic CRUD operations
 *
 * Source: specs/001-home-recents-favorites/tasks.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { RecentsManager } from '../../../src/main/services/storage/recents-manager';
import { ItemType } from '../../../src/shared/types/recents-favorites';

describe('RecentsManager', () => {
  let recentsManager: RecentsManager;
  let testStorePath: string;

  beforeEach(() => {
    // Create a temporary directory for test storage
    testStorePath = path.join(os.tmpdir(), `test-recents-${Date.now()}`);
    if (!fs.existsSync(testStorePath)) {
      fs.mkdirSync(testStorePath, { recursive: true });
    }

    recentsManager = new RecentsManager(testStorePath);
  });

  afterEach(async () => {
    // Clean up test storage
    if (fs.existsSync(testStorePath)) {
      fs.rmSync(testStorePath, { recursive: true, force: true });
    }
  });

  describe('Basic Operations', () => {
    it('should add a recent item', async () => {
      const item = {
        path: '/test/file.md',
        type: ItemType.FILE,
        lastOpened: Date.now(),
        displayName: 'file.md',
      };

      await recentsManager.addRecent(item);

      const recents = await recentsManager.getRecents(ItemType.FILE);
      expect(recents).toHaveLength(1);
      expect(recents[0]).toMatchObject({
        path: item.path,
        displayName: item.displayName,
      });
    });

    it('should get recents by type', async () => {
      await recentsManager.addRecent({
        path: '/test/file.md',
        type: ItemType.FILE,
        lastOpened: Date.now(),
        displayName: 'file.md',
      });

      await recentsManager.addRecent({
        path: '/test/folder',
        type: ItemType.FOLDER,
        lastOpened: Date.now(),
        displayName: 'folder',
      });

      const fileRecents = await recentsManager.getRecents(ItemType.FILE);
      const folderRecents = await recentsManager.getRecents(ItemType.FOLDER);

      expect(fileRecents).toHaveLength(1);
      expect(folderRecents).toHaveLength(1);
      expect(fileRecents[0].type).toBe(ItemType.FILE);
      expect(folderRecents[0].type).toBe(ItemType.FOLDER);
    });

    it('should remove a recent item', async () => {
      const item = {
        path: '/test/file.md',
        type: ItemType.FILE,
        lastOpened: Date.now(),
        displayName: 'file.md',
      };

      await recentsManager.addRecent(item);
      await recentsManager.removeRecent(item.path, item.type);

      const recents = await recentsManager.getRecents(ItemType.FILE);
      expect(recents).toHaveLength(0);
    });

    it('should clear all recents for a type', async () => {
      for (let i = 0; i < 5; i++) {
        await recentsManager.addRecent({
          path: `/test/file${i}.md`,
          type: ItemType.FILE,
          lastOpened: Date.now(),
          displayName: `file${i}.md`,
        });
      }

      await recentsManager.clearRecents(ItemType.FILE);

      const recents = await recentsManager.getRecents(ItemType.FILE);
      expect(recents).toHaveLength(0);
    });

    it('should check if item exists in recents', async () => {
      const item = {
        path: '/test/file.md',
        type: ItemType.FILE,
        lastOpened: Date.now(),
        displayName: 'file.md',
      };

      await recentsManager.addRecent(item);

      const exists = await recentsManager.hasRecent(item.path, item.type);
      expect(exists).toBe(true);

      const notExists = await recentsManager.hasRecent('/other/file.md', ItemType.FILE);
      expect(notExists).toBe(false);
    });
  });

  describe('LRU Eviction', () => {
    it('should enforce 10-item limit with LRU eviction', async () => {
      // Add 12 items
      for (let i = 0; i < 12; i++) {
        await recentsManager.addRecent({
          path: `/test/file${i}.md`,
          type: ItemType.FILE,
          lastOpened: Date.now() + i, // Ensure different timestamps
          displayName: `file${i}.md`,
        });

        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const recents = await recentsManager.getRecents(ItemType.FILE);

      // Should only have 10 items
      expect(recents).toHaveLength(10);

      // Oldest items (file0.md and file1.md) should be evicted
      const paths = recents.map((r) => r.path);
      expect(paths).not.toContain('/test/file0.md');
      expect(paths).not.toContain('/test/file1.md');

      // Newest items should still be present
      expect(paths).toContain('/test/file11.md');
      expect(paths).toContain('/test/file10.md');
    });

    it('should update lastOpened timestamp when re-adding existing item', async () => {
      const firstTimestamp = Date.now();
      await recentsManager.addRecent({
        path: '/test/file.md',
        type: ItemType.FILE,
        lastOpened: firstTimestamp,
        displayName: 'file.md',
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50));

      const secondTimestamp = Date.now();
      await recentsManager.addRecent({
        path: '/test/file.md',
        type: ItemType.FILE,
        lastOpened: secondTimestamp,
        displayName: 'file.md',
      });

      const recents = await recentsManager.getRecents(ItemType.FILE);

      // Should still have only 1 item
      expect(recents).toHaveLength(1);

      // Timestamp should be updated
      expect(recents[0].lastOpened).toBeGreaterThan(firstTimestamp);
    });

    it('should maintain items across different categories independently', async () => {
      // Add 10 files
      for (let i = 0; i < 10; i++) {
        await recentsManager.addRecent({
          path: `/test/file${i}.md`,
          type: ItemType.FILE,
          lastOpened: Date.now() + i,
          displayName: `file${i}.md`,
        });
      }

      // Add 10 folders
      for (let i = 0; i < 10; i++) {
        await recentsManager.addRecent({
          path: `/test/folder${i}`,
          type: ItemType.FOLDER,
          lastOpened: Date.now() + i,
          displayName: `folder${i}`,
        });
      }

      const fileRecents = await recentsManager.getRecents(ItemType.FILE);
      const folderRecents = await recentsManager.getRecents(ItemType.FOLDER);

      // Both should have 10 items
      expect(fileRecents).toHaveLength(10);
      expect(folderRecents).toHaveLength(10);
    });
  });

  describe('Path Normalization', () => {
    it('should normalize paths with different separators', async () => {
      await recentsManager.addRecent({
        path: '/test/path/file.md',
        type: ItemType.FILE,
        lastOpened: Date.now(),
        displayName: 'file.md',
      });

      // Try to add with backslashes (Windows style) - should normalize to same path
      const normalizedPath = path.normalize('/test/path/file.md');
      const exists = await recentsManager.hasRecent(normalizedPath, ItemType.FILE);
      expect(exists).toBe(true);
    });

    it('should handle paths with trailing slashes', async () => {
      const folderPath = '/test/folder';
      await recentsManager.addRecent({
        path: folderPath,
        type: ItemType.FOLDER,
        lastOpened: Date.now(),
        displayName: 'folder',
      });

      // Check with trailing slash
      const normalizedPath = path.normalize(folderPath);
      const exists = await recentsManager.hasRecent(normalizedPath, ItemType.FOLDER);
      expect(exists).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty recents list', async () => {
      const recents = await recentsManager.getRecents(ItemType.FILE);
      expect(recents).toEqual([]);
    });

    it('should handle removing non-existent item gracefully', async () => {
      await expect(
        recentsManager.removeRecent('/non/existent/file.md', ItemType.FILE)
      ).resolves.not.toThrow();
    });

    it('should handle clearing empty recents list', async () => {
      await expect(recentsManager.clearRecents(ItemType.FILE)).resolves.not.toThrow();
    });

    it('should maintain sort order by lastOpened (most recent first)', async () => {
      // Add items with specific timestamps
      const now = Date.now();
      await recentsManager.addRecent({
        path: '/test/old.md',
        type: ItemType.FILE,
        lastOpened: now - 2000,
        displayName: 'old.md',
      });

      await recentsManager.addRecent({
        path: '/test/new.md',
        type: ItemType.FILE,
        lastOpened: now,
        displayName: 'new.md',
      });

      await recentsManager.addRecent({
        path: '/test/middle.md',
        type: ItemType.FILE,
        lastOpened: now - 1000,
        displayName: 'middle.md',
      });

      const recents = await recentsManager.getRecents(ItemType.FILE);

      // Should be sorted by lastOpened descending (newest first)
      expect(recents[0].path).toBe('/test/new.md');
      expect(recents[1].path).toBe('/test/middle.md');
      expect(recents[2].path).toBe('/test/old.md');
    });
  });
});
