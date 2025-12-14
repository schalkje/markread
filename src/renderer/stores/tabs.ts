/**
 * Zustand Store: Tabs
 * Manages open tabs, active tab, and tab-level state
 */

import { create } from 'zustand';
import type { Tab } from '@shared/types/entities';

interface TabsState {
  tabs: Map<string, Tab>;

  // Actions
  addTab: (folderId: string, tab: Tab) => Tab | undefined;
  removeTab: (folderId: string, tabId: string) => void;
  setActiveTab: (folderId: string, tabId: string) => void;
  updateTabScrollPosition: (tabId: string, scrollPosition: number) => void;
  updateTabZoomLevel: (tabId: string, zoomLevel: number) => void;
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: new Map(),

  addTab: (folderId, tab) => {
    set((state) => {
      const newTabs = new Map(state.tabs);
      newTabs.set(tab.id, tab);
      return { tabs: newTabs };
    });
    return tab;
  },

  removeTab: (folderId, tabId) => {
    set((state) => {
      const newTabs = new Map(state.tabs);
      newTabs.delete(tabId);
      return { tabs: newTabs };
    });
  },

  setActiveTab: (folderId, tabId) => {
    // Implementation will be added when integrating with folders store
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
}));
