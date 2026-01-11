# Data Model: Search and Find

**Branch**: 001-search-find | **Date**: 2026-01-09 | **Status**: Complete

## Overview

This document defines the data entities, relationships, and state management for the search and find feature in MarkRead. The model supports both in-document search (CTRL+F) and cross-file search (SHIFT+CTRL+F) with session-based history.

## Core Entities

### SearchQuery

Represents a user's search request with all configuration options.

**Fields**:
- `query` (string) - The search term or regex pattern
- `type` ('inPage' | 'inFiles') - Search scope: current document or multi-file
- `caseSensitive` (boolean) - Case-sensitive matching flag (default: false)
- `wholeWord` (boolean) - Match whole words only flag (default: false)
- `useRegex` (boolean) - Treat query as regex pattern (default: false)
- `fileTypeFilter` ('markdown' | 'allText') - File type scope for multi-file search
- `repositoryScope` ('current' | 'allBranches' | 'allRepos') - Repository/branch scope for multi-file search
- `excludePatterns` (string[]) - File/folder patterns to exclude (e.g., ['node_modules', '.git'])
- `includeHiddenFiles` (boolean) - Include hidden files/folders (default: false)
- `timestamp` (number) - Unix timestamp when query was created

**Relationships**:
- One-to-many with `SearchResult` - A query produces multiple results
- One-to-one with `SearchHistoryEntry` - Each query may be saved to history

**Validation Rules**:
- `query` must not be empty (min length: 1)
- If `useRegex` is true, `query` must be valid JavaScript regex syntax
- If `useRegex` is true, `query` must pass safety validation (no dangerous patterns)
- `excludePatterns` must be valid glob patterns
- `fileTypeFilter` only applies when `type` is 'inFiles'
- `repositoryScope` only applies when `type` is 'inFiles'

**Example**:
```typescript
const searchQuery: SearchQuery = {
  query: 'TODO',
  type: 'inFiles',
  caseSensitive: false,
  wholeWord: false,
  useRegex: false,
  fileTypeFilter: 'markdown',
  repositoryScope: 'current',
  excludePatterns: ['node_modules', '.git', 'dist'],
  includeHiddenFiles: false,
  timestamp: Date.now()
};
```

---

### SearchMatch

Represents a single match within a file or document.

**Fields**:
- `lineNumber` (number) - Line number where match occurs (1-indexed)
- `columnStart` (number) - Starting column position of match (0-indexed)
- `columnEnd` (number) - Ending column position of match (0-indexed)
- `lineContent` (string) - Full content of the line containing the match
- `previewSnippet` (string) - Truncated preview with context (max 200 chars)
- `highlightStart` (number) - Start position within previewSnippet (0-indexed)
- `highlightEnd` (number) - End position within previewSnippet (0-indexed)
- `matchedText` (string) - The actual text that matched the query

**Relationships**:
- Many-to-one with `SearchResult` - Multiple matches belong to one result (file)

**Validation Rules**:
- `lineNumber` must be >= 1
- `columnStart` must be >= 0
- `columnEnd` must be > `columnStart`
- `lineContent` must not be empty
- `previewSnippet` max length: 200 characters
- `highlightStart` must be >= 0 and < `previewSnippet.length`
- `highlightEnd` must be > `highlightStart` and <= `previewSnippet.length`

**Example**:
```typescript
const searchMatch: SearchMatch = {
  lineNumber: 42,
  columnStart: 8,
  columnEnd: 12,
  lineContent: '  const TODO = "implement this feature";',
  previewSnippet: '  const TODO = "implement this feature";',
  highlightStart: 8,
  highlightEnd: 12,
  matchedText: 'TODO'
};
```

---

### SearchResult

Represents all matches within a single file.

**Fields**:
- `filePath` (string) - Absolute path to the file
- `fileName` (string) - Base name of the file (for display)
- `relativePath` (string) - Path relative to repository root
- `repository` (string) - Repository name (for multi-repo search)
- `branch` (string) - Git branch name (for multi-branch search)
- `matches` (SearchMatch[]) - Array of all matches in this file
- `totalMatches` (number) - Count of matches (convenience field)
- `fileSize` (number) - File size in bytes
- `lastModified` (number) - Unix timestamp of last file modification

**Relationships**:
- Many-to-one with `SearchQuery` - Multiple results belong to one query
- One-to-many with `SearchMatch` - One result contains multiple matches

**Validation Rules**:
- `filePath` must be absolute path
- `fileName` must not be empty
- `matches` must not be empty (result only exists if matches found)
- `totalMatches` must equal `matches.length`
- `fileSize` must be >= 0
- `lastModified` must be valid Unix timestamp

**Example**:
```typescript
const searchResult: SearchResult = {
  filePath: 'C:/repo/markread/src/main/search-service.ts',
  fileName: 'search-service.ts',
  relativePath: 'src/main/search-service.ts',
  repository: 'markread',
  branch: 'main',
  matches: [
    { lineNumber: 42, columnStart: 8, columnEnd: 12, /* ... */ },
    { lineNumber: 87, columnStart: 15, columnEnd: 19, /* ... */ }
  ],
  totalMatches: 2,
  fileSize: 8432,
  lastModified: 1704880123000
};
```

---

### SearchHistoryEntry

Represents a past search query for session-based history recall.

**Fields**:
- `id` (string) - Unique identifier (UUID)
- `query` (string) - The search term that was executed
- `type` ('inPage' | 'inFiles') - Type of search performed
- `timestamp` (number) - Unix timestamp when search was executed
- `resultsCount` (number) - Total number of matches found (optional)
- `filesSearched` (number) - Number of files searched (for 'inFiles' type)
- `executionTime` (number) - Search duration in milliseconds

**Relationships**:
- None (history entries are independent records)

**Validation Rules**:
- `id` must be unique UUID
- `query` must not be empty
- `timestamp` must be valid Unix timestamp
- `resultsCount` must be >= 0 if provided
- `filesSearched` only applies when `type` is 'inFiles'
- History limited to maximum 200 entries (FIFO eviction)

**State Management**:
- Stored in Zustand store (in-memory only)
- Cleared when application closes (no persistence)
- Sorted by timestamp descending (most recent first)

**Example**:
```typescript
const historyEntry: SearchHistoryEntry = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  query: 'TODO',
  type: 'inFiles',
  timestamp: 1704880123000,
  resultsCount: 47,
  filesSearched: 123,
  executionTime: 892
};
```

---

### ActiveSearch

Represents the state of a currently executing search operation (for progress tracking and cancellation).

**Fields**:
- `searchId` (string) - Unique identifier for this search operation (UUID)
- `query` (string) - The search term being executed
- `type` ('inPage' | 'inFiles') - Type of search
- `state` ('idle' | 'searching' | 'completed' | 'cancelled' | 'error') - Current state
- `filesSearched` (number) - Number of files processed so far
- `totalFiles` (number) - Total number of files to search (estimated)
- `resultsFound` (number) - Number of matches found so far
- `results` (SearchResult[]) - Accumulated results (partial or complete)
- `isActive` (boolean) - Whether search is currently running
- `startTime` (number) - Unix timestamp when search started
- `endTime` (number | null) - Unix timestamp when search finished (null if still running)
- `error` (string | null) - Error message if state is 'error'
- `cancellable` (boolean) - Whether this search can be cancelled

**Relationships**:
- One-to-many with `SearchResult` - Accumulates results during execution

**Validation Rules**:
- `searchId` must be unique UUID
- `query` must not be empty
- `filesSearched` must be <= `totalFiles`
- `resultsFound` must match count of matches in `results`
- `endTime` must be >= `startTime` if provided
- `isActive` must be false when `state` is 'completed', 'cancelled', or 'error'

**State Transitions**:
```
idle -> searching (user initiates search)
searching -> completed (search finishes successfully)
searching -> cancelled (user cancels search)
searching -> error (search encounters error)
completed|cancelled|error -> idle (user starts new search)
```

**Example**:
```typescript
const activeSearch: ActiveSearch = {
  searchId: 'f9e8d7c6-b5a4-3210-9876-fedcba098765',
  query: 'TODO',
  type: 'inFiles',
  state: 'searching',
  filesSearched: 245,
  totalFiles: 1000,
  resultsFound: 12,
  results: [/* partial results */],
  isActive: true,
  startTime: 1704880123000,
  endTime: null,
  error: null,
  cancellable: true
};
```

---

## State Management (Zustand Store)

### SearchStore Structure

```typescript
interface SearchStore {
  // Active Search State
  activeSearch: ActiveSearch | null;

  // UI State
  isSearchBarVisible: boolean;
  isFindInFilesVisible: boolean;
  currentMatchIndex: number; // For in-page navigation (0-indexed)

  // Search Configuration
  searchOptions: {
    caseSensitive: boolean;
    wholeWord: boolean;
    useRegex: boolean;
    fileTypeFilter: 'markdown' | 'allText';
    repositoryScope: 'current' | 'allBranches' | 'allRepos';
    excludePatterns: string[];
    includeHiddenFiles: boolean;
  };

  // History (session-only, max 200 entries)
  history: SearchHistoryEntry[];
  maxHistorySize: number; // 200

  // Actions
  startSearch: (query: string, type: 'inPage' | 'inFiles') => Promise<void>;
  cancelSearch: (searchId: string) => void;
  updateSearchProgress: (progress: Partial<ActiveSearch>) => void;
  completeSearch: () => void;

  setSearchBarVisible: (visible: boolean) => void;
  setFindInFilesVisible: (visible: boolean) => void;
  navigateToNextMatch: () => void;
  navigateToPreviousMatch: () => void;

  updateSearchOptions: (options: Partial<SearchOptions>) => void;

  addToHistory: (entry: SearchHistoryEntry) => void;
  clearHistory: () => void;
  getHistoryByType: (type: 'inPage' | 'inFiles') => SearchHistoryEntry[];
}
```

### State Persistence

**In-Memory Only**:
- `activeSearch` - Cleared when search completes or app closes
- `history` - Cleared when app closes (no persistence)
- `currentMatchIndex` - Reset when search changes or app closes

**Persisted via electron-store** (settings):
- `searchOptions.excludePatterns` - User's custom exclude patterns
- `searchOptions.fileTypeFilter` - User's last selected filter preference
- `searchOptions.repositoryScope` - User's last selected scope preference

**Never Persisted**:
- `history` - Privacy: don't persist search terms
- `activeSearch.results` - Performance: large data, recreated on demand

---

## IPC Data Transfer

### Main Process → Renderer Process

**Progress Events**:
```typescript
interface SearchProgressEvent {
  searchId: string;
  filesSearched: number;
  totalFiles: number;
  resultsFound: number;
  partialResults?: SearchResult[]; // Optional: send results incrementally
}
```

**Completion Events**:
```typescript
interface SearchCompleteEvent {
  searchId: string;
  results: SearchResult[];
  totalMatches: number;
  filesSearched: number;
  executionTime: number;
}
```

**Error Events**:
```typescript
interface SearchErrorEvent {
  searchId: string;
  error: string;
  partialResults?: SearchResult[]; // Results found before error
}
```

### Renderer Process → Main Process

**Search Requests**:
```typescript
interface SearchRequest {
  searchId: string;
  query: string;
  options: {
    caseSensitive: boolean;
    wholeWord: boolean;
    useRegex: boolean;
    excludePatterns: string[];
    includeHiddenFiles: boolean;
  };
  scope: {
    type: 'inPage' | 'inFiles';
    fileTypeFilter?: 'markdown' | 'allText';
    repositoryScope?: 'current' | 'allBranches' | 'allRepos';
    currentFilePath?: string; // For inPage search
    searchPath?: string; // Root path for inFiles search
  };
}
```

**Cancel Requests**:
```typescript
interface CancelSearchRequest {
  searchId: string;
}
```

**Validation Requests**:
```typescript
interface ValidateRegexRequest {
  pattern: string;
}

interface ValidateRegexResponse {
  valid: boolean;
  error?: string;
  isDangerous?: boolean; // True if pattern contains dangerous constructs
}
```

---

## Entity Relationships Diagram

```
┌─────────────────┐
│  SearchQuery    │
│                 │
│ - query         │
│ - type          │
│ - options       │
└────────┬────────┘
         │ 1
         │
         │ produces
         │
         │ N
         ▼
┌─────────────────┐
│  SearchResult   │
│                 │
│ - filePath      │
│ - fileName      │
│ - matches[]     │
└────────┬────────┘
         │ 1
         │
         │ contains
         │
         │ N
         ▼
┌─────────────────┐
│  SearchMatch    │
│                 │
│ - lineNumber    │
│ - columnStart   │
│ - columnEnd     │
│ - lineContent   │
└─────────────────┘


┌──────────────────────┐
│  SearchHistoryEntry  │  (session-only, max 200)
│                      │
│ - id                 │
│ - query              │
│ - type               │
│ - timestamp          │
└──────────────────────┘


┌─────────────────┐
│  ActiveSearch   │  (runtime state)
│                 │
│ - searchId      │
│ - state         │
│ - progress      │
│ - results[]     │
└────────┬────────┘
         │
         │ references
         │
         ▼
┌─────────────────┐
│  SearchResult   │
└─────────────────┘
```

---

## Database Schema

**Note**: This feature uses in-memory storage only (Zustand store). No database persistence required.

For settings persistence via electron-store:

```typescript
// .electron-store schema (partial)
{
  "search": {
    "excludePatterns": ["node_modules", ".git", "dist", "build"],
    "defaultFileTypeFilter": "markdown",
    "defaultRepositoryScope": "current"
  }
}
```

---

## Data Flow Examples

### In-Document Search Flow

```
1. User presses CTRL+F
   → SearchStore.setSearchBarVisible(true)

2. User types "TODO"
   → Debounced 150ms
   → SearchStore.startSearch("TODO", "inPage")

3. Renderer performs regex match on current document content
   → Creates SearchMatch[] for each occurrence
   → Creates SearchResult with all matches

4. SearchStore updates:
   - activeSearch.state = 'completed'
   - activeSearch.results = [singleFileResult]
   - currentMatchIndex = 0

5. UI highlights all matches
   → MarkdownViewer applies <mark> tags
   → CustomScrollbar displays markers at match positions

6. User presses F3
   → SearchStore.navigateToNextMatch()
   → currentMatchIndex increments
   → Scroll to next match, apply .current class
```

### Multi-File Search Flow

```
1. User presses SHIFT+CTRL+F
   → SearchStore.setFindInFilesVisible(true)

2. User types "TODO" and clicks Search
   → SearchStore.startSearch("TODO", "inFiles")
   → IPC: renderer sends SearchRequest to main process

3. Main process (search-service.ts):
   a. Scan directory for files matching filter
   b. For each file:
      - Read content
      - Apply regex matching
      - Send progress event every 50 files
   c. Send completion event with all results

4. Renderer receives progress events
   → SearchStore.updateSearchProgress(progress)
   → UI updates: "Searching... 245/1000 files"

5. Renderer receives completion event
   → SearchStore.completeSearch()
   → activeSearch.state = 'completed'
   → activeSearch.results = [...all matches]
   → Add to history

6. UI displays results grouped by folder/file
   → User clicks result
   → Open file and highlight match
```

---

## Performance Considerations

### Memory Management

**Result Limits**:
- In-document: Max 1,000 highlights rendered simultaneously
- Multi-file: No hard limit, but virtual scrolling for UI

**History Management**:
- FIFO eviction when exceeding 200 entries
- Each entry ~200 bytes → max ~40KB memory

**Search Result Size**:
- Average SearchMatch: ~400 bytes (with context)
- 1,000 files × 10 matches/file × 400 bytes = ~4MB
- Acceptable for desktop Electron app

### Data Transfer Optimization

**Incremental Results**:
- Main process can send partial results every 50 files
- Renderer displays results as they arrive
- Improves perceived performance

**Result Compression** (future consideration):
- If result sets exceed 10MB, consider compression
- Not needed for v1 based on scale targets (1,000 files)

---

## Type Definitions (TypeScript)

See [contracts/search-types.ts](./contracts/search-types.ts) for complete type definitions shared between main and renderer processes.

---

## Validation Summary

| Entity | Required Fields | Optional Fields | Computed Fields |
|--------|----------------|-----------------|-----------------|
| SearchQuery | query, type, caseSensitive, wholeWord, useRegex, timestamp | fileTypeFilter, repositoryScope, excludePatterns, includeHiddenFiles | - |
| SearchMatch | lineNumber, columnStart, columnEnd, lineContent, previewSnippet, highlightStart, highlightEnd | - | matchedText (derived from lineContent) |
| SearchResult | filePath, fileName, relativePath, matches | repository, branch, lastModified | totalMatches (= matches.length), fileSize |
| SearchHistoryEntry | id, query, type, timestamp | resultsCount, filesSearched, executionTime | - |
| ActiveSearch | searchId, query, type, state, filesSearched, totalFiles, resultsFound, results, isActive, startTime | endTime, error | cancellable (= isActive) |

---

## References

- [Zustand Store Documentation](https://github.com/pmndrs/zustand)
- [Electron IPC Best Practices](https://www.electronjs.org/docs/latest/tutorial/ipc)
- Existing MarkRead stores: [src/renderer/stores/settings.ts](../../src/renderer/stores/settings.ts)
