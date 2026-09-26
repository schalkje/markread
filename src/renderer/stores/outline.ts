/**
 * Zustand Store: Outline panel (issue #25)
 *
 * Holds the headings of the active document (published by MarkdownViewer),
 * the panel's runtime UI state, and per-tab collapse state for the session.
 * Visibility, width and follow-scroll are persisted through the UIState
 * manager; position and max depth live in Settings (appearance).
 */

import { create } from 'zustand';
import type { OutlineHeading } from '@shared/utils/outline';

export const OUTLINE_MIN_WIDTH = 170;
export const OUTLINE_MAX_WIDTH = 600;
export const OUTLINE_DEFAULT_WIDTH = 260;
export const OUTLINE_STACKED_MIN_HEIGHT = 120;
export const OUTLINE_STACKED_DEFAULT_HEIGHT = 280;

export interface OutlineDocument {
  headings: OutlineHeading[];
  /** The active buffer element of MarkdownViewer (scroll container) */
  scrollContainer: HTMLElement | null;
  /** File path the headings belong to */
  filePath: string | null;
}

interface OutlineState extends OutlineDocument {
  // Persisted (UIState)
  showOutline: boolean;
  outlineWidth: number;
  followScroll: boolean;

  // Session only
  sidebarOutlineHeight: number;
  filter: string;
  collapsedByTab: Map<string, Set<string>>;
  /** Incremented to ask the panel to focus its filter box */
  focusFilterRequest: number;
  isInitialized: boolean;

  // Document
  setDocument: (doc: OutlineDocument) => void;
  clearDocument: () => void;

  // Visibility / layout
  initialize: () => Promise<void>;
  setShowOutline: (show: boolean) => void;
  toggleOutline: () => void;
  setOutlineWidth: (width: number) => void;
  setFollowScroll: (follow: boolean) => void;
  toggleFollowScroll: () => void;
  setSidebarOutlineHeight: (height: number) => void;

  // Filter / focus
  setFilter: (filter: string) => void;
  requestFocusFilter: () => void;

  // Collapse state (per tab, for the session)
  isCollapsed: (tabId: string, headingId: string) => boolean;
  toggleCollapsed: (tabId: string, headingId: string) => void;
  collapseAll: (tabId: string, headingIds: string[]) => void;
  expandAll: (tabId: string) => void;
}

export function clampOutlineWidth(width: number): number {
  if (typeof width !== 'number' || Number.isNaN(width)) return OUTLINE_DEFAULT_WIDTH;
  return Math.min(OUTLINE_MAX_WIDTH, Math.max(OUTLINE_MIN_WIDTH, Math.round(width)));
}

function persist(partial: { showOutline?: boolean; outlineWidth?: number; outlineFollow?: boolean }): void {
  try {
    const maybePromise = window.electronAPI?.uiState?.save({ uiState: partial });
    if (maybePromise && typeof (maybePromise as Promise<unknown>).catch === 'function') {
      (maybePromise as Promise<unknown>).catch((error: unknown) => {
        console.error('[Outline] Failed to persist UI state:', error);
      });
    }
  } catch (error) {
    console.error('[Outline] Failed to persist UI state:', error);
  }
}

export const useOutlineStore = create<OutlineState>((set, get) => ({
  headings: [],
  scrollContainer: null,
  filePath: null,

  showOutline: false,
  outlineWidth: OUTLINE_DEFAULT_WIDTH,
  followScroll: true,

  sidebarOutlineHeight: OUTLINE_STACKED_DEFAULT_HEIGHT,
  filter: '',
  collapsedByTab: new Map(),
  focusFilterRequest: 0,
  isInitialized: false,

  setDocument: ({ headings, scrollContainer, filePath }) => {
    const current = get();
    const sameHeadings =
      current.scrollContainer === scrollContainer &&
      current.filePath === filePath &&
      current.headings.length === headings.length &&
      current.headings.every((h, i) => h.id === headings[i].id && h.level === headings[i].level && h.text === headings[i].text);
    if (sameHeadings) return;
    set({ headings, scrollContainer, filePath });
  },

  clearDocument: () => {
    const current = get();
    if (current.headings.length === 0 && current.scrollContainer === null && current.filePath === null) return;
    set({ headings: [], scrollContainer: null, filePath: null });
  },

  initialize: async () => {
    if (get().isInitialized) return;
    try {
      const uiState = await window.electronAPI?.uiState?.load();
      set({
        showOutline: typeof uiState?.showOutline === 'boolean' ? uiState.showOutline : get().showOutline,
        outlineWidth: typeof uiState?.outlineWidth === 'number' ? clampOutlineWidth(uiState.outlineWidth) : get().outlineWidth,
        followScroll: typeof uiState?.outlineFollow === 'boolean' ? uiState.outlineFollow : get().followScroll,
        isInitialized: true,
      });
    } catch (error) {
      console.error('[Outline] Failed to load UI state:', error);
      set({ isInitialized: true });
    }
  },

  setShowOutline: (show) => {
    if (get().showOutline === show) return;
    set({ showOutline: show });
    persist({ showOutline: show });
  },

  toggleOutline: () => {
    get().setShowOutline(!get().showOutline);
  },

  setOutlineWidth: (width) => {
    const clamped = clampOutlineWidth(width);
    if (get().outlineWidth === clamped) return;
    set({ outlineWidth: clamped });
    persist({ outlineWidth: clamped });
  },

  setFollowScroll: (follow) => {
    if (get().followScroll === follow) return;
    set({ followScroll: follow });
    persist({ outlineFollow: follow });
  },

  toggleFollowScroll: () => {
    get().setFollowScroll(!get().followScroll);
  },

  setSidebarOutlineHeight: (height) => {
    set({ sidebarOutlineHeight: Math.max(OUTLINE_STACKED_MIN_HEIGHT, Math.round(height)) });
  },

  setFilter: (filter) => {
    if (get().filter === filter) return;
    set({ filter });
  },

  requestFocusFilter: () => {
    set((state) => ({ focusFilterRequest: state.focusFilterRequest + 1 }));
  },

  isCollapsed: (tabId, headingId) => {
    return get().collapsedByTab.get(tabId)?.has(headingId) ?? false;
  },

  toggleCollapsed: (tabId, headingId) => {
    set((state) => {
      const next = new Map(state.collapsedByTab);
      const ids = new Set(next.get(tabId) ?? []);
      if (ids.has(headingId)) {
        ids.delete(headingId);
      } else {
        ids.add(headingId);
      }
      next.set(tabId, ids);
      return { collapsedByTab: next };
    });
  },

  collapseAll: (tabId, headingIds) => {
    set((state) => {
      const next = new Map(state.collapsedByTab);
      next.set(tabId, new Set(headingIds));
      return { collapsedByTab: next };
    });
  },

  expandAll: (tabId) => {
    set((state) => {
      if (!state.collapsedByTab.has(tabId)) return state;
      const next = new Map(state.collapsedByTab);
      next.delete(tabId);
      return { collapsedByTab: next };
    });
  },
}));

export default useOutlineStore;
