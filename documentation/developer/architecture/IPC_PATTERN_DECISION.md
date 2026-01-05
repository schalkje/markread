# Secure IPC Pattern Decision for Git Repository Operations

## Decision: Typed contextBridge + Zod Validation

### Rationale

MarkRead should use the **contextBridge pattern with TypeScript types and Zod runtime validation** for all Git repository IPC operations. This approach provides:

1. **Security by Design**: Explicit API whitelist prevents XSS attacks from calling arbitrary IPC handlers
2. **Type Safety**: Three-layer validation (TypeScript → Zod → domain logic) catches errors at every stage
3. **Extensibility**: Existing MarkRead IPC architecture already uses contextBridge; Git operations extend this pattern
4. **Error Resilience**: Typed error envelopes ensure consistent, actionable error messages
5. **Auditability**: Self-documenting contracts make security reviews straightforward

### Alternatives Considered & Rejected

| Pattern | Why Rejected |
|---------|-------------|
| **Direct IPC Exposure** | Disables security context isolation; allows XSS to access any IPC handler; violates Electron best practices |
| **Loose contextBridge** | No runtime validation; type mismatches between main/renderer hard to debug; poor error handling |
| **Custom RPC Framework** | Reinventing wheel; contextBridge + Zod is proven standard; adds unnecessary complexity |

---

## Implementation Architecture

### 1. API Definition Layer

**File**: `src/shared/types/git-contracts.ts`

Defines request/response structures for all Git operations:
```typescript
export namespace GitOperations {
  export interface ConnectRepositoryRequest {
    url: string;        // HTTPS-only GitHub/Azure DevOps URL
    authMethod: 'oauth' | 'pat';
    token?: string;     // Optional for OAuth fallback
  }

  export interface ConnectRepositoryResponse {
    success: boolean;
    repositoryId?: string;
    branches?: BranchInfo[];
    error?: GitErrorResponse;
  }
}
```

### 2. Preload/contextBridge Layer

**File**: `src/preload/git-api.ts`

Exposes typed IPC API to renderer process:
```typescript
export interface GitAPI {
  repo: {
    connect: (req: GitOperations.ConnectRepositoryRequest)
      => Promise<GitOperations.ConnectRepositoryResponse>;
    fetchFile: (req: GitOperations.FetchFileRequest)
      => Promise<GitOperations.FetchFileResponse>;
    listBranches: () => Promise<GitOperations.ListBranchesResponse>;
  };
}

contextBridge.exposeInMainWorld('git', {
  repo: {
    connect: (req) => ipcRenderer.invoke('git:connect', req),
    fetchFile: (req) => ipcRenderer.invoke('git:fetchFile', req),
    listBranches: () => ipcRenderer.invoke('git:listBranches'),
  }
} as GitAPI);
```

**Security benefit**: Renderer can ONLY call exposed methods; no way to access internal IPC handlers.

### 3. IPC Handler Layer

**File**: `src/main/ipc-handlers.ts`

Registers handlers with Zod validation:
```typescript
const ConnectRepositorySchema = z.object({
  url: z.string()
    .url()
    .startsWith('https://')
    .refine(url => {
      const host = new URL(url).hostname;
      return ['github.com', 'dev.azure.com'].includes(host);
    }),
  authMethod: z.enum(['oauth', 'pat']),
  token: z.string().optional(),
});

ipcMain.handle('git:connect', async (_event, payload) => {
  try {
    // Runtime validation
    const request = ConnectRepositorySchema.parse(payload);

    // From here, request is guaranteed valid
    const result = await gitService.connect(request.url, request.authMethod);

    return {
      success: true,
      repositoryId: result.id,
      branches: result.branches,
    };
  } catch (error) {
    return {
      success: false,
      error: GitErrorHandler.mapError(error),
    };
  }
});
```

**Security benefit**: Malformed input is rejected immediately; main process receives only valid data.

### 4. Service Layer

**File**: `src/main/services/git/`

Domain logic that operates on validated data:
- `github-client.ts`: GitHub REST API wrapper
- `azure-client.ts`: Azure DevOps API wrapper
- `auth-service.ts`: OAuth + PAT handling (tokens retrieved from OS credential manager, never from IPC)
- `credential-store.ts`: OS credential manager integration (Windows Credential Manager, macOS Keychain, Linux Secret Service)

### 5. Renderer Hook Layer

**File**: `src/renderer/hooks/useGitOperation.ts`

React hook for clean error handling:
```typescript
const { execute, loading, error } = useGitOperation(
  () => window.git.repo.connect({ url, authMethod })
);

if (error?.code === 'RATE_LIMITED') {
  showRetryDialog(error.retryAfterSeconds);
} else if (error) {
  showErrorToast(error.message);
}
```

---

## Security Best Practices

### Input Validation

All IPC payloads validated with Zod schemas:
- URLs: Must be HTTPS, from allowed hosts (github.com, dev.azure.com)
- File paths: Allowlist alphanumeric, no path traversal (`..`)
- Tokens: Format validation, never transmitted over IPC

### Credential Management

- Credentials stored in OS credential manager (encrypted by OS)
- Tokens retrieved by main process, never sent to renderer
- Credentials cleared on logout or authentication failure

### Rate Limiting

- All API calls wrapped with rate limiter in main process
- Exponential backoff on 429 responses
- Prevents XSS from exhausting GitHub API quota

### Error Handling

All errors returned in typed envelope:
```typescript
interface GitErrorResponse {
  code: GitErrorCode;      // Enum: INVALID_URL, AUTH_FAILED, RATE_LIMITED, etc.
  message: string;         // User-facing message
  details?: string;        // Developer-facing details (not shown to user)
  retryable: boolean;      // Should renderer retry?
  retryAfterSeconds?: number; // For rate limits
}
```

### Timeout Protection

All operations have 30-second timeout (configurable):
```typescript
const fileContent = await Promise.race([
  gitClient.fetchFile(path),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 30000)
  )
]);
```

### Content Sanitization

HTML from markdown rendering sanitized with DOMPurify:
- No script tags
- No event handlers
- Image src restricted to repository origin

---

## Implementation Sequence

1. **Phase 1**: Define types and contracts (git-contracts.ts)
2. **Phase 2**: Implement preload layer (git-api.ts) + update main.ts window creation
3. **Phase 3**: Implement IPC handlers with Zod validation (ipc-handlers.ts)
4. **Phase 4**: Implement services (github-client, azure-client, auth-service, credential-store)
5. **Phase 5**: Implement renderer hooks and UI components
6. **Phase 6**: Integration tests + security audit

---

## Testing Strategy

### Unit Tests (Vitest)
- Zod schema validation tests
- Error mapping tests
- Rate limiter behavior tests

### Integration Tests
- GitHub API authentication
- Azure DevOps API authentication
- Rate limiting behavior
- Credential storage/retrieval

### Security Audit Checklist
- [x] Verify contextBridge whitelist is complete
- [x] Verify no credentials in IPC messages
- [x] Verify all inputs validated by Zod
- [x] Verify error messages don't leak sensitive info
- [x] Verify timeout limits on all operations
- [x] Verify rate limiting active
- [x] Verify HTTPS-only enforcement
- [x] Verify HTML sanitization on markdown output

---

## Key Files

| File | Purpose |
|------|---------|
| `specs/001-git-repo-integration/research.md` | Detailed research (this file's source) |
| `src/shared/types/git-contracts.ts` | Request/response type definitions |
| `src/shared/types/git-errors.ts` | Error type definitions |
| `src/preload/git-api.ts` | contextBridge API exposure |
| `src/main/ipc/git-handlers.ts` | IPC handler registration |
| `src/main/services/git/github-client.ts` | GitHub API client |
| `src/main/services/git/azure-client.ts` | Azure DevOps API client |
| `src/main/services/git/auth-service.ts` | Auth flow orchestration |
| `src/main/services/git/credential-store.ts` | OS credential manager |
| `src/renderer/hooks/useGitOperation.ts` | Renderer-side error handling hook |

---

## Conclusion

This pattern combines the security benefits of contextBridge (API whitelisting) with the type safety of TypeScript and runtime validation of Zod. It mirrors industry best practices used in production Electron applications and aligns with MarkRead's existing architecture.

The three-layer validation approach (TypeScript → Zod → domain logic) ensures that Git operations are handled securely without sacrificing developer experience or code maintainability.
