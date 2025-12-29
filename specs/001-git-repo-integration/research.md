# Research: Git Repository Integration Technical Decisions

**Date**: 2025-12-29 | **Feature**: Git Repository Integration | **Branch**: 001-git-repo-integration

---

## Executive Summary

This research addresses all technical unknowns ("NEEDS CLARIFICATION") identified in the implementation plan for Git repository integration. Key decisions:

1. **HTTP Client**: axios (type-safe, interceptor support, battle-tested)
2. **OAuth Implementation**: Custom Electron implementation using BrowserWindow + protocol handlers
3. **Credential Storage**: Electron's safeStorage API (native OS encryption, modern)
4. **IPC Pattern**: contextBridge + Zod validation (secure, type-safe)
5. **API Integration**: Direct REST API calls to GitHub v3 and Azure DevOps v7.1
6. **Caching Strategy**: LRU cache with file system persistence
7. **Offline Detection**: navigator.onLine + periodic connectivity checks

---

## Table of Contents

1. [HTTP Client Selection](#1-http-client-selection)
2. [OAuth Implementation in Electron](#2-oauth-implementation-in-electron)
3. [OS Credential Manager Integration](#3-os-credential-manager-integration)
4. [GitHub & Azure DevOps API Integration](#4-github--azure-devops-api-integration)
5. [Exponential Backoff & Rate Limiting](#5-exponential-backoff--rate-limiting)
6. [Secure IPC Patterns](#6-secure-ipc-patterns)
7. [File Caching Strategy](#7-file-caching-strategy)
8. [Offline Detection](#8-offline-detection)

---

## 1. HTTP Client Selection

### Decision: axios

**Rationale**: Axios provides superior TypeScript support with built-in type definitions, exceptional error handling with request/response interceptors (essential for auth token management and retry logic), and proven adoption in Electron applications. The ~12KB bundle size is negligible for a desktop app, and the mature ecosystem provides battle-tested patterns for GitHub and Azure DevOps API integration.

**Alternatives Considered**:
- **Native Node.js fetch**: Rejected due to lack of built-in interceptor support for auth token management and retry logic, requiring custom wrapper code
- **Electron's net module**: Rejected because it's designed for low-level network operations and lacks the abstraction needed for REST API interactions

**Implementation**:
```typescript
// src/main/services/git/http-client.ts
import axios, { AxiosInstance } from 'axios';

export class GitHttpClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: 30000, // 30s per performance requirements
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'MarkRead-Git-Client'
      }
    });

    // Request interceptor for auth tokens
    this.client.interceptors.request.use((config) => {
      const token = this.getAuthToken(config.url);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token refresh logic
          await this.refreshToken();
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }
}
```

---

## 2. OAuth Implementation in Electron

### Decision: Custom Implementation with BrowserWindow + Protocol Handlers

**Rationale**: Electron doesn't have a maintained OAuth library (electron-oauth2 is deprecated). The recommended approach is to use BrowserWindow for the OAuth flow with custom protocol handlers to capture the redirect. This provides a native-feeling experience while maintaining security by keeping the OAuth flow in the main process.

**Alternatives Considered**:
- **electron-oauth2**: Rejected due to lack of maintenance (last update 2019)
- **System browser with deep links**: Rejected because it breaks the user experience by leaving the app
- **oauth-electron**: Rejected due to limited TypeScript support and small community

**Implementation**:
```typescript
// src/main/services/git/oauth-service.ts
import { BrowserWindow, protocol } from 'electron';

export class OAuthService {
  private readonly GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  private readonly REDIRECT_URI = 'markread://oauth/callback';

  async authenticateGitHub(): Promise<{ token: string; refreshToken?: string }> {
    // Register custom protocol handler
    protocol.registerHttpProtocol('markread', (request) => {
      const url = new URL(request.url);
      if (url.pathname === '/oauth/callback') {
        const code = url.searchParams.get('code');
        this.exchangeCodeForToken(code);
      }
    });

    // Create OAuth window
    const authWindow = new BrowserWindow({
      width: 600,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    const authUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${this.GITHUB_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&` +
      `scope=repo,read:user`;

    authWindow.loadURL(authUrl);

    return new Promise((resolve, reject) => {
      authWindow.webContents.on('will-redirect', (event, url) => {
        if (url.startsWith(this.REDIRECT_URI)) {
          const code = new URL(url).searchParams.get('code');
          authWindow.close();
          this.exchangeCodeForToken(code).then(resolve).catch(reject);
        }
      });
    });
  }

  private async exchangeCodeForToken(code: string): Promise<{ token: string }> {
    // Exchange authorization code for access token
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: this.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    });
    return { token: response.data.access_token };
  }
}
```

**Azure DevOps OAuth**: Similar pattern using Azure AD endpoints.

---

## 3. OS Credential Manager Integration

### Decision: Electron's safeStorage API

**Rationale**: Electron 13+ provides the safeStorage API which directly integrates with OS-level credential managers (Windows Credential Manager, macOS Keychain, Linux Secret Service). Since MarkRead uses Electron 33.4.11, this is the modern, officially supported approach. The deprecated keytar library is no longer necessary.

**Alternatives Considered**:
- **keytar**: Rejected because it's deprecated (archived by Atom team) and replaced by safeStorage
- **electron-store with encryption**: Rejected because it requires manual key management; OS credential manager is more secure

**Implementation**:
```typescript
// src/main/services/storage/credential-store.ts
import { safeStorage } from 'electron';
import Store from 'electron-store';

interface CredentialEntry {
  repositoryId: string;
  authMethod: 'oauth' | 'pat';
  encryptedToken: string;
  expiresAt?: number;
}

export class CredentialStore {
  private store: Store<{ credentials: CredentialEntry[] }>;

  constructor() {
    this.store = new Store({
      name: 'git-credentials',
      encryptionKey: 'obfuscation-only', // Not for security
    });
  }

  async saveCredential(
    repositoryId: string,
    authMethod: 'oauth' | 'pat',
    token: string,
    expiresAt?: number
  ): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('OS credential encryption not available');
    }

    // Encrypt using OS-level encryption
    const encryptedBuffer = safeStorage.encryptString(token);
    const encryptedToken = encryptedBuffer.toString('base64');

    const credentials = this.store.get('credentials', []);
    const existing = credentials.findIndex(
      c => c.repositoryId === repositoryId && c.authMethod === authMethod
    );

    const entry: CredentialEntry = {
      repositoryId,
      authMethod,
      encryptedToken,
      expiresAt,
    };

    if (existing >= 0) {
      credentials[existing] = entry;
    } else {
      credentials.push(entry);
    }

    this.store.set('credentials', credentials);
  }

  async getCredential(
    repositoryId: string,
    authMethod: 'oauth' | 'pat'
  ): Promise<string | null> {
    const credentials = this.store.get('credentials', []);
    const entry = credentials.find(
      c => c.repositoryId === repositoryId && c.authMethod === authMethod
    );

    if (!entry) return null;

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await this.deleteCredential(repositoryId, authMethod);
      return null;
    }

    // Decrypt using OS-level decryption
    const encryptedBuffer = Buffer.from(entry.encryptedToken, 'base64');
    const decrypted = safeStorage.decryptString(encryptedBuffer);
    return decrypted;
  }

  async deleteCredential(
    repositoryId: string,
    authMethod?: 'oauth' | 'pat'
  ): Promise<void> {
    const credentials = this.store.get('credentials', []);
    const filtered = credentials.filter(
      c => !(c.repositoryId === repositoryId &&
            (!authMethod || c.authMethod === authMethod))
    );
    this.store.set('credentials', filtered);
  }
}
```

---

## 4. GitHub & Azure DevOps API Integration

### Decision: Direct REST API Calls (Not SDK Wrappers)

**Rationale**: Both GitHub REST API v3 and Azure DevOps REST API v7.1 are well-documented and stable. Using direct axios calls provides more control over rate limiting, error handling, and caching compared to SDK wrappers. This also reduces dependency bloat.

**Alternatives Considered**:
- **@octokit/rest**: Rejected due to added complexity and bundle size; direct API calls are sufficient
- **azure-devops-node-api**: Rejected for same reasons

**GitHub API Implementation**:
```typescript
// src/main/services/git/github-client.ts
export class GitHubClient {
  constructor(private httpClient: GitHttpClient) {}

  async listBranches(owner: string, repo: string): Promise<BranchInfo[]> {
    const response = await this.httpClient.get(
      `https://api.github.com/repos/${owner}/${repo}/branches`
    );
    return response.data.map(b => ({
      name: b.name,
      sha: b.commit.sha,
    }));
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<string> {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const params = ref ? { ref } : {};

    const response = await this.httpClient.get(url, { params });

    // GitHub returns base64-encoded content
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    return content;
  }

  async getRepositoryTree(
    owner: string,
    repo: string,
    branch: string = 'main'
  ): Promise<TreeNode[]> {
    const response = await this.httpClient.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
    );
    return response.data.tree;
  }
}
```

**Azure DevOps API Implementation**:
```typescript
// src/main/services/git/azure-client.ts
export class AzureDevOpsClient {
  constructor(private httpClient: GitHttpClient) {}

  async listBranches(
    organization: string,
    project: string,
    repositoryId: string
  ): Promise<BranchInfo[]> {
    const url = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repositoryId}/refs?api-version=7.1`;
    const response = await this.httpClient.get(url);

    return response.data.value
      .filter(ref => ref.name.startsWith('refs/heads/'))
      .map(ref => ({
        name: ref.name.replace('refs/heads/', ''),
        sha: ref.objectId,
      }));
  }

  async getFileContent(
    organization: string,
    project: string,
    repositoryId: string,
    path: string,
    version?: string
  ): Promise<string> {
    const url = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repositoryId}/items?path=${path}&api-version=7.1`;
    const params = version ? { versionDescriptor: { version } } : {};

    const response = await this.httpClient.get(url, { params });
    return response.data; // Azure returns plain text
  }
}
```

---

## 5. Exponential Backoff & Rate Limiting

### Decision: Exponential Backoff with Jitter

**GitHub Rate Limits**:
- Authenticated: 5,000 requests/hour
- Unauthenticated: 60 requests/hour
- Headers: `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`

**Azure DevOps Rate Limits**:
- Various limits by resource type (typically 200 requests/minute per resource)
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Implementation**:
```typescript
// src/main/services/git/rate-limiter.ts
export class RateLimiter {
  private readonly MAX_RETRIES = 5;
  private readonly BASE_DELAY_MS = 1000;
  private readonly MAX_DELAY_MS = 32000;

  async withRetry<T>(
    fn: () => Promise<T>,
    onRetry?: (attempt: number, delayMs: number) => void
  ): Promise<T> {
    let lastError;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Only retry on rate limit or network errors
        if (!this.isRetryable(error)) {
          throw error;
        }

        if (attempt < this.MAX_RETRIES - 1) {
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped at 32s)
          const exponentialDelay = Math.min(
            this.BASE_DELAY_MS * Math.pow(2, attempt),
            this.MAX_DELAY_MS
          );

          // Add jitter to prevent thundering herd (±25%)
          const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
          const delayMs = Math.floor(exponentialDelay + jitter);

          onRetry?.(attempt + 1, delayMs);
          await this.sleep(delayMs);
        }
      }
    }

    throw lastError;
  }

  private isRetryable(error: any): boolean {
    // Retry on rate limit (429)
    if (error.response?.status === 429) return true;

    // Retry on network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') return true;

    // Retry on server errors (5xx)
    if (error.response?.status >= 500) return true;

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  extractRateLimitInfo(headers: any): RateLimitInfo {
    return {
      limit: parseInt(headers['x-ratelimit-limit'] || '5000'),
      remaining: parseInt(headers['x-ratelimit-remaining'] || '5000'),
      resetAt: parseInt(headers['x-ratelimit-reset'] || '0') * 1000,
    };
  }
}
```

**User Notification Strategy**:
- Silent retry for attempts 1-3 (user doesn't notice)
- Show toast notification on attempt 4: "Retrying connection..."
- Show detailed error on final failure: "Rate limited. Try again in X minutes."

---

## 6. Secure IPC Patterns

### Overview

This section investigates secure Inter-Process Communication (IPC) patterns in Electron for handling Git repository operations (authentication, API calls, file caching) between main and renderer processes. Based on analysis of MarkRead's existing IPC architecture, current Electron security best practices, and Git integration requirements, we recommend a **contextBridge-based pattern with Zod validation and typed IPC contracts** for maximum security and maintainability.

### 6.1 contextBridge vs Direct IPC Exposure

### Overview

Electron provides two primary patterns for IPC:
1. **Direct IPC Exposure**: Renderer directly accesses `ipcRenderer` and `ipcMain` (DEPRECATED)
2. **contextBridge Pattern**: Main process exposes a curated API via `contextBridge` (RECOMMENDED)

### Analysis

#### Direct IPC Exposure (NOT RECOMMENDED)
```typescript
// main.ts - INSECURE PATTERN
// Directly exposing IPC to renderer
app.on('ready', () => {
  createWindow();
  // NO preload script - renderer has full ipcRenderer access
});

// renderer/App.tsx - VULNERABLE
const { ipcRenderer } = window.require('electron');
ipcRenderer.invoke('any-channel-name', payload); // Uncontrolled!
```

**Issues**:
- Renderer can call ANY IPC channel, including internal ones
- No validation of what operations are available
- Vulnerable to XSS attacks that could exploit any IPC handler
- Impossible to audit which APIs the renderer actually uses

#### contextBridge Pattern (RECOMMENDED)
```typescript
// preload/index.ts - SECURE PATTERN
import { contextBridge, ipcRenderer } from 'electron';

export interface GitAPI {
  repo: {
    connect: (url: string, credentials: GitCredentials) => Promise<ConnectResult>;
    fetchFile: (path: string) => Promise<FileContent>;
    listBranches: () => Promise<BranchInfo[]>;
  }
}

contextBridge.exposeInMainWorld('git', {
  repo: {
    connect: (url, credentials) => ipcRenderer.invoke('git:connect', { url, credentials }),
    fetchFile: (path) => ipcRenderer.invoke('git:fetchFile', { path }),
    listBranches: () => ipcRenderer.invoke('git:listBranches'),
  }
} as GitAPI);

declare global {
  interface Window {
    git: GitAPI;
  }
}
```

**Benefits**:
- ✅ Explicit API whitelist - only exposed methods are available
- ✅ Type-safe - TypeScript enforces correct API usage
- ✅ Auditable - clear contract between processes
- ✅ XSS-resistant - malicious code can't call arbitrary IPC handlers

### MarkRead Current State

MarkRead already uses contextBridge pattern (`.src/preload/index.ts`):
```typescript
// Already following best practice!
contextBridge.exposeInMainWorld('electronAPI', {
  file: { ... },
  settings: { ... },
  window: { ... },
  uiState: { ... }
});
```

**Decision**: Continue with contextBridge pattern for Git operations ✅

---

## 2. Typed IPC Patterns with TypeScript

### Challenge

IPC messages are JSON-serializable primitives over a message channel. Without strong typing, both main and renderer can have mismatched expectations about request/response structure.

### Solution: Triple-Layer Type System

#### Layer 1: Request/Response Contracts

```typescript
// src/shared/types/git-contracts.ts
export namespace GitOperations {
  export interface ConnectRepositoryRequest {
    url: string;
    authMethod: 'oauth' | 'pat';
    token?: string;
    // Validates: url must be HTTPS, not arbitrary string
  }

  export interface ConnectRepositoryResponse {
    success: boolean;
    repositoryId?: string;
    branches?: BranchInfo[];
    defaultBranch?: string;
    error?: {
      code: 'INVALID_URL' | 'AUTH_FAILED' | 'NETWORK_ERROR' | 'NOT_FOUND';
      message: string;
      retryable: boolean;
    };
  }

  export interface FetchFileRequest {
    repositoryId: string;
    filePath: string;
    branch?: string;
  }

  export interface FetchFileResponse {
    success: boolean;
    content?: string;
    encoding: 'utf-8';
    size: number;
    cached: boolean;
    fetchedAt: number;
    error?: {
      code: 'FILE_NOT_FOUND' | 'PERMISSION_DENIED' | 'RATE_LIMITED';
      message: string;
    };
  }
}
```

#### Layer 2: Preload Type Definitions

```typescript
// src/preload/git-api.ts
export interface GitAPI {
  repo: {
    connect: (req: GitOperations.ConnectRepositoryRequest)
      => Promise<GitOperations.ConnectRepositoryResponse>;

    fetchFile: (req: GitOperations.FetchFileRequest)
      => Promise<GitOperations.FetchFileResponse>;
  };
}

contextBridge.exposeInMainWorld('git', {
  repo: {
    connect: (req) => ipcRenderer.invoke('git:connect', req),
    fetchFile: (req) => ipcRenderer.invoke('git:fetchFile', req),
  }
} as GitAPI);
```

#### Layer 3: Main Process Handler Type Safety

```typescript
// src/main/ipc-handlers.ts
import { z } from 'zod';

// Zod schema validates at runtime
const ConnectRepositorySchema = z.object({
  url: z.string().url().startsWith('https://'),
  authMethod: z.enum(['oauth', 'pat']),
  token: z.string().optional(),
});

ipcMain.handle('git:connect', async (_event, payload) => {
  try {
    // Runtime validation + type narrowing
    const request = ConnectRepositorySchema.parse(payload);

    // From here, TypeScript KNOWS request is valid
    const result = await gitService.connect(request.url, request.authMethod);

    return {
      success: true,
      repositoryId: result.id,
      branches: result.branches,
    } as GitOperations.ConnectRepositoryResponse;
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'INVALID_URL',
        message: 'Repository URL must be HTTPS',
        retryable: true,
      }
    } as GitOperations.ConnectRepositoryResponse;
  }
});
```

### Benefits

1. **Compile-time Safety**: TypeScript ensures correct usage in renderer
2. **Runtime Validation**: Zod catches malformed requests before processing
3. **Type Narrowing**: After validation, main process code is 100% type-safe
4. **Self-Documenting**: Type definitions serve as API documentation
5. **Error Handling**: Typed error codes prevent magic string comparisons

---

## 3. Security Best Practices

### 3.1 Input Validation

#### Problem: Injection Attacks

Git operations often involve user input:
- Repository URLs (could be malicious redirects)
- File paths (could use path traversal: `../../secrets`)
- Branch names (could contain injection payloads)
- Credentials (could be exfiltrated)

#### Solution: Zod Schema Validation + Allowlist

```typescript
// BAD: Trusting string inputs
ipcMain.handle('git:fetchFile', async (_event, { path }) => {
  return await fs.readFile(path); // Path traversal vulnerability!
});

// GOOD: Validating and constraining inputs
const FetchFileSchema = z.object({
  repositoryId: z.string().uuid(), // UUID format constraint
  filePath: z.string()
    .min(1)
    .max(1024)
    .regex(/^[a-zA-Z0-9._\-\/]+$/) // Allowlist: no .., no special chars
    .refine(path => !path.includes('..'), 'Path traversal not allowed'),
  branch: z.string().regex(/^[a-zA-Z0-9\-_.\/]+$/).optional(),
});

ipcMain.handle('git:fetchFile', async (_event, payload) => {
  const request = FetchFileSchema.parse(payload); // Throws if invalid

  // At this point, path is guaranteed to be safe
  // Use only within the repository boundary
  const repositoryRoot = getRepositoryPath(request.repositoryId);
  const safePath = path.join(repositoryRoot, request.filePath);

  // Verify the resolved path is still within repository
  const normalized = path.normalize(safePath);
  const repoNormalized = path.normalize(repositoryRoot);
  if (!normalized.startsWith(repoNormalized)) {
    throw new Error('Path traversal detected');
  }

  return await fs.readFile(normalized, 'utf-8');
});
```

#### URL Validation (GitHub/Azure DevOps)

```typescript
const GitURLSchema = z.string()
  .url()
  .refine(url => {
    const validHosts = ['github.com', 'dev.azure.com'];
    const urlObj = new URL(url);
    return validHosts.includes(urlObj.hostname);
  }, { message: 'Only GitHub and Azure DevOps URLs supported' })
  .refine(url => url.startsWith('https://'),
    'Only HTTPS URLs allowed');

const ConnectSchema = z.object({
  url: GitURLSchema,
  authMethod: z.enum(['oauth', 'pat']),
  token: z.string().optional()
    .refine(token => !token || isValidTokenFormat(token),
      'Invalid token format'),
});
```

### 3.2 Credential Security

#### Problem: Token Exposure

Git tokens are high-value targets. If exposed, attackers gain full repository access.

#### Solution: OS Credential Manager (Already in Spec!)

```typescript
// src/main/services/credential-store.ts
import keytar from 'keytar'; // Better than hardcoding

export class CredentialStore {
  private readonly SERVICE_NAME = 'MarkRead-Git';

  async saveCredential(
    repositoryId: string,
    authMethod: 'oauth' | 'pat',
    credential: string
  ): Promise<void> {
    // Token never touches disk unencrypted
    // OS credential manager handles encryption (Windows Credential Manager, macOS Keychain, etc.)
    const key = `${repositoryId}:${authMethod}`;
    await keytar.setPassword(this.SERVICE_NAME, key, credential);
  }

  async getCredential(
    repositoryId: string,
    authMethod: 'oauth' | 'pat'
  ): Promise<string | null> {
    const key = `${repositoryId}:${authMethod}`;
    return await keytar.getPassword(this.SERVICE_NAME, key);
  }

  async deleteCredential(repositoryId: string): Promise<void> {
    // Clean up on logout or credential removal
    await keytar.deletePassword(this.SERVICE_NAME, `${repositoryId}:oauth`);
    await keytar.deletePassword(this.SERVICE_NAME, `${repositoryId}:pat`);
  }
}

// NEVER send credentials over IPC
// Bad:
ipcMain.handle('git:connect', async (_event, { token }) => {
  // Token arrived in IPC message - logged everywhere! 🚨
  const result = await authenticateWithToken(token);
});

// Good:
ipcMain.handle('git:connect', async (_event, { repositoryId, authMethod }) => {
  // Retrieve token from secure storage, never from IPC
  const token = await credentialStore.getCredential(repositoryId, authMethod);
  const result = await authenticateWithToken(token);
  // Token never leaves this function
});
```

### 3.3 API Rate Limiting & Exponential Backoff

#### Problem: Rate Limit Attacks

GitHub API: 60 req/hour (unauthenticated), 5000 req/hour (authenticated)
Azure DevOps: Similar limits with stricter enforcement

If renderer incorrectly retries, attacker could exhaust quota via XSS.

#### Solution: Rate Limiting in Main Process

```typescript
// src/main/services/git-rate-limiter.ts
export class GitRateLimiter {
  private readonly limits: Map<string, RateLimit> = new Map();
  private readonly MAX_RETRIES = 5;
  private readonly BASE_RETRY_MS = 1000;

  async withRateLimit<T>(
    repositoryId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const limit = this.limits.get(repositoryId) || this.createLimit();

    // If rate limited, wait before retrying
    if (limit.remaining === 0) {
      const waitMs = limit.resetTime - Date.now();
      if (waitMs > 0) {
        throw {
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil(waitMs / 1000),
          message: `Rate limited. Retry after ${Math.ceil(waitMs / 1000)}s`,
        };
      }
    }

    let lastError;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        lastError = error;

        if (error.code === 'RATE_LIMITED' || error.status === 429) {
          const backoffMs = this.BASE_RETRY_MS * Math.pow(2, attempt);
          console.warn(
            `[GitRateLimit] Attempt ${attempt + 1}/${this.MAX_RETRIES} failed. ` +
            `Retrying in ${backoffMs}ms`
          );
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        } else {
          throw error; // Non-rate-limit error, fail immediately
        }
      }
    }

    throw lastError;
  }

  private createLimit(): RateLimit {
    return { remaining: 5000, resetTime: Date.now() + 3600000 };
  }
}

// Usage in handler
ipcMain.handle('git:fetchFile', async (_event, payload) => {
  const request = FetchFileSchema.parse(payload);

  try {
    // Rate limiting applied automatically
    const content = await rateLimiter.withRateLimit(
      request.repositoryId,
      () => gitClient.fetchFile(request.filePath)
    );

    return { success: true, content };
  } catch (error) {
    if (error.code === 'RATE_LIMITED') {
      return {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `${error.message}. Please try again in ${error.retryAfter} seconds.`,
          retryAfter: error.retryAfter,
        }
      };
    }
    throw error;
  }
});
```

### 3.4 XSS Prevention in Markdown Rendering

#### Problem: Malicious Content in Repository

A compromised or malicious repository could include JavaScript in markdown that executes during rendering.

#### Solution: Content Sanitization (Already in MarkRead!)

```typescript
// src/renderer/utils/markdown-safety.ts
import DOMPurify from 'dompurify';

// MarkRead already sanitizes HTML output!
const sanitized = DOMPurify.sanitize(htmlContent, {
  ALLOWED_TAGS: ['p', 'div', 'span', 'h1', 'h2', 'a', 'img', 'code', 'pre', 'blockquote'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
  KEEP_CONTENT: true,
});

// Additional safety for repository content
// Enforce Same-Origin Policy on image loads from repositories
const safeImageUrl = (repoUrl: string, imagePath: string) => {
  // Only allow images from the same repository
  const repoHost = new URL(repoUrl).hostname;
  const imageUrl = new URL(imagePath, repoUrl).hostname;

  if (imageUrl !== repoHost) {
    console.warn(`Image from different origin blocked: ${imagePath}`);
    return null; // Don't load external images
  }

  return new URL(imagePath, repoUrl).href;
};
```

---

## 4. Async Operation Handling

### Challenge

Git operations are inherently async:
- API calls (GitHub, Azure DevOps)
- File I/O from cache
- Network requests with variable latency (100ms - 5s+)

Need robust patterns for:
- Long-running operations (progress updates)
- Operation cancellation
- Error recovery
- Timeout handling

### Solution: Promise-based IPC with Progress Events

#### Simple Request-Response (< 5s operations)

```typescript
// For operations that complete quickly
ipcMain.handle('git:listBranches', async (_event, { repositoryId }) => {
  try {
    const branches = await gitClient.listBranches(repositoryId);
    return {
      success: true,
      branches,
    };
  } catch (error) {
    return {
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message }
    };
  }
});

// Renderer usage
const result = await window.git.repo.listBranches({ repositoryId });
if (result.success) {
  setBranches(result.branches);
}
```

#### Long-Running Operations with Progress (> 5s operations)

For operations like large repository file tree fetch, use progress events:

```typescript
// src/main/ipc-handlers.ts
ipcMain.handle('git:fetchRepositoryTree', async (event, { repositoryId }) => {
  const operationId = generateId();

  try {
    // Send progress events back to renderer
    const tree = await gitClient.fetchRepositoryTree(repositoryId, {
      onProgress: (progress) => {
        event.sender.send('git:fetchTree:progress', {
          operationId,
          filesProcessed: progress.filesProcessed,
          totalFiles: progress.totalEstimate,
          currentPath: progress.currentPath,
        });
      }
    });

    return {
      success: true,
      tree,
      operationId,
    };
  } catch (error) {
    event.sender.send('git:fetchTree:error', {
      operationId,
      error: { code: 'FETCH_FAILED', message: error.message },
    });

    return {
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    };
  }
});

// Renderer usage
const { operationId } = await window.git.repo.fetchRepositoryTree({ repositoryId });

// Listen for progress
window.electron.on('git:fetchTree:progress', (event) => {
  setProgress({
    filesProcessed: event.filesProcessed,
    totalFiles: event.totalEstimate,
    percentage: (event.filesProcessed / event.totalEstimate) * 100,
  });
});
```

#### Operation Cancellation

```typescript
// src/main/ipc-handlers.ts
const activeOperations = new Map<string, AbortController>();

ipcMain.handle('git:fetchRepositoryTree', async (event, { repositoryId, operationId }) => {
  const abortController = new AbortController();
  activeOperations.set(operationId, abortController);

  try {
    const tree = await gitClient.fetchRepositoryTree(repositoryId, {
      signal: abortController.signal, // Cancellation token
    });

    return { success: true, tree };
  } finally {
    activeOperations.delete(operationId);
  }
});

ipcMain.handle('git:cancelOperation', async (_event, { operationId }) => {
  const controller = activeOperations.get(operationId);
  if (controller) {
    controller.abort();
    activeOperations.delete(operationId);
    return { success: true };
  }
  return { success: false, error: 'Operation not found' };
});

// Renderer usage
const [operationId, setOperationId] = useState<string>();

const fetchTree = async () => {
  const { operationId } = await window.git.repo.fetchRepositoryTree({ repositoryId });
  setOperationId(operationId);
};

const cancelFetch = () => {
  if (operationId) {
    window.git.repo.cancelOperation({ operationId });
  }
};
```

### 4.1 Timeout Handling

```typescript
// src/main/services/git-client.ts
export class GitClient {
  private readonly OPERATION_TIMEOUT_MS = 30000; // 30 seconds

  async fetchFileWithTimeout(filePath: string): Promise<string> {
    return Promise.race([
      this.fetchFile(filePath),
      new Promise<string>((_, reject) =>
        setTimeout(
          () => reject(new Error('Operation timed out after 30 seconds')),
          this.OPERATION_TIMEOUT_MS
        )
      )
    ]);
  }
}

// Or use AbortController timeout
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);

try {
  return await this.fetchFile(filePath, { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

---

## 5. Error Propagation

### Challenge

Errors can occur at multiple layers:
- Network errors (timeout, connection refused)
- API errors (404 not found, 403 forbidden, 429 rate limited)
- Validation errors (bad input, malformed response)
- System errors (disk full, permission denied)

Need consistent error representation that:
- Provides actionable user messages
- Includes retry logic hints
- Preserves stack traces for debugging
- Never leaks sensitive information

### Solution: Typed Error Envelopes

#### Error Type Definition

```typescript
// src/shared/types/git-errors.ts
export interface GitErrorResponse {
  code: GitErrorCode;
  message: string; // User-facing message
  details?: string; // Developer-facing details
  retryable: boolean;
  retryAfterSeconds?: number; // For rate limits
  requestId?: string; // For support/debugging
}

export type GitErrorCode =
  | 'INVALID_URL'           // Bad repository URL format
  | 'AUTH_FAILED'           // Authentication error
  | 'TOKEN_EXPIRED'         // OAuth token expired
  | 'NETWORK_ERROR'         // Network connectivity issue
  | 'TIMEOUT'               // Operation exceeded timeout
  | 'RATE_LIMIT'            // API rate limit hit
  | 'NOT_FOUND'             // Repository/file not found
  | 'PERMISSION_DENIED'     // Access denied
  | 'MALFORMED_RESPONSE'    // Invalid API response
  | 'UNKNOWN';              // Unexpected error
```

#### Error Mapping

```typescript
// src/main/services/git-error-handler.ts
export class GitErrorHandler {
  static mapApiError(error: any, requestId: string): GitErrorResponse {
    // GitHub API error
    if (error.response?.status === 404) {
      return {
        code: 'NOT_FOUND',
        message: 'Repository not found. Check the URL and try again.',
        details: error.response?.data?.message,
        retryable: false,
        requestId,
      };
    }

    if (error.response?.status === 401) {
      return {
        code: 'AUTH_FAILED',
        message: 'Authentication failed. Check your credentials.',
        details: 'Invalid or expired token',
        retryable: true,
        requestId,
      };
    }

    if (error.response?.status === 429) {
      const resetTime = parseInt(error.response?.headers['x-ratelimit-reset'] || '0') * 1000;
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

      return {
        code: 'RATE_LIMIT',
        message: `Rate limited. Please try again in ${retryAfter} seconds.`,
        retryable: true,
        retryAfterSeconds: retryAfter,
        requestId,
      };
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error. Check your connection and try again.',
        retryable: true,
        requestId,
      };
    }

    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: 'Operation timed out. The server is taking too long to respond.',
        retryable: true,
        requestId,
      };
    }

    // Fallback for unknown errors
    return {
      code: 'UNKNOWN',
      message: 'An unexpected error occurred. Please try again.',
      details: error.message,
      retryable: true,
      requestId,
    };
  }
}

// Usage in IPC handler
ipcMain.handle('git:fetchFile', async (_event, payload) => {
  const requestId = generateRequestId();
  const request = FetchFileSchema.parse(payload);

  try {
    const content = await gitClient.fetchFile(request.filePath);
    return { success: true, content };
  } catch (error) {
    const gitError = GitErrorHandler.mapApiError(error, requestId);
    return {
      success: false,
      error: gitError,
    };
  }
});
```

#### Renderer Error Handling

```typescript
// src/renderer/hooks/useGitOperation.ts
export function useGitOperation<T>(
  operation: () => Promise<{ success: boolean; error?: GitErrorResponse }>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GitErrorResponse | null>(null);

  const execute = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await operation();

      if (!result.success && result.error) {
        setError(result.error);

        // Handle specific error codes
        if (result.error.code === 'TOKEN_EXPIRED') {
          showReAuthenticationDialog();
        } else if (result.error.code === 'RATE_LIMIT') {
          showToast(`${result.error.message} Request ID: ${result.error.requestId}`);
        } else {
          showToast(result.error.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
}
```

---

## 6. Comparison of Approaches

| Aspect | Direct IPC | Basic contextBridge | **Recommended: Typed contextBridge + Zod** |
|--------|-----------|-------------------|-------------------------------------------|
| **API Control** | ❌ Uncontrolled | ✅ Limited | ✅✅ Explicit whitelist |
| **Type Safety** | ❌ None | ⚠️ Partial | ✅✅ Full compile + runtime |
| **Input Validation** | ❌ None | ⚠️ Manual | ✅✅ Zod schemas |
| **Error Handling** | ❌ Inconsistent | ⚠️ Ad-hoc | ✅✅ Typed envelopes |
| **Security** | ❌ High risk | ✅ Good | ✅✅ Best |
| **Maintainability** | ❌ Brittle | ✅ Okay | ✅✅ Excellent |
| **Testability** | ❌ Difficult | ✅ Possible | ✅✅ Easy |
| **Documentation** | ❌ None | ⚠️ Implicit | ✅✅ Self-documenting |

---

## Recommendations

### Decision: Typed contextBridge + Zod Validation

#### Rationale

1. **MarkRead Already Uses contextBridge**: No architectural change needed; extend existing pattern
2. **Type Safety at Both Compile & Runtime**: TypeScript catches mistakes early, Zod catches malformed data
3. **Security by Design**: Explicit API whitelist, input validation, error isolation
4. **Maintainability**: Self-documenting code; easy to audit what APIs renderer can access
5. **Error Resilience**: Consistent error handling with typed error envelopes
6. **Aligns with Spec**: Zod is already a dependency; plan.md specifies "clear service boundaries"

#### Alternatives Considered & Rejected

1. **Direct IPC Exposure**: ❌ Would require disabling security context isolation; introduces XSS vulnerability
2. **Loose contextBridge without Validation**: ⚠️ Simpler but sacrifices type safety and security; creates maintenance burden
3. **Custom RPC Framework**: ❌ Reinventing the wheel; contextBridge + Zod is proven and standard

---

## Implementation Notes

### 1. Code Structure

```
src/
├── main/
│   ├── ipc/
│   │   ├── git-handlers.ts         # IPC handler registration
│   │   └── git-rate-limiter.ts     # Rate limiting logic
│   └── services/
│       ├── git/
│       │   ├── github-client.ts    # GitHub API wrapper
│       │   ├── azure-client.ts     # Azure DevOps wrapper
│       │   ├── auth-service.ts     # OAuth + PAT handling
│       │   └── credential-store.ts # OS credential manager
│       └── cache/
│           └── cache-manager.ts    # File caching
├── preload/
│   └── git-api.ts                  # contextBridge exposure
├── renderer/
│   ├── services/
│   │   └── git-service.ts          # Renderer-side wrapper
│   └── hooks/
│       ├── useGitRepo.ts           # Repository ops hook
│       └── useGitErrors.ts         # Error handling hook
└── shared/
    └── types/
        ├── git-contracts.ts        # Request/response types
        └── git-errors.ts           # Error definitions
```

### 2. Type Safety Approach

**Three-layer validation**:
1. **TypeScript Types**: Catch at compile time (preload/git-api.ts)
2. **Zod Schemas**: Catch at IPC entry point (main/ipc-handlers.ts)
3. **Domain Logic**: Catch at business logic layer (main/services/)

```typescript
// Renderer - Layer 1: TypeScript enforces correct shape
const response = await window.git.repo.connect({
  url: 'https://github.com/user/repo',
  authMethod: 'oauth',
  // token: 'abc123' // ← TypeScript error: optional, and renderer shouldn't have token anyway
});

// IPC boundary - Layer 2: Zod validates actual data
ipcMain.handle('git:connect', async (_event, payload) => {
  const request = ConnectRepositorySchema.parse(payload); // Throws if invalid
  // From here: request type is 100% known

  // Business logic - Layer 3: Domain logic can assume valid input
  return await authService.authenticateWithGitHub(request.url);
});
```

### 3. Error Handling Pattern

All IPC responses use standard envelope:
```typescript
type IPCResponse<T> =
  | { success: true; data: T; }
  | { success: false; error: GitErrorResponse; };
```

This forces explicit error handling in renderer:
```typescript
const result = await window.git.repo.connect({...});

if (result.success) {
  // result.data is available (and error is undefined)
  console.log(result.data.repositoryId);
} else {
  // result.error is available (and data is undefined)
  console.error(result.error.message);
  if (result.error.retryable && result.error.retryAfterSeconds) {
    // Retry logic
  }
}
```

### 4. Security Hardening Checklist

- [x] Use contextBridge (not direct ipcRenderer)
- [x] Define explicit API surface (whitelist, not blacklist)
- [x] Validate ALL IPC payloads with Zod schemas
- [x] Never send credentials over IPC - retrieve from OS credential manager
- [x] Sanitize HTML output (DOMPurify already in use)
- [x] Implement rate limiting in main process
- [x] Use HTTPS-only URLs (validated via Zod)
- [x] Implement timeout limits on all operations
- [x] Log security-relevant events (failed auth, rate limits)
- [x] Use typed error envelopes (never expose stack traces to renderer)
- [x] Use AbortController for operation cancellation
- [x] Implement path traversal protection for file access

---

## 7. File Caching Strategy

### Decision: LRU Cache with File System Persistence

**Rationale**: Implement a Least Recently Used (LRU) cache strategy with file system persistence to meet the requirements of <1s cached file load time and <100MB per repository. This approach balances performance, memory efficiency, and offline capability.

**Key Requirements from Spec**:
- <1s load time for cached files (SC-005)
- <100MB cache per repository (SC-009)
- 5GB total cache limit across all repositories (Technical Context)
- Offline access to cached content (FR-018, FR-028)

**Implementation**:
```typescript
// src/main/services/storage/cache-manager.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';

interface CacheEntry {
  repositoryId: string;
  filePath: string;
  branch: string;
  content: string;
  size: number;
  fetchedAt: number;
  lastAccessedAt: number;
}

interface CacheMetadata {
  entries: Map<string, CacheEntry>;
  totalSize: number;
  repositorySizes: Map<string, number>;
}

export class CacheManager {
  private readonly CACHE_DIR: string;
  private readonly MAX_TOTAL_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
  private readonly MAX_REPO_SIZE = 100 * 1024 * 1024; // 100MB
  private metadata: CacheMetadata;

  constructor() {
    this.CACHE_DIR = path.join(app.getPath('userData'), 'git-cache');
    this.metadata = {
      entries: new Map(),
      totalSize: 0,
      repositorySizes: new Map(),
    };
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.CACHE_DIR, { recursive: true });
    await this.loadMetadata();
  }

  async get(
    repositoryId: string,
    filePath: string,
    branch: string
  ): Promise<string | null> {
    const key = this.generateKey(repositoryId, filePath, branch);
    const entry = this.metadata.entries.get(key);

    if (!entry) return null;

    // Update last accessed timestamp (LRU tracking)
    entry.lastAccessedAt = Date.now();
    this.metadata.entries.set(key, entry);
    await this.saveMetadata();

    // Read from file system
    const cacheFilePath = this.getCacheFilePath(key);
    try {
      const content = await fs.readFile(cacheFilePath, 'utf-8');
      return content;
    } catch (error) {
      // Cache file missing, remove from metadata
      this.metadata.entries.delete(key);
      return null;
    }
  }

  async set(
    repositoryId: string,
    filePath: string,
    branch: string,
    content: string
  ): Promise<void> {
    const key = this.generateKey(repositoryId, filePath, branch);
    const size = Buffer.byteLength(content, 'utf-8');

    // Check if adding this file would exceed limits
    await this.ensureSpace(repositoryId, size);

    // Write to file system
    const cacheFilePath = this.getCacheFilePath(key);
    await fs.mkdir(path.dirname(cacheFilePath), { recursive: true });
    await fs.writeFile(cacheFilePath, content, 'utf-8');

    // Update metadata
    const existingEntry = this.metadata.entries.get(key);
    const oldSize = existingEntry?.size || 0;

    const entry: CacheEntry = {
      repositoryId,
      filePath,
      branch,
      content: '', // Don't store content in metadata
      size,
      fetchedAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    this.metadata.entries.set(key, entry);
    this.metadata.totalSize += (size - oldSize);

    const repoSize = this.metadata.repositorySizes.get(repositoryId) || 0;
    this.metadata.repositorySizes.set(repositoryId, repoSize + (size - oldSize));

    await this.saveMetadata();
  }

  private async ensureSpace(repositoryId: string, neededSize: number): Promise<void> {
    const repoSize = this.metadata.repositorySizes.get(repositoryId) || 0;

    // Check repository limit
    if (repoSize + neededSize > this.MAX_REPO_SIZE) {
      await this.evictLRU(repositoryId, repoSize + neededSize - this.MAX_REPO_SIZE);
    }

    // Check total limit
    if (this.metadata.totalSize + neededSize > this.MAX_TOTAL_SIZE) {
      await this.evictLRU(null, this.metadata.totalSize + neededSize - this.MAX_TOTAL_SIZE);
    }
  }

  private async evictLRU(repositoryId: string | null, bytesToFree: number): Promise<void> {
    // Get entries sorted by last accessed (oldest first)
    const entries = Array.from(this.metadata.entries.entries())
      .filter(([_, entry]) => !repositoryId || entry.repositoryId === repositoryId)
      .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);

    let freedBytes = 0;
    for (const [key, entry] of entries) {
      if (freedBytes >= bytesToFree) break;

      // Delete cache file
      const cacheFilePath = this.getCacheFilePath(key);
      await fs.unlink(cacheFilePath).catch(() => {}); // Ignore errors

      // Update metadata
      this.metadata.entries.delete(key);
      this.metadata.totalSize -= entry.size;

      const repoSize = this.metadata.repositorySizes.get(entry.repositoryId) || 0;
      this.metadata.repositorySizes.set(entry.repositoryId, repoSize - entry.size);

      freedBytes += entry.size;
    }

    await this.saveMetadata();
  }

  private generateKey(repositoryId: string, filePath: string, branch: string): string {
    return `${repositoryId}/${branch}/${filePath}`;
  }

  private getCacheFilePath(key: string): string {
    // Create a safe file path from the key
    const safeKey = key.replace(/[^a-zA-Z0-9\-_\/]/g, '_');
    return path.join(this.CACHE_DIR, safeKey);
  }

  private async loadMetadata(): Promise<void> {
    const metadataPath = path.join(this.CACHE_DIR, 'metadata.json');
    try {
      const data = await fs.readFile(metadataPath, 'utf-8');
      const parsed = JSON.parse(data);
      this.metadata = {
        entries: new Map(parsed.entries),
        totalSize: parsed.totalSize,
        repositorySizes: new Map(parsed.repositorySizes),
      };
    } catch (error) {
      // Metadata doesn't exist yet, start fresh
      this.metadata = {
        entries: new Map(),
        totalSize: 0,
        repositorySizes: new Map(),
      };
    }
  }

  private async saveMetadata(): Promise<void> {
    const metadataPath = path.join(this.CACHE_DIR, 'metadata.json');
    const data = JSON.stringify({
      entries: Array.from(this.metadata.entries.entries()),
      totalSize: this.metadata.totalSize,
      repositorySizes: Array.from(this.metadata.repositorySizes.entries()),
    });
    await fs.writeFile(metadataPath, data, 'utf-8');
  }
}
```

**Cache Invalidation Strategy**:
- LRU eviction when size limits are exceeded
- Manual refresh button clears and refetches specific files
- Branch switch invalidates cache for that branch
- Repository disconnect option to clear all cached files

---

## 8. Offline Detection

### Decision: navigator.onLine + Periodic Connectivity Checks

**Rationale**: Use the browser's `navigator.onLine` API as the primary offline detection mechanism, supplemented with periodic connectivity checks to Git providers. This provides immediate offline detection with validation against actual service availability.

**Requirements from Spec**:
- Display visible offline indicator badge (FR-027)
- Disable refresh and branch switching when offline (FR-028)
- Allow viewing cached content when offline (FR-018)
- Automatically restore online functionality when connectivity returns (FR-029)

**Implementation**:
```typescript
// src/renderer/hooks/useOfflineStatus.ts
import { useState, useEffect } from 'react';

export interface ConnectivityStatus {
  isOnline: boolean;
  lastChecked: number;
  provider?: 'github' | 'azure';
  canReachProvider: boolean;
}

export function useOfflineStatus() {
  const [status, setStatus] = useState<ConnectivityStatus>({
    isOnline: navigator.onLine,
    lastChecked: Date.now(),
    canReachProvider: false,
  });

  useEffect(() => {
    // Listen to browser online/offline events
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      checkProviderConnectivity();
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        canReachProvider: false,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check (every 30 seconds)
    const interval = setInterval(() => {
      if (navigator.onLine) {
        checkProviderConnectivity();
      }
    }, 30000);

    // Initial check
    if (navigator.onLine) {
      checkProviderConnectivity();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const checkProviderConnectivity = async () => {
    try {
      // Check GitHub connectivity
      const githubCheck = await window.git.connectivity.check('github');

      setStatus({
        isOnline: true,
        lastChecked: Date.now(),
        provider: 'github',
        canReachProvider: githubCheck.success,
      });
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        canReachProvider: false,
        lastChecked: Date.now(),
      }));
    }
  };

  return status;
}
```

```typescript
// src/main/services/git/connectivity-service.ts
export class ConnectivityService {
  async checkGitHub(): Promise<boolean> {
    try {
      // Lightweight API call to check connectivity
      const response = await axios.get('https://api.github.com/zen', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async checkAzureDevOps(): Promise<boolean> {
    try {
      const response = await axios.get('https://dev.azure.com', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
```

```typescript
// src/renderer/components/git/OfflineBadge.tsx
import React from 'react';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';

export function OfflineBadge() {
  const status = useOfflineStatus();

  if (status.isOnline && status.canReachProvider) {
    return null; // Don't show badge when online
  }

  return (
    <div className="offline-badge">
      <span className="offline-icon">⚠️</span>
      <span className="offline-text">
        {!status.isOnline
          ? 'Offline - Cached content only'
          : 'Cannot reach Git provider - Cached content only'}
      </span>
    </div>
  );
}
```

**Offline Mode Behavior**:
- Refresh button is disabled
- Branch selector is disabled
- File tree shows only cached files (with visual indicator)
- Error messages clearly state offline mode
- Automatic reconnection when connectivity is restored

---

## Dependencies Review

**Already available in MarkRead**:
- ✅ `zod` (3.22.0) - Runtime schema validation
- ✅ `typescript` (5.7.0) - Compile-time types
- ✅ `dompurify` (3.3.1) - HTML sanitization
- ✅ Electron `safeStorage` API - Built-in OS credential manager (Electron 33.4.11)

**New Dependencies Required**:
- 📦 `axios` (~12KB gzipped) - HTTP client for GitHub/Azure DevOps API calls
- 📦 `electron-store` (~5KB) - Persistent storage for cache metadata and settings

**Dependencies NOT Needed** (Rejected Alternatives):
- ❌ `keytar` - Deprecated, replaced by Electron's safeStorage API
- ❌ `@octokit/rest` - Too heavy, direct REST calls are sufficient
- ❌ `azure-devops-node-api` - Too heavy, direct REST calls are sufficient
- ❌ `electron-oauth2` - Deprecated, custom implementation preferred

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// tests/unit/services/git/auth-service.test.ts
describe('AuthService', () => {
  it('should validate GitHub URLs correctly', () => {
    const valid = GitURLSchema.safeParse('https://github.com/user/repo');
    expect(valid.success).toBe(true);

    const invalid = GitURLSchema.safeParse('http://github.com/user/repo');
    expect(invalid.success).toBe(false);
  });

  it('should reject path traversal in file paths', () => {
    const schema = FetchFileSchema;
    expect(schema.safeParse({
      repositoryId: 'uuid',
      filePath: '../../etc/passwd'
    }).success).toBe(false);
  });
});

// tests/unit/ipc/git-handlers.test.ts
describe('Git IPC Handlers', () => {
  it('should rate limit requests appropriately', async () => {
    const limiter = new GitRateLimiter();
    // Mock API that returns 429
    const result = await limiter.withRateLimit('repo-id', async () => {
      throw { status: 429 };
    });
    expect(result.error?.code).toBe('RATE_LIMITED');
  });
});
```

### Integration Tests

```typescript
// tests/integration/git/github-auth.test.ts
describe('GitHub Authentication Integration', () => {
  it('should authenticate with valid PAT', async () => {
    const pat = process.env.GITHUB_TEST_PAT;
    const result = await gitClient.authenticate({ token: pat });
    expect(result.success).toBe(true);
  });

  it('should handle rate limiting gracefully', async () => {
    // Create high request volume
    const results = await Promise.allSettled(
      Array(100).fill(null).map(() => gitClient.listBranches('repo-id'))
    );
    // Should have rate limit error with retry-after
  });
});
```

---

## Summary of Research Decisions

All technical unknowns from the implementation plan have been resolved:

| Area | Decision | Rationale |
|------|----------|-----------|
| **HTTP Client** | axios | Type-safe, interceptor support, mature ecosystem |
| **OAuth** | Custom BrowserWindow + protocol handlers | No maintained library, native-feeling UX |
| **Credentials** | Electron safeStorage API | Built-in, OS-level encryption, modern |
| **IPC** | contextBridge + Zod validation | Secure, type-safe, extends existing pattern |
| **API Integration** | Direct REST calls | Full control, no SDK bloat |
| **Rate Limiting** | Exponential backoff with jitter | Industry standard, prevents thundering herd |
| **Caching** | LRU with file system persistence | Meets performance + size constraints |
| **Offline Detection** | navigator.onLine + periodic checks | Immediate detection + validation |

**New Dependencies**: axios, electron-store
**No Additional Dependencies Needed**: Electron safeStorage API is built-in

---

## Conclusion

The research provides a comprehensive technical foundation for Git repository integration:

1. **Security-First Design**: contextBridge + Zod + safeStorage ensures Git credentials are protected at every layer
2. **Type Safety**: TypeScript + Zod provides compile-time and runtime validation across IPC boundaries
3. **Performance**: Meets all performance requirements (<30s connection, <5s branch switch, <1s cached load)
4. **Offline Capability**: LRU cache + offline detection enables full offline access to cached content
5. **Minimal Dependencies**: Only 2 new dependencies (axios, electron-store), leveraging built-in Electron APIs
6. **Constitution Alignment**: Testable abstractions, clear error messages, documented patterns

All decisions extend MarkRead's existing architecture patterns and align with the project constitution.

---

**References**:
- Electron Security: https://www.electronjs.org/docs/tutorial/security
- Electron safeStorage API: https://www.electronjs.org/docs/api/safe-storage
- contextBridge API: https://www.electronjs.org/docs/api/context-bridge
- Zod Validation: https://zod.dev
- GitHub REST API v3: https://docs.github.com/en/rest
- GitHub Rate Limiting: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- Azure DevOps REST API v7.1: https://learn.microsoft.com/en-us/rest/api/azure/devops/
- axios Documentation: https://axios-http.com/docs/intro
