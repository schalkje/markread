/**
 * Git Store
 *
 * Zustand store for managing Git repository state in the renderer process.
 * Tracks connected repositories, current branch, connectivity status, etc.
 *
 * Phase 3 - T046
 */

import { create } from 'zustand';
import type { BranchInfo, ConnectRepositoryResponse } from '../../shared/types/git-contracts';
import type { TreeNode } from '../../shared/types/repository';

/**
 * Git store state interface
 */
interface GitStoreState {
  // Repository state
  connectedRepository: ConnectRepositoryResponse | null;
  repositoryId: string | null;
  currentBranch: string | null;
  branches: BranchInfo[];

  // File tree state
  fileTree: TreeNode[] | null;
  currentFilePath: string | null;
  currentFileContent: string | null;

  // Connectivity state
  isOnline: boolean;
  lastConnectivityCheck: number | null;

  // Loading states
  isConnecting: boolean;
  isFetchingFile: boolean;
  isFetchingTree: boolean;
  isSwitchingBranch: boolean;

  // Error state
  error: string | null;

  // Actions
  setConnectedRepository: (repository: ConnectRepositoryResponse | null) => void;
  setCurrentBranch: (branch: string) => void;
  setBranches: (branches: BranchInfo[]) => void;
  setFileTree: (tree: TreeNode[] | null) => void;
  setCurrentFile: (path: string | null, content: string | null) => void;
  setIsOnline: (isOnline: boolean) => void;
  setLastConnectivityCheck: (timestamp: number) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setIsFetchingFile: (isFetching: boolean) => void;
  setIsFetchingTree: (isFetching: boolean) => void;
  setIsSwitchingBranch: (isSwitching: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  connectedRepository: null,
  repositoryId: null,
  currentBranch: null,
  branches: [],
  fileTree: null,
  currentFilePath: null,
  currentFileContent: null,
  isOnline: true,
  lastConnectivityCheck: null,
  isConnecting: false,
  isFetchingFile: false,
  isFetchingTree: false,
  isSwitchingBranch: false,
  error: null,
};

/**
 * Git state store
 *
 * Usage in components:
 * ```typescript
 * const { connectedRepository, setConnectedRepository } = useGitStore();
 * ```
 */
export const useGitStore = create<GitStoreState>((set) => ({
  ...initialState,

  setConnectedRepository: (repository) => set({
    connectedRepository: repository,
    repositoryId: repository?.repositoryId || null,
    currentBranch: repository?.currentBranch || null,
    branches: repository?.branches || [],
  }),

  setCurrentBranch: (branch) => set({ currentBranch: branch }),
  setBranches: (branches) => set({ branches }),
  setFileTree: (tree) => set({ fileTree: tree }),
  setCurrentFile: (path, content) => set({ currentFilePath: path, currentFileContent: content }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setLastConnectivityCheck: (timestamp) => set({ lastConnectivityCheck: timestamp }),
  setIsConnecting: (isConnecting) => set({ isConnecting }),
  setIsFetchingFile: (isFetching) => set({ isFetchingFile: isFetching }),
  setIsFetchingTree: (isFetching) => set({ isFetchingTree: isFetching }),
  setIsSwitchingBranch: (isSwitching) => set({ isSwitchingBranch: isSwitching }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
