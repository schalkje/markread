/**
 * Pinia Store: Tabs
 * Manages open tabs, active tab, and tab-level state
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Tab, SearchState, HistoryEntry } from '@shared/types/entities';
import { useFoldersStore } from './folders';

export const useTabsStore = defineStore('tabs', () => {
  const foldersStore = useFoldersStore();

  // State
  const tabs = ref<Map<string, Tab>>(new Map()); // Keyed by tab ID for fast lookup

  // Getters
  const getTabById = (tabId: string): Tab | undefined => {
    return tabs.value.get(tabId);
  };

  const getTabsByFolderId = (folderId: string): Tab[] => {
    const folder = foldersStore.getFolderById(folderId);
    if (!folder) return [];
    return folder.tabCollection;
  };

  const activeTab = computed(() => {
    const folder = foldersStore.activeFolder;
    if (!folder || !folder.activeTabId) return null;
    return tabs.value.get(folder.activeTabId) || null;
  });

  // Actions
  const addTab = (folderId: string, tab: Tab) => {
    const folder = foldersStore.getFolderById(folderId);
    if (!folder) return;

    // Check tab limit (FR-013a: warning at 20, hard block at 50)
    if (folder.tabCollection.length >= 50) {
      console.warn('Cannot add tab: Maximum 50 tabs reached');
      return;
    }

    if (folder.tabCollection.length >= 20) {
      console.warn('Warning: More than 20 tabs open');
    }

    // Check if file already open in this folder
    const existingTab = folder.tabCollection.find((t) => t.filePath === tab.filePath);
    if (existingTab) {
      // Activate existing tab instead
      folder.activeTabId = existingTab.id;
      return existingTab;
    }

    // Add tab
    tabs.value.set(tab.id, tab);
    folder.tabCollection.push(tab);
    folder.activeTabId = tab.id;

    return tab;
  };

  const removeTab = (folderId: string, tabId: string) => {
    const folder = foldersStore.getFolderById(folderId);
    if (!folder) return;

    const index = folder.tabCollection.findIndex((t) => t.id === tabId);
    if (index === -1) return;

    // Remove from folder's tab collection
    folder.tabCollection.splice(index, 1);

    // Remove from tabs map
    tabs.value.delete(tabId);

    // If removed tab was active, activate adjacent tab
    if (folder.activeTabId === tabId) {
      if (folder.tabCollection.length > 0) {
        // Activate previous tab, or first tab if removed was first
        const newIndex = Math.max(0, index - 1);
        folder.activeTabId = folder.tabCollection[newIndex]?.id || null;
      } else {
        folder.activeTabId = null;
      }
    }
  };

  const setActiveTab = (folderId: string, tabId: string) => {
    const folder = foldersStore.getFolderById(folderId);
    if (!folder) return;

    const tab = tabs.value.get(tabId);
    if (tab && folder.tabCollection.find((t) => t.id === tabId)) {
      folder.activeTabId = tabId;
    }
  };

  const updateTabScrollPosition = (tabId: string, scrollPosition: number) => {
    const tab = tabs.value.get(tabId);
    if (tab) {
      tab.scrollPosition = Math.max(0, scrollPosition);
    }
  };

  const updateTabZoomLevel = (tabId: string, zoomLevel: number) => {
    const tab = tabs.value.get(tabId);
    if (tab) {
      // Clamp zoom level to 10-2000% (FR-065, clarification)
      tab.zoomLevel = Math.max(10, Math.min(2000, zoomLevel));
    }
  };

  const updateTabSearchState = (tabId: string, searchState: SearchState | null) => {
    const tab = tabs.value.get(tabId);
    if (tab) {
      tab.searchState = searchState;
    }
  };

  const updateTabContent = (
    tabId: string,
    content: string,
    modificationTimestamp: number,
    renderCache?: string
  ) => {
    const tab = tabs.value.get(tabId);
    if (tab) {
      tab.modificationTimestamp = modificationTimestamp;
      if (renderCache !== undefined) {
        tab.renderCache = renderCache;
      }
      tab.isDirty = false;
    }
  };

  const markTabDirty = (tabId: string) => {
    const tab = tabs.value.get(tabId);
    if (tab) {
      tab.isDirty = true;
      tab.renderCache = null; // Invalidate cache
    }
  };

  const addToNavigationHistory = (tabId: string, entry: HistoryEntry) => {
    const tab = tabs.value.get(tabId);
    if (!tab) return;

    tab.navigationHistory.push(entry);

    // Limit to 50 entries (data-model.md)
    if (tab.navigationHistory.length > 50) {
      tab.navigationHistory.shift(); // Remove oldest
    }
  };

  const closeAllTabs = (folderId: string) => {
    const folder = foldersStore.getFolderById(folderId);
    if (!folder) return;

    // Remove all tabs from map
    folder.tabCollection.forEach((tab) => {
      tabs.value.delete(tab.id);
    });

    // Clear folder's tab collection
    folder.tabCollection = [];
    folder.activeTabId = null;
  };

  return {
    // State
    tabs,

    // Getters
    getTabById,
    getTabsByFolderId,
    activeTab,

    // Actions
    addTab,
    removeTab,
    setActiveTab,
    updateTabScrollPosition,
    updateTabZoomLevel,
    updateTabSearchState,
    updateTabContent,
    markTabDirty,
    addToNavigationHistory,
    closeAllTabs,
  };
});
