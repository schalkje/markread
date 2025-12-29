/**
 * Authentication Contracts: Git Repository Integration
 *
 * IPC contracts for OAuth and PAT authentication operations.
 * Aligns with FR-003, FR-004, FR-005, FR-017, and User Story 2.
 */

import { z } from 'zod';
import type { IPCResponse } from './error-contracts';

// ============================================================================
// OAuth Authentication
// ============================================================================

/**
 * Request to initiate OAuth authentication flow
 * Aligns with FR-003, User Story 2
 */
export interface InitiateOAuthRequest {
  /** Git provider to authenticate with */
  provider: 'github' | 'azure';

  /** OAuth scopes to request */
  scopes?: string[];
}

export const InitiateOAuthRequestSchema = z.object({
  provider: z.enum(['github', 'azure']),
  scopes: z.array(z.string()).optional(),
});

/**
 * Response from initiating OAuth flow
 */
export interface InitiateOAuthResponse {
  /** OAuth session ID (for tracking the flow) */
  sessionId: string;

  /** Authorization URL to open in browser window */
  authorizationUrl: string;
}

export type InitiateOAuthIPCResponse = IPCResponse<InitiateOAuthResponse>;

// ============================================================================
// Complete OAuth Flow
// ============================================================================

/**
 * OAuth flow completion notification (internal, triggered by protocol handler)
 * This is called internally when the OAuth redirect is captured
 */
export interface CompleteOAuthRequest {
  /** OAuth session ID */
  sessionId: string;

  /** Authorization code from OAuth provider */
  code: string;
}

export const CompleteOAuthRequestSchema = z.object({
  sessionId: z.string().uuid(),
  code: z.string().min(1),
});

/**
 * Response from completing OAuth flow
 */
export interface CompleteOAuthResponse {
  /** Access token (encrypted and stored, not returned to renderer) */
  tokenStored: boolean;

  /** Token expiration timestamp (if available) */
  expiresAt?: number;

  /** Granted scopes */
  scopes: string[];

  /** User information */
  user: {
    username: string;
    email?: string;
    avatarUrl?: string;
  };
}

export type CompleteOAuthIPCResponse = IPCResponse<CompleteOAuthResponse>;

// ============================================================================
// PAT Authentication
// ============================================================================

/**
 * Request to authenticate using a Personal Access Token
 * Aligns with FR-004, User Story 2
 */
export interface AuthenticateWithPATRequest {
  /** Git provider */
  provider: 'github' | 'azure';

  /** Personal Access Token */
  token: string;

  /** Repository URL (optional, for testing token validity) */
  testRepository?: string;
}

export const AuthenticateWithPATRequestSchema = z.object({
  provider: z.enum(['github', 'azure']),
  token: z.string()
    .min(1, 'Token cannot be empty')
    .max(500, 'Token too long'),
  testRepository: z.string().url().startsWith('https://').optional(),
});

/**
 * Response from PAT authentication
 */
export interface AuthenticateWithPATResponse {
  /** Whether token was successfully stored */
  tokenStored: boolean;

  /** Whether token was validated (if testRepository was provided) */
  validated: boolean;

  /** User information (if available from token validation) */
  user?: {
    username: string;
    email?: string;
  };

  /** Token scopes (if detectable) */
  scopes?: string[];
}

export type AuthenticateWithPATIPCResponse = IPCResponse<AuthenticateWithPATResponse>;

// ============================================================================
// Refresh Token
// ============================================================================

/**
 * Request to refresh an OAuth token
 * Aligns with FR-017 (handling expired tokens)
 */
export interface RefreshTokenRequest {
  /** Repository identifier */
  repositoryId: string;
}

export const RefreshTokenRequestSchema = z.object({
  repositoryId: z.string().uuid(),
});

/**
 * Response from token refresh
 */
export interface RefreshTokenResponse {
  /** Whether refresh was successful */
  refreshed: boolean;

  /** New token expiration timestamp */
  expiresAt?: number;
}

export type RefreshTokenIPCResponse = IPCResponse<RefreshTokenResponse>;

// ============================================================================
// Delete Credentials
// ============================================================================

/**
 * Request to delete stored credentials for a repository
 * Aligns with FR-005 (credential management)
 */
export interface DeleteCredentialsRequest {
  /** Repository identifier */
  repositoryId: string;

  /** Specific auth method to delete (optional, deletes all if not specified) */
  authMethod?: 'oauth' | 'pat';
}

export const DeleteCredentialsRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  authMethod: z.enum(['oauth', 'pat']).optional(),
});

/**
 * Response from deleting credentials
 */
export interface DeleteCredentialsResponse {
  /** Whether credentials were successfully deleted */
  deleted: boolean;

  /** Number of credential entries deleted */
  count: number;
}

export type DeleteCredentialsIPCResponse = IPCResponse<DeleteCredentialsResponse>;

// ============================================================================
// Check Token Validity
// ============================================================================

/**
 * Request to check if a repository's stored token is still valid
 * Aligns with FR-017, SC-012
 */
export interface CheckTokenValidityRequest {
  /** Repository identifier */
  repositoryId: string;
}

export const CheckTokenValidityRequestSchema = z.object({
  repositoryId: z.string().uuid(),
});

/**
 * Response from checking token validity
 */
export interface CheckTokenValidityResponse {
  /** Whether token is valid */
  isValid: boolean;

  /** Whether token is expired */
  isExpired: boolean;

  /** Token expiration timestamp (if known) */
  expiresAt?: number;

  /** Seconds until token expires (if known and not expired) */
  secondsUntilExpiry?: number;
}

export type CheckTokenValidityIPCResponse = IPCResponse<CheckTokenValidityResponse>;
