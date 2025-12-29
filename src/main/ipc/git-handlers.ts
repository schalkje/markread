/**
 * Git IPC Handlers
 *
 * Electron IPC handlers for Git repository operations.
 * Provides Zod validation, error handling, and response formatting.
 */

import { ipcMain } from 'electron';
import { repositoryService } from '../services/git/repository-service';
import { connectivityService } from '../services/git/connectivity-service';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/ipc';
import {
  ConnectRepositoryRequestSchema,
  FetchFileRequestSchema,
  FetchRepositoryTreeRequestSchema,
  CheckConnectivityRequestSchema,
  type ConnectRepositoryRequest,
  type FetchFileRequest,
  type FetchRepositoryTreeRequest,
  type CheckConnectivityRequest,
  type ConnectRepositoryIPCResponse,
  type FetchFileIPCResponse,
  type FetchRepositoryTreeIPCResponse,
  type CheckConnectivityIPCResponse,
} from '@/shared/types/git-contracts';

/**
 * Register all Git IPC handlers
 */
export function registerGitHandlers(): void {
  // Repository connection
  ipcMain.handle('git:connect', async (_event, payload): Promise<ConnectRepositoryIPCResponse> => {
    try {
      // Validate request
      const request = ConnectRepositoryRequestSchema.parse(payload) as ConnectRepositoryRequest;

      // Connect to repository
      const response = await repositoryService.connect(request);

      return createSuccessResponse(response);
    } catch (error: any) {
      return createErrorResponse({
        code: error.code || 'UNKNOWN',
        message: error.message || 'An unexpected error occurred',
        retryable: error.retryable ?? false,
        retryAfterSeconds: error.retryAfterSeconds,
        statusCode: error.statusCode,
      });
    }
  });

  // Fetch file
  ipcMain.handle('git:fetchFile', async (_event, payload): Promise<FetchFileIPCResponse> => {
    try {
      // Validate request
      const request = FetchFileRequestSchema.parse(payload) as FetchFileRequest;

      // Fetch file
      const response = await repositoryService.fetchFile(request);

      return createSuccessResponse(response);
    } catch (error: any) {
      return createErrorResponse({
        code: error.code || 'UNKNOWN',
        message: error.message || 'An unexpected error occurred',
        retryable: error.retryable ?? false,
        retryAfterSeconds: error.retryAfterSeconds,
        statusCode: error.statusCode,
      });
    }
  });

  // Fetch repository tree
  ipcMain.handle('git:fetchTree', async (_event, payload): Promise<FetchRepositoryTreeIPCResponse> => {
    try {
      // Validate request
      const request = FetchRepositoryTreeRequestSchema.parse(payload) as FetchRepositoryTreeRequest;

      // Fetch tree
      const response = await repositoryService.fetchTree(request);

      return createSuccessResponse(response);
    } catch (error: any) {
      return createErrorResponse({
        code: error.code || 'UNKNOWN',
        message: error.message || 'An unexpected error occurred',
        retryable: error.retryable ?? false,
        retryAfterSeconds: error.retryAfterSeconds,
        statusCode: error.statusCode,
      });
    }
  });

  // Check connectivity
  ipcMain.handle('git:connectivity:check', async (_event, payload): Promise<CheckConnectivityIPCResponse> => {
    try {
      // Validate request
      const request = CheckConnectivityRequestSchema.parse(payload) as CheckConnectivityRequest;

      // Check connectivity
      const results = request.provider
        ? [await connectivityService.check(request.provider)]
        : await connectivityService.checkAll();

      const isOnline = results.some(r => r.isReachable);

      const response = {
        isOnline,
        navigatorOnline: true, // This would be checked in renderer
        providers: results,
        checkedAt: Date.now(),
      };

      return createSuccessResponse(response);
    } catch (error: any) {
      return createErrorResponse({
        code: error.code || 'UNKNOWN',
        message: error.message || 'An unexpected error occurred',
        retryable: error.retryable ?? false,
        retryAfterSeconds: error.retryAfterSeconds,
        statusCode: error.statusCode,
      });
    }
  });
}
