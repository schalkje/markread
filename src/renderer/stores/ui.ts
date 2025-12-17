/**
 * Zustand Store: UI State
 * Task: T051a
 * Manages global UI state including global window zoom
 */

import { create } from 'zustand';

interface UIState {
  // Global zoom (per window, affects entire UI)
  globalZoomLevel: number; // 50-300 (percentage)

  // Statusbar visibility
  showZoomIndicator: boolean;

  // Actions
  setGlobalZoom: (level: number) => Promise<void>;
  incrementGlobalZoom: (delta: number) => void;
  resetGlobalZoom: () => void;
  initializeGlobalZoom: () => Promise<void>;
}

const MIN_GLOBAL_ZOOM = 50;
const MAX_GLOBAL_ZOOM = 300;
const DEFAULT_GLOBAL_ZOOM = 100;

export const useUIStore = create<UIState>((set, get) => ({
  globalZoomLevel: DEFAULT_GLOBAL_ZOOM,
  showZoomIndicator: true,

  /**
   * Set global window zoom level
   * Calls window:setGlobalZoom IPC handler
   */
  setGlobalZoom: async (level: number) => {
    const clampedLevel = Math.max(MIN_GLOBAL_ZOOM, Math.min(MAX_GLOBAL_ZOOM, level));
    const zoomFactor = clampedLevel / 100;

    try {
      // Call IPC handler to set zoom in main process
      const result = await window.electronAPI?.window?.setGlobalZoom({ zoomFactor });

      if (result?.success) {
        set({ globalZoomLevel: clampedLevel });

        // Persist to UIState
        await window.electronAPI?.uiState?.save({
          globalZoomLevel: clampedLevel,
        });
      }
    } catch (error) {
      console.error('Failed to set global zoom:', error);
    }
  },

  /**
   * Increment global zoom by delta (e.g., +10 or -10)
   */
  incrementGlobalZoom: (delta: number) => {
    const { globalZoomLevel, setGlobalZoom } = get();
    const newLevel = globalZoomLevel + delta;
    setGlobalZoom(newLevel);
  },

  /**
   * Reset global zoom to 100%
   */
  resetGlobalZoom: () => {
    const { setGlobalZoom } = get();
    setGlobalZoom(DEFAULT_GLOBAL_ZOOM);
  },

  /**
   * Initialize global zoom from persisted UIState
   */
  initializeGlobalZoom: async () => {
    try {
      const uiState = await window.electronAPI?.uiState?.load();
      const savedZoom = uiState?.globalZoomLevel || DEFAULT_GLOBAL_ZOOM;

      // Apply saved zoom
      const { setGlobalZoom } = get();
      await setGlobalZoom(savedZoom);
    } catch (error) {
      console.error('Failed to initialize global zoom:', error);
    }
  },
}));

export default useUIStore;
