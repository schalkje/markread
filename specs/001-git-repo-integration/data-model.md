# Data Model: Git Repository Integration

**Feature**: 001-git-repo-integration | **Date**: 2025-12-29

---

## Overview

This document defines the data entities, their relationships, and validation rules for the Git repository integration feature. All entities are designed to support both GitHub and Azure DevOps repositories with identical functionality.

---

## Entity Relationship Diagram

```
┌─────────────────┐      1      ┌──────────────┐
│   Repository    │◄────────────┤    Branch    │
│                 │              │              │
└────────┬────────┘              └──────┬───────┘
         │                              │
         │ 1                            │ 1
         │                              │
         ▼ N                            ▼ N
┌─────────────────┐              ┌──────────────┐
│ Repository File │              │ Cache Entry  │
│                 │              │              │
└─────────────────┘              └──────────────┘

┌─────────────────┐      1      ┌──────────────────────┐
│   Repository    │◄────────────┤ Authentication       │
│                 │              │ Credential           │
└────────┬────────┘              └──────────────────────┘
         │
         │ 1
         │
         ▼ 1
┌─────────────────┐
│  Recent Item    │
│                 │
└─────────────────┘
```

---

## Core Entities

### 1. Repository

Represents a remote Git repository (GitHub or Azure DevOps).

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | `string` (UUID) | ✅ | Unique repository identifier | UUID v4 format |
| `provider` | `'github' \| 'azure'` | ✅ | Git provider type | Enum value |
| `url` | `string` | ✅ | Normalized repository URL | HTTPS URL, standardized format (see FR-026) |
| `rawUrl` | `string` | ✅ | Original URL provided by user | HTTPS URL |
| `displayName` | `string` | ✅ | User-friendly repository name | 1-255 characters |
| `owner` | `string` | ✅ (GitHub) | Repository owner/organization | Valid GitHub username |
| `name` | `string` | ✅ (GitHub) | Repository name | Valid GitHub repo name |
| `organization` | `string` | ✅ (Azure) | Azure DevOps organization | Valid Azure org name |
| `project` | `string` | ✅ (Azure) | Azure DevOps project | Valid Azure project name |
| `repositoryId` | `string` | ✅ (Azure) | Azure repository ID | GUID format |
| `defaultBranch` | `string` | ✅ | Default branch name | Non-empty string |
| `currentBranch` | `string` | ✅ | Currently active branch | Non-empty string |
| `authMethod` | `'oauth' \| 'pat'` | ✅ | Authentication method used | Enum value |
| `lastAccessed` | `number` | ✅ | Timestamp of last access | Unix timestamp (ms) |
| `createdAt` | `number` | ✅ | Timestamp of first connection | Unix timestamp (ms) |
| `isOnline` | `boolean` | ✅ | Current connectivity status | Boolean |

**Validation Rules**:
- `url` must be normalized:
  - Remove trailing slashes
  - Remove `.git` suffix
  - Standardize protocol to `https://`
  - Examples: `https://github.com/user/repo` (not `https://github.com/user/repo.git/`)
- GitHub repositories require `owner` and `name`
- Azure DevOps repositories require `organization`, `project`, and `repositoryId`
- `displayName` defaults to `{owner}/{name}` for GitHub, `{project}/{name}` for Azure

**State Transitions**:
```
┌─────────┐    connect()     ┌───────────┐    disconnect()    ┌──────────────┐
│ Initial │─────────────────►│ Connected │───────────────────►│ Disconnected │
└─────────┘                  └─────┬─────┘                    └──────────────┘
                                   │
                                   │ offline detected
                                   ▼
                             ┌───────────┐
                             │  Offline  │
                             └─────┬─────┘
                                   │
                                   │ online detected
                                   ▼
                             ┌───────────┐
                             │ Connected │
                             └───────────┘
```

**TypeScript Definition**:
```typescript
// src/shared/types/repository.ts
export interface Repository {
  id: string;
  provider: 'github' | 'azure';
  url: string;
  rawUrl: string;
  displayName: string;

  // GitHub-specific
  owner?: string;
  name?: string;

  // Azure-specific
  organization?: string;
  project?: string;
  repositoryId?: string;

  defaultBranch: string;
  currentBranch: string;
  authMethod: 'oauth' | 'pat';
  lastAccessed: number;
  createdAt: number;
  isOnline: boolean;
}

export const RepositorySchema = z.object({
  id: z.string().uuid(),
  provider: z.enum(['github', 'azure']),
  url: z.string().url().startsWith('https://'),
  rawUrl: z.string().url().startsWith('https://'),
  displayName: z.string().min(1).max(255),
  owner: z.string().optional(),
  name: z.string().optional(),
  organization: z.string().optional(),
  project: z.string().optional(),
  repositoryId: z.string().optional(),
  defaultBranch: z.string().min(1),
  currentBranch: z.string().min(1),
  authMethod: z.enum(['oauth', 'pat']),
  lastAccessed: z.number().positive(),
  createdAt: z.number().positive(),
  isOnline: z.boolean(),
}).refine(
  (data) => {
    if (data.provider === 'github') {
      return !!data.owner && !!data.name;
    }
    return !!data.organization && !!data.project && !!data.repositoryId;
  },
  { message: 'GitHub repos require owner/name, Azure repos require organization/project/repositoryId' }
);
```

---

### 2. Branch

Represents a specific branch within a repository.

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `repositoryId` | `string` (UUID) | ✅ | Parent repository ID | UUID v4 format |
| `name` | `string` | ✅ | Branch name | Valid Git branch name |
| `sha` | `string` | ✅ | Latest commit SHA | 40-character hex string |
| `lastAccessed` | `number` | ✅ | Timestamp of last access | Unix timestamp (ms) |
| `isDefault` | `boolean` | ✅ | Whether this is the default branch | Boolean |

**Validation Rules**:
- `name` must be a valid Git branch name (alphanumeric, hyphens, underscores, slashes)
- `sha` must be a valid Git commit SHA (40 hexadecimal characters)
- Only one branch per repository can have `isDefault = true`

**TypeScript Definition**:
```typescript
// src/shared/types/repository.ts
export interface Branch {
  repositoryId: string;
  name: string;
  sha: string;
  lastAccessed: number;
  isDefault: boolean;
}

export const BranchSchema = z.object({
  repositoryId: z.string().uuid(),
  name: z.string().regex(/^[a-zA-Z0-9\-_./]+$/, 'Invalid branch name'),
  sha: z.string().regex(/^[a-f0-9]{40}$/, 'Invalid commit SHA'),
  lastAccessed: z.number().positive(),
  isDefault: z.boolean(),
});
```

---

### 3. Repository File

Represents a file within a repository.

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `repositoryId` | `string` (UUID) | ✅ | Parent repository ID | UUID v4 format |
| `branch` | `string` | ✅ | Branch containing this file | Valid branch name |
| `path` | `string` | ✅ | File path relative to repository root | Valid file path |
| `content` | `string` | ✅ | File content (UTF-8) | Valid UTF-8 string |
| `size` | `number` | ✅ | File size in bytes | Non-negative integer |
| `sha` | `string` | ✅ | File content SHA (for change detection) | 40-character hex string |
| `type` | `'file' \| 'directory'` | ✅ | File or directory | Enum value |
| `isMarkdown` | `boolean` | ✅ | Whether file is markdown | Boolean |
| `fetchedAt` | `number` | ✅ | Timestamp of last fetch | Unix timestamp (ms) |
| `cached` | `boolean` | ✅ | Whether file is cached locally | Boolean |

**Validation Rules**:
- `path` must not contain `..` (path traversal protection)
- `path` must use forward slashes `/` (normalized)
- `size` must not exceed 10MB (10 * 1024 * 1024 bytes) per edge case handling
- `isMarkdown` is true if path ends with `.md`, `.markdown`, or `.mdown`

**TypeScript Definition**:
```typescript
// src/shared/types/repository.ts
export interface RepositoryFile {
  repositoryId: string;
  branch: string;
  path: string;
  content: string;
  size: number;
  sha: string;
  type: 'file' | 'directory';
  isMarkdown: boolean;
  fetchedAt: number;
  cached: boolean;
}

export const RepositoryFileSchema = z.object({
  repositoryId: z.string().uuid(),
  branch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/),
  path: z.string()
    .min(1)
    .max(1024)
    .regex(/^[a-zA-Z0-9\-_./]+$/)
    .refine((path) => !path.includes('..'), 'Path traversal not allowed'),
  content: z.string(),
  size: z.number().nonnegative().max(10 * 1024 * 1024, 'File exceeds 10MB limit'),
  sha: z.string().regex(/^[a-f0-9]{40}$/),
  type: z.enum(['file', 'directory']),
  isMarkdown: z.boolean(),
  fetchedAt: z.number().positive(),
  cached: z.boolean(),
});
```

---

### 4. Authentication Credential

Represents stored authentication information for a repository.

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `repositoryId` | `string` (UUID) | ✅ | Associated repository ID | UUID v4 format |
| `provider` | `'github' \| 'azure'` | ✅ | Git provider type | Enum value |
| `authMethod` | `'oauth' \| 'pat'` | ✅ | Authentication method | Enum value |
| `encryptedToken` | `string` | ✅ | OS-encrypted token (base64) | Base64 string |
| `expiresAt` | `number` | ❌ | Token expiration timestamp | Unix timestamp (ms) |
| `scope` | `string[]` | ❌ | OAuth scopes granted | Array of scope strings |
| `createdAt` | `number` | ✅ | Timestamp of credential creation | Unix timestamp (ms) |
| `lastUsed` | `number` | ✅ | Timestamp of last use | Unix timestamp (ms) |

**Validation Rules**:
- `encryptedToken` is encrypted using Electron's `safeStorage` API
- `expiresAt` is required for OAuth tokens, optional for PATs
- Expired credentials are automatically removed on retrieval attempt
- `scope` should include at least `['repo', 'read:user']` for GitHub
- Token is NEVER stored in plain text or logged

**Security Notes**:
- Tokens are encrypted at rest using OS-level credential managers
- Tokens are NEVER sent over IPC; only repository ID is sent
- Tokens are retrieved in main process only
- Failed authentication attempts are logged (without token details)

**TypeScript Definition**:
```typescript
// src/shared/types/git.ts
export interface AuthenticationCredential {
  repositoryId: string;
  provider: 'github' | 'azure';
  authMethod: 'oauth' | 'pat';
  encryptedToken: string; // Base64-encoded encrypted token
  expiresAt?: number;
  scope?: string[];
  createdAt: number;
  lastUsed: number;
}

export const AuthenticationCredentialSchema = z.object({
  repositoryId: z.string().uuid(),
  provider: z.enum(['github', 'azure']),
  authMethod: z.enum(['oauth', 'pat']),
  encryptedToken: z.string().min(1), // Never validate token content
  expiresAt: z.number().positive().optional(),
  scope: z.array(z.string()).optional(),
  createdAt: z.number().positive(),
  lastUsed: z.number().positive(),
});
```

---

### 5. Recent Item

Represents an entry in the recent items list (unified local folders + Git repositories).

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | `string` (UUID) | ✅ | Unique item identifier | UUID v4 format |
| `type` | `'local' \| 'git'` | ✅ | Item type | Enum value |
| `location` | `string` | ✅ | File path (local) or URL (git) | Valid path or URL |
| `displayName` | `string` | ✅ | User-friendly name | 1-255 characters |
| `iconType` | `'folder' \| 'github' \| 'azure'` | ✅ | Icon to display | Enum value |
| `lastBranch` | `string` | ❌ | Last accessed branch (git only) | Valid branch name |
| `lastAccessed` | `number` | ✅ | Timestamp of last access | Unix timestamp (ms) |
| `isAvailable` | `boolean` | ✅ | Whether item is currently accessible | Boolean |

**Validation Rules**:
- `location` must be an absolute file path for local folders
- `location` must be a normalized HTTPS URL for git repositories
- `lastBranch` is required for git items, must be null for local items
- `iconType` is `'folder'` for local, `'github'` or `'azure'` for git
- Recent items list is sorted by `lastAccessed` (descending)
- Maximum 50 recent items are retained

**TypeScript Definition**:
```typescript
// src/shared/types/recent.ts
export interface RecentItem {
  id: string;
  type: 'local' | 'git';
  location: string;
  displayName: string;
  iconType: 'folder' | 'github' | 'azure';
  lastBranch?: string;
  lastAccessed: number;
  isAvailable: boolean;
}

export const RecentItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['local', 'git']),
  location: z.string().min(1),
  displayName: z.string().min(1).max(255),
  iconType: z.enum(['folder', 'github', 'azure']),
  lastBranch: z.string().optional(),
  lastAccessed: z.number().positive(),
  isAvailable: z.boolean(),
}).refine(
  (data) => {
    if (data.type === 'git') {
      return !!data.lastBranch;
    }
    return !data.lastBranch;
  },
  { message: 'Git items require lastBranch, local items must not have it' }
);
```

---

### 6. Cache Entry

Represents cached file content with metadata for LRU eviction.

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `key` | `string` | ✅ | Cache key (repo/branch/path) | Non-empty string |
| `repositoryId` | `string` (UUID) | ✅ | Associated repository ID | UUID v4 format |
| `filePath` | `string` | ✅ | File path relative to repo root | Valid file path |
| `branch` | `string` | ✅ | Branch containing this file | Valid branch name |
| `size` | `number` | ✅ | Content size in bytes | Non-negative integer |
| `fetchedAt` | `number` | ✅ | Timestamp of original fetch | Unix timestamp (ms) |
| `lastAccessedAt` | `number` | ✅ | Timestamp of last access (LRU) | Unix timestamp (ms) |
| `filePath` | `string` | ✅ | Path to cached file on disk | Absolute file path |

**Validation Rules**:
- `key` format: `{repositoryId}/{branch}/{filePath}`
- `size` contributes to per-repository and total cache size limits
- `lastAccessedAt` updated on every read for LRU tracking
- Cache entries are automatically evicted when size limits are exceeded
- Cache file path is sanitized to prevent path traversal

**Cache Limits** (from FR-020, SC-009):
- Maximum 100MB per repository
- Maximum 5GB total across all repositories
- LRU eviction when limits are exceeded

**TypeScript Definition**:
```typescript
// src/shared/types/cache.ts
export interface CacheEntry {
  key: string;
  repositoryId: string;
  filePath: string;
  branch: string;
  size: number;
  fetchedAt: number;
  lastAccessedAt: number;
  diskPath: string;
}

export const CacheEntrySchema = z.object({
  key: z.string().min(1),
  repositoryId: z.string().uuid(),
  filePath: z.string().min(1).max(1024),
  branch: z.string().regex(/^[a-zA-Z0-9\-_./]+$/),
  size: z.number().nonnegative(),
  fetchedAt: z.number().positive(),
  lastAccessedAt: z.number().positive(),
  diskPath: z.string().min(1),
});
```

---

## Helper Functions

### URL Normalization

```typescript
// src/shared/utils/url-normalizer.ts
export function normalizeRepositoryUrl(rawUrl: string): string {
  let normalized = rawUrl.trim();

  // Ensure HTTPS
  if (normalized.startsWith('http://')) {
    normalized = normalized.replace('http://', 'https://');
  }

  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, '');

  // Remove .git suffix
  if (normalized.endsWith('.git')) {
    normalized = normalized.slice(0, -4);
  }

  return normalized;
}

// Examples:
// normalizeRepositoryUrl('https://github.com/user/repo.git/') → 'https://github.com/user/repo'
// normalizeRepositoryUrl('http://github.com/user/repo/') → 'https://github.com/user/repo'
```

### Repository URL Parsing

```typescript
// src/shared/utils/url-parser.ts
export interface ParsedGitHubUrl {
  provider: 'github';
  owner: string;
  name: string;
}

export interface ParsedAzureUrl {
  provider: 'azure';
  organization: string;
  project: string;
  repositoryId: string;
}

export type ParsedRepositoryUrl = ParsedGitHubUrl | ParsedAzureUrl;

export function parseRepositoryUrl(url: string): ParsedRepositoryUrl {
  const normalized = normalizeRepositoryUrl(url);
  const urlObj = new URL(normalized);

  if (urlObj.hostname === 'github.com') {
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length < 2) {
      throw new Error('Invalid GitHub URL');
    }
    return {
      provider: 'github',
      owner: parts[0],
      name: parts[1],
    };
  }

  if (urlObj.hostname === 'dev.azure.com') {
    // Format: https://dev.azure.com/{organization}/{project}/_git/{repositoryId}
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length < 4 || parts[2] !== '_git') {
      throw new Error('Invalid Azure DevOps URL');
    }
    return {
      provider: 'azure',
      organization: parts[0],
      project: parts[1],
      repositoryId: parts[3],
    };
  }

  throw new Error('Unsupported Git provider');
}
```

---

## Persistence Strategy

### Repository Metadata
- **Storage**: `electron-store` in `repositories.json`
- **Location**: `{userData}/repositories.json`
- **Format**: JSON array of `Repository` objects
- **Indexed by**: `id`, `url` (for duplicate detection)

### Authentication Credentials
- **Storage**: Electron `safeStorage` API + `electron-store` for metadata
- **Location**: OS credential manager (encrypted) + `{userData}/credentials.json` (metadata only)
- **Format**: Encrypted tokens in OS keychain, metadata in JSON
- **Indexed by**: `repositoryId`

### Cache Entries
- **Storage**: File system + `electron-store` for metadata
- **Location**: `{userData}/git-cache/` (files) + `{userData}/git-cache/metadata.json`
- **Format**: Raw file content on disk, metadata in JSON
- **Indexed by**: `key` (for fast lookup)

### Recent Items
- **Storage**: `electron-store` in `recent-items.json`
- **Location**: `{userData}/recent-items.json`
- **Format**: JSON array of `RecentItem` objects, sorted by `lastAccessed`
- **Max Items**: 50 (oldest are evicted)

---

## Summary

All entities are designed with:
- ✅ **Type Safety**: Zod schemas for runtime validation
- ✅ **Security**: Credentials encrypted at rest, never in plain text
- ✅ **Performance**: LRU caching with size limits
- ✅ **Offline Support**: Cached content accessible when offline
- ✅ **Consistency**: Normalized URLs prevent duplicates
- ✅ **Constitution Alignment**: Clear validation rules, testable abstractions
