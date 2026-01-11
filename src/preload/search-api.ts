/**
 * Search API Preload Script
 * Task: T004
 *
 * Exposes search operations to the renderer process via contextBridge.
 * Provides IPC bridge for multi-file search functionality (FR-042, FR-043).
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
  SearchRequest,
  SearchResponse,
  SearchCancelRequest,
  SearchCancelResponse,
  SearchProgressEvent,
  SearchCompleteEvent,
  SearchErrorEvent,
} from '../shared/types/search';

/**
 * Search API exposed to renderer process via window.search
 *
 * Usage in renderer:
 * ```typescript
 * // Start multi-file search
 * const result = await window.search.inFiles({
 *   query: 'TODO',
 *   folderPath: '/path/to/folder',
 *   caseSensitive: false,
 *   useRegex: false
 * });
 *
 * // Listen for progress events
 * const unsubscribe = window.search.onProgress((event) => {
 *   console.log(`Progress: ${event.filesSearched}/${event.totalFiles}`);
 * });
 *
 * // Cancel search
 * await window.search.cancel(searchId);
 * ```
 */
export const exposeSearchAPI = () => {
  contextBridge.exposeInMainWorld('search', {
    /**
     * Execute multi-file search
     * T041: Invoke 'search:in-files' IPC handler
     *
     * @param request - Search parameters including query, folder path, and options
     * @returns Promise resolving to SearchResponse with searchId
     */
    inFiles: (request: SearchRequest): Promise<SearchResponse> => {
      return ipcRenderer.invoke('search:in-files', request);
    },

    /**
     * Cancel an active search
     * T042: Invoke 'search:cancel' IPC handler
     *
     * @param searchId - Unique identifier of the search to cancel
     * @returns Promise resolving to SearchCancelResponse
     */
    cancel: (searchId: string): Promise<SearchCancelResponse> => {
      return ipcRenderer.invoke('search:cancel', { searchId } as SearchCancelRequest);
    },

    /**
     * Subscribe to search progress events
     * T041: Listen for 'search:progress' events from main process
     *
     * @param callback - Function to call when progress updates occur
     * @returns Unsubscribe function to remove the listener
     */
    onProgress: (callback: (event: SearchProgressEvent) => void): (() => void) => {
      const listener = (_: any, event: SearchProgressEvent) => callback(event);
      ipcRenderer.on('search:progress', listener);
      return () => ipcRenderer.removeListener('search:progress', listener);
    },

    /**
     * Subscribe to search completion events
     * T041: Listen for 'search:complete' events from main process
     *
     * @param callback - Function to call when search completes
     * @returns Unsubscribe function to remove the listener
     */
    onComplete: (callback: (event: SearchCompleteEvent) => void): (() => void) => {
      const listener = (_: any, event: SearchCompleteEvent) => callback(event);
      ipcRenderer.on('search:complete', listener);
      return () => ipcRenderer.removeListener('search:complete', listener);
    },

    /**
     * Subscribe to search error events
     * T041: Listen for 'search:error' events from main process
     *
     * @param callback - Function to call when search errors occur
     * @returns Unsubscribe function to remove the listener
     */
    onError: (callback: (event: SearchErrorEvent) => void): (() => void) => {
      const listener = (_: any, event: SearchErrorEvent) => callback(event);
      ipcRenderer.on('search:error', listener);
      return () => ipcRenderer.removeListener('search:error', listener);
    },

    /**
     * Subscribe to individual search result events
     * T041: Listen for 'search:result' events from main process
     *
     * @param callback - Function to call when a search result is found
     * @returns Unsubscribe function to remove the listener
     */
    onResult: (callback: (event: { searchId: string; result: any }) => void): (() => void) => {
      const listener = (_: any, event: { searchId: string; result: any }) => callback(event);
      ipcRenderer.on('search:result', listener);
      return () => ipcRenderer.removeListener('search:result', listener);
    },
  });
};
