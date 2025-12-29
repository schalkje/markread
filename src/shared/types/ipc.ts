/**
 * IPC Response Envelope Types
 *
 * Standard response wrapper for all IPC operations.
 * Provides a discriminated union for success/error handling.
 *
 * Source: specs/001-git-repo-integration/contracts/error-contracts.ts
 */

import type { GitErrorResponse } from './git-errors';

/**
 * Helper type for IPC operations that can fail
 *
 * This provides a type-safe way to handle both success and error cases.
 *
 * Usage in renderer:
 * ```typescript
 * const result = await window.git.repo.connect(request);
 * if (result.success) {
 *   console.log(result.data); // TypeScript knows data exists
 * } else {
 *   console.error(result.error.message); // TypeScript knows error exists
 * }
 * ```
 */
export type IPCResponse<T> =
  | { success: true; data: T }
  | { success: false; error: GitErrorResponse };

/**
 * Helper function to create a successful IPC response
 */
export function createSuccessResponse<T>(data: T): IPCResponse<T> {
  return { success: true, data };
}

/**
 * Helper function to create an error IPC response
 */
export function createErrorResponse<T>(error: GitErrorResponse): IPCResponse<T> {
  return { success: false, error };
}
