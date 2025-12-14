/**
 * IPC Contract: Search Operations
 *
 * Defines the communication interface for in-page search and cross-file search.
 *
 * FR-042-046
 * Pattern: invoke/handle (async request-response) + events for async search progress
 */

// ============================================================================
// Requests (Renderer → Main)
// ============================================================================

export namespace SearchOperations {
  /**
   * Search within current document (in-page search)
   * FR-042
   * Executes in renderer process, no IPC needed
   * Included here for completeness
   */
  // NOTE: In-page search runs entirely in renderer using browser Find API
  // No main process involvement required

  /**
   * Cross-file search across all files in folder
   * FR-043, FR-044 (asynchronous with progress)
   */
  export interface SearchInFilesRequest {
    channel: 'search:inFiles';
    payload: {
      folderPath: string;      // Root folder to search
      query: string;           // Search query
      options: SearchOptions;
      maxResults?: number;     // Max results (from Settings.globalSearchMaxResults)
    };
  }

  export interface SearchInFilesResponse {
    success: boolean;
    searchId?: string;         // Unique ID for this search operation
    error?: string;
  }

  /**
   * Cancel ongoing cross-file search
   * FR-043 (cancel button requirement)
   */
  export interface CancelSearchRequest {
    channel: 'search:cancel';
    payload: {
      searchId: string;        // ID from SearchInFilesResponse
    };
  }

  export interface CancelSearchResponse {
    success: boolean;
    cancelled?: boolean;       // True if search was actually running
    error?: string;
  }

  /**
   * Get search history
   * FR-071
   */
  export interface GetSearchHistoryRequest {
    channel: 'search:getHistory';
    payload: {
      maxEntries?: number;     // Max entries to return (default from Settings)
    };
  }

  export interface GetSearchHistoryResponse {
    success: boolean;
    history?: SearchHistoryEntry[];
    error?: string;
  }

  /**
   * Add to search history
   * FR-071
   */
  export interface AddSearchHistoryRequest {
    channel: 'search:addHistory';
    payload: {
      query: string;
      type: 'inPage' | 'inFiles';
      timestamp: number;
    };
  }

  export interface AddSearchHistoryResponse {
    success: boolean;
  }

  /**
   * Clear search history
   * FR-071
   */
  export interface ClearSearchHistoryRequest {
    channel: 'search:clearHistory';
    payload: {};
  }

  export interface ClearSearchHistoryResponse {
    success: boolean;
  }
}

// ============================================================================
// Events (Main → Renderer)
// ============================================================================

export namespace SearchEvents {
  /**
   * Search progress update
   * FR-043 (progress indication: "X of Y files searched" counter)
   */
  export interface SearchProgressEvent {
    channel: 'search:progress';
    payload: {
      searchId: string;
      filesSearched: number;   // Number of files searched so far
      totalFiles: number;      // Total files to search
      currentFile: string;     // Currently searching file path
      resultsFound: number;    // Total results found so far
    };
  }

  /**
   * Search result found (incremental results)
   * FR-044 (display results grouped by file, updating incrementally)
   */
  export interface SearchResultEvent {
    channel: 'search:result';
    payload: {
      searchId: string;
      result: SearchResult;
    };
  }

  /**
   * Search completed
   * FR-043, FR-044
   */
  export interface SearchCompletedEvent {
    channel: 'search:completed';
    payload: {
      searchId: string;
      totalResults: number;
      filesWithMatches: number;
      durationMs: number;      // Search duration for performance tracking
      cancelled: boolean;      // True if user cancelled
    };
  }

  /**
   * Search error
   * Edge case: file read errors, permission issues
   */
  export interface SearchErrorEvent {
    channel: 'search:error';
    payload: {
      searchId: string;
      error: string;
      filePath?: string;       // File that caused error (if applicable)
    };
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface SearchOptions {
  caseSensitive: boolean;      // FR-042 (case-sensitive/insensitive)
  wholeWord: boolean;          // FR-042 (whole word matching)
  useRegex: boolean;           // FR-042 (regex support)
  excludePatterns: string[];   // FR-072 (folder exclusion patterns)
  includeHiddenFiles: boolean; // FR-073
}

export interface SearchResult {
  filePath: string;            // Absolute path to file with match
  fileName: string;            // File name for display
  matches: SearchMatch[];      // Array of matches in this file
}

export interface SearchMatch {
  lineNumber: number;          // Line number (1-based)
  columnStart: number;         // Column where match starts (0-based)
  columnEnd: number;           // Column where match ends (0-based)
  lineContent: string;         // Full line content
  previewSnippet: string;      // Preview snippet (50 chars before/after match)
  highlightStart: number;      // Start offset in previewSnippet
  highlightEnd: number;        // End offset in previewSnippet
}

export interface SearchHistoryEntry {
  query: string;
  type: 'inPage' | 'inFiles';
  timestamp: number;           // Unix timestamp (ms)
  resultsCount?: number;       // Number of results (if available)
}

// ============================================================================
// Usage Example
// ============================================================================

/**
 * Example: Cross-file search with progress updates
 *
 * // In renderer (SearchPanel.vue):
 * const searchId = ref<string | null>(null);
 * const progress = ref({ filesSearched: 0, totalFiles: 0, results: [] });
 *
 * // Start search
 * const startSearch = async (query: string) => {
 *   const response = await window.electronAPI.search.inFiles({
 *     folderPath: currentFolder.value.path,
 *     query,
 *     options: {
 *       caseSensitive: false,
 *       wholeWord: false,
 *       useRegex: false,
 *       excludePatterns: settings.value.search.excludePatterns,
 *       includeHiddenFiles: settings.value.search.includeHiddenFiles
 *     },
 *     maxResults: settings.value.search.globalSearchMaxResults
 *   });
 *
 *   if (response.success) {
 *     searchId.value = response.searchId;
 *   }
 * };
 *
 * // Listen for progress updates
 * window.electronAPI.on('search:progress', (event) => {
 *   if (event.searchId === searchId.value) {
 *     progress.value.filesSearched = event.filesSearched;
 *     progress.value.totalFiles = event.totalFiles;
 *     // Update UI: "X of Y files searched"
 *   }
 * });
 *
 * // Listen for results (incremental)
 * window.electronAPI.on('search:result', (event) => {
 *   if (event.searchId === searchId.value) {
 *     // Add result to UI (grouped by file)
 *     progress.value.results.push(event.result);
 *   }
 * });
 *
 * // Listen for completion
 * window.electronAPI.on('search:completed', (event) => {
 *   if (event.searchId === searchId.value) {
 *     console.log(`Search completed: ${event.totalResults} results in ${event.durationMs}ms`);
 *     searchId.value = null;  // Clear active search
 *   }
 * });
 *
 * // Cancel search
 * const cancelSearch = async () => {
 *   if (searchId.value) {
 *     await window.electronAPI.search.cancel({ searchId: searchId.value });
 *   }
 * };
 *
 *
 * // Example: In-page search (renderer-only, no IPC)
 * const findInPage = (query: string) => {
 *   const webContents = document.querySelector('webview');  // Or use Electron's webContents API
 *   webContents.findInPage(query, {
 *     forward: true,
 *     findNext: false
 *   });
 * };
 */
