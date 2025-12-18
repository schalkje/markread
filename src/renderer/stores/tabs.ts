/**
 * Zustand Store: Tabs
 * Tasks: T059, T065, T067
 * Manages open tabs, active tab, navigation history, and tab-level state
 */

import { create } from 'zustand';
import type { Tab, HistoryEntry } from '@shared/types/entities.d.ts';

interface TabsState {
  tabs: Map<string, Tab>;
  activeTabId: string | null;
  tabOrder: string[]; // Ordered list of tab IDs for display

  // Tab limits (T063)
  softLimit: number; // 20 tabs - show warning
  hardLimit: number; // 50 tabs - block creation

  // Actions - Tab Management (T059)
  addTab: (tab: Tab) => Tab | undefined;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  getActiveTab: () => Tab | undefined;
  getTab: (tabId: string) => Tab | undefined;
  getAllTabs: () => Tab[];

  // Actions - Tab Navigation (T061)
  switchToNextTab: () => void;
  switchToPreviousTab: () => void;
  switchToTabByIndex: (index: number) => void;

  // Actions - Tab State Updates
  updateTabScrollPosition: (tabId: string, scrollPosition: number) => void;
  updateTabZoomLevel: (tabId: string, zoomLevel: number) => void;
  updateTabSearchState: (tabId: string, searchState: any) => void;

  // Actions - Navigation History (T065, T067)
  addHistoryEntry: (tabId: string, entry: HistoryEntry) => void;
  navigateBack: (tabId: string) => HistoryEntry | null;
  navigateForward: (tabId: string) => HistoryEntry | null;
  navigateToIndex: (tabId: string, index: number) => HistoryEntry | null;
  canNavigateBack: (tabId: string) => boolean;
  canNavigateForward: (tabId: string) => boolean;

  // Tab limit checks (T063)
  canAddTab: () => { allowed: boolean; warning?: string; error?: string };
  getTabCount: () => number;

  // T063m, T063o: Tab reordering
  reorderTab: (fromIndex: number, toIndex: number) => void;

  // T063c: Tab duplication
  duplicateTab: (tabId: string) => Tab | undefined;

  // T163f: Move tab to new window
  moveTabToNewWindow: (tabId: string) => Promise<boolean>;

  // T163i: Open file in new tab
  openFileInNewTab: (filePath: string, folderId?: string) => Promise<Tab | undefined>;

  // T163j: Open file in new window
  openFileInNewWindow: (filePath: string, folderId?: string) => Promise<boolean>;

  // T063l: Convert direct file tab to folder-connected tab
  convertDirectFileToFolder: (tabId: string, folderPath: string) => void;
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: new Map(),
  activeTabId: null,
  tabOrder: [],
  softLimit: 20,
  hardLimit: 50,

  // T059: Add tab with limit checking
  addTab: (tab) => {
    const { canAddTab, tabs, tabOrder } = get();
    const check = canAddTab();

    if (!check.allowed) {
      console.error(check.error);
      return undefined;
    }

    if (check.warning) {
      console.warn(check.warning);
    }

    set((state) => {
      const newTabs = new Map(state.tabs);
      newTabs.set(tab.id, {
        ...tab,
        navigationHistory: tab.navigationHistory || [],
        currentHistoryIndex: tab.currentHistoryIndex ?? -1,
        forwardHistory: [], // No longer used
        createdAt: tab.createdAt || Date.now(),
      });

      return {
        tabs: newTabs,
        tabOrder: [...state.tabOrder, tab.id],
        activeTabId: tab.id, // Newly added tab becomes active
      };
    });

    return tab;
  },

  // T062: Remove tab with next tab activation
  removeTab: (tabId) => {
    set((state) => {
      const newTabs = new Map(state.tabs);
      newTabs.delete(tabId);

      const newTabOrder = state.tabOrder.filter((id) => id !== tabId);

      // Determine next active tab
      let newActiveTabId = state.activeTabId;

      if (state.activeTabId === tabId) {
        // If removing active tab, activate next tab
        const currentIndex = state.tabOrder.indexOf(tabId);

        if (newTabOrder.length > 0) {
          // Try to activate tab after current, or last tab if at end
          const nextIndex = Math.min(currentIndex, newTabOrder.length - 1);
          newActiveTabId = newTabOrder[nextIndex];
        } else {
          newActiveTabId = null;
        }
      }

      return {
        tabs: newTabs,
        tabOrder: newTabOrder,
        activeTabId: newActiveTabId,
      };
    });
  },

  setActiveTab: (tabId) => {
    const { tabs } = get();
    if (tabs.has(tabId)) {
      set({ activeTabId: tabId });
    }
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return activeTabId ? tabs.get(activeTabId) : undefined;
  },

  getTab: (tabId) => {
    const { tabs } = get();
    return tabs.get(tabId);
  },

  getAllTabs: () => {
    const { tabs, tabOrder } = get();
    return tabOrder.map((id) => tabs.get(id)).filter((tab): tab is Tab => tab !== undefined);
  },

  // T061: Tab navigation shortcuts
  switchToNextTab: () => {
    const { tabOrder, activeTabId } = get();
    if (tabOrder.length === 0) return;

    const currentIndex = activeTabId ? tabOrder.indexOf(activeTabId) : -1;
    const nextIndex = (currentIndex + 1) % tabOrder.length;
    const nextTabId = tabOrder[nextIndex];

    set({ activeTabId: nextTabId });
  },

  switchToPreviousTab: () => {
    const { tabOrder, activeTabId } = get();
    if (tabOrder.length === 0) return;

    const currentIndex = activeTabId ? tabOrder.indexOf(activeTabId) : -1;
    const prevIndex = currentIndex <= 0 ? tabOrder.length - 1 : currentIndex - 1;
    const prevTabId = tabOrder[prevIndex];

    set({ activeTabId: prevTabId });
  },

  switchToTabByIndex: (index) => {
    const { tabOrder } = get();
    if (index >= 0 && index < tabOrder.length) {
      const tabId = tabOrder[index];
      set({ activeTabId: tabId });
    }
  },

  updateTabScrollPosition: (tabId, scrollPosition) => {
    set((state) => {
      const tab = state.tabs.get(tabId);
      if (tab) {
        const newTabs = new Map(state.tabs);
        newTabs.set(tabId, { ...tab, scrollPosition: Math.max(0, scrollPosition) });
        return { tabs: newTabs };
      }
      return state;
    });
  },

  updateTabZoomLevel: (tabId, zoomLevel) => {
    set((state) => {
      const tab = state.tabs.get(tabId);
      if (tab) {
        const newTabs = new Map(state.tabs);
        newTabs.set(tabId, { ...tab, zoomLevel: Math.max(10, Math.min(2000, zoomLevel)) });
        return { tabs: newTabs };
      }
      return state;
    });
  },

  updateTabSearchState: (tabId, searchState) => {
    set((state) => {
      const tab = state.tabs.get(tabId);
      if (tab) {
        const newTabs = new Map(state.tabs);
        newTabs.set(tabId, { ...tab, searchState });
        return { tabs: newTabs };
      }
      return state;
    });
  },

  // T065: Navigation history management (Linear queue model)
  addHistoryEntry: (tabId, entry) => {
    set((state) => {
      const tab = state.tabs.get(tabId);
      if (!tab) return state;

      const newTabs = new Map(state.tabs);
      let history = [...tab.navigationHistory];
      let currentIndex = tab.currentHistoryIndex;

      // Check if the entry we're adding is the same as the current position
      // This prevents duplicates when navigating from the initial file
      if (currentIndex >= 0 && currentIndex < history.length) {
        const currentEntry = history[currentIndex];
        if (currentEntry.filePath === entry.filePath) {
          // Same file, just update scroll position at current position
          history[currentIndex] = entry;
          newTabs.set(tabId, {
            ...tab,
            navigationHistory: history,
            currentHistoryIndex: currentIndex,
            forwardHistory: []
          });
          return { tabs: newTabs };
        }
      }

      // If we're not at the end of history, truncate everything after current position
      // This happens when user navigates back, then clicks a new link
      if (currentIndex >= 0 && currentIndex < history.length - 1) {
        history = history.slice(0, currentIndex + 1);
      }

      // Add new entry to the end
      history.push(entry);
      currentIndex = history.length - 1;

      // Keep max 50 entries (remove oldest if needed)
      if (history.length > 50) {
        history.shift();
        currentIndex = Math.max(0, currentIndex - 1);
      }

      newTabs.set(tabId, {
        ...tab,
        navigationHistory: history,
        currentHistoryIndex: currentIndex,
        forwardHistory: [] // No longer used
      });
      return { tabs: newTabs };
    });
  },

  // T066: Navigate back in history (Linear queue model)
  navigateBack: (tabId) => {
    const { tabs } = get();
    const tab = tabs.get(tabId);

    if (!tab || tab.currentHistoryIndex <= 0) {
      return null; // Can't go back if at position 0 or no history
    }

    // Move back one position in the history queue
    const newIndex = tab.currentHistoryIndex - 1;
    const previousEntry = tab.navigationHistory[newIndex];

    // Update current history index
    set((state) => {
      const newTabs = new Map(state.tabs);
      const currentTab = newTabs.get(tabId);
      if (currentTab) {
        newTabs.set(tabId, {
          ...currentTab,
          currentHistoryIndex: newIndex
        });
      }
      return { tabs: newTabs };
    });

    return previousEntry;
  },

  // T066: Navigate forward in history (Linear queue model)
  navigateForward: (tabId) => {
    const { tabs } = get();
    const tab = tabs.get(tabId);

    if (!tab || tab.currentHistoryIndex >= tab.navigationHistory.length - 1) {
      return null; // Can't go forward if at the end of history
    }

    // Move forward one position in the history queue
    const newIndex = tab.currentHistoryIndex + 1;
    const nextEntry = tab.navigationHistory[newIndex];

    // Update current history index
    set((state) => {
      const newTabs = new Map(state.tabs);
      const currentTab = newTabs.get(tabId);
      if (currentTab) {
        newTabs.set(tabId, {
          ...currentTab,
          currentHistoryIndex: newIndex
        });
      }
      return { tabs: newTabs };
    });

    return nextEntry;
  },

  // Navigate to specific history index
  navigateToIndex: (tabId, index) => {
    const { tabs } = get();
    const tab = tabs.get(tabId);

    if (!tab || index < 0 || index >= tab.navigationHistory.length) {
      return null; // Invalid index
    }

    const entry = tab.navigationHistory[index];

    // Update current history index
    set((state) => {
      const newTabs = new Map(state.tabs);
      const currentTab = newTabs.get(tabId);
      if (currentTab) {
        newTabs.set(tabId, {
          ...currentTab,
          currentHistoryIndex: index
        });
      }
      return { tabs: newTabs };
    });

    return entry;
  },

  canNavigateBack: (tabId) => {
    const { tabs } = get();
    const tab = tabs.get(tabId);
    return tab ? tab.currentHistoryIndex > 0 : false;
  },

  canNavigateForward: (tabId) => {
    const { tabs } = get();
    const tab = tabs.get(tabId);
    return tab ? tab.currentHistoryIndex < tab.navigationHistory.length - 1 : false;
  },

  // T063: Tab limit checking
  canAddTab: () => {
    const { tabs, softLimit, hardLimit } = get();
    const count = tabs.size;

    if (count >= hardLimit) {
      return {
        allowed: false,
        error: `Cannot open more than ${hardLimit} tabs. Please close some tabs before opening new ones.`,
      };
    }

    if (count >= softLimit) {
      return {
        allowed: true,
        warning: `You have ${count} tabs open. Consider closing some tabs to improve performance.`,
      };
    }

    return { allowed: true };
  },

  getTabCount: () => {
    const { tabs } = get();
    return tabs.size;
  },

  // T063m, T063o: Reorder tabs via drag-and-drop
  reorderTab: (fromIndex, toIndex) => {
    set((state) => {
      const newTabOrder = [...state.tabOrder];
      const [movedTabId] = newTabOrder.splice(fromIndex, 1);
      newTabOrder.splice(toIndex, 0, movedTabId);

      return { tabOrder: newTabOrder };
    });
  },

  // T063c: Duplicate a tab
  duplicateTab: (tabId) => {
    const { tabs, addTab } = get();
    const originalTab = tabs.get(tabId);

    if (!originalTab) {
      console.error(`Cannot duplicate tab: tab ${tabId} not found`);
      return undefined;
    }

    // Create a duplicate tab with a new ID
    const duplicateTab: Tab = {
      ...originalTab,
      id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: `${originalTab.title} (Copy)`,
      createdAt: Date.now(),
      navigationHistory: [], // Start with empty history
      currentHistoryIndex: -1,
    };

    return addTab(duplicateTab);
  },

  // T163f: Move tab to new window
  moveTabToNewWindow: async (tabId) => {
    const { tabs, removeTab } = get();
    const tab = tabs.get(tabId);

    if (!tab) {
      console.error(`Cannot move tab: tab ${tabId} not found`);
      return false;
    }

    try {
      // Call IPC handler to create new window with tab state
      const result = await window.electronAPI.window.createNew({
        tabState: tab,
      });

      if (result.success) {
        // Remove tab from current window
        removeTab(tabId);
        return true;
      } else {
        console.error('Failed to create new window:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error moving tab to new window:', error);
      return false;
    }
  },

  // T163i: Open file in new tab
  openFileInNewTab: async (filePath, folderId) => {
    const { addTab } = get();

    // Get file name from path
    const fileName = filePath.split(/[/\\]/).pop() || 'Untitled';
    const title = fileName.replace(/\.md$/i, '');

    // Create new tab
    const newTab: Tab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      filePath,
      title,
      scrollPosition: 0,
      zoomLevel: 100,
      searchState: null,
      modificationTimestamp: Date.now(),
      isDirty: false,
      renderCache: null,
      navigationHistory: [],
      currentHistoryIndex: -1,
      forwardHistory: [],
      createdAt: Date.now(),
      folderId: folderId || null,
      isDirectFile: !folderId,
    };

    return addTab(newTab);
  },

  // T163j: Open file in new window
  openFileInNewWindow: async (filePath, folderId) => {
    try {
      // Call IPC handler to create new window with file path
      const result = await window.electronAPI.window.createNew({
        filePath,
        folderPath: folderId,
      });

      if (result.success) {
        return true;
      } else {
        console.error('Failed to create new window:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error opening file in new window:', error);
      return false;
    }
  },

  // T063l: Convert direct file tab to folder-connected tab
  convertDirectFileToFolder: (tabId, folderPath) => {
    set((state) => {
      const tab = state.tabs.get(tabId);
      if (!tab) return state;

      // Find or create folder ID for this path
      // For now, we'll set a placeholder - this should be integrated with folders store
      const newTabs = new Map(state.tabs);
      newTabs.set(tabId, {
        ...tab,
        isDirectFile: false,
        folderId: `folder-${folderPath}`, // This should match actual folder ID
      });

      return { tabs: newTabs };
    });
  },
}));

// Convenience methods for active tab navigation (for TitleBar)
// IMPORTANT: This hook must return reactive values that trigger re-renders
export const useActiveTabNavigation = () => {
  // Subscribe to the specific parts of state we need
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const activeTab = useTabsStore((state) =>
    state.activeTabId ? state.tabs.get(state.activeTabId) : undefined
  );
  const navigateBack = useTabsStore((state) => state.navigateBack);
  const navigateForward = useTabsStore((state) => state.navigateForward);

  // Compute boolean values that will trigger re-renders when they change
  const canGoBack = activeTab ? activeTab.currentHistoryIndex > 0 : false;
  const canGoForward = activeTab
    ? activeTab.currentHistoryIndex < activeTab.navigationHistory.length - 1
    : false;

  console.log('[useActiveTabNavigation]', {
    activeTabId,
    currentIndex: activeTab?.currentHistoryIndex,
    historyLength: activeTab?.navigationHistory.length,
    canGoBack,
    canGoForward
  });

  return {
    canGoBack,  // Boolean value, not a function!
    canGoForward,  // Boolean value, not a function!
    goBack: () => {
      if (activeTabId) {
        const entry = navigateBack(activeTabId);
        if (entry) {
          // Dispatch event to navigate to the entry
          window.dispatchEvent(
            new CustomEvent('navigate-to-history', { detail: entry })
          );
        }
      }
    },
    goForward: () => {
      if (activeTabId) {
        const entry = navigateForward(activeTabId);
        if (entry) {
          // Dispatch event to navigate to the entry
          window.dispatchEvent(
            new CustomEvent('navigate-to-history', { detail: entry })
          );
        }
      }
    },
  };
};
