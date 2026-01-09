# Developer Quickstart: Home Page - Recents and Favorites

**Feature**: 001-home-recents-favorites
**Date**: 2026-01-05

This guide helps developers get started with implementing and testing the recents and favorites feature.

---

## Prerequisites

- Node.js 18+ installed
- Git repository cloned
- Dependencies installed (`npm install`)
- Familiarity with TypeScript, React, and Electron

---

## Project Setup

### 1. Install Dependencies

All required dependencies are already installed. No new packages needed.

```bash
# Verify installation
npm list electron electron-store zustand react

# Expected output:
# ├── electron@33.4.11
# ├── electron-store@11.0.2
# ├── react@18.3.1
# └── zustand@4.5.0
```

### 2. Development Environment

```bash
# Start development server (hot reload enabled)
npm run dev

# In another terminal: run type checking in watch mode
npm run type-check -- --watch

# In another terminal: run tests in watch mode
npm run test:unit -- --watch
```

---

## Feature Overview

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer Process                      │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────┐  │
│  │   React UI   │ → │ Zustand Store│ → │IPC Service │  │
│  │  Components  │ ← │              │ ← │            │  │
│  └──────────────┘   └──────────────┘   └────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │ IPC
┌─────────────────────────▼───────────────────────────────┐
│                    Main Process                          │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────┐  │
│  │ IPC Handlers │ → │   Managers   │ → │electron-   │  │
│  │              │ ← │              │ ← │store       │  │
│  └──────────────┘   └──────────────┘   └────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── main/
│   ├── services/storage/
│   │   ├── recents-manager.ts         # NEW
│   │   └── favorites-manager.ts       # NEW
│   └── ipc-handlers.ts                # MODIFIED
│
├── renderer/
│   ├── components/home/               # NEW
│   │   ├── RecentsSection.tsx
│   │   ├── FavoritesSection.tsx
│   │   ├── ItemCard.tsx
│   │   └── CategoryColumn.tsx
│   ├── stores/
│   │   └── recents-favorites.ts       # NEW
│   ├── hooks/
│   │   └── useRecentsFavorites.ts     # NEW
│   └── services/
│       └── recents-favorites-service.ts # NEW
│
├── shared/types/
│   ├── recents-favorites.ts           # NEW
│   └── ipc-contracts.d.ts             # MODIFIED
│
└── preload/
    └── index.ts                       # MODIFIED
```

---

## Implementation Phases

### Phase 1: Storage Layer

**Files to create**:
- `src/main/services/storage/recents-manager.ts`
- `src/main/services/storage/favorites-manager.ts`
- `src/shared/types/recents-favorites.ts`

**Start here**:

```typescript
// src/shared/types/recents-favorites.ts
export enum ItemType {
  FILE = 'file',
  FOLDER = 'folder',
  REPO = 'repo'
}

export interface RecentItem {
  path: string;
  type: ItemType;
  lastOpened: number;
  displayName: string;
}

export interface Favorite {
  path: string;
  type: ItemType;
  dateAdded: number;
  displayName: string;
}
```

**Testing**:
```bash
# Create test file
# tests/unit/services/recents-manager.test.ts

npm run test:unit -- recents-manager
```

---

### Phase 2: IPC Layer

**Files to create/modify**:
- `src/main/ipc-handlers.ts` (add handlers)
- `src/preload/index.ts` (expose API)
- `src/renderer/services/recents-favorites-service.ts`

**IPC Handler Example**:

```typescript
// src/main/ipc-handlers.ts
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../shared/types/recents-favorites';
import { recentsManager, favoritesManager } from './services/storage';

// Register handlers
export function registerRecentsFavoritesHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_RECENTS, async (_, type) => {
    return recentsManager.getRecents(type);
  });

  ipcMain.handle(IPC_CHANNELS.ADD_RECENT, async (_, item) => {
    recentsManager.addRecent(item);
  });

  // ... more handlers
}
```

**Testing**:
```bash
# Integration test for IPC
npm run test:integration -- ipc-recents-favorites
```

---

### Phase 3: State Management

**Files to create**:
- `src/renderer/stores/recents-favorites.ts`
- `src/renderer/hooks/useRecentsFavorites.ts`

**Zustand Store Example**:

```typescript
// src/renderer/stores/recents-favorites.ts
import { create } from 'zustand';

interface RecentsFavoritesState {
  recents: Record<ItemType, RecentItem[]>;
  favorites: Record<ItemType, Favorite[]>;
  loadAll: () => Promise<void>;
  addRecent: (item: RecentItem) => Promise<void>;
  // ... more actions
}

export const useRecentsFavoritesStore = create<RecentsFavoritesState>(
  (set, get) => ({
    recents: { file: [], folder: [], repo: [] },
    favorites: { file: [], folder: [], repo: [] },

    loadAll: async () => {
      // Implementation
    }
  })
);
```

**Testing**:
```bash
npm run test:unit -- recents-favorites-store
```

---

### Phase 4: UI Components

**Files to create**:
- `src/renderer/components/home/ItemCard.tsx`
- `src/renderer/components/home/CategoryColumn.tsx`
- `src/renderer/components/home/RecentsSection.tsx`
- `src/renderer/components/home/FavoritesSection.tsx`

**Component Example**:

```tsx
// src/renderer/components/home/ItemCard.tsx
import React from 'react';
import { RecentItem, Favorite } from '@/shared/types/recents-favorites';

interface ItemCardProps {
  item: RecentItem | Favorite;
  onRemove: () => void;
  onClick: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onRemove, onClick }) => {
  return (
    <div className="item-card" onClick={onClick}>
      <span className="item-name">{item.displayName}</span>
      <button
        className="remove-btn"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Remove item"
      >
        ×
      </button>
      <div className="item-tooltip">
        <div>Path: {item.path}</div>
        <div>Last opened: {new Date(item.lastOpened).toLocaleString()}</div>
      </div>
    </div>
  );
};
```

**Testing**:
```bash
npm run test:unit -- ItemCard
```

---

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm run test:unit -- recents-manager

# Run tests in watch mode
npm run test:unit -- --watch

# Run with coverage
npm run test:unit -- --coverage
```

### E2E Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- home-recents-favorites

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Debug mode
npm run test:e2e -- --debug
```

**E2E Test Example**:

```typescript
// tests/e2e/home-recents-favorites.spec.ts
import { test, expect } from '@playwright/test';

test('user can add and view recent files', async ({ page }) => {
  // Navigate to home
  await page.goto('/');

  // Open a file
  await page.click('[data-testid="open-file-btn"]');
  await page.selectFile('test-fixtures/sample.md');

  // Verify file appears in recents
  const recentsSection = page.locator('[data-testid="recents-section"]');
  await expect(recentsSection).toContainText('sample.md');
});

test('user can add item to favorites', async ({ page }) => {
  // Open file (appears in recents)
  // ...

  // Click "Add to Favorites"
  await page.click('[data-testid="add-favorite-btn"]');

  // Verify in favorites section
  const favoritesSection = page.locator('[data-testid="favorites-section"]');
  await expect(favoritesSection).toContainText('sample.md');
});
```

---

## Debugging

### Main Process

```typescript
// Add debug logging
import { logger } from './logger';

logger.info('Recents manager initialized');
logger.debug('Adding recent item:', item);
```

### Renderer Process

```tsx
// Use React DevTools (F12)
console.log('Store state:', useRecentsFavoritesStore.getState());

// Zustand DevTools
import { devtools } from 'zustand/middleware';

export const useRecentsFavoritesStore = create(
  devtools((set, get) => ({
    // ... store implementation
  }), { name: 'RecentsFavorites' })
);
```

### Electron DevTools

```bash
# Development build includes DevTools
npm run dev

# Then in app: Ctrl+Shift+I (Windows) or Cmd+Option+I (Mac)
```

---

## Data Inspection

### View Stored Data

```bash
# Location varies by OS:
# Windows: %APPDATA%\markread\
# Mac: ~/Library/Application Support/markread/
# Linux: ~/.config/markread/

# View recents
cat "%APPDATA%\markread\recents.json"  # Windows
cat ~/Library/Application\ Support/markread/recents.json  # Mac

# View favorites
cat "%APPDATA%\markread\favorites.json"  # Windows
cat ~/Library/Application\ Support/markread/favorites.json  # Mac
```

### Reset Data

```bash
# Delete stored data (useful for testing)
rm "%APPDATA%\markread\recents.json"  # Windows
rm "%APPDATA%\markread\favorites.json"  # Windows

# Or clear via code
window.api.recentsFavorites.clearRecents(ItemType.FILE);
```

---

## Performance Profiling

### Measure Home Page Load Time

```typescript
// In Home.tsx
useEffect(() => {
  performance.mark('home-load-start');

  const loadData = async () => {
    await loadAll();
    performance.mark('home-load-end');
    performance.measure('home-load', 'home-load-start', 'home-load-end');

    const measure = performance.getEntriesByName('home-load')[0];
    console.log(`Home page loaded in ${measure.duration}ms`);

    // Assert performance constraint
    if (measure.duration > 500) {
      console.warn('⚠️ Home page load exceeded 500ms target');
    }
  };

  loadData();
}, []);
```

### Chrome DevTools Performance

1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Navigate to home page
5. Click Stop
6. Analyze timeline

---

## Common Issues

### Issue: IPC not working

**Symptom**: `window.api.recentsFavorites is undefined`

**Solution**:
1. Check preload script is registered in main process
2. Verify contextBridge.exposeInMainWorld is called
3. Restart dev server (sometimes hot reload fails for preload)

### Issue: Store not updating UI

**Symptom**: Data changes but UI doesn't re-render

**Solution**:
1. Ensure component subscribes to store: `const state = useRecentsFavoritesStore()`
2. Check immutability: use spread operator `{ ...state, recents: newRecents }`
3. Verify React.memo dependencies

### Issue: electron-store errors

**Symptom**: `Error: EACCES: permission denied`

**Solution**:
1. Check app has write permissions to AppData folder
2. Close other instances of app
3. Delete corrupt store file and restart

---

## Code Quality Checks

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Fix linting issues
npm run lint:fix

# All checks
npm run check
```

---

## Build and Package

```bash
# Development build
npm run build

# Package for distribution
npm run package

# Test packaged app
./dist/win-unpacked/markread.exe  # Windows
./dist/mac/markread.app            # Mac
```

---

## Next Steps

After implementing this feature:

1. Run full test suite: `npm test`
2. Manual testing: Follow user scenarios from [spec.md](./spec.md)
3. Performance validation: Ensure 500ms load time
4. Code review: Check against constitution principles
5. Create PR: Reference spec and plan docs

---

## Resources

- **Specification**: [spec.md](./spec.md)
- **Implementation Plan**: [plan.md](./plan.md)
- **Data Model**: [data-model.md](./data-model.md)
- **Research**: [research.md](./research.md)
- **Contracts**: [contracts/storage-schema.ts](./contracts/storage-schema.ts)

**External Docs**:
- [Electron IPC](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [electron-store](https://github.com/sindresorhus/electron-store)
- [Zustand](https://github.com/pmndrs/zustand)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)

---

**Questions?** Check the plan.md or research.md documents for detailed implementation decisions.
