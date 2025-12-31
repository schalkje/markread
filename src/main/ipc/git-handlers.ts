/**
 * Git IPC Handlers
 *
 * Electron IPC handlers for Git repository operations.
 * Provides Zod validation, error handling, and response formatting.
 */

import { ipcMain } from 'electron';
import { repositoryService } from '../services/git/repository-service';
import { connectivityService } from '../services/git/connectivity-service';
import { oauthService } from '../services/git/oauth-service';
import { createSuccessResponse, createErrorResponse } from '../../shared/types/ipc';
import {
  ConnectRepositoryRequestSchema,
  FetchFileRequestSchema,
  FetchRepositoryTreeRequestSchema,
  CheckConnectivityRequestSchema,
  InitiateDeviceFlowRequestSchema,
  CheckDeviceFlowStatusRequestSchema,
  type ConnectRepositoryRequest,
  type FetchFileRequest,
  type FetchRepositoryTreeRequest,
  type CheckConnectivityRequest,
  type InitiateDeviceFlowRequest,
  type CheckDeviceFlowStatusRequest,
  type ConnectRepositoryIPCResponse,
  type FetchFileIPCResponse,
  type FetchRepositoryTreeIPCResponse,
  type CheckConnectivityIPCResponse,
  type InitiateDeviceFlowIPCResponse,
  type CheckDeviceFlowStatusIPCResponse,
} from '../../shared/types/git-contracts';

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

  // Get cached repository tree
  ipcMain.handle('git:getCachedTree', async (_event, payload): Promise<FetchRepositoryTreeIPCResponse> => {
    try {
      // Validate request
      const request = FetchRepositoryTreeRequestSchema.parse(payload) as FetchRepositoryTreeRequest;

      // Get cached tree
      const response = await repositoryService.getCachedTree(request);

      if (response) {
        return createSuccessResponse(response);
      } else {
        return createErrorResponse({
          code: 'NOT_CACHED',
          message: 'Tree not found in cache',
          retryable: false,
        });
      }
    } catch (error: any) {
      return createErrorResponse({
        code: error.code || 'UNKNOWN',
        message: error.message || 'An unexpected error occurred',
        retryable: error.retryable ?? false,
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

  // Initiate Device Flow authentication
  ipcMain.handle('git:auth:deviceflow:initiate', async (_event, payload): Promise<InitiateDeviceFlowIPCResponse> => {
    try {
      // Validate request
      const request = InitiateDeviceFlowRequestSchema.parse(payload) as InitiateDeviceFlowRequest;

      // Initiate Device Flow
      const response = await oauthService.initiateDeviceFlow(request);

      return createSuccessResponse(response);
    } catch (error: any) {
      return createErrorResponse({
        code: error.code || 'UNKNOWN',
        message: error.message || 'An unexpected error occurred',
        retryable: error.retryable ?? false,
        details: error.details,
      });
    }
  });

  // Check Device Flow status
  ipcMain.handle('git:auth:deviceflow:status', async (_event, payload): Promise<CheckDeviceFlowStatusIPCResponse> => {
    try {
      // Validate request
      const request = CheckDeviceFlowStatusRequestSchema.parse(payload) as CheckDeviceFlowStatusRequest;

      // Check status
      const response = await oauthService.checkDeviceFlowStatus(request.sessionId);

      return createSuccessResponse(response);
    } catch (error: any) {
      return createErrorResponse({
        code: error.code || 'UNKNOWN',
        message: error.message || 'An unexpected error occurred',
        retryable: false,
      });
    }
  });

  // Cancel Device Flow
  ipcMain.handle('git:auth:deviceflow:cancel', async (_event, sessionId: string): Promise<any> => {
    try {
      oauthService.cancelDeviceFlow(sessionId);
      return createSuccessResponse({ cancelled: true });
    } catch (error: any) {
      return createErrorResponse({
        code: error.code || 'UNKNOWN',
        message: error.message || 'An unexpected error occurred',
        retryable: false,
      });
    }
  });
}
