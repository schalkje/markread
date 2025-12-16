/**
 * Zustand Store: Folders
 * Manages opened folders, active folder, and folder-level state
 */

import { create } from 'zustand';
import type { Folder, FileTreeState, RecentItem, PanelLayout } from '@shared/types/entities.d.ts';

interface FoldersState {
  folders: Folder[];
  activeFolderId: string | null;

  // Actions
  addFolder: (folder: Folder) => Folder;
  removeFolder: (folderId: string) => void;
  setActiveFolder: (folderId: string) => void;
  updateFileTreeState: (folderId: string, fileTreeState: Partial<FileTreeState>) => void;
  updateSplitLayout: (folderId: string, splitLayout: PanelLayout) => void;
  addRecentFile: (folderId: string, item: RecentItem) => void;
  clearRecentFiles: (folderId: string) => void;
  // T163n: Open folder in new window
  openFolderInNewWindow: (folderPath: string) => Promise<boolean>;
}

export const useFoldersStore = create<FoldersState>((set, get) => ({
  folders: [],
  activeFolderId: null,

  addFolder: (folder) => {
    const { folders } = get();
    const existing = folders.find((f) => f.path === folder.path);

    if (existing) {
      set({ activeFolderId: existing.id });
      return existing;
    }

    set((state) => ({
      folders: [...state.folders, folder],
      activeFolderId: folder.id,
    }));
    return folder;
  },

  removeFolder: (folderId) => {
    set((state) => {
      const newFolders = state.folders.filter((f) => f.id !== folderId);
      const newActiveFolderId =
        state.activeFolderId === folderId
          ? newFolders.length > 0
            ? newFolders[0].id
            : null
          : state.activeFolderId;

      return {
        folders: newFolders,
        activeFolderId: newActiveFolderId,
      };
    });
  },

  setActiveFolder: (folderId) => {
    const { folders } = get();
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      folder.lastAccessedAt = Date.now();
      set({ activeFolderId: folderId });
    }
  },

  updateFileTreeState: (folderId, fileTreeState) => {
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === folderId ? { ...f, fileTreeState: { ...f.fileTreeState, ...fileTreeState } } : f
      ),
    }));
  },

  updateSplitLayout: (folderId, splitLayout) => {
    set((state) => ({
      folders: state.folders.map((f) => (f.id === folderId ? { ...f, splitLayout } : f)),
    }));
  },

  addRecentFile: (folderId, item) => {
    set((state) => ({
      folders: state.folders.map((f) => {
        if (f.id !== folderId) return f;

        let recentFiles = f.recentFiles.filter((r) => r.path !== item.path);
        recentFiles.unshift(item);
        if (recentFiles.length > 20) {
          recentFiles = recentFiles.slice(0, 20);
        }

        return { ...f, recentFiles };
      }),
    }));
  },

  clearRecentFiles: (folderId) => {
    set((state) => ({
      folders: state.folders.map((f) => (f.id === folderId ? { ...f, recentFiles: [] } : f)),
    }));
  },

  // T163n: Open folder in new window
  openFolderInNewWindow: async (folderPath) => {
    try {
      // Call IPC handler to create new window with folder path
      const result = await window.electronAPI.window.createNew({
        folderPath,
      });

      if (result.success) {
        return true;
      } else {
        console.error('Failed to create new window:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error opening folder in new window:', error);
      return false;
    }
  },
}));
