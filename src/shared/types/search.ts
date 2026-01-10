// T003: Shared TypeScript interfaces for search functionality
// Data model based on specs/001-search-find/data-model.md

/**
 * Search query configuration
 */
export interface SearchQuery {
  query: string;
  type: 'inPage' | 'inFiles';
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  repositoryScope?: 'current' | 'allBranches' | 'allRepos';
  excludePatterns?: string[];
  includeHiddenFiles?: boolean;
  timestamp: number;
}

/**
 * Individual search match within a file
 */
export interface SearchMatch {
  lineNumber: number; // 1-indexed
  columnStart: number; // 0-indexed
  columnEnd: number; // 0-indexed
  lineContent: string;
  previewSnippet: string; // max 200 chars
  highlightStart: number; // position within previewSnippet (0-indexed)
  highlightEnd: number; // position within previewSnippet (0-indexed)
  matchedText: string;
}

/**
 * All matches within a single file
 */
export interface SearchResult {
  filePath: string; // absolute path
  fileName: string;
  relativePath: string;
  repository?: string;
  branch?: string;
  matches: SearchMatch[];
  totalMatches: number;
  fileSize: number;
  lastModified: number;
}

/**
 * Search history entry (session-only)
 */
export interface SearchHistoryEntry {
  id: string; // UUID
  query: string;
  type: 'inPage' | 'inFiles';
  timestamp: number;
  resultsCount?: number;
  filesSearched?: number;
  executionTime: number; // milliseconds
}

/**
 * Active search operation state
 */
export interface ActiveSearch {
  searchId: string; // UUID
  query: string;
  type: 'inPage' | 'inFiles';
  state: 'idle' | 'searching' | 'completed' | 'cancelled' | 'error';
  filesSearched: number;
  totalFiles: number;
  resultsFound: number;
  results: SearchResult[];
  isActive: boolean;
  startTime: number;
  endTime: number | null;
  error: string | null;
  cancellable: boolean;
}

/**
 * Search options for configuration
 */
export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  repositoryScope: 'current' | 'allBranches' | 'allRepos';
  excludePatterns: string[];
  includeHiddenFiles: boolean;
}

// IPC Request/Response Types

/**
 * Search request from renderer to main process
 * Supports both local folder search and repository search
 */
export interface SearchRequest {
  query: string;
  // For local folder search
  folderPath?: string; // root path for inFiles search
  // For repository search
  repositoryId?: string; // repository UUID
  branch?: string; // branch name
  // Common options
  options?: {
    caseSensitive?: boolean;
    wholeWord?: boolean;
    useRegex?: boolean;
    excludePatterns?: string[];
    includeHiddenFiles?: boolean;
  };
  maxResults?: number; // max number of results (default: 1000)
}

/**
 * Search progress event from main to renderer
 */
export interface SearchProgressEvent {
  searchId: string;
  filesSearched: number;
  totalFiles: number;
  resultsFound: number;
  partialResults?: SearchResult[];
}

/**
 * Search completion event from main to renderer
 */
export interface SearchCompleteEvent {
  searchId: string;
  results: SearchResult[];
  totalMatches: number;
  filesSearched: number;
  executionTime: number;
}

/**
 * Search error event from main to renderer
 */
export interface SearchErrorEvent {
  searchId: string;
  error: string;
  partialResults?: SearchResult[];
}

/**
 * Search response (IPC return value)
 */
export interface SearchResponse {
  success: boolean;
  searchId: string;
  error?: string;
}

/**
 * Cancel search request
 */
export interface SearchCancelRequest {
  searchId: string;
}

/**
 * Cancel search response
 */
export interface SearchCancelResponse {
  success: boolean;
  error?: string;
}

/**
 * Regex validation request
 */
export interface ValidateRegexRequest {
  pattern: string;
}

/**
 * Regex validation response
 */
export interface ValidateRegexResponse {
  valid: boolean;
  error?: string;
  isDangerous?: boolean;
}
