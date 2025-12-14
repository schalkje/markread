# IPC Contracts

This directory contains TypeScript contract definitions for Inter-Process Communication (IPC) between Electron's **main process** (Node.js) and **renderer process** (Chromium).

---

## Architecture Pattern

MarkRead uses Electron's secure **invoke/handle** pattern with **context isolation**:

```
┌─────────────────────────────────────────────────────────────┐
│  Renderer Process (Chromium)                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Vue Components & Services                             │ │
│  │    ↓                                                    │ │
│  │  window.electronAPI.file.read(payload)                 │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │ Context Bridge (preload script)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Main Process (Node.js)                                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ipcMain.handle('file:read', async (event, payload) => │ │
│  │    // File system operations, native APIs              │ │
│  │  });                                                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Contract Files

| File | Description | Key Features |
|------|-------------|--------------|
| [file-operations.contract.ts](file-operations.contract.ts) | File system operations | Open, read, watch, resolve paths (FR-019-025, FR-040) |
| [settings.contract.ts](settings.contract.ts) | Settings management | Load, save, validate, import/export (FR-047-062, FR-076-079) |
| [search.contract.ts](search.contract.ts) | Search operations | Cross-file search with progress, history (FR-042-046, FR-071-073) |
| [tabs.contract.ts](tabs.contract.ts) | Tab management | Create, close, switch, update state (FR-013-017) |
| [theme.contract.ts](theme.contract.ts) | Theme system | Load, apply, switch themes (FR-030-034, FR-063-066) |
| [window.contract.ts](window.contract.ts) | Window management | Bounds, menus, shortcuts (FR-026-029, FR-062) |
| [ui-state.contract.ts](ui-state.contract.ts) | UI state persistence | Window state, recent files, split layouts (FR-007, FR-018, FR-025) |

---

## Contract Structure

Each contract file follows this pattern:

### 1. Request/Response Pairs (invoke/handle)

```typescript
export namespace OperationName {
  export interface SomeRequest {
    channel: 'operation:action';  // IPC channel name
    payload: {
      // Request parameters
    };
  }

  export interface SomeResponse {
    success: boolean;
    data?: any;                   // Optional data on success
    error?: string;               // Optional error message
  }
}
```

### 2. Events (one-way, main → renderer)

```typescript
export namespace OperationEvents {
  export interface SomeEvent {
    channel: 'operation:eventName';
    payload: {
      // Event data
    };
  }
}
```

### 3. Supporting Types

```typescript
export interface SomeDataType {
  // Shared types used in requests/responses
}
```

### 4. Usage Examples

Each contract includes code examples showing:
- How to call from renderer
- How to handle in main process
- How to expose via preload script

---

## Security Principles

All IPC communication follows Electron security best practices:

### 1. Context Isolation

Preload script uses `contextBridge` to expose only specific APIs:

```typescript
// preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  file: {
    read: (payload) => ipcRenderer.invoke('file:read', payload),
    // ... other file operations
  },
  // ... other API categories
});
```

**No direct access** to Node.js APIs or `ipcRenderer` from renderer code.

### 2. Input Validation

Main process validates all IPC payloads using **Zod schemas**:

```typescript
import { z } from 'zod';

const ReadFilePayloadSchema = z.object({
  filePath: z.string().min(1).refine(isAbsolutePath)
});

ipcMain.handle('file:read', async (event, payload) => {
  const validated = ReadFilePayloadSchema.parse(payload);  // Throws on invalid input
  // ... safe to proceed
});
```

### 3. Sender Validation

Handlers verify the sender's origin:

```typescript
ipcMain.handle('file:read', async (event, payload) => {
  const senderURL = event.sender.getURL();
  if (!senderURL.startsWith('file://')) {
    throw new Error('Unauthorized sender');
  }
  // ... proceed
});
```

### 4. Rate Limiting

Expensive operations are rate-limited:

```typescript
const rateLimiter = new Map<string, number>();

ipcMain.handle('search:inFiles', async (event, payload) => {
  const senderId = event.sender.id;
  const lastCall = rateLimiter.get(senderId) || 0;

  if (Date.now() - lastCall < 1000) {  // Max 1 search/second
    throw new Error('Rate limit exceeded');
  }

  rateLimiter.set(senderId, Date.now());
  // ... proceed with search
});
```

---

## Implementation Checklist

- [ ] Define contracts (Phase 1) ✅ This directory
- [ ] Generate Zod schemas from contracts (Phase 2: Implementation)
- [ ] Implement main process handlers in `src/main/ipc-handlers.ts`
- [ ] Implement preload script in `src/preload/index.ts`
- [ ] Create renderer API wrapper in `src/renderer/services/electron-api.ts`
- [ ] Write integration tests in `tests/integration/ipc.test.ts`

---

## Contract Versioning

Contracts are versioned using semantic versioning in settings/UIState:

```typescript
export interface Settings {
  version: string;  // e.g., "1.0.0"
  // ...
}
```

**Breaking changes** (incompatible payload structures) require major version bump and migration logic.

---

## Related Documentation

- [Data Model](../data-model.md) - Entity definitions used in contracts
- [Research](../research.md) - Security best practices (Section 6)
- [Spec](../spec.md) - Functional requirements mapped to contracts

---

**Generated**: December 14, 2025
**Feature**: 006-electron-redesign
