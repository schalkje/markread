# Implementation Plan: Git Repository Integration

**Branch**: `001-git-repo-integration` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-git-repo-integration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable MarkRead to connect to and browse remote Git repositories (GitHub and Azure DevOps) with full authentication support, branch navigation, file caching, and offline capabilities. This feature transforms MarkRead from a local-only markdown viewer into a unified tool for both local and remote documentation access.

## Technical Context

**Language/Version**: TypeScript 5.7 with Node.js (Electron 33.4.11)
**Primary Dependencies**: React 18.3.1, Zustand 4.5.0, markdown-it 14.1.0, Zod 3.22.0, react-router-dom 6.20.0
**Storage**: File system cache (AppData folder), OS credential manager (Windows Credential Manager/macOS Keychain/Linux Secret Service)
**Testing**: Vitest 2.1.0 (unit/integration), Playwright 1.49.0 (e2e)
**Target Platform**: Windows/macOS/Linux desktop (Electron multi-platform)
**Project Type**: Single Electron desktop application
**Performance Goals**: <30s initial connection, <5s branch switching, <1s cached file load, <5s uncached file load
**Constraints**: <100MB cache per repository, 5GB total cache limit, offline-capable with cached content, exponential backoff for API rate limits
**Scale/Scope**: Multiple repositories, multiple simultaneous branches, thousands of files per repository, 50+ recent items

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality (Constitution Principle I)

**Gate**: Critical functionality (authentication, API integration, caching, offline detection) MUST have unit tests.

**Status**: ✅ PASS - Feature design includes testable abstractions for:
- Authentication service (OAuth + PAT flows)
- GitHub/Azure DevOps API clients (mockable for testing)
- Cache management service (file system operations)
- Network connectivity detection

**Action**: Phase 1 will define clear service boundaries to enable comprehensive unit testing.

### II. User Experience Consistency (Constitution Principle II)

**Gate**: All error scenarios MUST provide clear, actionable error messages to users.

**Status**: ✅ PASS - Feature spec (FR-017, FR-019) explicitly requires:
- Authentication failures with specific failure reasons
- Network failures with appropriate messaging
- Invalid URL errors with clear descriptions
- Offline mode with visible indicator badge

**Action**: Phase 1 contracts will enumerate all error states and their user-facing messages.

### III. Documentation Standard (Constitution Principle III)

**Gate**: OAuth setup and PAT creation process MUST be documented for users.

**Status**: ✅ PASS - Feature spec (User Story 2) includes guidance requirements for:
- PAT creation for GitHub and Azure DevOps
- OAuth authentication flows
- Permission requirements

**Action**: Phase 1 quickstart.md will include step-by-step authentication setup.

### IV. Performance Requirements (Constitution Principle IV)

**Gate**: Feature MUST meet specified performance constraints (<30s connection, <5s branch switch, <1s cached load).

**Status**: ✅ PASS - Performance goals explicitly defined in Technical Context and Success Criteria (SC-001 through SC-005).

**Action**: Phase 1 will identify performance-critical paths; implementation will include performance testing before ship.

### Post-Phase 1 Re-Evaluation

**Date**: 2025-12-29 | **Status**: ✅ ALL GATES STILL PASS

After completing Phase 1 design (research.md, data-model.md, contracts/, quickstart.md), all constitution gates have been re-evaluated:

**I. Code Quality**: ✅ PASS (CONFIRMED)
- ✅ Zod schemas defined for all IPC requests (contracts/)
- ✅ Service boundaries clearly defined (data-model.md, contracts/)
- ✅ Testable abstractions documented (research.md sections 6-8)
- **Evidence**: All contracts include Zod schemas for validation; service layer design enables mocking for unit tests

**II. User Experience Consistency**: ✅ PASS (CONFIRMED)
- ✅ All error codes enumerated with user-facing messages (error-contracts.ts)
- ✅ Consistent error envelope across all operations (IPCResponse<T>)
- ✅ Clear, actionable error messages in ERROR_MESSAGES constant
- **Evidence**: error-contracts.ts defines 15 error codes with clear messages; quickstart.md troubleshooting section covers all scenarios

**III. Documentation Standard**: ✅ PASS (CONFIRMED)
- ✅ OAuth and PAT setup fully documented (quickstart.md sections "Creating a GitHub Personal Access Token" and "Creating an Azure DevOps Personal Access Token")
- ✅ Step-by-step authentication flows for both providers (quickstart.md)
- ✅ Technical decisions documented (research.md)
- **Evidence**: quickstart.md is 268 lines of comprehensive user documentation

**IV. Performance Requirements**: ✅ PASS (CONFIRMED)
- ✅ Cache strategy designed for <1s cached load (LRU with file system persistence, research.md section 7)
- ✅ Performance-critical paths identified (data-model.md cache entries, file operations)
- ✅ Rate limiting strategy defined (research.md section 5 - exponential backoff with jitter)
- **Evidence**: CacheManager design meets 100MB per repo and 5GB total limits; LRU eviction ensures performance

### Complexity Assessment

**New Dependencies Required**: ~~HTTP client (NEEDS CLARIFICATION: fetch vs axios), Electron OAuth library (NEEDS CLARIFICATION), OS credential manager integration (NEEDS CLARIFICATION)~~ **RESOLVED**:
- axios (HTTP client) - ~12KB
- electron-store (settings persistence) - ~5KB
- Electron safeStorage API (built-in, no dependency)

**Architectural Impact**: Medium - Adds new service layer for remote repositories alongside existing local file system service, requires cache management subsystem

**Risk Level**: Medium - OAuth flows and API rate limiting require careful handling; offline/online transitions need robust state management

**Mitigation**: All risks addressed in research.md with proven patterns (contextBridge security, exponential backoff, LRU caching)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── main/                      # Electron main process
│   ├── services/
│   │   ├── git/              # NEW: Git repository services
│   │   │   ├── github-client.ts
│   │   │   ├── azure-client.ts
│   │   │   ├── auth-service.ts
│   │   │   └── repo-cache.ts
│   │   └── storage/          # NEW: Cache and credential storage
│   │       ├── cache-manager.ts
│   │       └── credential-store.ts
│   └── ipc/                  # NEW: IPC handlers for Git operations
│       └── git-handlers.ts
├── preload/                   # Electron preload scripts
│   └── git-api.ts            # NEW: Git API exposure to renderer
├── renderer/                  # React UI
│   ├── components/
│   │   ├── git/              # NEW: Git-specific UI components
│   │   │   ├── RepoConnectDialog.tsx
│   │   │   ├── BranchSelector.tsx
│   │   │   ├── RepoFileTree.tsx
│   │   │   └── OfflineBadge.tsx
│   │   └── recent/           # MODIFIED: Enhanced recent items
│   │       └── RecentItemsList.tsx
│   ├── services/
│   │   └── git-service.ts    # NEW: Renderer-side Git service wrapper
│   ├── stores/
│   │   ├── git-store.ts      # NEW: Zustand store for Git state
│   │   └── recent-store.ts   # MODIFIED: Support Git repositories
│   └── hooks/
│       ├── useGitRepo.ts     # NEW: Repository management hook
│       └── useOfflineStatus.ts # NEW: Offline detection hook
└── shared/
    └── types/
        ├── git.ts            # NEW: Git-related type definitions
        └── repository.ts     # NEW: Repository entity types

tests/
├── integration/
│   └── git/                  # NEW: Git integration tests
│       ├── github-auth.test.ts
│       ├── azure-auth.test.ts
│       └── repo-caching.test.ts
└── unit/
    └── services/
        └── git/              # NEW: Git service unit tests
            ├── github-client.test.ts
            ├── azure-client.test.ts
            └── cache-manager.test.ts
```

**Structure Decision**: Electron single-project structure with clear separation between main process (Node.js backend) and renderer process (React frontend). Git integration services reside in main process for security (handling credentials) and file system access (caching). Renderer communicates via IPC for Git operations.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: ✅ No constitution violations - all gates passed.

The feature introduces moderate architectural complexity (new service layer, cache management, OAuth flows) but this complexity is justified by the functional requirements and aligns with constitution principles. No simpler alternatives exist for the required functionality (remote repository access, authentication, offline support).
