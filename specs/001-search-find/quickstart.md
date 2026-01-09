# Quickstart Guide: Search and Find Feature

**Branch**: 001-search-find | **Date**: 2026-01-09 | **Status**: Incomplete - Integration Required

## Overview

This guide helps developers understand, test, and complete the search and find feature for MarkRead. The feature has components built but needs UI integration.

## Prerequisites

### Required Tools
- **Node.js**: v18.x or later
- **npm**: v9.x or later
- **Git**: For version control
- **VS Code**: Recommended IDE (or any TypeScript-capable editor)

### Platform
- **Primary**: Windows 10 or later
- **Cross-platform**: macOS, Linux (Electron supports all)

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/schalkje/markread.git

# Navigate to the project
cd markread

# Checkout the search feature branch
git checkout 001-search-find

# Install dependencies
npm install
```

### 2. Development Environment

```bash
# Start development server with hot reload
npm run dev

# This starts:
# - Electron main process (Node.js backend)
# - Vite dev server (React renderer)
# - Hot Module Replacement (HMR) for fast iteration
```

### 3. Build and Test

```bash
# Type checking (no output = success)
npm run type-check

# Lint code
npm run lint

# Run unit tests
npm test

# Run unit tests in watch mode
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests (requires built app)
npm run build
npm run test:e2e

# Build for production
npm run build

# Package as distributable
npm run package
```

## Project Structure

### Search Feature Files

```
src/
├── main/                              # Electron main process (Node.js)
│   ├── search-service.ts             # Backend search engine (EXISTS ✅)
│   └── ipc/
│       └── search-handlers.ts        # IPC handlers (NEEDS CREATION ❌)
│
├── renderer/                          # React renderer process
│   ├── components/
│   │   ├── search/
│   │   │   ├── FindBar.tsx           # In-document search UI (EXISTS ✅)
│   │   │   ├── FindBar.css           # Styling (EXISTS ✅)
│   │   │   ├── SearchResults.tsx     # Multi-file results panel (EXISTS ✅)
│   │   │   └── SearchResults.css     # Styling (EXISTS ✅)
│   │   ├── AppLayout.tsx             # NEEDS INTEGRATION ❌
│   │   ├── markdown/
│   │   │   └── MarkdownViewer.tsx    # NEEDS HIGHLIGHTING ❌
│   │   └── scrollbar/
│   │       └── CustomScrollbar.tsx   # NEEDS MARKERS ❌
│   │
│   ├── stores/
│   │   └── search.ts                 # Zustand state management (EXISTS ✅)
│   │
│   └── services/
│       ├── command-service.ts        # Commands registered (EXISTS ✅)
│       └── keyboard-handler.ts       # Shortcuts registered (EXISTS ✅)
│
├── preload/
│   └── search-api.ts                 # IPC bridge (NEEDS CREATION ❌)
│
└── shared/
    └── types/
        └── search.ts                  # Shared TypeScript types (NEEDS CREATION ❌)

specs/001-search-find/                 # Feature documentation
├── spec.md                           # Requirements (COMPLETE ✅)
├── plan.md                           # Implementation plan (COMPLETE ✅)
├── research.md                       # Technical research (COMPLETE ✅)
├── data-model.md                     # Data entities (COMPLETE ✅)
├── quickstart.md                     # This file
└── contracts/
    └── search-ipc.md                 # IPC contracts (COMPLETE ✅)
```

## Testing the Components (Standalone)

### Test FindBar Component

Since FindBar isn't integrated, you can test it in isolation:

```bash
# 1. Create a test file: src/renderer/components/search/FindBar.test.tsx
# 2. Run tests
npm run test:unit -- FindBar
```

Example test setup:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { FindBar } from './FindBar';

test('FindBar renders with search input', () => {
  const handleSearch = jest.fn();
  render(<FindBar isVisible={true} onSearch={handleSearch} />);

  const input = screen.getByPlaceholderText(/find/i);
  expect(input).toBeInTheDocument();
});
```

### Test SearchResults Component

```bash
npm run test:unit -- SearchResults
```

### Test Search Store

```bash
npm run test:unit -- stores/search
```

## Understanding the Architecture

### Electron Process Model

MarkRead uses Electron's multi-process architecture:

```
┌─────────────────────────────────────┐
│      Main Process (Node.js)         │
│                                     │
│  - File system access               │
│  - Search across files              │
│  - Window management                │
│  - Native OS integration            │
└──────────────┬──────────────────────┘
               │
               │ IPC (Inter-Process Communication)
               │
┌──────────────▼──────────────────────┐
│   Renderer Process (Chromium+React) │
│                                     │
│  - UI rendering                     │
│  - User interactions                │
│  - Search UI components             │
│  - State management (Zustand)       │
└─────────────────────────────────────┘
```

### Data Flow for Search

#### In-Document Search (CTRL+F):
```
1. User presses CTRL+F
   ↓
2. Keyboard handler detects shortcut
   ↓
3. AppLayout sets isSearchBarVisible = true
   ↓
4. FindBar component renders
   ↓
5. User types search query (debounced 150ms)
   ↓
6. Search executed on document content (renderer-side)
   ↓
7. MarkdownViewer highlights matches
   ↓
8. CustomScrollbar shows markers
```

#### Multi-File Search (SHIFT+CTRL+F):
```
1. User presses SHIFT+CTRL+F
   ↓
2. Keyboard handler detects shortcut
   ↓
3. AppLayout toggles isFindInFilesVisible = true
   ↓
4. SearchResults panel replaces FileTree
   ↓
5. User enters query and clicks Search
   ↓
6. IPC: Renderer → Main (search request)
   ↓
7. Main process scans files asynchronously
   ↓
8. IPC: Main → Renderer (progress events)
   ↓
9. SearchResults updates in real-time
   ↓
10. User clicks result → Open file with highlight
```

## Current Implementation Status

### ✅ What Works (Standalone Components)

The following components exist and work when tested in isolation:

1. **FindBar Component** - In-document search UI with:
   - Search input with debouncing
   - Case sensitivity toggle
   - Regex mode toggle
   - Next/Previous navigation buttons
   - Result counter ("N of M")

2. **SearchResults Component** - Multi-file search panel with:
   - Search input and options
   - File grouping (folder > file)
   - Match preview snippets
   - Click to open file

3. **Search Service** - Backend search engine with:
   - File scanning
   - Text matching (plain text and regex)
   - Progress tracking
   - Cancellation support

4. **Search Store** - State management with:
   - Search options
   - Session-based history
   - Active search tracking

### ❌ What's Missing (Integration)

The components aren't connected to the main application:

1. **FindBar not rendered** - AppLayout doesn't import or display FindBar
2. **SearchResults not rendered** - AppLayout doesn't import or display SearchResults
3. **No event handlers** - Keyboard shortcuts trigger events but nothing responds
4. **No highlighting** - MarkdownViewer doesn't highlight search matches
5. **No scrollbar markers** - CustomScrollbar doesn't show match positions
6. **No IPC wiring** - Renderer and main process don't communicate for multi-file search

## Integration Tasks

To complete the feature, you need to integrate the components. Here's the order:

### Phase A: In-Document Search (Highest Priority)

**Files to modify**:
- `src/renderer/components/AppLayout.tsx`
- `src/renderer/components/markdown/MarkdownViewer.tsx`

**Steps**:
1. Import FindBar component in AppLayout
2. Add state: `const [isSearchBarVisible, setSearchBarVisible] = useState(false)`
3. Add event listener for CTRL+F shortcut
4. Render FindBar conditionally: `{isSearchBarVisible && <FindBar ... />}`
5. Integrate highlighting in MarkdownViewer (wrap matches in `<mark>` tags)

### Phase B: Visual Navigation

**Files to modify**:
- `src/renderer/components/scrollbar/CustomScrollbar.tsx`

**Steps**:
1. Accept `searchMarkers` prop
2. Render markers as absolute-positioned overlays
3. Handle marker clicks to scroll to position

### Phase C: Multi-File Search

**Files to modify**:
- `src/renderer/components/AppLayout.tsx`
- `src/preload/search-api.ts` (create)
- `src/main/ipc/search-handlers.ts` (create)
- `src/shared/types/search.ts` (create)

**Steps**:
1. Import SearchResults component in AppLayout
2. Add state: `const [isFindInFilesVisible, setFindInFilesVisible] = useState(false)`
3. Add event listener for 'menu:find-in-files'
4. Toggle between FileTree and SearchResults in sidebar
5. Create IPC preload API (see [contracts/search-ipc.md](./contracts/search-ipc.md))
6. Create IPC handlers in main process
7. Wire up search result clicks to open files

## Debugging Tips

### Enable Electron DevTools

Development mode automatically opens DevTools. For additional debugging:

```typescript
// In src/main/index.ts
mainWindow.webContents.openDevTools({ mode: 'detach' });
```

### Log Search Events

Add logging to track search flow:

```typescript
// In search store
startSearch: (query: string) => {
  console.log('[Search] Starting search:', { query, options: get().searchOptions });
  // ... search logic
}
```

### Test IPC Communication

```typescript
// Renderer side
console.log('Sending search request:', request);
const response = await window.api.search.inFiles(request);
console.log('Received response:', response);

// Main side (in handler)
ipcMain.handle('search:in-files', (event, request) => {
  console.log('[Main] Search request received:', request);
  // ... handle
});
```

### Monitor State Changes

Use React DevTools to inspect Zustand store state:

```bash
# Install React DevTools extension in Electron
npm install --save-dev electron-devtools-installer
```

## Performance Profiling

### Measure Search Performance

```typescript
// In search-service.ts
const startTime = performance.now();
// ... perform search
const executionTime = performance.now() - startTime;
console.log(`Search completed in ${executionTime}ms`);
```

### React Component Performance

Use React DevTools Profiler to identify slow renders:

1. Open React DevTools
2. Go to "Profiler" tab
3. Click record
4. Perform search operation
5. Stop recording and analyze flame graph

## Common Issues

### Issue: "window.api is undefined"

**Cause**: Preload script not loaded correctly

**Solution**: Check `src/main/index.ts` window configuration:
```typescript
const mainWindow = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false
  }
});
```

### Issue: Search results don't update

**Cause**: State not triggering re-render

**Solution**: Verify Zustand store updates are immutable:
```typescript
// ❌ Wrong - mutates state
set({ results: state.results.push(newResult) });

// ✅ Correct - creates new array
set({ results: [...state.results, newResult] });
```

### Issue: CTRL+F shortcut not working

**Cause**: Keyboard handler not registered or another handler capturing the event

**Solution**: Check registration in AppLayout:
```typescript
useEffect(() => {
  registerSearchShortcuts({
    onFind: () => setSearchBarVisible(true)
  });
  return () => unregisterSearchShortcuts();
}, []);
```

## Resources

### Documentation
- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [React Documentation](https://react.dev/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Vite Documentation](https://vitejs.dev/)

### Project-Specific Docs
- [Feature Specification](./spec.md) - User stories and requirements
- [Implementation Plan](./plan.md) - Technical approach and status
- [Data Model](./data-model.md) - Entities and state management
- [IPC Contracts](./contracts/search-ipc.md) - API between renderer and main
- [Research Findings](./research.md) - Technical decisions and rationale

### Related Code
- Existing keyboard shortcuts: `src/renderer/services/keyboard-handler.ts`
- Command palette: `src/renderer/services/command-service.ts`
- Settings panel: `src/renderer/components/settings/SearchPanel.tsx`

## Next Steps

1. **Review existing components**: Familiarize yourself with FindBar and SearchResults
2. **Start with AppLayout integration**: Add FindBar to the UI first
3. **Test incrementally**: Verify each integration step works before moving to the next
4. **Run `/speckit.tasks`**: Generate detailed task breakdown for systematic implementation
5. **Commit frequently**: Make small, focused commits for each integration step

## Getting Help

- **Feature questions**: Review [spec.md](./spec.md) for requirements clarification
- **Architecture questions**: See [plan.md](./plan.md) for design decisions
- **IPC questions**: Consult [contracts/search-ipc.md](./contracts/search-ipc.md)
- **Codebase questions**: Use Grep/Read tools to explore existing patterns

---

**Status Summary**: Components are built ✅ | Integration pending ❌ | Ready for implementation 🚀
