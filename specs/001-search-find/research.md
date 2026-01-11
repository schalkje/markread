# Research Findings: Search and Find

**Branch**: 001-search-find | **Date**: 2026-01-09 | **Status**: Complete

## Overview

This document captures research findings and technical decisions made during the planning phase for the search and find feature in MarkRead (Electron + TypeScript + React application).

## Clarifications Resolved

### 1. Regex Pattern Safety

**Question**: How should the system prevent malicious or accidental regex patterns that could freeze the UI or consume excessive resources?

**Decision**: Implement two-layer protection:
1. **Pattern Validation** - Block known dangerous regex constructs before execution
2. **Timeout Fallback** - 5-second timeout as safety net

**Rationale**:
- ReDoS (Regular Expression Denial of Service) attacks can freeze applications
- Users may accidentally create catastrophic backtracking patterns
- Two layers provide defense-in-depth

**Alternatives Considered**:
- Allow all patterns (rejected: too risky for user-provided input)
- Timeout only (rejected: allows UI freeze for up to 5 seconds)
- Restrict to literal strings only (rejected: users need regex for advanced searches)

**Implementation Approach**:
```typescript
// Example dangerous patterns to block:
// - Excessive nesting: (a+)+, (a*)*
// - Quantifier stacking: a**+, b++*
// - Unbounded alternation: (a|b|c|...) with many alternatives

const DANGEROUS_PATTERNS = [
  /(\([\w\*\+]+\)[\*\+])+/,  // Nested quantifiers
  /[\*\+]{2,}/,              // Quantifier stacking
  // ... more patterns
];
```

**References**:
- [OWASP: Regular expression Denial of Service](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
- [Node.js regex timeout discussions](https://github.com/nodejs/node/issues/8440)

---

### 2. File Type Filtering Strategy

**Question**: Should the system filter by file type or search all files indiscriminately during multi-file search?

**Decision**: Default to markdown files (.md, .markdown) with UI option to expand to "All Text Files"

**Rationale**:
- MarkRead is a markdown viewer - primary use case is markdown documentation
- Filtering reduces noise from config files, build artifacts, dependencies
- Default markdown-only improves performance (fewer files to scan)
- "All Text Files" option provides flexibility when needed

**Alternatives Considered**:
- Search all files (rejected: too much noise, slower performance)
- Markdown only with no option to expand (rejected: too restrictive)
- Configurable file type list (rejected: over-engineering for initial release)

**Implementation Approach**:
```typescript
const FILE_TYPE_FILTERS = {
  MARKDOWN_ONLY: ['.md', '.markdown'],
  ALL_TEXT: ['.md', '.markdown', '.txt', '.json', '.xml', '.yml', '.yaml', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.scss']
};
```

---

### 3. Text File Definition

**Question**: Which specific file types should qualify as "text files" when users expand beyond markdown?

**Decision**: Keep "All Text Files" definition flexible - delegate to implementation discretion based on platform capabilities

**Rationale**:
- Different platforms have different capabilities for detecting text vs binary
- Node.js provides `fs.stat()` but detection is heuristic-based
- Common text extensions cover majority of use cases
- Binary file detection can use simple heuristics (null bytes, encoding checks)

**Alternatives Considered**:
- Define exact list in specification (rejected: limits future flexibility)
- Use MIME type detection (rejected: adds dependency, not always accurate)
- Read first N bytes to detect binary (selected: good balance)

**Implementation Approach**:
```typescript
async function isTextFile(filePath: string): Promise<boolean> {
  // Common text file extensions
  const textExtensions = ['.txt', '.md', '.markdown', '.json', '.xml', ...];

  const ext = path.extname(filePath).toLowerCase();
  if (textExtensions.includes(ext)) return true;

  // For unknown extensions, check first 512 bytes for null bytes
  const buffer = await fs.readFile(filePath, { encoding: null, flag: 'r' });
  const sample = buffer.slice(0, 512);
  return !sample.includes(0); // Binary files typically have null bytes
}
```

**References**:
- [Node.js fs module documentation](https://nodejs.org/api/fs.html)
- [File type detection strategies](https://stackoverflow.com/questions/29043050/how-to-check-if-file-is-binary-or-text-in-node-js)

---

### 4. Search Debouncing Delay

**Question**: What specific debouncing delay should be used for real-time search updates to balance responsiveness and performance?

**Decision**: 150ms debounce delay

**Rationale**:
- Human perception threshold for "instant" is ~100-200ms
- 150ms is well within "real-time" feel
- Reduces search operations by ~60% compared to per-keystroke execution
- Balances responsiveness (faster than 200ms) with performance (not every keystroke)

**Alternatives Considered**:
- 100ms (rejected: too aggressive, still high search frequency)
- 200ms (rejected: perceptible lag for fast typists)
- 300ms (rejected: feels sluggish, doesn't feel real-time)

**Implementation Approach**:
```typescript
import { debounce } from 'lodash-es';

const performSearch = debounce((query: string) => {
  // Execute search
}, 150);
```

**References**:
- [Debouncing and Throttling Explained](https://css-tricks.com/debouncing-throttling-explained-examples/)
- [UX Design: Response time limits](https://www.nngroup.com/articles/response-times-3-important-limits/)

---

### 5. Search History Persistence

**Question**: Should search queries be saved and recalled across sessions?

**Decision**: Session-only history (no persistence across app restarts)

**Rationale**:
- Simpler implementation (in-memory only, no disk I/O)
- No privacy concerns about search terms being persisted
- No need for cleanup logic (history cleared on close)
- Still provides value during active session (most common use case)

**Alternatives Considered**:
- Persistent history with electron-store (rejected: complexity, privacy concerns)
- No history at all (rejected: users benefit from recalling recent searches)
- Encrypted persistent history (rejected: over-engineering for v1)

**Implementation Approach**:
```typescript
// Zustand store (in-memory, cleared on app close)
interface SearchStore {
  history: SearchHistoryEntry[];
  maxHistorySize: 200;
  addToHistory: (entry: SearchHistoryEntry) => void;
  clearHistory: () => void;
}
```

**Data Retention**: Maximum 200 entries per session, FIFO eviction when limit reached.

---

## Technology Research

### Electron + React Best Practices

**Finding**: Electron's architecture requires careful separation between main process (Node.js) and renderer process (Chromium + React)

**Best Practices for Search Feature**:
1. **Main Process** (search-service.ts)
   - File system operations (reading files, directory traversal)
   - Heavy computation (regex matching across files)
   - Progress tracking for long-running searches

2. **Renderer Process** (React components)
   - UI rendering (search bar, results panel)
   - User input handling (debouncing)
   - State management (Zustand store)

3. **IPC Communication** (preload + handlers)
   - Secure bridge via context isolation
   - Event-based progress updates for async operations
   - Typed contracts for type safety

**Security Considerations**:
- Enable `contextIsolation` (already enabled in MarkRead)
- Use preload scripts to expose controlled API surface
- Validate all user input before passing to main process

**References**:
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc)

---

### React State Management with Zustand

**Finding**: MarkRead already uses Zustand for state management - consistent choice for search state

**Best Practices**:
```typescript
// Separate concerns: UI state vs data
interface SearchStore {
  // UI State
  isSearchBarVisible: boolean;
  isFindInFilesVisible: boolean;

  // Search Data
  currentQuery: string;
  searchOptions: SearchOptions;
  results: SearchResult[];

  // History
  history: SearchHistoryEntry[];

  // Actions
  setQuery: (query: string) => void;
  performSearch: () => void;
  clearResults: () => void;
}
```

**Why Zustand**:
- Minimal boilerplate compared to Redux
- Good TypeScript support
- No provider wrapping needed
- Consistent with existing MarkRead architecture

**References**:
- [Zustand documentation](https://github.com/pmndrs/zustand)
- Existing MarkRead stores: settings.ts, panes.ts

---

### Text Highlighting in React

**Finding**: Multiple strategies for highlighting search matches in markdown rendered content

**Selected Approach**: DOM manipulation with `mark` elements

**Implementation**:
```typescript
function highlightMatches(text: string, query: string, options: SearchOptions): string {
  const regex = buildSearchRegex(query, options);
  return text.replace(regex, (match) => `<mark class="search-highlight">${match}</mark>`);
}
```

**CSS Styling**:
```css
.search-highlight {
  background-color: #ffff00; /* Yellow background */
  color: inherit;
}

.search-highlight.current {
  background-color: #ff9632; /* Orange for current match */
}
```

**Alternatives Considered**:
- React component wrapping (rejected: performance issues with many matches)
- Canvas-based highlighting (rejected: accessibility concerns)
- Text selection API (rejected: conflicts with user text selection)

**References**:
- [MDN: mark element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/mark)
- [VS Code search highlighting implementation](https://github.com/microsoft/vscode/blob/main/src/vs/editor/contrib/find/browser/findWidget.ts)

---

### Scrollbar Markers Implementation

**Finding**: Custom scrollbar implementation required for visual search result markers

**Approach**: Absolute-positioned overlays on custom scrollbar

**Implementation**:
```typescript
interface ScrollbarMarker {
  position: number; // 0-100 percentage from top
  type: 'search-match' | 'current-match';
}

// Calculate marker positions
function calculateMarkerPositions(matches: SearchMatch[], documentHeight: number): ScrollbarMarker[] {
  return matches.map(match => ({
    position: (match.lineNumber / documentHeight) * 100,
    type: 'search-match'
  }));
}
```

**CSS**:
```css
.scrollbar-marker {
  position: absolute;
  right: 0;
  width: 4px;
  height: 3px;
  background-color: #ffff00;
  cursor: pointer;
}
```

**References**:
- Existing: src/renderer/components/scrollbar/CustomScrollbar.tsx
- [Chrome DevTools scrollbar markers](https://developer.chrome.com/blog/find-in-devtools/)

---

### Performance Optimization Strategies

**Finding**: Large-scale searches require optimization to maintain responsiveness

**Strategies Implemented**:

1. **Debouncing** (150ms)
   - Reduces search frequency during typing
   - Implemented with lodash `debounce`

2. **Web Workers** (for multi-file search)
   - Move heavy regex matching off main thread
   - Alternative: Main process handles file scanning (selected for Electron)

3. **Lazy Loading Results**
   - Render first 50 results immediately
   - Virtual scrolling for remaining results
   - Use `@tanstack/react-virtual` (already in dependencies)

4. **Result Limit**
   - Cap at 1,000 highlights per document
   - Show warning: "Too many matches, showing first 1,000"

5. **Async File Operations**
   - Use `fs.promises` for non-blocking I/O
   - Stream large files instead of reading entirely into memory

**Performance Targets**:
- In-document search: < 200ms for 10,000 line documents
- Multi-file search: < 10 seconds for 1,000 markdown files
- UI responsiveness: 60fps during search (16ms frame budget)

**References**:
- [React Virtual](https://tanstack.com/virtual/latest)
- [Node.js async file operations](https://nodejs.org/api/fs.html#promises-api)

---

## Design Patterns

### Search State Machine

**Pattern**: Finite state machine for search lifecycle

**States**:
- `idle` - No active search
- `searching` - Search in progress
- `completed` - Results available
- `cancelled` - User cancelled search
- `error` - Search failed

**Transitions**:
```
idle -> searching (user enters query)
searching -> completed (search finishes successfully)
searching -> cancelled (user clicks cancel)
searching -> error (search fails)
completed|cancelled|error -> idle (user clears search)
```

**Implementation**: Zustand store with state field

---

### IPC Request/Response Pattern

**Pattern**: Structured communication between renderer and main process

**Request Pattern**:
```typescript
// Renderer sends request
const results = await window.api.search.inFiles({
  query: 'TODO',
  options: { caseSensitive: false, useRegex: false },
  scope: { repository: 'current', branch: 'main' }
});
```

**Progress Pattern**:
```typescript
// Main process sends progress events
ipcRenderer.on('search:progress', (event, progress) => {
  // Update UI: "Searching... 245/1000 files"
});
```

**Cancellation Pattern**:
```typescript
// Renderer sends cancel request
window.api.search.cancel(searchId);
```

---

## Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Regex Safety | Validation + Timeout | Defense-in-depth against ReDoS |
| File Type Filter | Markdown-first with opt-in expansion | Optimize for common case, provide flexibility |
| Text File Detection | Heuristic-based (null byte check) | Balance accuracy with simplicity |
| Debounce Delay | 150ms | Sweet spot for responsiveness vs performance |
| Search History | Session-only (in-memory) | Simpler, no privacy concerns |
| State Management | Zustand | Consistent with existing architecture |
| Text Highlighting | DOM manipulation with `<mark>` | Performance and accessibility balance |
| Scrollbar Markers | Absolute-positioned overlays | Visual clarity, clickable navigation |
| Multi-file Search Process | Main process (Node.js) | Leverage file system access, avoid worker overhead |
| Result Rendering | Virtual scrolling | Handle large result sets efficiently |

---

## Open Questions / Future Considerations

### Not Addressed in V1

1. **Search across Git history** - Search in previous commits
   - Requires Git integration beyond current file system access
   - Potential future enhancement (P3 in spec)

2. **Replace functionality** - Find and replace text
   - Out of scope for read-only viewer
   - Relevant if editing capability added later

3. **Fuzzy search** - Approximate matching (typo tolerance)
   - Adds complexity, not requested in requirements
   - Libraries available if needed: fuse.js, fuzzy

4. **Search result persistence** - Save search results to file
   - No user request for this feature
   - Can add export function if users request it

5. **Search analytics** - Track most-searched terms
   - Privacy considerations
   - Not valuable for solo markdown viewer

---

## References

### Documentation
- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [React Documentation](https://react.dev/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### Libraries Used
- markdown-it 14.1.0 - Markdown parsing
- highlight.js 11.11.1 - Syntax highlighting (already integrated)
- @tanstack/react-virtual 3.0.0 - Virtual scrolling (already in deps)

### Security
- [OWASP ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)

### UX Research
- [Nielsen Norman Group: Response Times](https://www.nngroup.com/articles/response-times-3-important-limits/)
- [Google Web Fundamentals: Performance](https://web.dev/performance/)
