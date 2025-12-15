/**
 * Search Store
 * Task: T172
 *
 * Manages search state and history with max 200 entries (FR-071)
 */

import { create } from 'zustand';

export interface SearchHistoryEntry {
  query: string;
  type: 'inPage' | 'inFiles';
  timestamp: number;
  resultsCount?: number;
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  excludePatterns: string[];
  includeHiddenFiles: boolean;
}

export interface SearchMatch {
  lineNumber: number;
  columnStart: number;
  columnEnd: number;
  lineContent: string;
  previewSnippet: string;
  highlightStart: number;
  highlightEnd: number;
}

export interface SearchResult {
  filePath: string;
  fileName: string;
  matches: SearchMatch[];
}

export interface ActiveSearch {
  searchId: string;
  query: string;
  type: 'inPage' | 'inFiles';
  filesSearched: number;
  totalFiles: number;
  resultsFound: number;
  results: SearchResult[];
  isActive: boolean;
  startTime: number;
}

interface SearchState {
  // Search history (T172: max 200 entries)
  history: SearchHistoryEntry[];
  maxHistoryEntries: number;

  // Active search state
  activeSearch: ActiveSearch | null;

  // In-page search state (T169)
  findInPageQuery: string;
  findInPageOptions: {
    caseSensitive: boolean;
    wholeWord: boolean;
    useRegex: boolean;
  };
  findInPageCurrentIndex: number;
  findInPageTotalMatches: number;

  // Cross-file search options (T170)
  searchInFilesOptions: SearchOptions;

  // Actions
  addToHistory: (entry: Omit<SearchHistoryEntry, 'timestamp'>) => void;
  clearHistory: () => void;
  getRecentSearches: (count?: number) => SearchHistoryEntry[];

  // In-page search actions
  setFindInPageQuery: (query: string) => void;
  setFindInPageOptions: (options: Partial<SearchState['findInPageOptions']>) => void;
  setFindInPageResults: (currentIndex: number, totalMatches: number) => void;
  clearFindInPage: () => void;

  // Cross-file search actions
  setSearchInFilesOptions: (options: Partial<SearchOptions>) => void;
  startSearch: (searchId: string, query: string, type: 'inPage' | 'inFiles') => void;
  updateSearchProgress: (
    searchId: string,
    filesSearched: number,
    totalFiles: number,
    resultsFound: number
  ) => void;
  addSearchResult: (searchId: string, result: SearchResult) => void;
  completeSearch: (searchId: string, totalResults: number) => void;
  cancelSearch: () => void;
}

/**
 * T172: Search store with history management
 */
export const useSearchStore = create<SearchState>((set, get) => ({
  // Initial state
  history: [],
  maxHistoryEntries: 200,

  activeSearch: null,

  findInPageQuery: '',
  findInPageOptions: {
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
  },
  findInPageCurrentIndex: 0,
  findInPageTotalMatches: 0,

  searchInFilesOptions: {
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    excludePatterns: ['node_modules', '.git', 'dist', 'build'],
    includeHiddenFiles: false,
  },

  // History management (T172)
  addToHistory: (entry) => {
    const timestamp = Date.now();
    const newEntry: SearchHistoryEntry = {
      ...entry,
      timestamp,
    };

    set((state) => {
      // Check if query already exists in history
      const existingIndex = state.history.findIndex(
        (h) => h.query === entry.query && h.type === entry.type
      );

      let newHistory: SearchHistoryEntry[];

      if (existingIndex >= 0) {
        // Update existing entry with new timestamp
        newHistory = [...state.history];
        newHistory[existingIndex] = newEntry;
      } else {
        // Add new entry
        newHistory = [newEntry, ...state.history];
      }

      // Enforce max 200 entries
      if (newHistory.length > state.maxHistoryEntries) {
        newHistory = newHistory.slice(0, state.maxHistoryEntries);
      }

      return { history: newHistory };
    });
  },

  clearHistory: () => {
    set({ history: [] });
  },

  getRecentSearches: (count = 10) => {
    const { history } = get();
    return history.slice(0, count);
  },

  // In-page search (T169)
  setFindInPageQuery: (query) => {
    set({ findInPageQuery: query });
  },

  setFindInPageOptions: (options) => {
    set((state) => ({
      findInPageOptions: {
        ...state.findInPageOptions,
        ...options,
      },
    }));
  },

  setFindInPageResults: (currentIndex, totalMatches) => {
    set({
      findInPageCurrentIndex: currentIndex,
      findInPageTotalMatches: totalMatches,
    });
  },

  clearFindInPage: () => {
    set({
      findInPageQuery: '',
      findInPageCurrentIndex: 0,
      findInPageTotalMatches: 0,
    });
  },

  // Cross-file search (T170)
  setSearchInFilesOptions: (options) => {
    set((state) => ({
      searchInFilesOptions: {
        ...state.searchInFilesOptions,
        ...options,
      },
    }));
  },

  startSearch: (searchId, query, type) => {
    set({
      activeSearch: {
        searchId,
        query,
        type,
        filesSearched: 0,
        totalFiles: 0,
        resultsFound: 0,
        results: [],
        isActive: true,
        startTime: Date.now(),
      },
    });
  },

  updateSearchProgress: (searchId, filesSearched, totalFiles, resultsFound) => {
    set((state) => {
      if (!state.activeSearch || state.activeSearch.searchId !== searchId) {
        return state;
      }

      return {
        activeSearch: {
          ...state.activeSearch,
          filesSearched,
          totalFiles,
          resultsFound,
        },
      };
    });
  },

  addSearchResult: (searchId, result) => {
    set((state) => {
      if (!state.activeSearch || state.activeSearch.searchId !== searchId) {
        return state;
      }

      return {
        activeSearch: {
          ...state.activeSearch,
          results: [...state.activeSearch.results, result],
          resultsFound: state.activeSearch.resultsFound + result.matches.length,
        },
      };
    });
  },

  completeSearch: (searchId, totalResults) => {
    set((state) => {
      if (!state.activeSearch || state.activeSearch.searchId !== searchId) {
        return state;
      }

      // Add to history
      get().addToHistory({
        query: state.activeSearch.query,
        type: state.activeSearch.type,
        resultsCount: totalResults,
      });

      return {
        activeSearch: {
          ...state.activeSearch,
          isActive: false,
        },
      };
    });
  },

  cancelSearch: () => {
    set((state) => {
      if (!state.activeSearch) {
        return state;
      }

      return {
        activeSearch: {
          ...state.activeSearch,
          isActive: false,
        },
      };
    });
  },
}));

export default useSearchStore;
