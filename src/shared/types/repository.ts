/**
 * Repository Type Definitions
 *
 * Shared types for repository entities, branches, and files.
 * These types are used across main, preload, and renderer processes.
 *
 * Source: specs/001-git-repo-integration/data-model.md
 */

import { z } from 'zod';
import type { GitProvider, AuthMethod } from './git';

// ============================================================================
// Repository Entity (T019)
// ============================================================================

/**
 * Repository entity
 * Represents a remote Git repository (GitHub or Azure DevOps).
 */
export interface Repository {
  id: string;
  provider: GitProvider;
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
  authMethod: AuthMethod;
  lastAccessed: number;
  createdAt: number;
  isOnline: boolean;
}

/**
 * Zod schema for Repository validation
 */
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

// ============================================================================
// Branch Entity (T020)
// ============================================================================

/**
 * Branch entity
 * Represents a specific branch within a repository.
 */
export interface Branch {
  repositoryId: string;
  name: string;
  sha: string;
  lastAccessed: number;
  isDefault: boolean;
}

/**
 * Zod schema for Branch validation
 */
export const BranchSchema = z.object({
  repositoryId: z.string().uuid(),
  name: z.string().regex(/^[a-zA-Z0-9\-_./]+$/, 'Invalid branch name'),
  sha: z.string().regex(/^[a-f0-9]{40}$/, 'Invalid commit SHA'),
  lastAccessed: z.number().positive(),
  isDefault: z.boolean(),
});

// ============================================================================
// Repository File Entity (T021)
// ============================================================================

/**
 * Repository file entity
 * Represents a file within a repository.
 */
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

/**
 * Zod schema for RepositoryFile validation
 */
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

// ============================================================================
// Tree Node (for file tree display)
// ============================================================================

/**
 * Tree node structure (for file tree display)
 */
export interface TreeNode {
  path: string;
  type: 'file' | 'directory';
  size: number;
  sha?: string;
  isMarkdown: boolean;
  children?: TreeNode[];
}

// ============================================================================
// Recent Item Entity (T074 - Phase 6)
// ============================================================================

/**
 * Recent item entity (for recent repositories list)
 * Unified list of both local folders and Git repositories.
 */
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

/**
 * Zod schema for RecentItem validation
 */
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
