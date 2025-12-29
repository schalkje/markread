# IPC Pattern Quick Reference Guide

A concise reference for implementing the recommended secure IPC pattern for Git operations.

---

## The 3-Layer Pattern at a Glance

```
┌─────────────────────────────────────────┐
│ Layer 1: Type Definitions               │
│ src/shared/types/git-contracts.ts       │
│ └─ Request/Response interfaces          │
│ └─ Error types                          │
└─────────────────────────────────────────┘
           ↓ Enforced by TypeScript
┌─────────────────────────────────────────┐
│ Layer 2: IPC API Surface                │
│ src/preload/git-api.ts                  │
│ └─ contextBridge.exposeInMainWorld()    │
│ └─ Type-safe API for renderer           │
│                                          │
│ src/main/ipc-handlers.ts                │
│ └─ ipcMain.handle()                     │
│ └─ Zod schema validation                │
└─────────────────────────────────────────┘
           ↓ Validated by Zod
┌─────────────────────────────────────────┐
│ Layer 3: Business Logic                 │
│ src/main/services/git/                  │
│ └─ github-client.ts                     │
│ └─ azure-client.ts                      │
│ └─ auth-service.ts                      │
│ └─ credential-store.ts                  │
│ └─ rate-limiter.ts                      │
└─────────────────────────────────────────┘
```

---

## Decision Table

| Aspect | Why Chosen |
|--------|-----------|
| **API Pattern** | contextBridge | Explicit whitelist, XSS-resistant |
| **Validation** | Zod schemas | Runtime catch of bad input |
| **Credential Storage** | OS credential manager (keytar) | OS-level encryption, not custom |
| **Error Handling** | Typed envelopes | Enforces explicit error handling |
| **Rate Limiting** | Main process | Prevents XSS quota exhaustion |
| **Timeouts** | 30 seconds default | All operations have limits |

---

## Checklist: Implementing a New Git IPC Operation

### Step 1: Define Types (git-contracts.ts)

```typescript
export namespace GitOperations {
  export interface YourOperationRequest {
    // Required fields with validation rules
    repositoryId: string;
    // Optional fields
    branch?: string;
  }

  export interface YourOperationResponse {
    success: boolean;
    data?: any;
    error?: GitErrorResponse;
  }
}
```

### Step 2: Add to Preload API (git-api.ts)

```typescript
export interface GitAPI {
  repo: {
    yourOperation: (req: GitOperations.YourOperationRequest)
      => Promise<GitOperations.YourOperationResponse>;
  };
}

contextBridge.exposeInMainWorld('git', {
  repo: {
    yourOperation: (req) => ipcRenderer.invoke('git:yourOperation', req),
  }
} as GitAPI);
```

### Step 3: Create Zod Schema (ipc-handlers.ts)

```typescript
const YourOperationSchema = z.object({
  repositoryId: z.string().uuid(),
  branch: z.string().optional(),
});
```

### Step 4: Register IPC Handler (ipc-handlers.ts)

```typescript
ipcMain.handle('git:yourOperation', async (_event, payload) => {
  try {
    const request = YourOperationSchema.parse(payload);
    const result = await gitService.yourOperation(request);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: GitErrorHandler.mapError(error, generateRequestId()),
    };
  }
});
```

### Step 5: Implement Service Method (services/git/)

```typescript
async yourOperation(request: GitOperations.YourOperationRequest): Promise<any> {
  // Actual business logic here
  // - Retrieve credentials from credential store (not IPC!)
  // - Call GitHub/Azure DevOps API
  // - Handle rate limiting
  // - Return result
}
```

### Step 6: Use in Renderer

```typescript
const result = await window.git.repo.yourOperation({
  repositoryId: 'abc-123',
});

if (result.success) {
  console.log('Success:', result.data);
} else {
  console.error('Error:', result.error.message);
}
```

---

## Security Considerations Checklist

For each new IPC operation, verify:

- [ ] **No credentials in request**: Retrieve from keytar in main process only
- [ ] **URL validation**: Must be HTTPS, from github.com or dev.azure.com
- [ ] **Path validation**: No `..`, allowlist characters
- [ ] **Zod schema**: All fields validated before business logic
- [ ] **Error safety**: No stack traces, secrets, or internal details in error messages
- [ ] **Timeout**: Operation has 30-second limit or appropriate custom limit
- [ ] **Rate limiting**: Wrapped with rateLimiter.withRateLimit()
- [ ] **Cancellation**: Long operations support AbortController
- [ ] **Type safety**: Both preload and handler have matching types

---

## Common Patterns

### Pattern 1: Simple Request-Response (< 5s)

```typescript
// Handler
ipcMain.handle('git:quickOperation', async (_event, payload) => {
  const request = QuickOperationSchema.parse(payload);
  const result = await service.quickOperation(request);
  return { success: true, data: result };
});

// Renderer
const result = await window.git.repo.quickOperation({ /* ... */ });
```

### Pattern 2: Long-Running with Progress

```typescript
// Handler
ipcMain.handle('git:longOperation', async (event, payload) => {
  const { operationId } = generateOperationId();

  try {
    const result = await service.longOperation(payload, {
      onProgress: (progress) => {
        event.sender.send('git:longOperation:progress', { operationId, ...progress });
      },
    });
    return { success: true, operationId, data: result };
  } catch (error) {
    event.sender.send('git:longOperation:error', { operationId, error });
    return { success: false, error };
  }
});

// Renderer
const { operationId } = await window.git.repo.longOperation({});

window.electron.on('git:longOperation:progress', (event) => {
  updateProgress(event.filesProcessed / event.totalFiles);
});
```

### Pattern 3: Operation with Cancellation

```typescript
// Handler
const activeOps = new Map();

ipcMain.handle('git:cancelOperation', async (_event, { operationId }) => {
  const controller = activeOps.get(operationId);
  if (controller) {
    controller.abort();
    return { success: true };
  }
  return { success: false };
});

// Service (receives signal)
async someOperation(payload, { signal }) {
  if (signal?.aborted) throw new Error('Cancelled');
  // Operation logic
}
```

---

## Error Codes Reference

| Code | Meaning | Retryable | Action |
|------|---------|-----------|--------|
| `INVALID_URL` | Bad URL format | No | Show validation error |
| `AUTH_FAILED` | Wrong credentials | Yes | Ask user to re-authenticate |
| `TOKEN_EXPIRED` | OAuth token expired | Yes | Redirect to re-auth |
| `NETWORK_ERROR` | Network down | Yes | Retry with exponential backoff |
| `TIMEOUT` | Operation too slow | Yes | Retry, may fail again |
| `RATE_LIMIT` | API rate limit hit | Yes | Wait `retryAfterSeconds` |
| `NOT_FOUND` | Resource missing | No | Tell user "not found" |
| `PERMISSION_DENIED` | Access forbidden | No | Tell user no access |
| `UNKNOWN` | Unexpected error | Yes | Log error code, retry |

---

## Type Safety Verification Checklist

For every IPC operation, verify:

```
┌─ Compile Time (TypeScript)
│  ├─ Preload interface defines operation signature
│  ├─ Renderer uses correct request shape
│  └─ Type mismatch caught at compile
│
├─ IPC Boundary (Zod)
│  ├─ Schema validates payload structure
│  ├─ Schema validates field constraints (URLs, paths, etc)
│  └─ Invalid payload rejected before business logic
│
└─ Runtime (Domain Logic)
│  ├─ Handler assumes valid input after schema.parse()
│  └─ No type coercion needed, all types known
```

---

## Performance Guidelines

| Operation | Target | Acceptable | Unacceptable |
|-----------|--------|------------|-------------|
| Connect repo | 30s | < 45s | > 60s |
| Switch branch | 5s | < 10s | > 15s |
| List branches | 2s | < 3s | > 5s |
| Fetch file (cached) | 1s | < 1.5s | > 2s |
| Fetch file (uncached) | 5s | < 10s | > 30s |
| List files (< 1000) | 3s | < 5s | > 10s |

All operations timeout at 30s by default unless explicitly longer timeout is required.

---

## File Structure Quick Reference

```
src/
├── main/
│   ├── ipc/
│   │   ├── git-handlers.ts          ← Register handlers
│   │   ├── git-rate-limiter.ts      ← Rate limiting
│   │   └── git-error-handler.ts     ← Error mapping
│   └── services/
│       └── git/
│           ├── git-service.ts       ← Orchestration
│           ├── github-client.ts     ← GitHub API
│           ├── azure-client.ts      ← Azure API
│           ├── auth-service.ts      ← OAuth + PAT
│           └── credential-store.ts  ← OS credential manager
│
├── preload/
│   └── git-api.ts                   ← contextBridge exposure
│
├── renderer/
│   ├── hooks/
│   │   ├── useGitOperation.ts       ← Generic operation hook
│   │   └── useGitError.ts           ← Error handling
│   └── components/
│       └── git/
│           ├── RepoConnect.tsx      ← Connection UI
│           ├── BranchSelector.tsx   ← Branch switching
│           └── FileTree.tsx         ← File browser
│
└── shared/
    └── types/
        ├── git-contracts.ts         ← Request/response types
        └── git-errors.ts            ← Error types
```

---

## Security Hardening Reminders

1. **Credentials**: Never ever send over IPC
   ```typescript
   // WRONG ❌
   ipcRenderer.invoke('git:auth', { token: userToken });

   // CORRECT ✅
   // Main process retrieves from keytar internally
   ```

2. **Error Messages**: Don't leak sensitive info
   ```typescript
   // WRONG ❌
   return { error: `Token ${token} is invalid` };

   // CORRECT ✅
   return { error: { code: 'AUTH_FAILED', message: 'Invalid token' } };
   ```

3. **URL Validation**: Always check hostname
   ```typescript
   // WRONG ❌
   const url = userInput; // "https://evil.com/steal-data"
   await fetch(url);

   // CORRECT ✅
   const urlObj = new URL(url);
   if (urlObj.hostname !== 'github.com' && urlObj.hostname !== 'dev.azure.com') {
     throw new Error('Invalid host');
   }
   ```

4. **Path Traversal**: Block `..` in file paths
   ```typescript
   // WRONG ❌
   const filePath = userInput; // "../../etc/passwd"
   await readFile(filePath);

   // CORRECT ✅
   const schema = z.object({
     filePath: z.string().refine(p => !p.includes('..'), 'No traversal')
   });
   ```

---

## Testing Checklist

### Unit Tests
- [ ] Zod schemas validate correct input
- [ ] Zod schemas reject invalid input
- [ ] Error mapping produces correct error codes
- [ ] Rate limiter implements exponential backoff

### Integration Tests
- [ ] GitHub authentication works
- [ ] Azure DevOps authentication works
- [ ] Rate limiting works with real API
- [ ] Credentials stored/retrieved from OS manager
- [ ] Timeout kills long-running operations

### Security Tests
- [ ] Path traversal attempts rejected
- [ ] Invalid URLs rejected
- [ ] Credentials never in IPC logs
- [ ] Error messages don't leak info

---

## Deployment Checklist

Before shipping:
- [ ] All IPC operations have Zod schemas
- [ ] No credentials transmitted over IPC
- [ ] All errors use typed envelopes
- [ ] Rate limiting active and tested
- [ ] Timeouts configured on all operations
- [ ] HTTPS URLs enforced
- [ ] Path traversal protection active
- [ ] Security tests passing
- [ ] Performance tests meeting targets
- [ ] Code reviewed by security team

---

## Quick Answers to Common Questions

**Q: Can I send the user's GitHub token over IPC?**
A: No. Retrieve it from OS credential manager (keytar) in the main process only.

**Q: What if an IPC message is malformed?**
A: Zod will throw, the handler catches it and returns a typed error response.

**Q: How do I implement cancellation?**
A: Use AbortController. Main process monitors `signal.aborted`, renderer calls cancel handler.

**Q: How long should operations timeout?**
A: Default 30 seconds. For GitHub API calls: 30s is reasonable.

**Q: Can the renderer call internal IPC handlers?**
A: No. Only methods exposed via contextBridge are available.

**Q: How do I debug type mismatches?**
A: Check: preload interface → handler signature → return type. Use TypeScript strict mode.

**Q: What error should I return for rate limiting?**
A: `{ code: 'RATE_LIMIT', message: '...', retryAfterSeconds: 60 }`

**Q: How do I add a new Git operation?**
A: Follow the 6-step checklist above (define types → preload → schema → handler → service → renderer).

---

This reference guide should answer 95% of implementation questions. For details, see the full research documents.
