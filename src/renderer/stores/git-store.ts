/**
 * Git Store
 *
 * Zustand store for managing Git repository state in the renderer process.
 * Tracks connected repositories, current branch, connectivity status, etc.
 */

import { create } from 'zustand';

// TODO: Import proper types from src/shared/types when they are created (Phase 2)
// import type { Repository, Branch } from '@/shared/types/repository';
// import type { ConnectivityStatus } from '@/shared/types/git';

/**
 * Git store state interface
 */
interface GitStoreState {
  // Repository state
  connectedRepository: any | null;
  currentBranch: string | null;
  branches: any[];

  // File tree state
  fileTree: any | null;
  currentFilePath: string | null;

  // Connectivity state
  isOnline: boolean;
  connectivityStatus: any | null;

  // Loading states
  isConnecting: boolean;
  isFetchingFile: boolean;
  isFetchingTree: boolean;
  isSwitchingBranch: boolean;

  // Error state
  error: string | null;

  // Actions
  setConnectedRepository: (repository: any | null) => void;
  setCurrentBranch: (branch: string) => void;
  setBranches: (branches: any[]) => void;
  setFileTree: (tree: any) => void;
  setCurrentFilePath: (path: string | null) => void;
  setIsOnline: (isOnline: boolean) => void;
  setConnectivityStatus: (status: any) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setIsFetchingFile: (isFetching: boolean) => void;
  setIsFetchingTree: (isFetching: boolean) => void;
  setIsSwitchingBranch: (isSwitching: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  connectedRepository: null,
  currentBranch: null,
  branches: [],
  fileTree: null,
  currentFilePath: null,
  isOnline: true,
  connectivityStatus: null,
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

  setConnectedRepository: (repository) => set({ connectedRepository: repository }),
  setCurrentBranch: (branch) => set({ currentBranch: branch }),
  setBranches: (branches) => set({ branches }),
  setFileTree: (tree) => set({ fileTree: tree }),
  setCurrentFilePath: (path) => set({ currentFilePath: path }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setConnectivityStatus: (status) => set({ connectivityStatus: status }),
  setIsConnecting: (isConnecting) => set({ isConnecting }),
  setIsFetchingFile: (isFetching) => set({ isFetchingFile: isFetching }),
  setIsFetchingTree: (isFetching) => set({ isFetchingTree: isFetching }),
  setIsSwitchingBranch: (isSwitching) => set({ isSwitchingBranch: isSwitching }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
