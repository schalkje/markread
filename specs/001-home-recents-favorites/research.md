# Research: Home Page - Recents and Favorites

**Feature**: 001-home-recents-favorites
**Date**: 2026-01-05
**Status**: Complete

## Research Questions

### 1. Storage Strategy for Recents and Favorites

**Question**: What is the best approach for persisting recents and favorites data across application sessions?

**Options Evaluated**:

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| `electron-store` | Already used in app, JSON-based, cross-platform, simple API | Synchronous I/O (mitigated with small dataset) | ✓ **SELECTED** |
| SQLite (better-sqlite3) | Fast queries, relational data | Overkill for simple key-value storage, adds dependency | Rejected |
| File System (JSON files) | Simple, no dependencies | Must implement locking, error handling, migrations | Rejected |
| IndexedDB (renderer) | Asynchronous, web standard | Only accessible from renderer, complex API | Rejected |

**Decision**: Use `electron-store` (v11.0.2, already installed)

**Rationale**:
- Already used for application settings (precedent in codebase)
- Built-in support for JSON serialization
- Cross-platform path handling
- Atomic writes prevent corruption
- Schema versioning support
- Synchronous I/O acceptable for small dataset (60 items max)

**Implementation Notes**:
- Create separate store instances for recents and favorites
- Use schema validation to ensure data integrity
- Store location: `{appData}/markread/recents.json` and `{appData}/markread/favorites.json`
- Implement migrations for future schema changes

---

### 2. State Management Pattern

**Question**: How should we manage recents/favorites state in the React renderer process?

**Options Evaluated**:

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Zustand store | Already used (git-store, folders, tabs), simple API, TypeScript support | N/A | ✓ **SELECTED** |
| React Context + hooks | No dependencies | Boilerplate for async state, re-render optimization | Rejected |
| Redux Toolkit | Mature ecosystem, dev tools | Overkill, not used in app | Rejected |
| Local component state | Simple | Doesn't scale, props drilling | Rejected |

**Decision**: Zustand store with IPC service pattern

**Rationale**:
- Consistent with existing state management (`src/renderer/stores/git-store.ts`, `src/renderer/stores/folders.ts`)
- Minimal boilerplate
- Built-in TypeScript support
- Easy testing (pure functions)
- Integrates cleanly with IPC async calls

**Implementation Pattern** (based on existing `git-store.ts`):
```typescript
// src/renderer/stores/recents-favorites.ts
import { create } from 'zustand';
import { recentsFavoritesService } from '../services/recents-favorites-service';

interface RecentsFavoritesState {
  recents: Record<ItemType, RecentItem[]>;
  favorites: Record<ItemType, Favorite[]>;
  loading: boolean;

  // Actions
  loadAll: () => Promise<void>;
  addRecent: (item: RecentItem) => Promise<void>;
  removeRecent: (path: string, type: ItemType) => Promise<void>;
  addFavorite: (item: Favorite) => Promise<void>;
  removeFavorite: (path: string, type: ItemType) => Promise<void>;
  isFavorite: (path: string, type: ItemType) => boolean;
}
```

---

### 3. UI Component Architecture

**Question**: How should we structure the home page components for recents and favorites?

**Research Findings**:
- Existing `src/renderer/components/Home.tsx` is a placeholder with basic layout
- Folder selector pattern found in `src/renderer/components/FolderOpener.tsx` and `src/renderer/components/sidebar/FolderSwitcher.tsx`
- Component composition pattern used throughout (e.g., `sidebar/`, `settings/`, `git/`)

**Decision**: Create dedicated `home/` component subdirectory with composition-based architecture

**Component Hierarchy**:
```
Home.tsx (modified)
└── home/
    ├── RecentsSection.tsx       # Container for all recent items
    │   └── CategoryColumn.tsx   # Column for Files/Folders/Repos
    │       └── ItemCard.tsx     # Individual item display
    ├── FavoritesSection.tsx     # Container for all favorites
    │   └── CategoryColumn.tsx   # Reused from above
    │       └── ItemCard.tsx     # Reused from above
    └── hooks/
        └── useRecentsFavorites.ts  # Custom hook for state integration
```

**Rationale**:
- Follows existing pattern (sidebar/, settings/, git/)
- Reusable ItemCard and CategoryColumn components
- Clear separation of concerns
- Easy to test individual components
- Matches folder selector visual design

**Styling Strategy**:
- Reuse CSS patterns from `FolderSwitcher.tsx` for consistent look
- Use existing theme variables for colors
- Implement responsive column layout (CSS Grid or Flexbox)

---

### 4. Item Uniqueness and Path Handling

**Question**: How should we uniquely identify items across different platforms (Windows, Mac, Linux)?

**Research Findings**:
- Windows uses backslashes (`C:\Users\...`)
- Mac/Linux use forward slashes (`/home/...`)
- Git repositories may use URLs (`https://github.com/...`) or local paths
- Electron provides `path` module for normalization

**Decision**: Use full absolute path with normalization via Node.js `path.normalize()`

**Implementation Strategy**:
```typescript
import * as path from 'path';

function normalizeItemPath(itemPath: string): string {
  // Normalize separators and resolve relative paths
  return path.normalize(path.resolve(itemPath));
}

function getDisplayName(itemPath: string): string {
  // For files/folders: extract basename
  // For repos: extract repo name from URL or path
  return path.basename(itemPath);
}
```

**Rationale**:
- Cross-platform consistency
- Handles relative paths, `.`, `..`
- Built-in Node.js API (no dependencies)
- Consistent with existing file handling in app

**Edge Cases**:
- Network paths (UNC): `\\server\share` - normalize preserves these
- Case sensitivity: Windows case-insensitive, Mac/Linux case-sensitive - store as-is, compare with `path.normalize()`
- Symbolic links: Resolve to actual path for uniqueness

---

### 5. Data Freshness and Sync Strategy

**Question**: When and how should recents/favorites data be loaded and synchronized?

**Decision**: Load on app startup, sync on file/folder/repo open events

**Loading Strategy**:
1. **App Startup**: Load all recents/favorites during renderer initialization
2. **Open Events**: Hook into existing file/folder/repo open handlers to call `addRecent()`
3. **IPC Events**: Listen for `recents:updated` and `favorites:updated` events to re-sync

**Implementation Hooks** (based on codebase exploration):
```typescript
// In file open handler (src/renderer/services/...)
async function openFile(filePath: string) {
  // Existing open logic...

  // NEW: Track in recents
  await recentsFavoritesService.addRecent({
    path: filePath,
    type: 'file',
    lastOpened: Date.now(),
    displayName: path.basename(filePath)
  });
}
```

**Rationale**:
- Minimal latency impact (async updates)
- Always up-to-date data
- Leverages existing event infrastructure
- No polling required

---

### 6. LRU Eviction Strategy for Recents

**Question**: How should we handle eviction when recents exceed 10 items per category?

**Decision**: Implement Least Recently Used (LRU) eviction based on `lastOpened` timestamp

**Algorithm**:
```typescript
function addRecentWithEviction(item: RecentItem, category: ItemType) {
  const recents = getRecents(category);

  // Remove existing if updating
  const filtered = recents.filter(r => r.path !== item.path);

  // Add to front
  const updated = [item, ...filtered];

  // Evict oldest if limit exceeded
  const limited = updated.slice(0, 10);

  saveRecents(category, limited);
}
```

**Rationale**:
- Simple to implement
- Predictable behavior (oldest goes first)
- Efficient (array slice operation)
- No complex data structures needed

**Alternatives Considered**:
- LFU (Least Frequently Used): Requires tracking access count - overkill
- FIFO: Not user-friendly (recent items may be evicted)

---

### 7. Error Handling and Unavailable Items

**Question**: How should we handle items that no longer exist (deleted, moved, network unavailable)?

**Decision**: Lazy cleanup on access attempt (clarified in spec)

**Implementation Strategy**:
```typescript
async function handleItemClick(item: RecentItem | Favorite) {
  try {
    // Attempt to open item
    await openItem(item.path, item.type);
  } catch (error) {
    // If file not found, remove from list
    if (error.code === 'ENOENT' || error.code === 'ENOTFOUND') {
      showToast('Item no longer exists');
      await removeItem(item.path, item.type);
    } else {
      // Other errors (permissions, etc.)
      showToast('Could not open item');
    }
  }
}
```

**Rationale**:
- No expensive validation on startup
- User-friendly (items don't disappear unexpectedly)
- Automatic cleanup when encountered
- Matches user expectation (try to open, fail gracefully)

**Toast Integration**:
- Reuse existing `src/renderer/components/common/Toast.tsx`
- Display error message with option to dismiss
- Auto-dismiss after 3 seconds

---

### 8. Performance Optimization

**Question**: What optimizations ensure we meet the 500ms home page load time?

**Research Findings**:
- Current Home.tsx is lightweight (placeholder content)
- electron-store is synchronous but fast for small data
- React rendering of 60 items is negligible

**Optimization Strategies**:
1. **Lazy Load UI**: Load recents/favorites asynchronously after initial render
2. **Virtualization**: Not needed (max 20 items per column)
3. **Memoization**: Use `React.memo()` for ItemCard to prevent unnecessary re-renders
4. **Batching**: Batch IPC calls (single `loadAll()` instead of per-category calls)

**Performance Budget**:
- Store read: <10ms (60 items × 200 bytes)
- IPC round-trip: <50ms
- React render: <100ms (60 ItemCard components)
- Layout/paint: <100ms
- **Total: ~260ms** (well under 500ms target)

**Monitoring**:
- Add performance marks: `performance.mark('home-load-start')`, `performance.mark('home-load-end')`
- Log metrics in development mode
- Add Playwright test to validate 500ms constraint

---

## Technology Stack Summary

**Selected Technologies**:
- **Storage**: electron-store v11.0.2 (already installed)
- **State Management**: Zustand v4.5.0 (already installed)
- **UI Framework**: React 18.3.1 (already installed)
- **IPC**: Electron IPC (built-in)
- **Path Handling**: Node.js `path` module (built-in)
- **Testing**: Vitest (unit), Playwright (e2e)

**New Dependencies**: None

---

## Implementation Priorities

1. **Phase 0 (Foundation)**:
   - Storage managers (RecentsManager, FavoritesManager)
   - IPC contracts and type definitions
   - Zustand store implementation

2. **Phase 1 (UI)**:
   - ItemCard and CategoryColumn components
   - RecentsSection and FavoritesSection containers
   - Home.tsx integration

3. **Phase 2 (Integration)**:
   - Hook file/folder/repo open events
   - Error handling for unavailable items
   - Empty states and loading indicators

4. **Phase 3 (Polish)**:
   - Delete (×) button for manual removal
   - Tooltips with timestamp + full path
   - Limits enforcement (10 per category)

5. **Phase 4 (Testing)**:
   - Unit tests for managers and stores
   - E2E tests for user scenarios
   - Performance validation

---

## Open Research Questions

**None** - All technical questions resolved.

---

## References

**Codebase Patterns**:
- Zustand store pattern: `src/renderer/stores/git-store.ts`
- electron-store usage: `src/main/services/storage/cache-manager.ts`
- IPC pattern: `src/main/ipc/git-handlers.ts` + `src/renderer/services/git-service.ts`
- Component composition: `src/renderer/components/sidebar/`, `src/renderer/components/settings/`
- Folder selector UI: `src/renderer/components/FolderOpener.tsx`, `src/renderer/components/sidebar/FolderSwitcher.tsx`

**External Documentation**:
- electron-store: https://github.com/sindresorhus/electron-store
- Zustand: https://github.com/pmndrs/zustand
- Electron IPC: https://www.electronjs.org/docs/latest/tutorial/ipc

---

**Sign-off**: ✓ Research Complete | Ready for Phase 1 (Design & Contracts)
