# IPC Contracts: Git Repository Integration

**Feature**: 001-git-repo-integration | **Date**: 2025-12-29

---

## Overview

This directory contains TypeScript contract definitions for all IPC operations between the main process and renderer process in the Git repository integration feature.

All operations follow a standard request/response pattern with typed error handling.

---

## Contract Files

| File | Description | IPC Channels |
|------|-------------|--------------|
| [repository-contracts.ts](./repository-contracts.ts) | Repository connection and management | `git:connect`, `git:disconnect`, `git:listBranches`, `git:switchBranch` |
| [file-contracts.ts](./file-contracts.ts) | File fetching and tree operations | `git:fetchFile`, `git:fetchTree`, `git:refreshFile` |
| [auth-contracts.ts](./auth-contracts.ts) | Authentication operations | `git:auth:oauth`, `git:auth:pat`, `git:auth:refresh` |
| [cache-contracts.ts](./cache-contracts.ts) | Cache management | `git:cache:get`, `git:cache:clear`, `git:cache:stats` |
| [connectivity-contracts.ts](./connectivity-contracts.ts) | Network connectivity checks | `git:connectivity:check` |
| [error-contracts.ts](./error-contracts.ts) | Standard error response types | N/A (used across all operations) |

---

## Standard Response Envelope

All IPC operations return a standard envelope:

```typescript
type IPCResponse<T> =
  | { success: true; data: T }
  | { success: false; error: GitErrorResponse };
```

This forces explicit error handling in the renderer process.

---

## Usage in Main Process

```typescript
// src/main/ipc/git-handlers.ts
import { ipcMain } from 'electron';
import { ConnectRepositoryRequestSchema } from '../../../specs/001-git-repo-integration/contracts';

ipcMain.handle('git:connect', async (_event, payload) => {
  try {
    // Validate request
    const request = ConnectRepositoryRequestSchema.parse(payload);

    // Execute operation
    const result = await gitService.connect(request.url, request.authMethod);

    // Return success response
    return {
      success: true,
      data: {
        repositoryId: result.id,
        defaultBranch: result.defaultBranch,
        branches: result.branches,
      }
    };
  } catch (error) {
    // Return error response
    return {
      success: false,
      error: GitErrorHandler.mapError(error),
    };
  }
});
```

---

## Usage in Renderer Process

```typescript
// src/renderer/services/git-service.ts
import type { ConnectRepositoryRequest, ConnectRepositoryResponse } from '../../../specs/001-git-repo-integration/contracts';

export class GitService {
  async connect(url: string, authMethod: 'oauth' | 'pat'): Promise<ConnectRepositoryResponse> {
    const request: ConnectRepositoryRequest = { url, authMethod };

    const response = await window.git.repo.connect(request);

    if (!response.success) {
      throw new Error(response.error.message);
    }

    return response.data;
  }
}
```

---

## Type Safety Guarantees

1. **Compile-time**: TypeScript enforces correct request/response types
2. **Runtime**: Zod schemas validate all IPC payloads in main process
3. **Error handling**: Typed error codes prevent magic strings
4. **Documentation**: Contracts serve as the source of truth for API

---

## Adding New Operations

When adding a new Git operation:

1. Define request/response types in appropriate contract file
2. Create Zod schema for request validation
3. Document error codes in error-contracts.ts
4. Register IPC handler in src/main/ipc/git-handlers.ts
5. Expose via contextBridge in src/preload/git-api.ts
6. Create renderer-side wrapper in src/renderer/services/git-service.ts
7. Add unit tests for validation and error handling
