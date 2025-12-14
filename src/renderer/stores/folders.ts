/**
 * Pinia Store: Folders
 * Manages opened folders, active folder, and folder-level state
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Folder, FileTreeState, RecentItem, PanelLayout } from '@shared/types/entities';

export const useFoldersStore = defineStore('folders', () => {
  // State
  const folders = ref<Folder[]>([]);
  const activeFolderId = ref<string | null>(null);

  // Getters
  const activeFolder = computed(() => {
    if (!activeFolderId.value) return null;
    return folders.value.find((f) => f.id === activeFolderId.value) || null;
  });

  const folderCount = computed(() => folders.value.length);

  const getFolderById = (id: string): Folder | undefined => {
    return folders.value.find((f) => f.id === id);
  };

  // Actions
  const addFolder = (folder: Folder) => {
    // Check if folder already exists
    const existing = folders.value.find((f) => f.path === folder.path);
    if (existing) {
      // Activate existing folder instead
      activeFolderId.value = existing.id;
      return existing;
    }

    folders.value.push(folder);
    activeFolderId.value = folder.id;
    return folder;
  };

  const removeFolder = (folderId: string) => {
    const index = folders.value.findIndex((f) => f.id === folderId);
    if (index === -1) return;

    folders.value.splice(index, 1);

    // If removed folder was active, activate another folder or set to null
    if (activeFolderId.value === folderId) {
      activeFolderId.value = folders.value.length > 0 ? folders.value[0].id : null;
    }
  };

  const setActiveFolder = (folderId: string) => {
    const folder = getFolderById(folderId);
    if (folder) {
      activeFolderId.value = folderId;
      folder.lastAccessedAt = Date.now();
    }
  };

  const updateFileTreeState = (folderId: string, fileTreeState: Partial<FileTreeState>) => {
    const folder = getFolderById(folderId);
    if (folder) {
      folder.fileTreeState = { ...folder.fileTreeState, ...fileTreeState };
    }
  };

  const updateSplitLayout = (folderId: string, splitLayout: PanelLayout) => {
    const folder = getFolderById(folderId);
    if (folder) {
      folder.splitLayout = splitLayout;
    }
  };

  const addRecentFile = (folderId: string, item: RecentItem) => {
    const folder = getFolderById(folderId);
    if (!folder) return;

    // Remove existing entry if present
    folder.recentFiles = folder.recentFiles.filter((r) => r.path !== item.path);

    // Add to front (most recent)
    folder.recentFiles.unshift(item);

    // Limit to 20 items (FR-008)
    if (folder.recentFiles.length > 20) {
      folder.recentFiles = folder.recentFiles.slice(0, 20);
    }
  };

  const clearRecentFiles = (folderId: string) => {
    const folder = getFolderById(folderId);
    if (folder) {
      folder.recentFiles = [];
    }
  };

  return {
    // State
    folders,
    activeFolderId,

    // Getters
    activeFolder,
    folderCount,
    getFolderById,

    // Actions
    addFolder,
    removeFolder,
    setActiveFolder,
    updateFileTreeState,
    updateSplitLayout,
    addRecentFile,
    clearRecentFiles,
  };
});
