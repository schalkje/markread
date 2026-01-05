# Data Model: Home Page - Recents and Favorites

**Feature**: 001-home-recents-favorites
**Date**: 2026-01-05
**Status**: Complete

## Overview

This document defines the data structures, storage schemas, and state management patterns for the recents and favorites feature. The model follows Electron's process separation architecture with persistent storage in the main process and reactive state management in the renderer process.

---

## Core Entities

### 1. ItemType (Enum)

Categorizes items into three distinct types for organization and display.

```typescript
/**
 * Type of item that can be tracked in recents or favorites
 */
export enum ItemType {
  FILE = 'file',
  FOLDER = 'folder',
  REPO = 'repo'
}
```

**Usage**:
- Storage partitioning (separate lists per type)
- UI column organization
- Icon selection and display logic

---

### 2. RecentItem (Interface)

Represents a recently opened item with temporal metadata.

```typescript
/**
 * Represents a recently accessed file, folder, or repository
 */
export interface RecentItem {
  /**
   * Full absolute path to the item (unique identifier)
   * Normalized using path.normalize() for cross-platform consistency
   * Examples:
   *   - File: C:\Users\john\Documents\notes.md
   *   - Folder: C:\Users\john\Projects
   *   - Repo: C:\Users\john\repos\markread
   */
  path: string;

  /**
   * Type of item (file, folder, or repo)
   */
  type: ItemType;

  /**
   * Timestamp when item was last opened (milliseconds since epoch)
   * Used for sorting (most recent first) and LRU eviction
   */
  lastOpened: number;

  /**
   * Display name extracted from path (basename)
   * Examples:
   *   - notes.md
   *   - Projects
   *   - markread
   */
  displayName: string;
}
```

**Validation Rules**:
- `path`: Non-empty string, must be absolute path
- `type`: Must be valid ItemType enum value
- `lastOpened`: Positive integer (timestamp in ms)
- `displayName`: Non-empty string

**Relationships**:
- One RecentItem per unique (path, type) combination
- Max 10 RecentItems per ItemType category
- No relationship to Favorite (independent lists)

---

### 3. Favorite (Interface)

Represents a user-bookmarked item with creation metadata.

```typescript
/**
 * Represents a user-favorited file, folder, or repository
 */
export interface Favorite {
  /**
   * Full absolute path to the item (unique identifier)
   * Normalized using path.normalize() for cross-platform consistency
   */
  path: string;

  /**
   * Type of item (file, folder, or repo)
   */
  type: ItemType;

  /**
   * Timestamp when item was added to favorites (milliseconds since epoch)
   * Used for tracking when favorites were created
   */
  dateAdded: number;

  /**
   * Display name extracted from path (basename)
   * Used for alphabetical sorting and display
   */
  displayName: string;
}
```

**Validation Rules**:
- `path`: Non-empty string, must be absolute path
- `type`: Must be valid ItemType enum value
- `dateAdded`: Positive integer (timestamp in ms)
- `displayName`: Non-empty string

**Relationships**:
- One Favorite per unique (path, type) combination
- Max 10 Favorites per ItemType category
- No relationship to RecentItem (independent lists)

**Constraints**:
- Favorites are permanent until explicitly removed by user
- Favorites appear above recents in UI (FR-008)
- If an item is both favorite and recent, only shown in favorites section (FR-011)

---

## Storage Schema

### Storage Layer: electron-store

**Store Configuration**:
```typescript
import Store from 'electron-store';

// Recents store
const recentsStore = new Store<RecentsSchema>({
  name: 'recents',
  cwd: app.getPath('userData'), // {appData}/markread/
  schema: {
    files: {
      type: 'array',
      items: { type: 'object' },
      default: []
    },
    folders: {
      type: 'array',
      items: { type: 'object' },
      default: []
    },
    repos: {
      type: 'array',
      items: { type: 'object' },
      default: []
    },
    version: {
      type: 'number',
      default: 1
    }
  }
});

// Favorites store
const favoritesStore = new Store<FavoritesSchema>({
  name: 'favorites',
  cwd: app.getPath('userData'),
  schema: {
    files: {
      type: 'array',
      items: { type: 'object' },
      default: []
    },
    folders: {
      type: 'array',
      items: { type: 'object' },
      default: []
    },
    repos: {
      type: 'array',
      items: { type: 'object' },
      default: []
    },
    version: {
      type: 'number',
      default: 1
    }
  }
});
```

**File Locations**:
- Recents: `{appData}/markread/recents.json`
- Favorites: `{appData}/markread/favorites.json`

**Storage Structure** (JSON):
```json
{
  "files": [
    {
      "path": "C:\\Users\\john\\Documents\\notes.md",
      "type": "file",
      "lastOpened": 1704499200000,
      "displayName": "notes.md"
    }
  ],
  "folders": [
    {
      "path": "C:\\Users\\john\\Projects",
      "type": "folder",
      "lastOpened": 1704492000000,
      "displayName": "Projects"
    }
  ],
  "repos": [
    {
      "path": "C:\\Users\\john\\repos\\markread",
      "type": "repo",
      "lastOpened": 1704488400000,
      "displayName": "markread"
    }
  ],
  "version": 1
}
```

---

### 4. RecentsSchema (Type)

Type definition for the recents storage structure.

```typescript
/**
 * Storage schema for recents data
 */
export interface RecentsSchema {
  files: RecentItem[];
  folders: RecentItem[];
  repos: RecentItem[];
  version: number;
}
```

**Constraints**:
- Each array limited to 10 items (enforced by RecentsManager)
- Sorted by lastOpened descending (most recent first)
- No duplicate paths within each category

---

### 5. FavoritesSchema (Type)

Type definition for the favorites storage structure.

```typescript
/**
 * Storage schema for favorites data
 */
export interface FavoritesSchema {
  files: Favorite[];
  folders: Favorite[];
  repos: Favorite[];
  version: number;
}
```

**Constraints**:
- Each array limited to 10 items (enforced by FavoritesManager)
- Sorted by displayName alphabetically (case-insensitive)
- No duplicate paths within each category

---

## State Management

### 6. RecentsFavoritesState (Zustand Store)

React state management for recents and favorites in the renderer process.

```typescript
import { create } from 'zustand';
import { recentsFavoritesService } from '../services/recents-favorites-service';

/**
 * Zustand store for managing recents and favorites state in the renderer
 */
interface RecentsFavoritesState {
  // State
  recents: Record<ItemType, RecentItem[]>;
  favorites: Record<ItemType, Favorite[]>;
  loading: boolean;
  error: string | null;

  // Actions
  loadAll: () => Promise<void>;
  addRecent: (item: Omit<RecentItem, 'lastOpened'>) => Promise<void>;
  removeRecent: (path: string, type: ItemType) => Promise<void>;
  clearRecents: (type?: ItemType) => Promise<void>;

  addFavorite: (item: Omit<Favorite, 'dateAdded'>) => Promise<void>;
  removeFavorite: (path: string, type: ItemType) => Promise<void>;
  isFavorite: (path: string, type: ItemType) => boolean;

  // Internal
  setRecents: (type: ItemType, items: RecentItem[]) => void;
  setFavorites: (type: ItemType, items: Favorite[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRecentsFavoritesStore = create<RecentsFavoritesState>((set, get) => ({
  // Initial state
  recents: {
    [ItemType.FILE]: [],
    [ItemType.FOLDER]: [],
    [ItemType.REPO]: []
  },
  favorites: {
    [ItemType.FILE]: [],
    [ItemType.FOLDER]: [],
    [ItemType.REPO]: []
  },
  loading: false,
  error: null,

  // Actions implementation
  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [filesRecents, foldersRecents, reposRecents,
             filesFavorites, foldersFavorites, reposFavorites] = await Promise.all([
        recentsFavoritesService.getRecents(ItemType.FILE),
        recentsFavoritesService.getRecents(ItemType.FOLDER),
        recentsFavoritesService.getRecents(ItemType.REPO),
        recentsFavoritesService.getFavorites(ItemType.FILE),
        recentsFavoritesService.getFavorites(ItemType.FOLDER),
        recentsFavoritesService.getFavorites(ItemType.REPO)
      ]);

      set({
        recents: {
          [ItemType.FILE]: filesRecents,
          [ItemType.FOLDER]: foldersRecents,
          [ItemType.REPO]: reposRecents
        },
        favorites: {
          [ItemType.FILE]: filesFavorites,
          [ItemType.FOLDER]: foldersFavorites,
          [ItemType.REPO]: reposFavorites
        },
        loading: false
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  addRecent: async (item) => {
    const recentItem: RecentItem = {
      ...item,
      lastOpened: Date.now()
    };
    await recentsFavoritesService.addRecent(recentItem);
    const updated = await recentsFavoritesService.getRecents(item.type);
    get().setRecents(item.type, updated);
  },

  removeRecent: async (path, type) => {
    await recentsFavoritesService.removeRecent(path, type);
    const updated = await recentsFavoritesService.getRecents(type);
    get().setRecents(type, updated);
  },

  clearRecents: async (type) => {
    if (type) {
      await recentsFavoritesService.clearRecents(type);
      get().setRecents(type, []);
    } else {
      // Clear all categories
      await Promise.all([
        recentsFavoritesService.clearRecents(ItemType.FILE),
        recentsFavoritesService.clearRecents(ItemType.FOLDER),
        recentsFavoritesService.clearRecents(ItemType.REPO)
      ]);
      set({
        recents: {
          [ItemType.FILE]: [],
          [ItemType.FOLDER]: [],
          [ItemType.REPO]: []
        }
      });
    }
  },

  addFavorite: async (item) => {
    const favorite: Favorite = {
      ...item,
      dateAdded: Date.now()
    };
    await recentsFavoritesService.addFavorite(favorite);
    const updated = await recentsFavoritesService.getFavorites(item.type);
    get().setFavorites(item.type, updated);
  },

  removeFavorite: async (path, type) => {
    await recentsFavoritesService.removeFavorite(path, type);
    const updated = await recentsFavoritesService.getFavorites(type);
    get().setFavorites(type, updated);
  },

  isFavorite: (path, type) => {
    const favorites = get().favorites[type];
    return favorites.some(fav => fav.path === path);
  },

  // Internal setters
  setRecents: (type, items) => set((state) => ({
    recents: { ...state.recents, [type]: items }
  })),

  setFavorites: (type, items) => set((state) => ({
    favorites: { ...state.favorites, [type]: items }
  })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
```

---

## Service Layer

### 7. RecentsManager (Main Process)

Service responsible for persisting and managing recents data in the main process.

**Location**: `src/main/services/storage/recents-manager.ts`

**API**:
```typescript
class RecentsManager {
  private store: Store<RecentsSchema>;

  constructor();

  /**
   * Get all recent items for a specific type
   */
  getRecents(type: ItemType): RecentItem[];

  /**
   * Add or update a recent item (implements LRU eviction)
   */
  addRecent(item: RecentItem): void;

  /**
   * Remove a specific recent item
   */
  removeRecent(path: string, type: ItemType): void;

  /**
   * Clear all recents for a specific type
   */
  clearRecents(type: ItemType): void;

  /**
   * Check if path exists in recents
   */
  hasRecent(path: string, type: ItemType): boolean;
}
```

---

### 8. FavoritesManager (Main Process)

Service responsible for persisting and managing favorites data in the main process.

**Location**: `src/main/services/storage/favorites-manager.ts`

**API**:
```typescript
class FavoritesManager {
  private store: Store<FavoritesSchema>;

  constructor();

  /**
   * Get all favorites for a specific type
   */
  getFavorites(type: ItemType): Favorite[];

  /**
   * Add a new favorite (enforces 10-item limit)
   */
  addFavorite(item: Favorite): void;

  /**
   * Remove a specific favorite
   */
  removeFavorite(path: string, type: ItemType): void;

  /**
   * Check if path exists in favorites
   */
  isFavorite(path: string, type: ItemType): boolean;

  /**
   * Get count of favorites for a specific type
   */
  getFavoritesCount(type: ItemType): number;
}
```

---

## Data Flow Diagrams

### Add Recent Flow
```
User opens file/folder/repo
    ↓
File open handler calls addRecent()
    ↓
IPC: renderer → main (via recentsFavoritesService)
    ↓
RecentsManager.addRecent()
    ├─ Normalize path
    ├─ Remove existing (if updating)
    ├─ Add to front of list
    ├─ Evict oldest if > 10 items (LRU)
    └─ Save to electron-store
    ↓
IPC event: main → renderer ('recents:updated')
    ↓
Zustand store updates
    ↓
React components re-render
```

### Add Favorite Flow
```
User clicks "Add to Favorites" button
    ↓
Component calls addFavorite()
    ↓
IPC: renderer → main (via recentsFavoritesService)
    ↓
FavoritesManager.addFavorite()
    ├─ Check count (< 10)
    ├─ Normalize path
    ├─ Add to list
    ├─ Sort alphabetically
    └─ Save to electron-store
    ↓
IPC event: main → renderer ('favorites:updated')
    ↓
Zustand store updates
    ↓
React components re-render
```

---

## Migration Strategy

**Current Version**: 1

**Future Migrations** (when needed):
```typescript
// Example: Adding description field to favorites (hypothetical future)
function migrateV1ToV2(oldSchema: FavoritesSchema): FavoritesSchemaV2 {
  return {
    ...oldSchema,
    files: oldSchema.files.map(fav => ({ ...fav, description: '' })),
    folders: oldSchema.folders.map(fav => ({ ...fav, description: '' })),
    repos: oldSchema.repos.map(fav => ({ ...fav, description: '' })),
    version: 2
  };
}
```

**Migration Execution**:
- Check `version` field on store init
- Run migration functions in sequence
- Save updated schema with new version
- Log migration success/failure

---

## Testing Considerations

**Unit Tests**:
- RecentsManager: addRecent, removeRecent, LRU eviction, limit enforcement
- FavoritesManager: addFavorite, removeFavorite, alphabetical sorting, limit enforcement
- Zustand store: all actions, optimistic updates, error handling

**Integration Tests**:
- IPC round-trip: renderer → main → renderer
- Store persistence: write → read → verify
- Event emissions: action → event → state update

**E2E Tests**:
- User flow: open file → verify in recents → add to favorites → verify in favorites
- Error handling: click unavailable item → verify error message → verify removal

---

**Sign-off**: ✓ Data Model Complete | Ready for Contracts Definition
