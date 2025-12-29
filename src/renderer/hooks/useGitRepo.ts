/**
 * Git Repository Hook
 *
 * React hook for managing Git repository operations.
 * Integrates with useGitStore and window.git IPC API.
 *
 * Phase 3 - T047
 */

import { useCallback } from 'react';
import { useGitStore } from '../stores/git-store';
import type {
  ConnectRepositoryRequest,
  FetchFileRequest,
  FetchRepositoryTreeRequest,
} from '../../shared/types/git-contracts';

/**
 * Git repository operations hook
 *
 * Usage:
 * ```typescript
 * const { connectRepository, fetchFile, fetchTree, isConnecting, error } = useGitRepo();
 *
 * // Connect to repository
 * await connectRepository({
 *   url: 'https://github.com/owner/repo',
 *   authMethod: 'oauth'
 * });
 *
 * // Fetch file
 * await fetchFile({
 *   repositoryId: '...',
 *   filePath: 'README.md'
 * });
 * ```
 */
export const useGitRepo = () => {
  const {
    connectedRepository,
    repositoryId,
    currentBranch,
    branches,
    fileTree,
    currentFilePath,
    currentFileContent,
    isConnecting,
    isFetchingFile,
    isFetchingTree,
    error,
    setConnectedRepository,
    setFileTree,
    setCurrentFile,
    setIsConnecting,
    setIsFetchingFile,
    setIsFetchingTree,
    setError,
    reset,
  } = useGitStore();

  /**
   * Connect to a Git repository
   *
   * @param request - Connection request
   * @returns Repository information
   */
  const connectRepository = useCallback(
    async (request: ConnectRepositoryRequest) => {
      setIsConnecting(true);
      setError(null);

      try {
        const response = await window.git.repo.connect(request);

        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to connect to repository');
        }

        setConnectedRepository(response.data);
        return response.data;
      } catch (err: any) {
        const errorMessage = err.message || 'An unexpected error occurred';
        setError(errorMessage);
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [setIsConnecting, setError, setConnectedRepository]
  );

  /**
   * Fetch a file from the repository
   *
   * @param request - File fetch request
   * @returns File content and metadata
   */
  const fetchFile = useCallback(
    async (request: FetchFileRequest) => {
      setIsFetchingFile(true);
      setError(null);

      try {
        const response = await window.git.repo.fetchFile(request);

        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to fetch file');
        }

        setCurrentFile(response.data.filePath, response.data.content);
        return response.data;
      } catch (err: any) {
        const errorMessage = err.message || 'An unexpected error occurred';
        setError(errorMessage);
        throw err;
      } finally {
        setIsFetchingFile(false);
      }
    },
    [setIsFetchingFile, setError, setCurrentFile]
  );

  /**
   * Fetch repository file tree
   *
   * @param request - Tree fetch request
   * @returns File tree structure
   */
  const fetchTree = useCallback(
    async (request: FetchRepositoryTreeRequest) => {
      setIsFetchingTree(true);
      setError(null);

      try {
        const response = await window.git.repo.fetchTree(request);

        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to fetch repository tree');
        }

        setFileTree(response.data.tree);
        return response.data;
      } catch (err: any) {
        const errorMessage = err.message || 'An unexpected error occurred';
        setError(errorMessage);
        throw err;
      } finally {
        setIsFetchingTree(false);
      }
    },
    [setIsFetchingTree, setError, setFileTree]
  );

  /**
   * Disconnect from repository and reset state
   */
  const disconnectRepository = useCallback(() => {
    reset();
  }, [reset]);

  return {
    // State
    connectedRepository,
    repositoryId,
    currentBranch,
    branches,
    fileTree,
    currentFilePath,
    currentFileContent,
    isConnecting,
    isFetchingFile,
    isFetchingTree,
    error,

    // Actions
    connectRepository,
    fetchFile,
    fetchTree,
    disconnectRepository,
  };
};
