# Implementation Plan: Home Page - Recents and Favorites

**Branch**: `001-home-recents-favorites` | **Date**: 2026-01-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-home-recents-favorites/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature enhances the home page with two main capabilities: (1) Recently opened items tracking that displays the last 10 opened files, folders, and repositories sorted by access time, and (2) Favorites management allowing users to bookmark important items with up to 10 favorites per category. Items are uniquely identified by full absolute path but displayed with name only for clean UI. The implementation uses Zustand for state management, electron-store for persistent storage, and follows the existing Electron + React architecture pattern.

## Technical Context

**Language/Version**: TypeScript 5.7 / Node.js with Electron 33.4.11
**Primary Dependencies**: React 18.3.1, Zustand 4.5.0, electron-store 11.0.2, react-router-dom 6.20.0
**Storage**: electron-store (persistent local storage in AppData folder)
**Testing**: Vitest (unit tests), Playwright (e2e tests)
**Target Platform**: Windows desktop (Electron application, cross-platform capable)
**Project Type**: Desktop application (Electron + React)
**Performance Goals**: Home page loads within 500ms, instant UI response for favorites/recents interactions
**Constraints**: Support up to 60 items total (10 recents + 10 favorites per category × 3 categories) without performance degradation
**Scale/Scope**: Feature addition to existing markdown viewer application, affects home page UI and adds new storage layer

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality ✓ PASS

- **Clean, readable code**: Implementation will follow existing TypeScript + React patterns in the codebase
- **Testing**: Unit tests for store logic, Zustand store actions; e2e tests for user interactions (add/remove favorites, navigate recents)
- **Linting**: Existing ESLint configuration will enforce consistency
- **Documentation**: Complex storage schema and state management decisions will be documented inline

**Justification**: Standard feature addition following established patterns. No special complexity.

### II. User Experience Consistency ✓ PASS

- **Error messages**: Clear feedback for limit reached ("Maximum 10 favorites per category"), unavailable items ("Item no longer exists")
- **UI patterns**: Reuses existing folder selector design patterns, consistent with current app styling
- **Settings**: Recents/favorites accessible from home page (existing route), no new settings required

**Justification**: Feature integrates naturally with existing home page navigation. Consistent with app's information architecture.

### III. Documentation Standard ✓ PASS

- **README**: Will update main README with new home page features
- **Design decisions**: Will document storage schema choices (why full path for uniqueness, LRU eviction strategy)
- **Up-to-date docs**: Will keep quickstart.md current with implementation

**Justification**: Standard documentation approach for new feature.

### IV. Performance Requirements ✓ PASS

- **Startup impact**: Minimal - recents/favorites loaded asynchronously after initial render
- **UI responsiveness**: All interactions (add/remove, navigate) are synchronous with optimistic updates
- **Memory usage**: Bounded by 60-item limit, each item ~200 bytes = ~12KB total
- **Profiling plan**: Will measure home page render time and storage I/O during implementation

**Justification**: Small dataset (60 items max), simple operations, no heavy computation.

**Overall**: ✓ ALL GATES PASS - No violations to justify

## Project Structure

### Documentation (this feature)

```text
specs/001-home-recents-favorites/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── storage-schema.ts
└── checklists/          # Quality validation checklists
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── main/
│   ├── services/
│   │   └── storage/
│   │       ├── recents-manager.ts          # NEW: Recents storage service
│   │       └── favorites-manager.ts        # NEW: Favorites storage service
│   └── ipc-handlers.ts                     # MODIFIED: Add recents/favorites IPC handlers
├── renderer/
│   ├── components/
│   │   ├── Home.tsx                        # MODIFIED: Add recents/favorites UI
│   │   └── home/                           # NEW: Home page components
│   │       ├── RecentsSection.tsx          # NEW: Recent items display
│   │       ├── FavoritesSection.tsx        # NEW: Favorites display
│   │       ├── ItemCard.tsx                # NEW: Reusable item card component
│   │       └── CategoryColumn.tsx          # NEW: Column layout component
│   ├── stores/
│   │   └── recents-favorites.ts            # NEW: Zustand store for recents/favorites state
│   ├── hooks/
│   │   └── useRecentsFavorites.ts          # NEW: Custom hook for component integration
│   └── services/
│       └── recents-favorites-service.ts    # NEW: IPC bridge to main process
├── shared/
│   └── types/
│       ├── recents-favorites.ts            # NEW: Shared type definitions
│       └── ipc-contracts.d.ts              # MODIFIED: Add recents/favorites IPC contracts
└── preload/
    └── index.ts                            # MODIFIED: Expose recents/favorites API

tests/
├── unit/
│   ├── stores/
│   │   └── recents-favorites.test.ts       # NEW: Store unit tests
│   └── services/
│       ├── recents-manager.test.ts         # NEW: Recents service tests
│       └── favorites-manager.test.ts       # NEW: Favorites service tests
└── e2e/
    └── home-recents-favorites.spec.ts      # NEW: E2E tests for user flows
```

**Structure Decision**: This is a standard Electron application with main/renderer process separation. The feature follows the existing pattern:
- Main process handles storage (electron-store) via manager services
- Renderer process manages UI state (Zustand stores) and components (React)
- IPC communication bridges the two processes
- Shared types ensure type safety across process boundary
- Testing uses existing Vitest + Playwright setup

## Complexity Tracking

*No violations requiring justification - all constitution checks passed.*

## Phase 0: Research & Technology Decisions

See [research.md](./research.md) for detailed research findings.

**Key Decisions**:
1. **Storage Strategy**: Use electron-store for persistent storage (already used in app, supports JSON, cross-platform)
2. **State Management**: Zustand store with IPC service pattern (consistent with existing git-store, folders store)
3. **UI Architecture**: New home/ subdirectory with composition-based components (follows existing patterns)
4. **Item Identification**: Full absolute path as unique key, normalize path separators for cross-platform consistency
5. **Data Freshness**: Load on app startup, sync on each file/folder/repo open event
6. **Eviction Strategy**: LRU (Least Recently Used) for recents when limit exceeded

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md) for complete entity definitions.

**Core Entities**:
- `RecentItem`: `{ path: string, type: ItemType, lastOpened: number, displayName: string }`
- `Favorite`: `{ path: string, type: ItemType, dateAdded: number, displayName: string }`
- `RecentsFavoritesStore`: Zustand store managing UI state
- `RecentsManager`: Main process service for recents persistence
- `FavoritesManager`: Main process service for favorites persistence

### API Contracts

See [contracts/](./contracts/) for detailed schemas.

**IPC Contracts** (Electron main ↔ renderer):
- `getRecents(type?: ItemType): Promise<RecentItem[]>`
- `addRecent(item: RecentItem): Promise<void>`
- `removeRecent(path: string, type: ItemType): Promise<void>`
- `getFavorites(type?: ItemType): Promise<Favorite[]>`
- `addFavorite(item: Favorite): Promise<void>`
- `removeFavorite(path: string, type: ItemType): Promise<void>`
- `isFavorite(path: string, type: ItemType): Promise<boolean>`

**Event Emissions**:
- `recents:updated` - Emitted when recents list changes
- `favorites:updated` - Emitted when favorites list changes

### Integration Points

**Existing Code Modifications**:
1. **File/Folder/Repo Opening** - Hook into existing open handlers to call `addRecent()`
2. **Home Component** - Replace placeholder content with RecentsSection + FavoritesSection
3. **IPC Handlers** - Register new recents/favorites handlers in main process
4. **Preload API** - Expose recents/favorites methods to renderer

**Dependencies**:
- `electron-store`: Already installed (v11.0.2)
- `zustand`: Already installed (v4.5.0)
- No new dependencies required

## Phase 2: Task Breakdown

*NOTE: Task breakdown is generated by `/speckit.tasks` command - NOT created by /speckit.plan.*

See [tasks.md](./tasks.md) when available.

## Development Quickstart

See [quickstart.md](./quickstart.md) for detailed setup and testing instructions.

**Quick Commands**:
```bash
# Run development server
npm run dev

# Run type checking
npm run type-check

# Run unit tests
npm run test:unit

# Run e2e tests
npm run test:e2e

# Run all checks
npm run check
```

## Rollout Plan

**Phase 1: Core Functionality**
1. Storage layer (RecentsManager, FavoritesManager)
2. IPC contracts and handlers
3. Zustand store implementation
4. Basic UI components (ItemCard, CategoryColumn)

**Phase 2: UI Integration**
1. Home page layout with RecentsSection/FavoritesSection
2. Add/remove favorites interactions
3. Manual delete (×) button for recents
4. Tooltips with timestamp + full path

**Phase 3: Integration & Polish**
1. Hook into file/folder/repo open events
2. Error handling for unavailable items
3. Empty states for categories
4. Limits enforcement (10 per category)

**Phase 4: Testing & Validation**
1. Unit tests for all managers and stores
2. E2E tests for user scenarios
3. Performance validation (500ms load time)
4. Cross-platform testing

**Post-Launch Monitoring**:
- Monitor home page load times in production
- Track user adoption of favorites feature
- Gather feedback on 10-item limit

## Open Questions & Risks

**Open Questions**: None - all clarifications resolved during spec phase

**Risks**:
1. **Risk**: Performance degradation with 60 items on slow storage
   - **Mitigation**: Async loading, indexed access patterns, performance tests
2. **Risk**: Cross-platform path normalization issues
   - **Mitigation**: Use Node.js path utilities, test on Windows/Mac/Linux
3. **Risk**: Race conditions with concurrent file opens
   - **Mitigation**: Serialize recents updates, use immutable state patterns

**Assumptions**:
- Existing home page component is easily modifiable
- Folder selector design patterns are well-documented
- File/folder/repo open events are hookable

## Sign-off

**Plan Status**: ✓ COMPLETE
**Constitution Check**: ✓ ALL GATES PASS
**Research Complete**: See research.md
**Design Complete**: See data-model.md, contracts/
**Ready for**: `/speckit.tasks` command to generate implementation tasks

**Next Command**: `/speckit.tasks`
