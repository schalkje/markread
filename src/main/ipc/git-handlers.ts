/**
 * Git IPC Handlers
 *
 * Electron IPC handlers for Git repository operations.
 * Provides Zod validation, error handling, and response formatting.
 */

import { ipcMain } from 'electron';
import { createSuccessResponse, createErrorResponse } from '../../shared/types/ipc';

// Lazy-load services only when needed to avoid slowing down app startup
// This prevents Windows shell extensions (like Git Credential Manager) from being
// loaded at startup, which can cause the folder picker dialog to hang
let repositoryService: any = null;
let connectivityService: any = null;
let oauthService: any = null;
let authService: any = null;

async function getRepositoryService() {
  if (!repositoryService) {
    const module = await import('../services/git/repository-service');
    repositoryService = module.repositoryService;
  }
  return repositoryService;
}

async function getConnectivityService() {
  if (!connectivityService) {
    const module = await import('../services/git/connectivity-service');
    connectivityService = module.connectivityService;
  }
  return connectivityService;
}

async function getOAuthService() {
  if (!oauthService) {
    const module = await import('../services/git/oauth-service');
    oauthService = module.oauthService;
  }
  return oauthService;
}

async function getAuthService() {
  if (!authService) {
    const module = await import('../services/git/auth-service');
    authService = module.authService;
  }
  return authService;
}
import {
  ConnectRepositoryRequestSchema,
  FetchRepositoryInfoRequestSchema,
  FetchFileRequestSchema,
  FetchRepositoryTreeRequestSchema,
  CheckConnectivityRequestSchema,
  InitiateDeviceFlowRequestSchema,
  CheckDeviceFlowStatusRequestSchema,
  AuthenticateWithPATRequestSchema,
  type ConnectRepositoryRequest,
  type FetchRepositoryInfoRequest,
  type FetchFileRequest,
  type FetchRepositoryTreeRequest,
  type CheckConnectivityRequest,
  type InitiateDeviceFlowRequest,
  type CheckDeviceFlowStatusRequest,
  type AuthenticateWithPATRequest,
  type ConnectRepositoryIPCResponse,
  type FetchRepositoryInfoIPCResponse,
  type FetchFileIPCResponse,
  type FetchRepositoryTreeIPCResponse,
  type CheckConnectivityIPCResponse,
  type InitiateDeviceFlowIPCResponse,
  type CheckDeviceFlowStatusIPCResponse,
  type AuthenticateWithPATIPCResponse,
} from '../../shared/types/git-contracts';

/**
 * Register all Git IPC handlers
 */
export function registerGitHandlers(): void {
  // Repository connection
  ipcMain.handle('git:connect', async (_event, payload): Promise<ConnectRepositoryIPCResponse> => {
    console.log('[IPC] git:connect received:', payload);
    try {
      // Validate request
      const request = ConnectRepositoryRequestSchema.parse(payload) as ConnectRepositoryRequest;
      console.log('[IPC] Request validated:', request);

      // Connect to repository
      console.log('[IPC] Calling repositoryService.connect...');
      const service = await getRepositoryService();
      const response = await service.connect(request);
      console.log('[IPC] Repository connected successfully');

      return createSuccessResponse(response);
    } catch (error: any) {
      console.error('[IPC] Error connecting to repository:', error);
      return createErrorResponse({
        code: error.code || 'UNKNOWN',
        message: error.message || 'An unexpected error occurred',
        retryable: error.retryable ?? false,
        retryAfterSeconds: error.retryAfterSeconds,
        statusCode: error.statusCode,
      });
    }
  });

  // Fetch repository info (for branch selection)
  ipcMain.handle('git:fetchRepositoryInfo', async (_event, payload): Promise<FetchRepositoryInfoIPCResponse> => {
    console.log('[IPC] git:fetchRepositoryInfo received:', payload);
    try {
      // Validate request
      const request = FetchRepositoryInfoRequestSchema.parse(payload) as FetchRepositoryInfoRequest;
      console.log('[IPC] Request validated:', request);

      // Fetch repository info
      console.log('[IPC] Calling repositoryService.fetchRepositoryInfo...');
      const service = await getRepositoryService();
      const response = await service.fetchRepositoryInfo(request);
      console.log('[IPC] Repository info fetched successfully');

      return createSuccessResponse(response);
    } catch (error: any) {
      console.error('[IPC] Error fetching repository info:', error);
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
      const service = await getRepositoryService();
      const response = await service.fetchFile(request);

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
      const service = await getRepositoryService();
      const response = await service.fetchTree(request);

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
      const service = await getRepositoryService();
      const response = await service.getCachedTree(request);

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
      const service = await getConnectivityService();
      const results = request.provider
        ? [await service.check(request.provider)]
        : await service.checkAll();

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

  // Authenticate with Personal Access Token
  ipcMain.handle('git:auth:pat:authenticate', async (_event, payload): Promise<AuthenticateWithPATIPCResponse> => {
    try {
      // Validate request
      const request = AuthenticateWithPATRequestSchema.parse(payload) as AuthenticateWithPATRequest;

      // Authenticate with PAT
      const service = await getAuthService();
      const response = await service.authenticateWithPAT(request);

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

  // Initiate Device Flow authentication
  ipcMain.handle('git:auth:deviceflow:initiate', async (_event, payload): Promise<InitiateDeviceFlowIPCResponse> => {
    try {
      // Validate request
      const request = InitiateDeviceFlowRequestSchema.parse(payload) as InitiateDeviceFlowRequest;

      // Initiate Device Flow
      const service = await getOAuthService();
      const response = await service.initiateDeviceFlow(request);

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
      const service = await getOAuthService();
      const response = await service.checkDeviceFlowStatus(request.sessionId);

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
      const service = await getOAuthService();
      service.cancelDeviceFlow(sessionId);
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
