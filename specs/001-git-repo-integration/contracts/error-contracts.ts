/**
 * Error Contracts: Git Repository Integration
 *
 * Standardized error response types used across all Git IPC operations.
 * All errors include a typed error code, user-facing message, and retry guidance.
 */

import { z } from 'zod';

/**
 * Standard error codes for Git operations
 */
export type GitErrorCode =
  // Authentication errors
  | 'AUTH_FAILED'           // Authentication credentials invalid or expired
  | 'TOKEN_EXPIRED'         // OAuth token has expired
  | 'INVALID_TOKEN'         // PAT format is invalid
  | 'PERMISSION_DENIED'     // User lacks permission for requested operation

  // Network errors
  | 'NETWORK_ERROR'         // Network connectivity issue
  | 'TIMEOUT'               // Operation exceeded timeout limit
  | 'RATE_LIMIT'            // API rate limit exceeded

  // Repository errors
  | 'INVALID_URL'           // Repository URL format is invalid
  | 'REPOSITORY_NOT_FOUND'  // Repository does not exist or is inaccessible
  | 'BRANCH_NOT_FOUND'      // Requested branch does not exist
  | 'FILE_NOT_FOUND'        // Requested file does not exist

  // Cache errors
  | 'CACHE_ERROR'           // Cache read/write operation failed
  | 'CACHE_FULL'            // Cache size limit exceeded

  // System errors
  | 'OFFLINE'               // System is offline, operation requires connectivity
  | 'STORAGE_ERROR'         // File system or credential storage error
  | 'UNKNOWN';              // Unexpected error occurred

/**
 * Standard error response envelope
 */
export interface GitErrorResponse {
  /** Typed error code for programmatic handling */
  code: GitErrorCode;

  /** User-facing error message (localized, actionable) */
  message: string;

  /** Optional developer-facing details (not shown to user) */
  details?: string;

  /** Whether this error is retryable */
  retryable: boolean;

  /** For rate limit errors: seconds until retry is allowed */
  retryAfterSeconds?: number;

  /** Unique request ID for debugging/support */
  requestId?: string;

  /** HTTP status code (if from API response) */
  statusCode?: number;
}

/**
 * Zod schema for validating error responses
 */
export const GitErrorResponseSchema = z.object({
  code: z.enum([
    'AUTH_FAILED',
    'TOKEN_EXPIRED',
    'INVALID_TOKEN',
    'PERMISSION_DENIED',
    'NETWORK_ERROR',
    'TIMEOUT',
    'RATE_LIMIT',
    'INVALID_URL',
    'REPOSITORY_NOT_FOUND',
    'BRANCH_NOT_FOUND',
    'FILE_NOT_FOUND',
    'CACHE_ERROR',
    'CACHE_FULL',
    'OFFLINE',
    'STORAGE_ERROR',
    'UNKNOWN',
  ]),
  message: z.string().min(1),
  details: z.string().optional(),
  retryable: z.boolean(),
  retryAfterSeconds: z.number().positive().optional(),
  requestId: z.string().optional(),
  statusCode: z.number().optional(),
});

/**
 * Helper type for IPC operations that can fail
 */
export type IPCResponse<T> =
  | { success: true; data: T }
  | { success: false; error: GitErrorResponse };

/**
 * User-facing error messages for each error code
 * These should be clear, actionable, and avoid technical jargon
 */
export const ERROR_MESSAGES: Record<GitErrorCode, string> = {
  AUTH_FAILED: 'Authentication failed. Please check your credentials and try again.',
  TOKEN_EXPIRED: 'Your authentication token has expired. Please sign in again.',
  INVALID_TOKEN: 'The provided access token is invalid. Please check the token format.',
  PERMISSION_DENIED: 'You do not have permission to access this resource.',

  NETWORK_ERROR: 'Network error. Please check your internet connection and try again.',
  TIMEOUT: 'The operation timed out. Please try again.',
  RATE_LIMIT: 'Rate limit exceeded. Please wait before trying again.',

  INVALID_URL: 'Invalid repository URL. Please check the URL and try again.',
  REPOSITORY_NOT_FOUND: 'Repository not found. Please check the URL and your access permissions.',
  BRANCH_NOT_FOUND: 'Branch not found in this repository.',
  FILE_NOT_FOUND: 'File not found in this branch.',

  CACHE_ERROR: 'Failed to read from cache. Please try refreshing.',
  CACHE_FULL: 'Cache storage is full. Please clear some cached repositories.',

  OFFLINE: 'You are offline. This operation requires an internet connection.',
  STORAGE_ERROR: 'Failed to access local storage. Please check disk space and permissions.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
};

/**
 * Mapping of HTTP status codes to error codes
 */
export const HTTP_STATUS_TO_ERROR_CODE: Record<number, GitErrorCode> = {
  400: 'INVALID_URL',
  401: 'AUTH_FAILED',
  403: 'PERMISSION_DENIED',
  404: 'REPOSITORY_NOT_FOUND',
  408: 'TIMEOUT',
  429: 'RATE_LIMIT',
  500: 'UNKNOWN',
  502: 'NETWORK_ERROR',
  503: 'NETWORK_ERROR',
  504: 'TIMEOUT',
};
