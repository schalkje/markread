# Implementation Tasks: Git Repository Integration

**Feature**: 001-git-repo-integration | **Date**: 2025-12-29
**Branch**: `001-git-repo-integration`

---

## Overview

This document contains all implementation tasks for the Git Repository Integration feature, organized by user story priority to enable incremental delivery and independent testing.

**Total Tasks**: 89
**User Stories**: 6 (P1-P6)
**Parallel Opportunities**: 47 tasks marked [P]

---

## Implementation Strategy

### Incremental Delivery Approach

Each user story can be implemented and tested independently:

1. **MVP (User Story 1 - P1)**: Connect and view repository files - Delivers core value
2. **Enhanced Auth (User Story 2 - P2)**: PAT authentication fallback
3. **Branch Navigation (User Story 3 - P3)**: Switch between branches
4. **Quick Access (User Story 4 - P4)**: Recent repositories list
5. **Advanced (User Story 5 - P5)**: Multiple branches simultaneously
6. **Enterprise (User Story 6 - P6)**: Azure DevOps support

### Parallel Execution Opportunities

Within each phase, tasks marked [P] can be executed in parallel:
- Phase 2 (Foundational): 6 parallel tasks
- Phase 3 (US1): 15 parallel tasks
- Phase 4 (US2): 4 parallel tasks
- Phase 5 (US3): 4 parallel tasks
- Phase 6 (US4): 3 parallel tasks
- Phase 7 (US5): 3 parallel tasks
- Phase 8 (US6): 7 parallel tasks
- Phase 9 (Polish): 5 parallel tasks

---

## Phase 1: Setup & Project Initialization

**Goal**: Install dependencies, configure environment, set up project structure

**Prerequisites**: None

### Tasks

- [ ] T001 Install axios dependency (~12KB) via npm install axios
- [ ] T002 Install electron-store dependency (~5KB) via npm install electron-store
- [ ] T003 Create src/main/services/git/ directory structure
- [ ] T004 Create src/main/services/storage/ directory structure
- [ ] T005 Create src/main/ipc/ directory for IPC handlers
- [ ] T006 Create src/preload/git-api.ts for Git API exposure
- [ ] T007 Create src/renderer/components/git/ directory structure
- [ ] T008 Create src/renderer/services/git-service.ts wrapper
- [ ] T009 Create src/renderer/stores/git-store.ts Zustand store
- [ ] T010 Create src/renderer/hooks/ for custom React hooks
- [ ] T011 Create src/shared/types/git.ts for Git type definitions
- [ ] T012 Create src/shared/types/repository.ts for repository types
- [ ] T013 Create tests/integration/git/ directory for integration tests
- [ ] T014 Create tests/unit/services/git/ directory for unit tests

**Completion Criteria**: ✅ All directories created, dependencies installed, no build errors

---

## Phase 2: Foundational Infrastructure

**Goal**: Implement shared services and utilities needed by all user stories

**Prerequisites**: Phase 1 complete

### Tasks

- [ ] T015 [P] Create error types and schemas in src/shared/types/git-errors.ts (from error-contracts.ts)
- [ ] T016 [P] Create IPC response envelope type in src/shared/types/ipc.ts
- [ ] T017 [P] Implement URL normalization utility in src/shared/utils/url-normalizer.ts (from data-model.md helper functions)
- [ ] T018 [P] Implement URL parser utility in src/shared/utils/url-parser.ts (from data-model.md helper functions)
- [ ] T019 [P] Create Repository entity types and Zod schemas in src/shared/types/repository.ts (from data-model.md)
- [ ] T020 [P] Create Branch entity types and Zod schemas in src/shared/types/repository.ts (from data-model.md)
- [ ] T021 [P] Create RepositoryFile entity types and Zod schemas in src/shared/types/repository.ts (from data-model.md)
- [ ] T022 [P] Create AuthenticationCredential entity types in src/shared/types/git.ts (from data-model.md)
- [ ] T023 [P] Create CacheEntry entity types in src/shared/types/cache.ts (from data-model.md)
- [ ] T024 Implement CredentialStore using Electron safeStorage API in src/main/services/storage/credential-store.ts (from research.md section 3)
- [ ] T025 Implement CacheManager with LRU eviction in src/main/services/storage/cache-manager.ts (from research.md section 7)
- [ ] T026 Implement RateLimiter with exponential backoff in src/main/services/git/rate-limiter.ts (from research.md section 5)
- [ ] T027 Implement GitHttpClient with axios in src/main/services/git/http-client.ts (from research.md section 1)
- [ ] T028 Implement ConnectivityService in src/main/services/git/connectivity-service.ts (from research.md section 8)

**Completion Criteria**: ✅ All foundational services implemented, unit tests pass (if tests requested), no blocking dependencies for user stories

---

## Phase 3: User Story 1 (P1) - Connect and View Repository Files

**Story Goal**: Users can connect to a GitHub repository and view markdown files without cloning

**Independent Test**: Connect to https://github.com/schalkje/markread, view README.md, verify markdown renders correctly

**Acceptance Criteria**:
- Repository connection completes within 30 seconds (SC-001)
- File tree appears and user can navigate folders (AS #2)
- Markdown content renders with proper formatting (AS #3)
- Clear error messages on connection failure (AS #4)

### Tasks

#### Type Definitions & Contracts

- [ ] T029 [P] [US1] Create repository contracts in src/shared/types/git-contracts.ts (ConnectRepositoryRequest/Response from repository-contracts.ts)
- [ ] T030 [P] [US1] Create file contracts in src/shared/types/git-contracts.ts (FetchFileRequest/Response from file-contracts.ts)
- [ ] T031 [P] [US1] Create connectivity contracts in src/shared/types/git-contracts.ts (CheckConnectivityRequest/Response from connectivity-contracts.ts)

#### Main Process - GitHub API Client

- [ ] T032 [P] [US1] Implement GitHubClient.listBranches() in src/main/services/git/github-client.ts (from research.md section 4)
- [ ] T033 [P] [US1] Implement GitHubClient.getFileContent() in src/main/services/git/github-client.ts (from research.md section 4)
- [ ] T034 [P] [US1] Implement GitHubClient.getRepositoryTree() in src/main/services/git/github-client.ts (from research.md section 4)

#### Main Process - Repository Service

- [ ] T035 [US1] Implement RepositoryService.connect() in src/main/services/git/repository-service.ts (handles ConnectRepositoryRequest)
- [ ] T036 [US1] Implement RepositoryService.fetchFile() in src/main/services/git/repository-service.ts (handles FetchFileRequest, integrates CacheManager)
- [ ] T037 [US1] Implement RepositoryService.fetchTree() in src/main/services/git/repository-service.ts (handles FetchRepositoryTreeRequest)

#### Main Process - IPC Handlers

- [ ] T038 [P] [US1] Implement git:connect IPC handler in src/main/ipc/git-handlers.ts (Zod validation, calls RepositoryService)
- [ ] T039 [P] [US1] Implement git:fetchFile IPC handler in src/main/ipc/git-handlers.ts (Zod validation, rate limiting)
- [ ] T040 [P] [US1] Implement git:fetchTree IPC handler in src/main/ipc/git-handlers.ts (Zod validation, progress events)
- [ ] T041 [P] [US1] Implement git:connectivity:check IPC handler in src/main/ipc/git-handlers.ts (Zod validation)

#### Preload - API Exposure

- [ ] T042 [US1] Expose git.repo.connect() via contextBridge in src/preload/git-api.ts (from research.md section 6)
- [ ] T043 [US1] Expose git.repo.fetchFile() via contextBridge in src/preload/git-api.ts
- [ ] T044 [US1] Expose git.repo.fetchTree() via contextBridge in src/preload/git-api.ts
- [ ] T045 [US1] Expose git.connectivity.check() via contextBridge in src/preload/git-api.ts

#### Renderer - State Management

- [ ] T046 [P] [US1] Create git store with repository state in src/renderer/stores/git-store.ts (Zustand)
- [ ] T047 [P] [US1] Create useGitRepo hook in src/renderer/hooks/useGitRepo.ts (repository operations)
- [ ] T048 [P] [US1] Create useOfflineStatus hook in src/renderer/hooks/useOfflineStatus.ts (from research.md section 8)

#### Renderer - UI Components

- [ ] T049 [P] [US1] Create RepoConnectDialog component in src/renderer/components/git/RepoConnectDialog.tsx (URL input, auth method selection)
- [ ] T050 [P] [US1] Create RepoFileTree component in src/renderer/components/git/RepoFileTree.tsx (displays tree structure, clickable files)
- [ ] T051 [P] [US1] Create OfflineBadge component in src/renderer/components/git/OfflineBadge.tsx (from research.md section 8)
- [ ] T052 [US1] Integrate RepoConnectDialog into main page in src/renderer/pages/MainPage.tsx
- [ ] T053 [US1] Integrate RepoFileTree into repository view in src/renderer/pages/RepositoryView.tsx
- [ ] T054 [US1] Integrate markdown rendering for fetched files in src/renderer/components/MarkdownViewer.tsx

#### Image Resolution

- [ ] T055 [US1] Implement image path resolution for repository-relative paths in src/renderer/utils/image-resolver.ts (FR-013)

**Completion Criteria**: ✅ Can connect to public GitHub repository, navigate file tree, view markdown files, images render correctly, offline badge appears when disconnected

---

## Phase 4: User Story 2 (P2) - Authenticate with Personal Access Tokens

**Story Goal**: Users can authenticate with PAT as a fallback when OAuth is unavailable

**Independent Test**: Connect to a private repository using a PAT, verify access granted

**Acceptance Criteria**:
- Valid PAT grants access to private repository (AS #1)
- Invalid PAT shows specific error with guidance (AS #2)
- Limited permissions show clear messaging (AS #3)

### Tasks

#### Type Definitions & Contracts

- [ ] T056 [P] [US2] Create auth contracts in src/shared/types/git-contracts.ts (AuthenticateWithPATRequest/Response from auth-contracts.ts)

#### Main Process - Authentication Service

- [ ] T057 [US2] Implement AuthService.authenticateWithPAT() in src/main/services/git/auth-service.ts (validates and stores PAT)
- [ ] T058 [US2] Integrate PAT authentication with GitHubClient in src/main/services/git/github-client.ts (pass token to HTTP client)
- [ ] T059 [US2] Implement auth:pat IPC handler in src/main/ipc/git-handlers.ts (Zod validation, credentials storage)

#### Preload & Renderer

- [ ] T060 [US2] Expose git.auth.authenticateWithPAT() via contextBridge in src/preload/git-api.ts
- [ ] T061 [P] [US2] Add PAT input field to RepoConnectDialog in src/renderer/components/git/RepoConnectDialog.tsx
- [ ] T062 [P] [US2] Add PAT authentication flow to useGitRepo hook in src/renderer/hooks/useGitRepo.ts
- [ ] T063 [US2] Add error handling for invalid PAT with user guidance in src/renderer/components/git/RepoConnectDialog.tsx

**Completion Criteria**: ✅ Can authenticate with PAT, access private repositories, error messages guide PAT creation

---

## Phase 5: User Story 3 (P3) - Switch Between Branches

**Story Goal**: Users can switch between different branches to view version-specific documentation

**Independent Test**: Connect to a multi-branch repository, switch branches, verify file content updates

**Acceptance Criteria**:
- Branch switch completes within 5 seconds (SC-003, AS #1)
- Same file path loads on new branch if exists (AS #2)
- Appropriate messaging when file doesn't exist on new branch (AS #3)
- Warning about losing context when switching with unsaved changes (AS #4)

### Tasks

#### Type Definitions & Contracts

- [ ] T064 [P] [US3] Create branch contracts in src/shared/types/git-contracts.ts (SwitchBranchRequest/Response, ListBranchesRequest/Response from repository-contracts.ts)

#### Main Process

- [ ] T065 [US3] Implement RepositoryService.switchBranch() in src/main/services/git/repository-service.ts (updates current branch, preserves file path)
- [ ] T066 [US3] Implement RepositoryService.listBranches() in src/main/services/git/repository-service.ts
- [ ] T067 [US3] Implement git:switchBranch IPC handler in src/main/ipc/git-handlers.ts
- [ ] T068 [US3] Implement git:listBranches IPC handler in src/main/ipc/git-handlers.ts

#### Preload & Renderer

- [ ] T069 [US3] Expose git.repo.switchBranch() and git.repo.listBranches() via contextBridge in src/preload/git-api.ts
- [ ] T070 [P] [US3] Create BranchSelector component in src/renderer/components/git/BranchSelector.tsx (dropdown with branch list)
- [ ] T071 [P] [US3] Add branch switching logic to useGitRepo hook in src/renderer/hooks/useGitRepo.ts
- [ ] T072 [US3] Integrate BranchSelector into repository view in src/renderer/pages/RepositoryView.tsx
- [ ] T073 [US3] Add file existence check after branch switch in src/renderer/components/git/RepoFileTree.tsx (AS #3)

**Completion Criteria**: ✅ Can list branches, switch between them, file tree updates within 5 seconds, file path preserved when possible

---

## Phase 6: User Story 4 (P4) - Access Recent Repositories

**Story Goal**: Users have quick access to recently opened repositories with visual indicators

**Independent Test**: Open several repositories, reopen app, verify recent list appears with Git icons and branch names

**Acceptance Criteria**:
- Unified list shows both local folders and Git repositories (AS #1)
- Git repositories marked with distinct icon (AS #2)
- Last accessed branch name displayed (AS #3)
- Error message for inaccessible repositories (AS #4)

### Tasks

#### Type Definitions

- [ ] T074 [P] [US4] Create RecentItem entity types and Zod schemas in src/shared/types/recent.ts (from data-model.md)

#### Main Process - Recent Items Service

- [ ] T075 [US4] Implement RecentItemsService in src/main/services/storage/recent-items-service.ts (persist to electron-store, max 50 items)
- [ ] T076 [US4] Add repository to recent items on successful connection in src/main/services/git/repository-service.ts
- [ ] T077 [US4] Implement git:recent:list IPC handler in src/main/ipc/git-handlers.ts

#### Preload & Renderer

- [ ] T078 [US4] Expose git.recent.list() via contextBridge in src/preload/git-api.ts
- [ ] T079 [P] [US4] Update recent-store.ts to support Git repositories in src/renderer/stores/recent-store.ts
- [ ] T080 [P] [US4] Update RecentItemsList component to show Git icons in src/renderer/components/recent/RecentItemsList.tsx
- [ ] T081 [US4] Add branch name display for Git repositories in src/renderer/components/recent/RecentItemsList.tsx

**Completion Criteria**: ✅ Recent list shows both local and Git items, Git items have icons and branch names, persists across app restarts

---

## Phase 7: User Story 5 (P5) - Open Multiple Branches Simultaneously

**Story Goal**: Users can compare documentation across branches by opening multiple tabs

**Independent Test**: Open same repository with two different branches, verify both remain accessible independently

**Acceptance Criteria**:
- Multiple branches open in separate tabs (AS #1)
- Independent navigation in each tab (AS #2)
- Tab shows repository and branch name (AS #3)
- Automatic caching for inactive tabs (AS #4)

### Tasks

#### Main Process

- [ ] T082 [US5] Extend RepositoryService to support multiple branch instances in src/main/services/git/repository-service.ts (repository ID + branch combination)
- [ ] T083 [US5] Implement git:openBranchInNewTab IPC handler in src/main/ipc/git-handlers.ts (from repository-contracts.ts)

#### Preload & Renderer

- [ ] T084 [US5] Expose git.repo.openBranchInNewTab() via contextBridge in src/preload/git-api.ts
- [ ] T085 [P] [US5] Add tab management to git-store.ts in src/renderer/stores/git-store.ts (track multiple repository + branch tabs)
- [ ] T086 [P] [US5] Create tab UI component in src/renderer/components/TabBar.tsx (shows repository + branch for each tab)
- [ ] T087 [US5] Add "Open Branch in New Tab" option to BranchSelector in src/renderer/components/git/BranchSelector.tsx

**Completion Criteria**: ✅ Can open multiple branches in tabs, each tab maintains independent state, tab labels show repository and branch

---

## Phase 8: User Story 6 (P6) - Azure DevOps Repository Support

**Story Goal**: Enterprise users can connect to Azure DevOps repositories with same functionality as GitHub

**Independent Test**: Connect to Azure DevOps repository, perform same operations as GitHub (view files, switch branches)

**Acceptance Criteria**:
- Azure DevOps repository opens with same functionality as GitHub (AS #1)
- Can navigate project structure (AS #2)
- Appropriate guidance for Azure DevOps PAT creation (AS #3)

### Tasks

#### Main Process - Azure DevOps Client

- [ ] T088 [P] [US6] Implement AzureDevOpsClient.listBranches() in src/main/services/git/azure-client.ts (from research.md section 4)
- [ ] T089 [P] [US6] Implement AzureDevOpsClient.getFileContent() in src/main/services/git/azure-client.ts
- [ ] T090 [P] [US6] Implement AzureDevOpsClient.getRepositoryTree() in src/main/services/git/azure-client.ts

#### Main Process - OAuth for Azure DevOps

- [ ] T091 [P] [US6] Implement OAuthService.authenticateAzureDevOps() in src/main/services/git/oauth-service.ts (from research.md section 2, Azure AD endpoints)

#### Integration

- [ ] T092 [US6] Extend RepositoryService to detect and route to Azure client in src/main/services/git/repository-service.ts (use URL parser)
- [ ] T093 [US6] Add Azure DevOps URL validation to RepoConnectDialog in src/renderer/components/git/RepoConnectDialog.tsx
- [ ] T094 [US6] Add Azure DevOps icon support to recent items in src/renderer/components/recent/RecentItemsList.tsx

#### OAuth Implementation (Optional - If US1 needs OAuth)

- [ ] T095 [US6] Implement OAuthService.authenticateGitHub() in src/main/services/git/oauth-service.ts (from research.md section 2)
- [ ] T096 [US6] Implement auth:oauth IPC handler in src/main/ipc/git-handlers.ts
- [ ] T097 [US6] Expose git.auth.initiateOAuth() via contextBridge in src/preload/git-api.ts
- [ ] T098 [US6] Add OAuth flow to RepoConnectDialog in src/renderer/components/git/RepoConnectDialog.tsx

**Completion Criteria**: ✅ Can connect to Azure DevOps repositories, all operations work identically to GitHub, proper guidance for Azure PAT

---

## Phase 9: Polish & Cross-Cutting Concerns

**Goal**: Refine user experience, handle edge cases, performance optimization

**Prerequisites**: All user stories complete

### Tasks

#### Error Handling & Edge Cases

- [ ] T099 [P] Implement error boundary for Git operations in src/renderer/components/ErrorBoundary.tsx
- [ ] T100 [P] Add retry logic for failed API calls in src/main/services/git/http-client.ts (integrate RateLimiter)
- [ ] T101 [P] Handle large file warning (>10MB) in src/main/services/git/repository-service.ts (FR-015 edge case)
- [ ] T102 [P] Implement pagination for repositories with thousands of files in src/renderer/components/git/RepoFileTree.tsx (FR-015 edge case)

#### Performance Optimization

- [ ] T103 [P] Add loading indicators for all async operations in src/renderer/components/LoadingIndicator.tsx
- [ ] T104 [P] Implement cache pre-warming for offline use in src/main/services/storage/cache-manager.ts (from cache-contracts.ts)
- [ ] T105 Optimize file tree rendering with virtualization in src/renderer/components/git/RepoFileTree.tsx (@tanstack/react-virtual)

#### Security Hardening

- [ ] T106 Audit all IPC handlers for input validation in src/main/ipc/git-handlers.ts (Zod schemas)
- [ ] T107 Add security logging for failed auth attempts in src/main/services/git/auth-service.ts

#### Documentation

- [ ] T108 Update README.md with Git repository integration feature
- [ ] T109 Create user guide from quickstart.md content in docs/git-integration-guide.md

**Completion Criteria**: ✅ All edge cases handled, performance meets requirements, security audit complete, documentation updated

---

## Dependency Graph

### User Story Completion Order

```text
Phase 1: Setup
  ↓
Phase 2: Foundational Infrastructure
  ↓
  ├─→ Phase 3: US1 (P1) - Connect & View [MVP] ← START HERE
  │     ↓
  │   ├─→ Phase 4: US2 (P2) - PAT Auth (depends on US1 connect flow)
  │   ├─→ Phase 5: US3 (P3) - Branch Switching (depends on US1 file viewing)
  │   └─→ Phase 6: US4 (P4) - Recent Items (depends on US1 connection)
  │         ↓
  │       Phase 7: US5 (P5) - Multiple Branches (depends on US3 branch switching)
  │         ↓
  │       Phase 8: US6 (P6) - Azure DevOps (extends US1-US5 to new provider)
  │
  └─→ Phase 9: Polish & Cross-Cutting
```

**Critical Path**: Phase 1 → Phase 2 → Phase 3 (US1) → All others can proceed in parallel

**Story Dependencies**:
- **US1 (P1)**: No dependencies - **START HERE FOR MVP**
- **US2 (P2)**: Depends on US1 (authentication flows)
- **US3 (P3)**: Depends on US1 (file viewing)
- **US4 (P4)**: Depends on US1 (repository connection)
- **US5 (P5)**: Depends on US3 (branch switching) and US1
- **US6 (P6)**: Depends on US1-US5 (extends to Azure)

---

## Parallel Execution Examples

### Phase 2: Foundational (6 parallel tasks)
```bash
# Can all run in parallel after T014 completes:
T015, T016, T017, T018, T019, T020, T021, T022, T023 (all [P] tasks)
```

### Phase 3: US1 - Connect & View (15 parallel tasks)
```bash
# After type definitions (T029-T031) complete, can run in parallel:
Group 1: T032, T033, T034 (GitHub client methods)
Group 2: T038, T039, T040, T041 (IPC handlers)
Group 3: T046, T047, T048 (React hooks)
Group 4: T049, T050, T051 (UI components)
```

### Phase 4: US2 - PAT Auth (4 parallel tasks)
```bash
# After T059 completes:
T061, T062 (renderer updates)
```

### Phase 9: Polish (5 parallel tasks)
```bash
# Can all run in parallel:
T099, T100, T101, T102, T103, T104
```

---

## Testing Strategy

**Note**: Tests are not included in this task list as they were not explicitly requested in the feature specification. If TDD approach is desired, add contract tests before implementation tasks in each phase.

**Manual Testing per Story**:
- **US1**: Independent test in spec.md AS #1-4
- **US2**: Independent test in spec.md AS #1-3
- **US3**: Independent test in spec.md AS #1-4
- **US4**: Independent test in spec.md AS #1-4
- **US5**: Independent test in spec.md AS #1-4
- **US6**: Independent test in spec.md AS #1-3

**Integration Testing**:
- After each user story completes, run its independent test
- Verify success criteria before proceeding to next story
- Each story should work independently even if later stories aren't implemented

---

## MVP Recommendation

**Suggested MVP Scope**: User Story 1 (P1) only

**Includes**:
- Phases 1, 2, 3 (Tasks T001-T055)
- Connect to public GitHub repositories
- View markdown files with images
- Basic file tree navigation
- Offline detection
- Cache functionality

**Delivers**: Core value proposition - view remote markdown without cloning

**Validation**: Can users successfully view markdown documentation from a GitHub repository?

**After MVP**: Add stories incrementally based on user feedback

---

## Format Validation

✅ **All tasks follow required format**: `- [ ] [TaskID] [Labels] Description with file path`
✅ **Task IDs**: Sequential T001-T109
✅ **[P] markers**: 47 tasks marked parallelizable
✅ **[Story] labels**: All user story tasks properly labeled [US1]-[US6]
✅ **File paths**: All implementation tasks include specific file paths
✅ **Phases**: Organized by user story priority (P1-P6)

---

**Total Implementation Tasks**: 109
**Estimated Complexity**: High (OAuth, IPC, caching, offline support)
**Key Technologies**: TypeScript, Electron, React, Zustand, Zod, axios

**Next Steps**: Begin with Phase 1 (Setup), then Phase 2 (Foundational), then implement User Story 1 (P1) for MVP delivery.
