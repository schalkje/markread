/**
 * Zustand Store: Panes
 * Manages split pane layout and active panes
 */

import { create } from 'zustand';
import type { Pane } from '@shared/types/entities';

interface PanesState {
  panes: Map<string, Pane>;

  // Actions
  createPane: (
    tabs?: string[],
    activeTabId?: string | null,
    orientation?: 'vertical' | 'horizontal',
    sizeRatio?: number
  ) => Pane;
  splitPane: (paneId: string, orientation: 'vertical' | 'horizontal', newPaneTabs?: string[]) => Pane | null;
  resizePane: (paneId: string, sizeRatio: number) => void;
}

export const usePanesStore = create<PanesState>((set, get) => ({
  panes: new Map(),

  createPane: (tabs = [], activeTabId = null, orientation = 'vertical', sizeRatio = 0.5) => {
    const paneId = crypto.randomUUID();
    const pane: Pane = {
      id: paneId,
      tabs,
      activeTabId,
      orientation,
      sizeRatio: Math.max(0.1, Math.min(0.9, sizeRatio)),
      splitChildren: null,
    };

    set((state) => {
      const newPanes = new Map(state.panes);
      newPanes.set(paneId, pane);
      return { panes: newPanes };
    });

    return pane;
  },

  splitPane: (paneId, orientation, newPaneTabs = []) => {
    const { panes, createPane } = get();
    const pane = panes.get(paneId);
    if (!pane) return null;

    const newPane = createPane(newPaneTabs, null, orientation, 0.5);
    return newPane;
  },

  resizePane: (paneId, sizeRatio) => {
    set((state) => {
      const pane = state.panes.get(paneId);
      if (pane) {
        const newPanes = new Map(state.panes);
        newPanes.set(paneId, {
          ...pane,
          sizeRatio: Math.max(0.1, Math.min(0.9, sizeRatio)),
        });
        return { panes: newPanes };
      }
      return state;
    });
  },
}));
