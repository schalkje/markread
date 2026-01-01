/**
 * IPC Contract: UI State Persistence
 *
 * Window state, recent files, folder state, split layouts.
 *
 * FR-007, FR-018, FR-025, FR-062
 * Pattern: invoke/handle
 */

import type { UIState, Folder, RecentItem, PanelLayout } from '../data-model';

export namespace UIStateOperations {
  /** Load UI state from disk */
  export interface LoadUIStateRequest {
    channel: 'uiState:load';
    payload: {};
  }

  export interface LoadUIStateResponse {
    success: boolean;
    uiState?: UIState;
    error?: string;
  }

  /** Save UI state to disk (debounced 500ms) */
  export interface SaveUIStateRequest {
    channel: 'uiState:save';
    payload: {
      uiState: Partial<UIState>;  // Partial for incremental updates
    };
  }

  export interface SaveUIStateResponse {
    success: boolean;
    error?: string;
  }

  /** Add recent item (file or folder) (FR-025) */
  export interface AddRecentItemRequest {
    channel: 'uiState:addRecent';
    payload: {
      path: string;
      type: 'file' | 'folder';
      folderId?: string;
    };
  }

  export interface AddRecentItemResponse {
    success: boolean;
    recentItems?: RecentItem[];  // Updated list (max 20)
  }

  /** Clear recent items */
  export interface ClearRecentItemsRequest {
    channel: 'uiState:clearRecent';
    payload: {
      type?: 'file' | 'folder';  // Optional: Clear only files or folders
    };
  }

  export interface ClearRecentItemsResponse {
    success: boolean;
  }

  /** Save split layout for folder (FR-018) */
  export interface SaveSplitLayoutRequest {
    channel: 'uiState:saveSplitLayout';
    payload: {
      folderId: string;
      layout: PanelLayout;
    };
  }

  export interface SaveSplitLayoutResponse {
    success: boolean;
  }

  /** Get split layout for folder */
  export interface GetSplitLayoutRequest {
    channel: 'uiState:getSplitLayout';
    payload: {
      folderId: string;
    };
  }

  export interface GetSplitLayoutResponse {
    success: boolean;
    layout?: PanelLayout;
  }
}

export namespace UIStateEvents {
  /** UI state changed (from any source) */
  export interface UIStateChangedEvent {
    channel: 'uiState:changed';
    payload: {
      changedFields: (keyof UIState)[];
      newState: UIState;
    };
  }
}

/** File path: %APPDATA%/MarkRead/ui-state.json */
export const UI_STATE_PATH = '%APPDATA%/MarkRead/ui-state.json';
