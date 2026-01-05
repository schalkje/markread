/**
 * Git Type Definitions
 *
 * Shared types for Git operations, authentication, and connectivity.
 * These types are used across main, preload, and renderer processes.
 *
 * Source: specs/001-git-repo-integration/data-model.md and contracts/
 */

import { z } from 'zod';

/**
 * Git provider types
 */
export type GitProvider = 'github' | 'azure';

/**
 * Authentication method types
 */
export type AuthMethod = 'oauth' | 'pat';

// ============================================================================
// Authentication Credential Entity (T022)
// ============================================================================

/**
 * Authentication credential (encrypted storage)
 * Represents stored authentication information for a repository.
 *
 * Security Notes:
 * - Tokens are encrypted at rest using Electron's safeStorage API
 * - Tokens are NEVER stored in plain text or logged
 * - Tokens are NEVER sent over IPC; only repository ID is sent
 * - Tokens are retrieved in main process only
 */
export interface AuthenticationCredential {
  repositoryId: string;
  provider: GitProvider;
  authMethod: AuthMethod;
  encryptedToken: string; // Base64-encoded encrypted token
  expiresAt?: number;
  scope?: string[];
  createdAt: number;
  lastUsed: number;
}

/**
 * Zod schema for AuthenticationCredential validation
 */
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

// ============================================================================
// Connectivity Types
// ============================================================================

/**
 * Connectivity status
 */
export interface ConnectivityStatus {
  isOnline: boolean;
  navigatorOnline: boolean;
  providers: ProviderConnectivityStatus[];
  checkedAt: number;
}

/**
 * Provider-specific connectivity status
 */
export interface ProviderConnectivityStatus {
  provider: GitProvider;
  isReachable: boolean;
  responseTimeMs?: number;
  lastSuccessfulConnection?: number;
  error?: string;
}
