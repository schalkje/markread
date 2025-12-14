/**
 * Pinia Store: Panes
 * Manages split pane layout and active panes
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Pane, PanelLayout } from '@shared/types/entities';
import { useFoldersStore } from './folders';

export const usePanesStore = defineStore('panes', () => {
  const foldersStore = useFoldersStore();

  // State
  const panes = ref<Map<string, Pane>>(new Map()); // Keyed by pane ID

  // Getters
  const getPaneById = (paneId: string): Pane | undefined => {
    return panes.value.get(paneId);
  };

  const getActivePaneLayout = (): PanelLayout | null => {
    const folder = foldersStore.activeFolder;
    if (!folder) return null;
    return folder.splitLayout;
  };

  // Actions
  const createPane = (
    tabs: string[] = [],
    activeTabId: string | null = null,
    orientation: 'vertical' | 'horizontal' = 'vertical',
    sizeRatio: number = 0.5
  ): Pane => {
    const paneId = crypto.randomUUID();
    const pane: Pane = {
      id: paneId,
      tabs,
      activeTabId,
      orientation,
      sizeRatio: Math.max(0.1, Math.min(0.9, sizeRatio)), // Clamp to 0.1-0.9
      splitChildren: null,
    };

    panes.value.set(paneId, pane);
    return pane;
  };

  const splitPane = (
    paneId: string,
    orientation: 'vertical' | 'horizontal',
    newPaneTabs: string[] = []
  ): Pane | null => {
    const pane = getPaneById(paneId);
    if (!pane) return null;

    // Create new pane for split
    const newPane = createPane(newPaneTabs, null, orientation, 0.5);

    // Convert current pane to split container
    pane.splitChildren = [
      { ...pane, id: crypto.randomUUID(), splitChildren: null }, // Clone original pane
      newPane,
    ];
    pane.orientation = orientation;

    // Update in map
    panes.value.set(pane.id, pane);

    return newPane;
  };

  const resizePane = (paneId: string, sizeRatio: number) => {
    const pane = getPaneById(paneId);
    if (pane) {
      // Clamp to 0.1-0.9 (minimum 10%, maximum 90%)
      pane.sizeRatio = Math.max(0.1, Math.min(0.9, sizeRatio));
    }
  };

  const closePaneTab = (paneId: string, tabId: string) => {
    const pane = getPaneById(paneId);
    if (!pane) return;

    const index = pane.tabs.indexOf(tabId);
    if (index === -1) return;

    pane.tabs.splice(index, 1);

    // Update active tab if needed
    if (pane.activeTabId === tabId) {
      if (pane.tabs.length > 0) {
        const newIndex = Math.max(0, index - 1);
        pane.activeTabId = pane.tabs[newIndex] || null;
      } else {
        pane.activeTabId = null;
      }
    }
  };

  const moveTabToPane = (fromPaneId: string, toPaneId: string, tabId: string) => {
    const fromPane = getPaneById(fromPaneId);
    const toPane = getPaneById(toPaneId);

    if (!fromPane || !toPane) return;

    // Remove from source pane
    const index = fromPane.tabs.indexOf(tabId);
    if (index === -1) return;

    fromPane.tabs.splice(index, 1);

    // Add to destination pane
    toPane.tabs.push(tabId);
    toPane.activeTabId = tabId;

    // Update active tab in source pane if needed
    if (fromPane.activeTabId === tabId) {
      fromPane.activeTabId = fromPane.tabs.length > 0 ? fromPane.tabs[0] : null;
    }
  };

  const setActivePaneTab = (paneId: string, tabId: string) => {
    const pane = getPaneById(paneId);
    if (pane && pane.tabs.includes(tabId)) {
      pane.activeTabId = tabId;
    }
  };

  const initializeFolderLayout = (folderId: string) => {
    const folder = foldersStore.getFolderById(folderId);
    if (!folder) return;

    // Create default single-pane layout if not exists
    if (!folder.splitLayout) {
      const rootPane = createPane([], null, 'vertical', 1.0);
      folder.splitLayout = {
        rootPane,
        layoutType: 'single',
      };
    } else {
      // Register all panes from layout
      const registerPane = (pane: Pane) => {
        panes.value.set(pane.id, pane);
        if (pane.splitChildren) {
          pane.splitChildren.forEach(registerPane);
        }
      };
      registerPane(folder.splitLayout.rootPane);
    }
  };

  const saveFolderLayout = async (folderId: string) => {
    const folder = foldersStore.getFolderById(folderId);
    if (!folder) return;

    try {
      await window.electronAPI.uiState.save({
        uiState: {
          splitLayouts: {
            [folderId]: folder.splitLayout,
          },
        },
      });
    } catch (error) {
      console.error('Failed to save split layout:', error);
    }
  };

  return {
    // State
    panes,

    // Getters
    getPaneById,
    getActivePaneLayout,

    // Actions
    createPane,
    splitPane,
    resizePane,
    closePaneTab,
    moveTabToPane,
    setActivePaneTab,
    initializeFolderLayout,
    saveFolderLayout,
  };
});
