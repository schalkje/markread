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
  addRepositoryFolder: (repositoryData: {
    id: string;
    url: string;
    displayName: string;
    repositoryId: string;
    currentBranch: string;
    defaultBranch: string;
    branches: Array<{name: string; isDefault: boolean; sha: string}>;
  }) => Folder;
  removeFolder: (folderId: string) => void;
  setActiveFolder: (folderId: string) => void;
  updateFileTreeState: (folderId: string, fileTreeState: Partial<FileTreeState>) => void;
  updateSplitLayout: (folderId: string, splitLayout: PanelLayout) => void;
  addRecentFile: (folderId: string, item: RecentItem) => void;
  clearRecentFiles: (folderId: string) => void;
  updateRepositoryBranch: (folderId: string, branch: string) => void;
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

  addRepositoryFolder: (repositoryData) => {
    const { folders } = get();
    // Check for existing repo with SAME URL AND SAME BRANCH
    const existing = folders.find(
      (f) => f.path === repositoryData.url &&
             f.type === 'repository' &&
             f.currentBranch === repositoryData.currentBranch
    );

    if (existing) {
      set({ activeFolderId: existing.id });
      return existing;
    }

    const newFolder: Folder = {
      id: `${repositoryData.id}-${repositoryData.currentBranch}`, // Include branch in ID
      path: repositoryData.url,
      displayName: `${repositoryData.displayName}`, // Keep clean name, branch shows in UI
      type: 'repository',
      fileTreeState: {
        expandedPaths: [],
        collapsedPaths: [],
        scrollPosition: 0,
        selectedPath: null,
      },
      activeFolderId: null,
      tabCollection: [],
      activeTabId: null,
      recentFiles: [],
      splitLayout: { type: 'single', primarySize: 100 },
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      repositoryId: repositoryData.repositoryId,
      currentBranch: repositoryData.currentBranch,
      defaultBranch: repositoryData.defaultBranch,
      branches: repositoryData.branches,
    };

    set((state) => ({
      folders: [...state.folders, newFolder],
      activeFolderId: newFolder.id,
    }));
    return newFolder;
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

  updateRepositoryBranch: (folderId, branch) => {
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === folderId && f.type === 'repository' ? { ...f, currentBranch: branch } : f
      ),
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
