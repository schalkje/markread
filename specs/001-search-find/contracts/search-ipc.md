# Search IPC Contracts

**Branch**: 001-search-find | **Date**: 2026-01-09 | **Status**: Complete

## Overview

This document defines the IPC (Inter-Process Communication) contracts between the Electron renderer process (React UI) and main process (Node.js backend) for the search and find feature. All communication follows Electron's contextBridge pattern for security.

## Architecture

```
┌──────────────────────────────┐
│   Renderer Process (React)   │
│                              │
│  - FindBar component         │
│  - SearchResults component   │
│  - Search Zustand store      │
└──────────┬───────────────────┘
           │
           │ window.api.search.*
           │ (via preload script)
           │
           ▼
┌──────────────────────────────┐
│   Preload Script             │
│                              │
│  - contextBridge.exposeInMainWorld
│  - ipcRenderer wrapper       │
└──────────┬───────────────────┘
           │
           │ IPC channels
           │
           ▼
┌──────────────────────────────┐
│   Main Process (Node.js)     │
│                              │
│  - search-service.ts         │
│  - IPC handlers              │
│  - File system operations    │
└──────────────────────────────┘
```

---

## IPC Channels

### Overview Table

| Channel | Direction | Type | Description |
|---------|-----------|------|-------------|
| `search:in-page` | Renderer → Main | Request/Response | In-document search |
| `search:in-files` | Renderer → Main | Request + Events | Multi-file search with progress |
| `search:cancel` | Renderer → Main | Request | Cancel active search |
| `search:validate-regex` | Renderer → Main | Request/Response | Validate regex pattern safety |
| `search:progress` | Main → Renderer | Event | Progress updates during search |
| `search:complete` | Main → Renderer | Event | Search completion notification |
| `search:error` | Main → Renderer | Event | Search error notification |

---

## Request/Response Contracts

### 1. In-Page Search

**Channel**: `search:in-page`

**Request** (Renderer → Main):
```typescript
interface InPageSearchRequest {
  searchId: string;           // UUID for this search operation
  filePath: string;           // Absolute path to current document
  query: string;              // Search term or regex pattern
  caseSensitive: boolean;     // Case-sensitive matching
  wholeWord: boolean;         // Match whole words only
  useRegex: boolean;          // Treat query as regex
}
```

**Response** (Main → Renderer):
```typescript
interface InPageSearchResponse {
  searchId: string;           // Matches request searchId
  matches: SearchMatch[];     // All matches found in document
  totalMatches: number;       // Total count (= matches.length)
  executionTime: number;      // Search duration in milliseconds
  error?: string;             // Error message if search failed
}

interface SearchMatch {
  lineNumber: number;         // Line number (1-indexed)
  columnStart: number;        // Start column (0-indexed)
  columnEnd: number;          // End column (0-indexed)
  lineContent: string;        // Full line text
  previewSnippet: string;     // Truncated preview (max 200 chars)
  highlightStart: number;     // Highlight start in snippet
  highlightEnd: number;       // Highlight end in snippet
  matchedText: string;        // The matched text
}
```

**Example Usage** (Renderer):
```typescript
const response = await window.api.search.inPage({
  searchId: 'a1b2c3d4-...',
  filePath: 'C:/repo/markread/README.md',
  query: 'TODO',
  caseSensitive: false,
  wholeWord: false,
  useRegex: false
});

console.log(`Found ${response.totalMatches} matches in ${response.executionTime}ms`);
```

**Error Handling**:
- Invalid regex → `error: "Invalid regex pattern: <details>"`
- File not found → `error: "File not found: <path>"`
- File read error → `error: "Failed to read file: <details>"`

---

### 2. Multi-File Search

**Channel**: `search:in-files`

**Request** (Renderer → Main):
```typescript
interface InFilesSearchRequest {
  searchId: string;               // UUID for this search operation
  query: string;                  // Search term or regex pattern
  caseSensitive: boolean;         // Case-sensitive matching
  wholeWord: boolean;             // Match whole words only
  useRegex: boolean;              // Treat query as regex
  fileTypeFilter: 'markdown' | 'allText';  // File type scope
  repositoryScope: 'current' | 'allBranches' | 'allRepos';  // Repo/branch scope
  excludePatterns: string[];      // Glob patterns to exclude
  includeHiddenFiles: boolean;    // Include hidden files/folders
  searchPath: string;             // Root directory to search
  maxResults?: number;            // Optional: max results to return (default: unlimited)
}
```

**Immediate Response** (Main → Renderer):
```typescript
interface InFilesSearchStartResponse {
  searchId: string;               // Matches request searchId
  started: boolean;               // true if search started successfully
  totalFiles: number;             // Estimated total files to search
  error?: string;                 // Error if search couldn't start
}
```

**Progress Events** (Main → Renderer) on `search:progress`:
```typescript
interface SearchProgressEvent {
  searchId: string;               // Matches request searchId
  filesSearched: number;          // Files processed so far
  totalFiles: number;             // Total files to search
  resultsFound: number;           // Total matches found so far
  currentFile?: string;           // Current file being searched
  partialResults?: SearchResult[]; // Optional: incremental results
}
```

**Completion Event** (Main → Renderer) on `search:complete`:
```typescript
interface SearchCompleteEvent {
  searchId: string;               // Matches request searchId
  results: SearchResult[];        // All search results
  totalMatches: number;           // Total count of matches
  filesSearched: number;          // Total files processed
  executionTime: number;          // Total duration in milliseconds
}

interface SearchResult {
  filePath: string;               // Absolute path to file
  fileName: string;               // Base name for display
  relativePath: string;           // Path relative to repo root
  repository: string;             // Repository name
  branch: string;                 // Git branch name
  matches: SearchMatch[];         // All matches in this file
  totalMatches: number;           // Count (= matches.length)
  fileSize: number;               // File size in bytes
  lastModified: number;           // Unix timestamp
}
```

**Error Event** (Main → Renderer) on `search:error`:
```typescript
interface SearchErrorEvent {
  searchId: string;               // Matches request searchId
  error: string;                  // Error message
  partialResults?: SearchResult[]; // Results found before error
  filesSearched: number;          // Files processed before error
}
```

**Example Usage** (Renderer):
```typescript
// Start search
const startResponse = await window.api.search.inFiles({
  searchId: 'b2c3d4e5-...',
  query: 'TODO',
  caseSensitive: false,
  wholeWord: false,
  useRegex: false,
  fileTypeFilter: 'markdown',
  repositoryScope: 'current',
  excludePatterns: ['node_modules', '.git'],
  includeHiddenFiles: false,
  searchPath: 'C:/repo/markread'
});

// Listen for progress
window.api.search.onProgress((event) => {
  console.log(`Progress: ${event.filesSearched}/${event.totalFiles}`);
  updateUI(event);
});

// Listen for completion
window.api.search.onComplete((event) => {
  console.log(`Complete: ${event.totalMatches} matches in ${event.executionTime}ms`);
  displayResults(event.results);
});

// Listen for errors
window.api.search.onError((event) => {
  console.error(`Error: ${event.error}`);
  showError(event.error);
});
```

**Error Scenarios**:
- Search path not found → Error event with message
- Permission denied on file → Skip file, continue search
- Regex timeout → Skip file, log warning, continue
- Out of memory → Error event, return partial results

---

### 3. Cancel Search

**Channel**: `search:cancel`

**Request** (Renderer → Main):
```typescript
interface CancelSearchRequest {
  searchId: string;               // UUID of search to cancel
}
```

**Response** (Main → Renderer):
```typescript
interface CancelSearchResponse {
  searchId: string;               // Matches request searchId
  cancelled: boolean;             // true if successfully cancelled
  message?: string;               // Optional cancellation message
}
```

**Example Usage** (Renderer):
```typescript
const response = await window.api.search.cancel({
  searchId: 'b2c3d4e5-...'
});

if (response.cancelled) {
  console.log('Search cancelled');
}
```

**Behavior**:
- If search is active → Stop immediately, send partial results via `search:complete` with `cancelled: true` flag
- If search already complete → Return `cancelled: false` with message "Search already completed"
- If searchId not found → Return `cancelled: false` with message "Search not found"

---

### 4. Validate Regex

**Channel**: `search:validate-regex`

**Request** (Renderer → Main):
```typescript
interface ValidateRegexRequest {
  pattern: string;                // Regex pattern to validate
}
```

**Response** (Main → Renderer):
```typescript
interface ValidateRegexResponse {
  valid: boolean;                 // true if pattern is valid and safe
  error?: string;                 // Error message if invalid
  isDangerous?: boolean;          // true if pattern contains dangerous constructs
  sanitizedPattern?: string;      // Optional: suggested safe alternative
}
```

**Example Usage** (Renderer):
```typescript
const response = await window.api.search.validateRegex({
  pattern: '(a+)+'
});

if (!response.valid) {
  if (response.isDangerous) {
    console.error('Dangerous pattern detected:', response.error);
  } else {
    console.error('Invalid regex:', response.error);
  }
}
```

**Validation Rules**:
- Check JavaScript regex syntax validity
- Detect dangerous constructs:
  - Nested quantifiers: `(a+)+`, `(a*)*`
  - Quantifier stacking: `a**`, `b++`
  - Excessive alternation: `(a|b|c|d|...){100}` with many alternatives
- Suggest safe alternatives when possible

**Dangerous Pattern Examples**:
```typescript
// Dangerous - nested quantifiers
'(a+)+' → isDangerous: true, error: "Nested quantifiers can cause catastrophic backtracking"

// Dangerous - quantifier stacking
'a**' → isDangerous: true, error: "Quantifier stacking is not allowed"

// Valid but complex
'[a-z]{1,100}' → valid: true

// Invalid syntax
'(' → valid: false, error: "Unclosed group"
```

---

## Preload Script API Surface

**File**: `src/preload/search-api.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  search: {
    // Request/response calls
    inPage: (request: InPageSearchRequest) =>
      ipcRenderer.invoke('search:in-page', request),

    inFiles: (request: InFilesSearchRequest) =>
      ipcRenderer.invoke('search:in-files', request),

    cancel: (request: CancelSearchRequest) =>
      ipcRenderer.invoke('search:cancel', request),

    validateRegex: (request: ValidateRegexRequest) =>
      ipcRenderer.invoke('search:validate-regex', request),

    // Event listeners
    onProgress: (callback: (event: SearchProgressEvent) => void) => {
      ipcRenderer.on('search:progress', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('search:progress');
    },

    onComplete: (callback: (event: SearchCompleteEvent) => void) => {
      ipcRenderer.on('search:complete', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('search:complete');
    },

    onError: (callback: (event: SearchErrorEvent) => void) => {
      ipcRenderer.on('search:error', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('search:error');
    },

    // Cleanup helper
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('search:progress');
      ipcRenderer.removeAllListeners('search:complete');
      ipcRenderer.removeAllListeners('search:error');
    }
  }
});
```

**TypeScript Declarations** (`src/renderer/global.d.ts`):
```typescript
export interface SearchAPI {
  inPage: (request: InPageSearchRequest) => Promise<InPageSearchResponse>;
  inFiles: (request: InFilesSearchRequest) => Promise<InFilesSearchStartResponse>;
  cancel: (request: CancelSearchRequest) => Promise<CancelSearchResponse>;
  validateRegex: (request: ValidateRegexRequest) => Promise<ValidateRegexResponse>;

  onProgress: (callback: (event: SearchProgressEvent) => void) => () => void;
  onComplete: (callback: (event: SearchCompleteEvent) => void) => () => void;
  onError: (callback: (event: SearchErrorEvent) => void) => () => void;

  removeAllListeners: () => void;
}

declare global {
  interface Window {
    api: {
      search: SearchAPI;
      // ... other APIs
    };
  }
}
```

---

## Main Process IPC Handlers

**File**: `src/main/ipc/search-handlers.ts`

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import { searchService } from '../search-service';

export function registerSearchHandlers() {
  // In-page search
  ipcMain.handle('search:in-page', async (_event, request: InPageSearchRequest) => {
    try {
      const results = await searchService.searchInPage(request);
      return results;
    } catch (error) {
      return {
        searchId: request.searchId,
        matches: [],
        totalMatches: 0,
        executionTime: 0,
        error: error.message
      };
    }
  });

  // Multi-file search
  ipcMain.handle('search:in-files', async (event, request: InFilesSearchRequest) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      return { searchId: request.searchId, started: false, totalFiles: 0, error: 'Window not found' };
    }

    try {
      // Start async search with progress callbacks
      const totalFiles = await searchService.startSearchInFiles(
        request,
        // Progress callback
        (progress) => {
          win.webContents.send('search:progress', progress);
        },
        // Complete callback
        (results) => {
          win.webContents.send('search:complete', results);
        },
        // Error callback
        (error) => {
          win.webContents.send('search:error', error);
        }
      );

      return { searchId: request.searchId, started: true, totalFiles };
    } catch (error) {
      return { searchId: request.searchId, started: false, totalFiles: 0, error: error.message };
    }
  });

  // Cancel search
  ipcMain.handle('search:cancel', async (_event, request: CancelSearchRequest) => {
    const cancelled = searchService.cancelSearch(request.searchId);
    return {
      searchId: request.searchId,
      cancelled,
      message: cancelled ? 'Search cancelled' : 'Search not found or already completed'
    };
  });

  // Validate regex
  ipcMain.handle('search:validate-regex', async (_event, request: ValidateRegexRequest) => {
    const validation = searchService.validateRegex(request.pattern);
    return validation;
  });
}
```

---

## Security Considerations

### Context Isolation
- **Enabled**: `contextIsolation: true` in BrowserWindow options
- **Preload script**: Uses `contextBridge.exposeInMainWorld()` for secure API exposure
- **No direct access**: Renderer cannot access Node.js or Electron APIs directly

### Input Validation
- **Regex patterns**: Validated for syntax and dangerous constructs before execution
- **File paths**: Sanitized and validated to prevent directory traversal
- **Search queries**: Length-limited (max 1000 characters)
- **Exclude patterns**: Validated as glob patterns

### Resource Limits
- **Timeout**: 5-second timeout per file for regex matching
- **Max file size**: Skip files > 10MB (configurable)
- **Max results**: Optional limit to prevent memory exhaustion
- **Concurrent operations**: Single active search per searchId

### Error Handling
- Never expose system paths in error messages sent to renderer
- Sanitize error messages to prevent information leakage
- Log detailed errors in main process only

---

## Performance Optimizations

### Debouncing
- **Renderer-side**: 150ms debounce on search input to reduce IPC calls
- **Main process**: Batch progress events (send every 50 files or 500ms)

### Incremental Results
- **Optional**: Send `partialResults` in progress events for large searches
- **Renderer**: Display results as they arrive (streaming UX)

### Cancellation
- **Cooperative**: Check cancellation flag between file operations
- **Responsive**: Return partial results when cancelled

### Memory Management
- **Streaming**: Process files one at a time, don't load all into memory
- **Cleanup**: Clear search state when complete or cancelled
- **GC-friendly**: Release references to large result objects promptly

---

## Testing IPC Contracts

### Unit Tests
```typescript
// Test IPC handler
describe('search:in-page handler', () => {
  it('should return matches for valid query', async () => {
    const request = {
      searchId: 'test-123',
      filePath: '/path/to/test.md',
      query: 'test',
      caseSensitive: false,
      wholeWord: false,
      useRegex: false
    };

    const response = await ipcMain.handleOnce('search:in-page', request);

    expect(response.searchId).toBe('test-123');
    expect(response.totalMatches).toBeGreaterThan(0);
    expect(response.matches).toHaveLength(response.totalMatches);
  });
});
```

### Integration Tests
```typescript
// Test full IPC round-trip
describe('Search IPC integration', () => {
  it('should search and return results via IPC', async () => {
    const result = await window.api.search.inPage({
      searchId: 'integration-test',
      filePath: testFilePath,
      query: 'TODO',
      caseSensitive: false,
      wholeWord: false,
      useRegex: false
    });

    expect(result.totalMatches).toBeGreaterThan(0);
  });
});
```

---

## References

- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [contextBridge API](https://www.electronjs.org/docs/latest/api/context-bridge)
- Implementation: [src/main/search-service.ts](../../../src/main/search-service.ts)
- Implementation: [src/renderer/stores/search.ts](../../../src/renderer/stores/search.ts)
