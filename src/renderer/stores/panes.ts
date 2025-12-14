/**
 * Zustand Store: Panes
 * Tasks: T069, T072
 * Manages split pane layout and independent scroll/zoom state per pane
 */

import { create } from 'zustand';
import type { Pane, PanelLayout } from '@shared/types/entities';

interface PanesState {
  // Current layout configuration
  layout: PanelLayout;

  // Pane-specific state (T072)
  paneStates: Map<
    string,
    {
      scrollPosition: number;
      zoomLevel: number;
    }
  >;

  // Actions - Layout Management (T069)
  splitVertical: (paneId: string) => void;
  splitHorizontal: (paneId: string) => void;
  closePane: (paneId: string) => void;
  setActivePaneTab: (paneId: string, tabId: string) => void;
  getPaneById: (paneId: string) => Pane | null;

  // Actions - Pane State (T072)
  setPaneScrollPosition: (paneId: string, scrollPosition: number) => void;
  setPaneZoomLevel: (paneId: string, zoomLevel: number) => void;
  getPaneState: (paneId: string) => { scrollPosition: number; zoomLevel: number };

  // Layout type helpers
  updateLayoutType: () => void;
  getRootPaneId: () => string;
}

// Helper function to find pane in tree
function findPaneInTree(pane: Pane, targetId: string): Pane | null {
  if (pane.id === targetId) return pane;

  if (pane.splitChildren) {
    for (const child of pane.splitChildren) {
      const found = findPaneInTree(child, targetId);
      if (found) return found;
    }
  }

  return null;
}

// Helper to determine layout type
function determineLayoutType(rootPane: Pane): PanelLayout['layoutType'] {
  if (!rootPane.splitChildren || rootPane.splitChildren.length === 0) {
    return 'single';
  }

  const hasVertical = rootPane.orientation === 'vertical';
  const hasHorizontal = rootPane.orientation === 'horizontal';

  if (hasVertical && !hasHorizontal) return 'vsplit';
  if (hasHorizontal && !hasVertical) return 'hsplit';

  return 'grid';
}

// Generate unique ID
function generateId(): string {
  return `pane-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const usePanesStore = create<PanesState>((set, get) => ({
  // Initial single pane layout
  layout: {
    rootPane: {
      id: generateId(),
      tabs: [],
      activeTabId: null,
      orientation: 'vertical',
      sizeRatio: 1.0,
      splitChildren: null,
    },
    layoutType: 'single',
  },

  paneStates: new Map(),

  // T069: Split pane vertically (side-by-side)
  splitVertical: (paneId) => {
    set((state) => {
      const targetPane = findPaneInTree(state.layout.rootPane, paneId);
      if (!targetPane || targetPane.splitChildren) return state;

      // Create two child panes
      const leftPane: Pane = {
        id: generateId(),
        tabs: [...targetPane.tabs],
        activeTabId: targetPane.activeTabId,
        orientation: 'vertical',
        sizeRatio: 0.5,
        splitChildren: null,
      };

      const rightPane: Pane = {
        id: generateId(),
        tabs: [],
        activeTabId: null,
        orientation: 'vertical',
        sizeRatio: 0.5,
        splitChildren: null,
      };

      // Update target pane to be a split container
      targetPane.splitChildren = [leftPane, rightPane];
      targetPane.tabs = [];
      targetPane.activeTabId = null;
      targetPane.orientation = 'vertical';

      // Initialize pane states
      const newPaneStates = new Map(state.paneStates);
      newPaneStates.set(leftPane.id, { scrollPosition: 0, zoomLevel: 100 });
      newPaneStates.set(rightPane.id, { scrollPosition: 0, zoomLevel: 100 });

      const newLayout = {
        rootPane: { ...state.layout.rootPane },
        layoutType: determineLayoutType(state.layout.rootPane),
      };

      return { layout: newLayout, paneStates: newPaneStates };
    });
  },

  // T069: Split pane horizontally (top-bottom)
  splitHorizontal: (paneId) => {
    set((state) => {
      const targetPane = findPaneInTree(state.layout.rootPane, paneId);
      if (!targetPane || targetPane.splitChildren) return state;

      // Create two child panes
      const topPane: Pane = {
        id: generateId(),
        tabs: [...targetPane.tabs],
        activeTabId: targetPane.activeTabId,
        orientation: 'horizontal',
        sizeRatio: 0.5,
        splitChildren: null,
      };

      const bottomPane: Pane = {
        id: generateId(),
        tabs: [],
        activeTabId: null,
        orientation: 'horizontal',
        sizeRatio: 0.5,
        splitChildren: null,
      };

      // Update target pane
      targetPane.splitChildren = [topPane, bottomPane];
      targetPane.tabs = [];
      targetPane.activeTabId = null;
      targetPane.orientation = 'horizontal';

      // Initialize pane states
      const newPaneStates = new Map(state.paneStates);
      newPaneStates.set(topPane.id, { scrollPosition: 0, zoomLevel: 100 });
      newPaneStates.set(bottomPane.id, { scrollPosition: 0, zoomLevel: 100 });

      const newLayout = {
        rootPane: { ...state.layout.rootPane },
        layoutType: determineLayoutType(state.layout.rootPane),
      };

      return { layout: newLayout, paneStates: newPaneStates };
    });
  },

  // Close a pane (merge with sibling)
  closePane: (paneId) => {
    set((state) => {
      if (state.layout.rootPane.id === paneId) {
        return state; // Can't close root
      }

      // Simplified: Reset to single pane
      return {
        layout: {
          rootPane: {
            id: generateId(),
            tabs: [],
            activeTabId: null,
            orientation: 'vertical',
            sizeRatio: 1.0,
            splitChildren: null,
          },
          layoutType: 'single',
        },
        paneStates: new Map(),
      };
    });
  },

  setActivePaneTab: (paneId, tabId) => {
    set((state) => {
      const targetPane = findPaneInTree(state.layout.rootPane, paneId);
      if (targetPane && !targetPane.splitChildren) {
        targetPane.activeTabId = tabId;
        return { layout: { ...state.layout } };
      }
      return state;
    });
  },

  getPaneById: (paneId) => {
    const { layout } = get();
    return findPaneInTree(layout.rootPane, paneId);
  },

  // T072: Independent scroll position per pane
  setPaneScrollPosition: (paneId, scrollPosition) => {
    set((state) => {
      const newPaneStates = new Map(state.paneStates);
      const current = newPaneStates.get(paneId) || { scrollPosition: 0, zoomLevel: 100 };
      newPaneStates.set(paneId, { ...current, scrollPosition });
      return { paneStates: newPaneStates };
    });
  },

  // T072: Independent zoom level per pane
  setPaneZoomLevel: (paneId, zoomLevel) => {
    set((state) => {
      const newPaneStates = new Map(state.paneStates);
      const current = newPaneStates.get(paneId) || { scrollPosition: 0, zoomLevel: 100 };
      newPaneStates.set(paneId, { ...current, zoomLevel: Math.max(10, Math.min(2000, zoomLevel)) });
      return { paneStates: newPaneStates };
    });
  },

  getPaneState: (paneId) => {
    const { paneStates } = get();
    return paneStates.get(paneId) || { scrollPosition: 0, zoomLevel: 100 };
  },

  updateLayoutType: () => {
    set((state) => ({
      layout: {
        ...state.layout,
        layoutType: determineLayoutType(state.layout.rootPane),
      },
    }));
  },

  getRootPaneId: () => {
    const { layout } = get();
    return layout.rootPane.id;
  },
}));
