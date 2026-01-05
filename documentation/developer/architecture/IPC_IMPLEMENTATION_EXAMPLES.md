# IPC Implementation Examples - Git Repository Operations

This document provides concrete code examples for implementing the recommended Typed contextBridge + Zod pattern for Git operations in MarkRead.

---

## Example 1: Type-Safe Repository Connection

### 1.1 Type Definition (src/shared/types/git-contracts.ts)

```typescript
export interface BranchInfo {
  name: string;
  isDefault: boolean;
  lastCommitSha: string;
  lastCommitMessage: string;
  lastCommitDate: string;
}

export interface RepositoryInfo {
  id: string;
  name: string;
  url: string;
  description?: string;
  isPrivate: boolean;
  defaultBranch: string;
  owner: {
    login: string;
    avatar?: string;
  };
}

export namespace GitOperations {
  export interface ConnectRepositoryRequest {
    url: string;
    authMethod: 'oauth' | 'pat';
    token?: string; // Only for PAT, only from keytar (never from IPC)
  }

  export interface ConnectRepositoryResponse {
    success: boolean;
    repository?: RepositoryInfo;
    branches?: BranchInfo[];
    error?: GitErrorResponse;
  }
}

export interface GitErrorResponse {
  code:
    | 'INVALID_URL'
    | 'AUTH_FAILED'
    | 'TOKEN_EXPIRED'
    | 'NETWORK_ERROR'
    | 'TIMEOUT'
    | 'RATE_LIMIT'
    | 'NOT_FOUND'
    | 'PERMISSION_DENIED'
    | 'UNKNOWN';
  message: string;
  details?: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  requestId?: string;
}
```

### 1.2 Preload API (src/preload/git-api.ts)

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { GitOperations } from '../shared/types/git-contracts';

export interface GitAPI {
  repo: {
    connect: (req: GitOperations.ConnectRepositoryRequest) => Promise<GitOperations.ConnectRepositoryResponse>;
    disconnect: (repositoryId: string) => Promise<{ success: boolean }>;
    getCurrentRepository: () => Promise<{ repository?: RepositoryInfo } | { error: GitErrorResponse }>;
  };
  auth: {
    startOAuthFlow: (provider: 'github' | 'azure') => Promise<{ success: boolean; error?: string }>;
    savePAT: (provider: 'github' | 'azure', token: string) => Promise<{ success: boolean }>;
  };
}

contextBridge.exposeInMainWorld('git', {
  repo: {
    connect: (req) => ipcRenderer.invoke('git:connect', req),
    disconnect: (repositoryId) => ipcRenderer.invoke('git:disconnect', { repositoryId }),
    getCurrentRepository: () => ipcRenderer.invoke('git:getCurrentRepository'),
  },
  auth: {
    startOAuthFlow: (provider) => ipcRenderer.invoke('git:oauth:start', { provider }),
    savePAT: (provider, token) => ipcRenderer.invoke('git:pat:save', { provider, token }),
  },
} as GitAPI);

declare global {
  interface Window {
    git: GitAPI;
  }
}
```

### 1.3 IPC Handlers (src/main/ipc-handlers.ts)

```typescript
import { ipcMain } from 'electron';
import { z } from 'zod';
import { GitOperations } from '../shared/types/git-contracts';
import { GitService } from './services/git/git-service';
import { GitErrorHandler } from './services/git/git-error-handler';
import { generateRequestId } from './utils/request-id';

// Zod schemas for validation
const ConnectRepositorySchema = z.object({
  url: z.string()
    .min(1, 'URL is required')
    .url('Invalid URL format')
    .refine(
      (url) => url.startsWith('https://'),
      'Only HTTPS URLs are supported'
    )
    .refine(
      (url) => {
        const hostname = new URL(url).hostname;
        return hostname === 'github.com' || hostname === 'dev.azure.com';
      },
      'Only GitHub and Azure DevOps URLs are supported'
    ),
  authMethod: z.enum(['oauth', 'pat'], {
    errorMap: () => ({ message: 'Auth method must be "oauth" or "pat"' }),
  }),
  token: z.string().optional(),
});

const DisconnectSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID'),
});

const OAuthStartSchema = z.object({
  provider: z.enum(['github', 'azure']),
});

const PATSaveSchema = z.object({
  provider: z.enum(['github', 'azure']),
  token: z.string().min(20, 'Token is invalid'),
});

// Service instances
const gitService = new GitService();

// Register handlers
export function registerGitIpcHandlers() {
  // Connect to repository
  ipcMain.handle('git:connect', async (_event, payload) => {
    const requestId = generateRequestId();

    try {
      // Layer 2: Runtime validation
      const request = ConnectRepositorySchema.parse(payload);

      // Layer 3: Business logic (now guaranteed to have valid input)
      const repository = await gitService.connect(request.url, request.authMethod, requestId);

      return {
        success: true,
        repository,
        branches: await gitService.listBranches(repository.id),
      } as GitOperations.ConnectRepositoryResponse;
    } catch (error) {
      const mappedError = GitErrorHandler.mapError(error, requestId);

      return {
        success: false,
        error: mappedError,
      } as GitOperations.ConnectRepositoryResponse;
    }
  });

  // Disconnect from repository
  ipcMain.handle('git:disconnect', async (_event, payload) => {
    const requestId = generateRequestId();

    try {
      const request = DisconnectSchema.parse(payload);
      await gitService.disconnect(request.repositoryId);

      return { success: true };
    } catch (error) {
      const mappedError = GitErrorHandler.mapError(error, requestId);
      return { success: false, error: mappedError };
    }
  });

  // Get current repository
  ipcMain.handle('git:getCurrentRepository', async () => {
    try {
      const repository = await gitService.getCurrentRepository();
      return { repository };
    } catch (error) {
      return { error: GitErrorHandler.mapError(error, generateRequestId()) };
    }
  });

  // OAuth flow
  ipcMain.handle('git:oauth:start', async (_event, payload) => {
    try {
      const request = OAuthStartSchema.parse(payload);
      const success = await gitService.startOAuthFlow(request.provider);
      return { success };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Save PAT
  ipcMain.handle('git:pat:save', async (_event, payload) => {
    try {
      const request = PATSaveSchema.parse(payload);
      await gitService.savePAT(request.provider, request.token);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  console.log('Git IPC handlers registered');
}
```

### 1.4 Renderer Usage (src/renderer/components/GitRepoConnect.tsx)

```typescript
import React, { useState } from 'react';
import { GitOperations } from '../../shared/types/git-contracts';

interface ConnectProps {
  onConnected?: (repo: RepositoryInfo) => void;
}

export const GitRepoConnect: React.FC<ConnectProps> = ({ onConnected }) => {
  const [url, setUrl] = useState('');
  const [authMethod, setAuthMethod] = useState<'oauth' | 'pat'>('oauth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      // Layer 1: TypeScript enforces correct shape
      const request: GitOperations.ConnectRepositoryRequest = {
        url,
        authMethod,
      };

      // IPC call (payload validated in main process)
      const response = await window.git.repo.connect(request);

      if (response.success && response.repository) {
        onConnected?.(response.repository);
      } else if (!response.success && response.error) {
        // Typed error handling
        setError(response.error.message);

        if (response.error.code === 'RATE_LIMITED' && response.error.retryAfterSeconds) {
          setTimeout(handleConnect, response.error.retryAfterSeconds * 1000);
        }
      }
    } catch (err) {
      setError('Unexpected error connecting to repository');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="git-repo-connect">
      <input
        type="text"
        placeholder="Repository URL (https://github.com/user/repo)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={loading}
      />

      <select value={authMethod} onChange={(e) => setAuthMethod(e.target.value as any)} disabled={loading}>
        <option value="oauth">OAuth 2.0</option>
        <option value="pat">Personal Access Token</option>
      </select>

      <button onClick={handleConnect} disabled={loading}>
        {loading ? 'Connecting...' : 'Connect'}
      </button>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};
```

---

## Example 2: Secure File Fetching with Path Traversal Protection

### 2.1 Type Definitions

```typescript
export namespace GitOperations {
  export interface FetchFileRequest {
    repositoryId: string;
    filePath: string; // Relative to repository root
    branch?: string;
  }

  export interface FetchFileResponse {
    success: boolean;
    content?: string;
    encoding: 'utf-8';
    size: number;
    cached: boolean;
    fetchedAt: number;
    etag?: string; // For conditional requests
    error?: GitErrorResponse;
  }
}
```

### 2.2 Zod Validation Schema

```typescript
const FetchFileSchema = z.object({
  repositoryId: z.string()
    .uuid('Invalid repository ID format'),
  filePath: z.string()
    .min(1, 'File path is required')
    .max(1024, 'File path too long')
    // Allowlist: alphanumeric, dots, slashes, hyphens, underscores
    .regex(
      /^[a-zA-Z0-9._\-\/]+$/,
      'File path contains invalid characters'
    )
    // Prevent directory traversal
    .refine(
      (path) => !path.includes('..'),
      'Path traversal (..) not allowed'
    )
    .refine(
      (path) => !path.startsWith('/'),
      'Absolute paths not allowed'
    ),
  branch: z.string()
    .regex(/^[a-zA-Z0-9\-_.\/]+$/, 'Invalid branch name')
    .optional(),
});
```

### 2.3 Secure Handler Implementation

```typescript
ipcMain.handle('git:fetchFile', async (_event, payload) => {
  const requestId = generateRequestId();

  try {
    // Runtime validation with allowlist rules
    const request = FetchFileSchema.parse(payload);

    // Get repository configuration
    const repoConfig = await gitService.getRepository(request.repositoryId);
    if (!repoConfig) {
      throw new Error('Repository not found');
    }

    // Get cached or fresh content
    const content = await gitService.fetchFile({
      repositoryId: request.repositoryId,
      filePath: request.filePath,
      branch: request.branch,
      requestId,
    });

    return {
      success: true,
      content,
      size: content.length,
      encoding: 'utf-8' as const,
      cached: false,
      fetchedAt: Date.now(),
    } as GitOperations.FetchFileResponse;
  } catch (error) {
    return {
      success: false,
      encoding: 'utf-8' as const,
      size: 0,
      cached: false,
      fetchedAt: Date.now(),
      error: GitErrorHandler.mapError(error, requestId),
    } as GitOperations.FetchFileResponse;
  }
});
```

---

## Example 3: Rate Limiting & Exponential Backoff

### 3.1 Rate Limiter Service

```typescript
// src/main/services/git/rate-limiter.ts
interface RateLimitState {
  remaining: number;
  limit: number;
  reset: number; // Unix timestamp
}

export class GitRateLimiter {
  private readonly limits: Map<string, RateLimitState> = new Map();
  private readonly MAX_RETRIES = 5;
  private readonly BASE_BACKOFF_MS = 1000;
  private readonly MAX_BACKOFF_MS = 60000;

  async withRateLimit<T>(
    repositoryId: string,
    operation: () => Promise<T>,
    abortSignal?: AbortSignal
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      // Check if operation is cancelled
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled');
      }

      try {
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;

        // Check if error is rate limit (429)
        if (error.response?.status === 429 || error.status === 429) {
          const resetTime = parseInt(error.response?.headers['x-ratelimit-reset'] || '0') * 1000;
          const waitMs = Math.max(0, resetTime - Date.now());

          if (attempt < this.MAX_RETRIES - 1) {
            // Exponential backoff with jitter
            const backoffMs = Math.min(
              this.BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.random() * 1000,
              this.MAX_BACKOFF_MS
            );

            console.warn(
              `[RateLimit] Attempt ${attempt + 1}/${this.MAX_RETRIES}. ` +
              `Waiting ${backoffMs}ms before retry. Reset in ${waitMs}ms`
            );

            await new Promise((resolve) => setTimeout(resolve, Math.max(backoffMs, waitMs)));
          }
        } else {
          // Non-rate-limit error, fail immediately
          throw error;
        }
      }
    }

    throw lastError;
  }

  updateLimitState(repositoryId: string, headers: Record<string, string>) {
    const remaining = parseInt(headers['x-ratelimit-remaining'] || '0');
    const limit = parseInt(headers['x-ratelimit-limit'] || '5000');
    const reset = parseInt(headers['x-ratelimit-reset'] || '0') * 1000;

    this.limits.set(repositoryId, { remaining, limit, reset });
  }

  isRateLimited(repositoryId: string): boolean {
    const state = this.limits.get(repositoryId);
    return state ? state.remaining === 0 : false;
  }

  getResetTime(repositoryId: string): number | null {
    const state = this.limits.get(repositoryId);
    return state?.reset || null;
  }
}

// Usage in handler
const rateLimiter = new GitRateLimiter();

ipcMain.handle('git:fetchFile', async (_event, payload) => {
  const request = FetchFileSchema.parse(payload);

  try {
    const content = await rateLimiter.withRateLimit(
      request.repositoryId,
      () => gitClient.fetchFile(request.filePath),
      _event.sender.abort?.signal
    );

    return { success: true, content };
  } catch (error) {
    if (error.message === 'Operation cancelled') {
      return {
        success: false,
        error: {
          code: 'CANCELLED',
          message: 'File fetch was cancelled',
          retryable: true,
        },
      };
    }

    return {
      success: false,
      error: GitErrorHandler.mapError(error, generateRequestId()),
    };
  }
});
```

---

## Example 4: Secure Credential Storage

### 4.1 Credential Store Service

```typescript
// src/main/services/git/credential-store.ts
import keytar from 'keytar';

interface StoredCredential {
  provider: 'github' | 'azure';
  authMethod: 'oauth' | 'pat';
  token: string; // Retrieved from keytar (encrypted)
  expiresAt?: number; // For OAuth tokens
}

export class CredentialStore {
  private readonly SERVICE_NAME = 'MarkRead-Git';

  /**
   * Save credential securely to OS credential manager
   * IMPORTANT: Main process only - never call from renderer
   */
  async saveCredential(
    repositoryId: string,
    credential: StoredCredential
  ): Promise<void> {
    const key = this.buildKey(repositoryId, credential.authMethod);

    try {
      // keytar handles OS-specific encryption (Windows Credential Manager, macOS Keychain, etc.)
      await keytar.setPassword(this.SERVICE_NAME, key, credential.token);

      // Optionally store metadata in app config (not the token itself)
      // { repositoryId, provider, authMethod, expiresAt }
    } catch (error) {
      console.error('[CredentialStore] Failed to save credential:', error);
      throw new Error('Failed to save credentials');
    }
  }

  /**
   * Retrieve credential from secure storage
   * IMPORTANT: Returns token only to main process - never send over IPC
   */
  async getCredential(
    repositoryId: string,
    authMethod: 'oauth' | 'pat'
  ): Promise<string | null> {
    const key = this.buildKey(repositoryId, authMethod);

    try {
      return await keytar.getPassword(this.SERVICE_NAME, key);
    } catch (error) {
      console.error('[CredentialStore] Failed to retrieve credential:', error);
      return null;
    }
  }

  /**
   * Delete credential when user disconnects or logs out
   */
  async deleteCredential(
    repositoryId: string,
    authMethod: 'oauth' | 'pat'
  ): Promise<void> {
    const key = this.buildKey(repositoryId, authMethod);

    try {
      const deleted = await keytar.deletePassword(this.SERVICE_NAME, key);
      if (!deleted) {
        console.warn('[CredentialStore] Credential not found for deletion:', key);
      }
    } catch (error) {
      console.error('[CredentialStore] Failed to delete credential:', error);
      throw new Error('Failed to delete credentials');
    }
  }

  /**
   * Check if credential exists
   */
  async hasCredential(
    repositoryId: string,
    authMethod: 'oauth' | 'pat'
  ): Promise<boolean> {
    const credential = await this.getCredential(repositoryId, authMethod);
    return credential !== null;
  }

  /**
   * Clear all credentials (app uninstall, etc.)
   */
  async clearAll(): Promise<void> {
    try {
      const accounts = await keytar.findCredentials(this.SERVICE_NAME);
      await Promise.all(accounts.map((account) => keytar.deletePassword(this.SERVICE_NAME, account.account)));
    } catch (error) {
      console.warn('[CredentialStore] Failed to clear all credentials:', error);
    }
  }

  private buildKey(repositoryId: string, authMethod: 'oauth' | 'pat'): string {
    return `${repositoryId}:${authMethod}`;
  }
}

export const credentialStore = new CredentialStore();
```

### 4.2 IPC Handler (Credential Saving)

```typescript
// IMPORTANT: Main process retrieves token from keytar before saving
ipcMain.handle('git:pat:save', async (_event, payload) => {
  try {
    const request = PATSaveSchema.parse(payload);

    // Validate token with provider before storing
    const isValid = await gitClient.validateToken(request.token, request.provider);
    if (!isValid) {
      return {
        success: false,
        error: 'Invalid or expired token',
      };
    }

    // Save to OS credential manager (never over IPC)
    const repositoryId = generateRepositoryId(request.provider);
    await credentialStore.saveCredential(repositoryId, {
      provider: request.provider,
      authMethod: 'pat',
      token: request.token,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
});

// CRITICAL: Never do this ❌
// ipcMain.handle('git:getCredential', async (_event, { repositoryId, authMethod }) => {
//   const token = await credentialStore.getCredential(repositoryId, authMethod);
//   return { token }; // DON'T SEND TOKEN OVER IPC!
// });

// Instead, main process retrieves token internally ✅
ipcMain.handle('git:authenticateRepository', async (_event, { repositoryId }) => {
  const token = await credentialStore.getCredential(repositoryId, 'pat');
  if (!token) {
    return { success: false, error: 'Credentials not found' };
  }

  // Token is used internally, never returned over IPC
  const isAuthenticated = await gitClient.authenticate(token);
  return { success: isAuthenticated };
});
```

---

## Example 5: Comprehensive Error Handling

### 5.1 Error Handler Service

```typescript
// src/main/services/git/git-error-handler.ts
import { GitErrorResponse } from '../../shared/types/git-contracts';

export class GitErrorHandler {
  static mapError(error: any, requestId: string): GitErrorResponse {
    // HTTP errors
    if (error.response) {
      return this.mapHttpError(error.response, requestId);
    }

    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'EHOSTUNREACH') {
      return {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the server. Please check your internet connection.',
        details: error.message,
        retryable: true,
        requestId,
      };
    }

    // Timeout errors
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: 'The request took too long. The server may be experiencing issues.',
        details: error.message,
        retryable: true,
        requestId,
      };
    }

    // Validation errors (from Zod)
    if (error.name === 'ZodError') {
      const issue = error.errors[0];
      return {
        code: 'INVALID_URL',
        message: `Invalid input: ${issue.message}`,
        details: `Path: ${issue.path.join('.')}`,
        retryable: false,
        requestId,
      };
    }

    // Unknown errors
    return {
      code: 'UNKNOWN',
      message: 'An unexpected error occurred. Please try again.',
      details: error.message,
      retryable: true,
      requestId,
    };
  }

  private static mapHttpError(response: any, requestId: string): GitErrorResponse {
    const status = response.status;
    const data = response.data || {};

    switch (status) {
      case 401:
        return {
          code: 'AUTH_FAILED',
          message: 'Authentication failed. Your token may be invalid or expired.',
          details: data.message || 'Invalid credentials',
          retryable: true,
          requestId,
        };

      case 403:
        return {
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to access this repository.',
          details: data.message || 'Permission denied',
          retryable: false,
          requestId,
        };

      case 404:
        return {
          code: 'NOT_FOUND',
          message: 'The repository or file was not found.',
          details: data.message || 'Resource not found',
          retryable: false,
          requestId,
        };

      case 429:
        const resetTime = parseInt(response.headers['x-ratelimit-reset'] || '0') * 1000;
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

        return {
          code: 'RATE_LIMIT',
          message: `Rate limited. Please try again in ${retryAfter} seconds.`,
          retryable: true,
          retryAfterSeconds: Math.max(retryAfter, 1),
          requestId,
        };

      default:
        return {
          code: 'UNKNOWN',
          message: `Server error: ${status}`,
          details: data.message,
          retryable: status >= 500,
          requestId,
        };
    }
  }
}
```

### 5.2 Renderer Error Hook

```typescript
// src/renderer/hooks/useGitError.ts
import { GitErrorResponse } from '../../shared/types/git-contracts';

export function useGitError() {
  const handleError = (error: GitErrorResponse | null): string => {
    if (!error) return '';

    switch (error.code) {
      case 'INVALID_URL':
        return `Invalid repository URL. ${error.message}`;

      case 'AUTH_FAILED':
        return 'Authentication failed. Please check your credentials and try again.';

      case 'TOKEN_EXPIRED':
        return 'Your authentication token has expired. Please reconnect.';

      case 'NETWORK_ERROR':
        return 'Network connection lost. Please check your internet connection.';

      case 'TIMEOUT':
        return 'The request timed out. Please try again.';

      case 'RATE_LIMIT':
        return error.retryAfterSeconds
          ? `Too many requests. Please wait ${error.retryAfterSeconds} seconds.`
          : 'Too many requests. Please try again later.';

      case 'NOT_FOUND':
        return 'Repository or file not found. Please check the URL.';

      case 'PERMISSION_DENIED':
        return 'You do not have permission to access this resource.';

      default:
        return error.message || 'An unexpected error occurred.';
    }
  };

  const canRetry = (error: GitErrorResponse | null): boolean => {
    return error?.retryable ?? false;
  };

  const getRetryDelay = (error: GitErrorResponse | null): number => {
    return (error?.retryAfterSeconds ?? 5) * 1000;
  };

  return { handleError, canRetry, getRetryDelay };
}
```

---

## Summary: The Three-Layer Pattern

| Layer | File | Responsibility |
|-------|------|-----------------|
| **Layer 1: Types** | `shared/types/git-contracts.ts` | Define request/response structures |
| **Layer 2: IPC** | `preload/git-api.ts` + `main/ipc-handlers.ts` | Enforce API surface, validate with Zod |
| **Layer 3: Services** | `main/services/git/*.ts` | Business logic, credential handling, rate limiting |

This separation ensures:
- ✅ Security: Credentials never in IPC messages
- ✅ Type Safety: Compile-time + runtime validation
- ✅ Maintainability: Clear boundaries between layers
- ✅ Testability: Each layer can be tested independently
