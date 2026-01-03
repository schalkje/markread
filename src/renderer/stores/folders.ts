/**
 * Zustand Store: Folders
 * Manages opened folders, active folder, and folder-level state
 */

import { create } from 'zustand';
import type { Folder, FileTreeState, RecentItem, PanelLayout } from '@shared/types/entities.d.ts';
import {
  generateRepoFolderId,
  migrateRepositoryFolders,
  getRepositoryId,
} from '@shared/utils/repository-utils';

interface FoldersState {
  folders: Folder[];
  activeFolderId: string | null;

  // Actions
  addFolder: (folder: Folder) => Folder;
  addRepositoryFolder: (repositoryData: {
    url: string;
    displayName: string;
    repositoryId: string;
    currentBranch: string;
    defaultBranch: string;
    branches: Array<{name: string; isDefault: boolean; sha: string}>;
  }) => Folder;
  openRepositoryBranch: (repositoryId: string, branchName: string) => Promise<Folder | null>;
  removeFolder: (folderId: string) => void;
  setActiveFolder: (folderId: string) => void;
  updateFileTreeState: (folderId: string, fileTreeState: Partial<FileTreeState>) => void;
  updateSplitLayout: (folderId: string, splitLayout: PanelLayout) => void;
  addRecentFile: (folderId: string, item: RecentItem) => void;
  clearRecentFiles: (folderId: string) => void;
  updateRepositoryBranch: (folderId: string, branch: string) => void;
  updateRepositoryMetadata: (repositoryId: string, metadata: {
    branches: Array<{name: string; isDefault: boolean; sha: string}>;
    owner?: string;
    name?: string;
  }) => void;
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

    // Generate deterministic ID for this repo/branch combination
    const folderId = generateRepoFolderId(repositoryData.repositoryId, repositoryData.currentBranch);

    // Check if this exact repo/branch combination already exists
    const existing = folders.find((f) => f.id === folderId);

    if (existing) {
      // Update metadata in case branches changed
      set((state) => ({
        folders: state.folders.map((f) =>
          f.id === folderId
            ? {
                ...f,
                repositoryMetadata: {
                  branches: repositoryData.branches,
                  owner: repositoryData.displayName.split('/')[0],
                  name: repositoryData.displayName.split('/')[1],
                },
                lastAccessedAt: Date.now(),
              }
            : f
        ),
        activeFolderId: folderId,
      }));
      return existing;
    }

    const newFolder: Folder = {
      id: folderId, // Deterministic: repo:${repoId}:${branch}
      path: repositoryData.url,
      displayName: repositoryData.displayName,
      type: 'repository',
      fileTreeState: {
        expandedDirectories: new Set<string>(),
        scrollPosition: 0,
        selectedPath: null,
      },
      activeFolderId: null,
      tabCollection: [],
      activeTabId: null,
      recentFiles: [],
      splitLayout: {
        rootPane: {
          id: crypto.randomUUID(),
          tabs: [],
          activeTabId: null,
          orientation: 'vertical',
          sizeRatio: 1.0,
          splitChildren: null,
        },
        layoutType: 'single',
      },
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      repositoryId: repositoryData.repositoryId,
      repositoryUrl: repositoryData.url,
      currentBranch: repositoryData.currentBranch,
      defaultBranch: repositoryData.defaultBranch,
      repositoryMetadata: {
        branches: repositoryData.branches,
        owner: repositoryData.displayName.split('/')[0],
        name: repositoryData.displayName.split('/')[1],
      },
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

  updateRepositoryMetadata: (repositoryId, metadata) => {
    set((state) => ({
      folders: state.folders.map((f) => {
        const folderRepoId = getRepositoryId(f);
        return folderRepoId === repositoryId
          ? { ...f, repositoryMetadata: metadata }
          : f;
      }),
    }));
  },

  openRepositoryBranch: async (repositoryId, branchName) => {
    const { folders } = get();

    // Generate deterministic ID for this repo/branch
    const folderId = generateRepoFolderId(repositoryId, branchName);

    // Check if already open
    const existing = folders.find((f) => f.id === folderId);
    if (existing) {
      set({ activeFolderId: folderId });
      return existing;
    }

    // Find any existing folder from the same repository to copy metadata
    const sameRepoFolder = folders.find((f) => getRepositoryId(f) === repositoryId);
    if (!sameRepoFolder || !sameRepoFolder.repositoryMetadata) {
      console.error('Cannot open branch: no existing folder found for repository', repositoryId);
      return null;
    }

    // Create new folder for this branch
    // Extract base repo name from the existing displayName (remove branch suffix if present)
    const baseRepoName = sameRepoFolder.repositoryMetadata?.owner && sameRepoFolder.repositoryMetadata?.name
      ? `${sameRepoFolder.repositoryMetadata.owner}/${sameRepoFolder.repositoryMetadata.name}`
      : sameRepoFolder.displayName.replace(/\s*\([^)]+\)\s*$/, '');

    const newFolder: Folder = {
      id: folderId,
      path: sameRepoFolder.path,
      displayName: `${baseRepoName} (${branchName})`,
      type: 'repository',
      fileTreeState: {
        expandedDirectories: new Set<string>(),
        scrollPosition: 0,
        selectedPath: null,
      },
      activeFolderId: null,
      tabCollection: [],
      activeTabId: null,
      recentFiles: [],
      splitLayout: {
        rootPane: {
          id: crypto.randomUUID(),
          tabs: [],
          activeTabId: null,
          orientation: 'vertical',
          sizeRatio: 1.0,
          splitChildren: null,
        },
        layoutType: 'single',
      },
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      repositoryId: sameRepoFolder.repositoryId,
      repositoryUrl: sameRepoFolder.repositoryUrl,
      currentBranch: branchName,
      defaultBranch: sameRepoFolder.defaultBranch,
      repositoryMetadata: sameRepoFolder.repositoryMetadata,
    };

    set((state) => ({
      folders: [...state.folders, newFolder],
      activeFolderId: newFolder.id,
    }));

    // Trigger file tree fetch for new branch
    // This will be handled by the component after switching
    window.dispatchEvent(new CustomEvent('repository:branch-opened', {
      detail: { folderId, repositoryId, branchName },
    }));

    return newFolder;
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
