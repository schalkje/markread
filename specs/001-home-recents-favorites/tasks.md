# Tasks: Home Page - Recents and Favorites

**Input**: Design documents from `/specs/001-home-recents-favorites/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/storage-schema.ts

**Tests**: Tests are NOT explicitly requested in the specification, so this task breakdown focuses on implementation. E2E tests will be added in the Polish phase for validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Project structure follows Electron architecture with process separation:
- **Main process**: `src/main/` (Node.js, electron-store)
- **Renderer process**: `src/renderer/` (React, Zustand)
- **Shared types**: `src/shared/types/`
- **Preload API**: `src/preload/`
- **Tests**: `tests/unit/`, `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and type definitions

- [X] T001 [P] Create shared types in src/shared/types/recents-favorites.ts (ItemType enum, RecentItem, Favorite interfaces)
- [X] T002 [P] Create storage schema constants in src/shared/types/recents-favorites.ts (IPC_CHANNELS, MAX_ITEMS_PER_CATEGORY, ERROR_MESSAGES)
- [X] T003 [P] Update IPC contracts in src/shared/types/ipc-contracts.d.ts (add RecentsFavoritesAPI to global window.api interface)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core storage and IPC infrastructure that MUST be complete before ANY user story UI can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Implement RecentsManager class in src/main/services/storage/recents-manager.ts (constructor, getRecents, addRecent with LRU eviction, removeRecent, clearRecents, hasRecent methods)
- [X] T005 [P] Implement FavoritesManager class in src/main/services/storage/favorites-manager.ts (constructor, getFavorites, addFavorite with limit check, removeFavorite, isFavorite, getFavoritesCount methods)
- [X] T006 Register recents/favorites IPC handlers in src/main/ipc-handlers.ts (handle GET_RECENTS, ADD_RECENT, REMOVE_RECENT, CLEAR_RECENTS, GET_FAVORITES, ADD_FAVORITE, REMOVE_FAVORITE, IS_FAVORITE, GET_FAVORITES_COUNT)
- [X] T007 Expose recents/favorites API in src/preload/index.ts (use contextBridge.exposeInMainWorld to expose recentsFavorites methods matching RecentsFavoritesAPI interface)
- [X] T008 Create IPC service bridge in src/renderer/services/recents-favorites-service.ts (wrapper for window.api.recentsFavorites calls)
- [X] T009 Implement Zustand store in src/renderer/stores/recents-favorites.ts (state: recents, favorites, loading, error; actions: loadAll, addRecent, removeRecent, clearRecents, addFavorite, removeFavorite, isFavorite)
- [X] T010 Create custom React hook in src/renderer/hooks/useRecentsFavorites.ts (wrapper for Zustand store with component-friendly interface)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 3 - Visual Organization with Column Layout (Priority: P1) 🎯 MVP Foundation

**Goal**: Create the base UI components for displaying items in a column layout with visual design inspired by the folder selector

**Independent Test**: Components render correctly with mock data, showing proper column organization and styling

**Why this is foundational**: User Stories 1 and 2 both depend on these shared UI components, so we build them first

### Implementation for User Story 3

- [X] T011 [P] [US3] Create ItemCard component in src/renderer/components/home/ItemCard.tsx (displays item name, delete button, handles click, tooltip container for path/timestamp)
- [X] T012 [P] [US3] Create CategoryColumn component in src/renderer/components/home/CategoryColumn.tsx (renders column header, list of ItemCard components, empty state message)
- [X] T013 [P] [US3] Add CSS styles for ItemCard and CategoryColumn in src/renderer/components/home/styles.css (follow folder selector design patterns, responsive layout)
- [X] T014 [US3] Create Home page layout structure in src/renderer/components/Home.tsx (three-column grid layout for Files/Folders/Repos columns)

**Checkpoint**: At this point, the base UI components are ready for recents and favorites sections

---

## Phase 4: User Story 1 - Quick Access to Recent Items (Priority: P1) 🎯 MVP Core

**Goal**: Users can see their last 10 opened items per category, sorted by most recent, with quick navigation and manual removal

**Independent Test**: Open various files/folders/repos, verify they appear in recents sorted by time, click to navigate, click × to remove, hover to see timestamp and full path

### Implementation for User Story 1

- [X] T015 [US1] Create RecentsSection component in src/renderer/components/home/RecentsSection.tsx (uses CategoryColumn for each type, passes recents data from store, handles item click to navigate, handles delete button)
- [X] T016 [US1] Integrate RecentsSection into Home.tsx (render RecentsSection with data from useRecentsFavorites hook)
- [X] T017 [US1] Hook file open events to track recents - modify file open handler to call addRecent (locate existing file open handler, add recentsFavoritesService.addRecent call with normalized path)
- [X] T018 [US1] Hook folder open events to track recents - modify folder open handler to call addRecent (locate existing folder open handler, add recentsFavoritesService.addRecent call)
- [X] T019 [US1] Hook repository open events to track recents - modify repo open handler to call addRecent (locate existing repo open handler, add recentsFavoritesService.addRecent call)
- [X] T020 [US1] Implement item navigation on click in RecentsSection.tsx (use existing app navigation methods to open file/folder/repo when clicking recent item)
- [X] T021 [US1] Add error handling for unavailable items in RecentsSection.tsx (try-catch on navigation, show error toast if ENOENT, automatically remove item from recents)
- [X] T022 [US1] Implement tooltip display in ItemCard.tsx (show full path and formatted timestamp on hover using title attribute or custom tooltip)

**Checkpoint**: At this point, User Story 1 should be fully functional - recents track automatically, display correctly, and are navigable

---

## Phase 5: User Story 2 - Manage Favorites for Persistent Quick Access (Priority: P2)

**Goal**: Users can bookmark important items as favorites (max 10 per category), displayed above recents and sorted alphabetically

**Independent Test**: Add items to favorites, verify they appear above recents sorted alphabetically, remove favorites, verify 10-item limit enforcement with clear error message

### Implementation for User Story 2

- [X] T023 [P] [US2] Create FavoritesSection component in src/renderer/components/home/FavoritesSection.tsx (uses CategoryColumn for each type, passes favorites data from store, handles item click to navigate, handles remove favorite button)
- [X] T024 [US2] Integrate FavoritesSection into Home.tsx above RecentsSection (render FavoritesSection with data from useRecentsFavorites hook, add visual separator)
- [X] T025 [US2] Add "Add to Favorites" UI element to ItemCard.tsx (star icon or button, shows only if not already favorited, calls addFavorite on click)
- [X] T026 [US2] Implement favorites limit enforcement in FavoritesSection.tsx (before adding, check getFavoritesCount, show error toast if >= 10 with message: "Maximum 10 favorites per category. Please remove an existing favorite first.")
- [X] T027 [US2] Implement alphabetical sorting for favorites in Zustand store (sort by displayName case-insensitive when favorites are loaded or updated)
- [X] T028 [US2] Handle duplicate prevention in UI (if item is in favorites, don't show in recents section - filter recents by checking isFavorite)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - recents work, favorites work, no duplicates shown

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Refinements, error handling, performance validation, and user experience improvements

- [X] T029 [P] Add empty state messages to CategoryColumn.tsx (e.g., "No recent files", "No favorite folders", "No repositories opened yet")
- [X] T030 [P] Implement long name truncation in ItemCard.tsx (truncate displayName with ellipsis if exceeds max width, full name visible in tooltip)
- [X] T031 [P] Add loading state to Home.tsx (show skeleton or spinner while loadAll() is in progress)
- [X] T032 Add performance measurement to Home.tsx (mark home-load-start and home-load-end, log duration, warn if > 500ms)
- [X] T033 [P] Add visual separator between favorites and recents in CategoryColumn.tsx (horizontal line or spacing to clearly distinguish sections)
- [X] T034 [P] Implement toast notifications for user actions (success: "Added to favorites", error: "Item no longer exists", info: "Favorites limit reached")
- [X] T035 Create E2E test for full user journey in tests/e2e/home-recents-favorites.spec.ts (open items → verify in recents → add to favorites → verify in favorites → remove from favorites → verify in recents again)
- [X] T036 [P] Add unit tests for RecentsManager in tests/unit/services/recents-manager.test.ts (test LRU eviction, limit enforcement, path normalization)
- [X] T037 [P] Add unit tests for FavoritesManager in tests/unit/services/favorites-manager.test.ts (test limit enforcement, alphabetical sorting, duplicate prevention)
- [X] T038 [P] Add unit tests for Zustand store in tests/unit/stores/recents-favorites.test.ts (test all actions, state updates, error handling)
- [X] T039 Update main README.md with recents and favorites feature documentation (describe home page sections, usage, limits)
- [X] T040 Validate implementation against quickstart.md scenarios (ensure all scenarios work as documented)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - Phase 3 (US3 - Visual Organization) MUST complete before Phase 4 and 5 (provides shared components)
  - Phase 4 (US1 - Recents) can proceed after Phase 3
  - Phase 5 (US2 - Favorites) should proceed after Phase 4 (builds on recents integration)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Provides base components for other stories
- **User Story 1 (P1)**: Can start after US3 - Uses CategoryColumn and ItemCard components
- **User Story 2 (P2)**: Can start after US1 - Integrates with recents display and navigation patterns

### Within Each Phase

- Tasks marked [P] can run in parallel (different files, no dependencies)
- Sequential tasks must complete in order (dependencies on previous tasks)
- Storage managers (T004, T005) must complete before IPC handlers (T006)
- IPC infrastructure (T004-T007) must complete before renderer services (T008-T010)

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks can run in parallel (T001, T002, T003)

**Phase 2 (Foundational)**:
- Storage managers (T004, T005) can run in parallel
- After T004, T005 complete: T006 (IPC handlers) and T007 (preload), T008 (service bridge) can run in parallel
- After T006, T007, T008 complete: T009 (store) and T010 (hook) can run sequentially

**Phase 3 (US3)**:
- Components (T011, T012, T013) can run in parallel
- T014 (Home layout) depends on T011, T012 completing

**Phase 6 (Polish)**:
- UI polish tasks (T029, T030, T031, T033, T034) can run in parallel
- Test tasks (T035, T036, T037, T038) can run in parallel
- Documentation tasks (T039, T040) can run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch storage managers together:
Task T004: "Implement RecentsManager in src/main/services/storage/recents-manager.ts"
Task T005: "Implement FavoritesManager in src/main/services/storage/favorites-manager.ts"

# After storage managers complete, launch IPC layer together:
Task T006: "Register IPC handlers in src/main/ipc-handlers.ts"
Task T007: "Expose API in src/preload/index.ts"
Task T008: "Create IPC service bridge in src/renderer/services/recents-favorites-service.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 3 + 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T010) - CRITICAL
3. Complete Phase 3: User Story 3 (T011-T014) - Base components
4. Complete Phase 4: User Story 1 (T015-T022) - Core recents feature
5. **STOP and VALIDATE**: Test recent items tracking and navigation
6. Deploy/demo if ready (MVP without favorites)

### Incremental Delivery

1. **Foundation** (Phases 1-2) → Storage and IPC ready
2. **MVP** (Phase 3-4) → Recents tracking works → Test → Demo
3. **Enhanced** (Phase 5) → Add favorites → Test → Demo
4. **Polished** (Phase 6) → Add error handling, tests, docs → Release

### Sequential Implementation (Single Developer)

**Week 1**: Setup + Foundational
- Day 1-2: Phase 1 (Setup types and contracts)
- Day 3-5: Phase 2 (Storage managers, IPC, Zustand store)

**Week 2**: Core Feature
- Day 1-2: Phase 3 (UI components)
- Day 3-5: Phase 4 (Recents implementation)

**Week 3**: Enhancement + Polish
- Day 1-2: Phase 5 (Favorites implementation)
- Day 3-5: Phase 6 (Testing, error handling, docs)

---

## Notes

- **[P]** tasks = different files, no dependencies - can run in parallel
- **[Story]** label maps task to specific user story (US1, US2, US3) for traceability
- Each user story should be independently testable once its phase completes
- **Path normalization**: Use Node.js `path.normalize()` for all file paths
- **LRU eviction**: Automatic when adding recent item exceeds 10-item limit
- **Favorites limit**: Enforced at addFavorite with user-friendly error message
- **Empty states**: Important for first-time user experience
- **Performance target**: Home page load within 500ms (validate in T032)
- Commit after each task or logical group of parallel tasks
- Stop at any checkpoint to validate story independently before proceeding

---

## Success Criteria

Upon completion of all tasks:

✅ Recents automatically track when opening files/folders/repos (max 10 per category)
✅ Recents sorted by last opened timestamp (most recent first)
✅ Users can manually remove items from recents with × button
✅ Users can add/remove favorites (max 10 per category)
✅ Favorites sorted alphabetically and displayed above recents
✅ Items in favorites don't appear in recents (no duplicates)
✅ Clicking any item navigates to it
✅ Unavailable items show error and auto-remove on access attempt
✅ Tooltips show full path and timestamp on hover
✅ Home page loads within 500ms
✅ All user stories independently testable and functional
✅ E2E tests validate complete user journeys
✅ Unit tests cover all critical logic (managers, store)
