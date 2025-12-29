/**
 * Connectivity Contracts: Git Repository Integration
 *
 * IPC contracts for network connectivity detection and status monitoring.
 * Aligns with FR-018, FR-027, FR-028, FR-029.
 */

import { z } from 'zod';
import type { IPCResponse } from './error-contracts';

// ============================================================================
// Check Connectivity
// ============================================================================

/**
 * Request to check connectivity to Git providers
 * Aligns with FR-027, FR-029
 */
export interface CheckConnectivityRequest {
  /** Git provider to check (optional, checks all if not specified) */
  provider?: 'github' | 'azure';

  /** Timeout for connectivity check in milliseconds (default: 5000) */
  timeoutMs?: number;
}

export const CheckConnectivityRequestSchema = z.object({
  provider: z.enum(['github', 'azure']).optional(),
  timeoutMs: z.number().positive().int().max(30000).optional(),
});

/**
 * Connectivity status for a single provider
 */
export interface ProviderConnectivityStatus {
  /** Provider name */
  provider: 'github' | 'azure';

  /** Whether provider is reachable */
  isReachable: boolean;

  /** Response time in milliseconds */
  responseTimeMs?: number;

  /** Last successful connection timestamp */
  lastSuccessfulConnection?: number;

  /** Error message (if unreachable) */
  error?: string;
}

/**
 * Response from checking connectivity
 */
export interface CheckConnectivityResponse {
  /** Overall online status (true if any provider is reachable) */
  isOnline: boolean;

  /** Browser navigator.onLine status */
  navigatorOnline: boolean;

  /** Per-provider connectivity status */
  providers: ProviderConnectivityStatus[];

  /** Timestamp of check */
  checkedAt: number;
}

export type CheckConnectivityIPCResponse = IPCResponse<CheckConnectivityResponse>;

// ============================================================================
// Get Connectivity Status
// ============================================================================

/**
 * Request to get current cached connectivity status (no active check)
 * This is faster than CheckConnectivity as it returns the last known status
 */
export interface GetConnectivityStatusRequest {
  // No parameters needed
}

export const GetConnectivityStatusRequestSchema = z.object({});

/**
 * Response from getting connectivity status
 */
export interface GetConnectivityStatusResponse {
  /** Overall online status */
  isOnline: boolean;

  /** Browser navigator.onLine status */
  navigatorOnline: boolean;

  /** Per-provider status */
  providers: ProviderConnectivityStatus[];

  /** When status was last updated */
  lastChecked: number;

  /** Age of cached status in seconds */
  ageSeconds: number;
}

export type GetConnectivityStatusIPCResponse = IPCResponse<GetConnectivityStatusResponse>;

// ============================================================================
// Subscribe to Connectivity Changes
// ============================================================================

/**
 * Connectivity change event (sent from main to renderer via event)
 * Not a request/response, but an event subscription
 */
export interface ConnectivityChangeEvent {
  /** New online status */
  isOnline: boolean;

  /** Provider that triggered the change */
  provider: 'github' | 'azure' | 'system';

  /** Previous status */
  wasOnline: boolean;

  /** Timestamp of change */
  changedAt: number;

  /** Details about the change */
  details: string;
}

/**
 * Event channel: 'git:connectivity:changed'
 * Renderer listens for this event to update UI in real-time
 *
 * Usage in renderer:
 * ```typescript
 * window.git.connectivity.onChanged((event: ConnectivityChangeEvent) => {
 *   if (!event.isOnline) {
 *     showOfflineBadge();
 *   } else {
 *     hideOfflineBadge();
 *     attemptReconnect();
 *   }
 * });
 * ```
 */

// ============================================================================
// Test Repository Connection
// ============================================================================

/**
 * Request to test connection to a specific repository
 * Useful for validating credentials and accessibility before connecting
 */
export interface TestRepositoryConnectionRequest {
  /** Repository URL to test */
  url: string;

  /** Authentication method to use */
  authMethod: 'oauth' | 'pat';

  /** Timeout in milliseconds (default: 10000) */
  timeoutMs?: number;
}

export const TestRepositoryConnectionRequestSchema = z.object({
  url: z.string()
    .url()
    .startsWith('https://'),
  authMethod: z.enum(['oauth', 'pat']),
  timeoutMs: z.number().positive().int().max(30000).optional(),
});

/**
 * Response from testing repository connection
 */
export interface TestRepositoryConnectionResponse {
  /** Whether repository is accessible */
  isAccessible: boolean;

  /** Whether authentication succeeded */
  authenticationValid: boolean;

  /** Repository metadata (if accessible) */
  repository?: {
    /** Display name */
    displayName: string;

    /** Default branch */
    defaultBranch: string;

    /** Number of branches */
    branchCount: number;

    /** Whether repository is private */
    isPrivate: boolean;
  };

  /** Response time in milliseconds */
  responseTimeMs: number;

  /** Error details (if inaccessible) */
  error?: string;
}

export type TestRepositoryConnectionIPCResponse = IPCResponse<TestRepositoryConnectionResponse>;

// ============================================================================
// Get Offline Capabilities
// ============================================================================

/**
 * Request to get information about offline capabilities for a repository
 * Aligns with FR-018, FR-028
 */
export interface GetOfflineCapabilitiesRequest {
  /** Repository identifier */
  repositoryId: string;
}

export const GetOfflineCapabilitiesRequestSchema = z.object({
  repositoryId: z.string().uuid(),
});

/**
 * Response from getting offline capabilities
 */
export interface GetOfflineCapabilitiesResponse {
  /** Whether repository has cached content */
  hasCachedContent: boolean;

  /** Number of cached files available offline */
  cachedFileCount: number;

  /** Number of cached markdown files */
  cachedMarkdownCount: number;

  /** Branches with cached content */
  cachedBranches: string[];

  /** Total cache size in bytes */
  cacheSize: number;

  /** Whether all markdown files are cached */
  allMarkdownCached: boolean;

  /** Percentage of repository files cached (estimate) */
  cacheCompleteness: number;

  /** Recommended actions for better offline experience */
  recommendations: string[];
}

export type GetOfflineCapabilitiesIPCResponse = IPCResponse<GetOfflineCapabilitiesResponse>;
