/**
 * Git API Preload Script
 *
 * Exposes Git repository operations to the renderer process via contextBridge.
 * Aligns with FR-003, FR-004, FR-012 through FR-016, and security best practices.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
  ConnectRepositoryRequest,
  ConnectRepositoryIPCResponse,
  FetchRepositoryInfoRequest,
  FetchRepositoryInfoIPCResponse,
  FetchFileRequest,
  FetchFileIPCResponse,
  FetchRepositoryTreeRequest,
  FetchRepositoryTreeIPCResponse,
  CheckConnectivityRequest,
  CheckConnectivityIPCResponse,
} from '../shared/types/git-contracts';

/**
 * Git API exposed to renderer process via window.git
 *
 * Usage in renderer:
 * ```typescript
 * const result = await window.git.repo.connect({ url: '...', authMethod: 'oauth' });
 * ```
 */
export const exposeGitAPI = () => {
  contextBridge.exposeInMainWorld('git', {
    // Repository operations (Phase 3 - US1)
    repo: {
      /**
       * Connect to a Git repository
       * T042
       */
      connect: (request: ConnectRepositoryRequest): Promise<ConnectRepositoryIPCResponse> => {
        return ipcRenderer.invoke('git:connect', request);
      },

      /**
       * Fetch repository information (for branch selection)
       * Used before connecting to get available branches
       */
      fetchInfo: (request: FetchRepositoryInfoRequest): Promise<FetchRepositoryInfoIPCResponse> => {
        return ipcRenderer.invoke('git:fetchRepositoryInfo', request);
      },

      /**
       * Fetch a file from repository
       * T043
       */
      fetchFile: (request: FetchFileRequest): Promise<FetchFileIPCResponse> => {
        return ipcRenderer.invoke('git:fetchFile', request);
      },

      /**
       * Fetch repository file tree
       * T044
       */
      fetchTree: (request: FetchRepositoryTreeRequest): Promise<FetchRepositoryTreeIPCResponse> => {
        return ipcRenderer.invoke('git:fetchTree', request);
      },

      /**
       * Get cached repository file tree
       * Returns cached tree if available, otherwise returns error
       */
      getCachedTree: (request: FetchRepositoryTreeRequest): Promise<FetchRepositoryTreeIPCResponse> => {
        return ipcRenderer.invoke('git:getCachedTree', request);
      },

      // TODO: T069 - Implement git.repo.switchBranch() and listBranches() (Phase 5 - US3)
      // TODO: T084 - Implement git.repo.openBranchInNewTab() (Phase 7 - US5)
    },

    // Authentication operations (Phase 4 - US2)
    auth: {
      /**
       * Initiate Device Flow authentication
       * Opens browser for GitHub authorization using Device Flow (no client secret required)
       */
      initiateDeviceFlow: (request: import('../shared/types/git-contracts').InitiateDeviceFlowRequest): Promise<import('../shared/types/git-contracts').InitiateDeviceFlowIPCResponse> => {
        return ipcRenderer.invoke('git:auth:deviceflow:initiate', request);
      },

      /**
       * Check Device Flow authentication status
       * Poll this to determine when Device Flow is complete
       */
      checkDeviceFlowStatus: (request: import('../shared/types/git-contracts').CheckDeviceFlowStatusRequest): Promise<import('../shared/types/git-contracts').CheckDeviceFlowStatusIPCResponse> => {
        return ipcRenderer.invoke('git:auth:deviceflow:status', request);
      },

      /**
       * Cancel Device Flow authentication
       */
      cancelDeviceFlow: (sessionId: string): Promise<any> => {
        return ipcRenderer.invoke('git:auth:deviceflow:cancel', sessionId);
      },
    },

    // Connectivity operations (Phase 3 - US1)
    connectivity: {
      /**
       * Check connectivity to Git providers
       * T045
       */
      check: (request?: CheckConnectivityRequest): Promise<CheckConnectivityIPCResponse> => {
        return ipcRenderer.invoke('git:connectivity:check', request || {});
      },

      // TODO: Implement git.connectivity.onChanged() event listener
    },

    // Recent items (Phase 6 - US4)
    recent: {
      // TODO: T078 - Implement git.recent.list()
    },
  });
};
