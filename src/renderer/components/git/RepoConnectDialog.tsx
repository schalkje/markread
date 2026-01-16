/**
 * Repository Connect Dialog Component
 * Phase 3 - T049
 *
 * Dialog for connecting to a Git repository with:
 * - URL input field
 * - Authentication method selection (OAuth/PAT)
 * - Validation and error display
 * - Connection progress indicator
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGitRepo } from '../../hooks/useGitRepo';
import { useRecentsFavorites } from '../../hooks/useRecentsFavorites';
import type { ConnectRepositoryRequest, BranchInfo } from '../../../shared/types/git-contracts';
import { ItemType } from '../../../shared/types/recents-favorites';
import { getConnectionHistory, groupConnectionHistory, removeFromConnectionHistory, type ConnectionHistoryEntry, type GroupedHistoryRepository } from '../../utils/connection-history';
import { sortBranchesByPriority, getDefaultBranch } from '../../../shared/utils/repository-utils';
import './RepoConnectDialog.css';

export interface RepoConnectDialogProps {
  /** Whether the dialog is visible */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when successfully connected - receives the connected repository data */
  onConnected?: (connectedRepository: import('../../../shared/types/git-contracts').ConnectRepositoryResponse) => void;
}

/**
 * Device Flow session state
 */
interface DeviceFlowSessionState {
  sessionId: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
  statusMessage: string;
}

/**
 * T049: Repository Connect Dialog
 *
 * Usage:
 * ```typescript
 * <RepoConnectDialog
 *   isOpen={isDialogOpen}
 *   onClose={() => setIsDialogOpen(false)}
 *   onConnected={() => console.log('Connected!')}
 * />
 * ```
 */
export const RepoConnectDialog: React.FC<RepoConnectDialogProps> = ({
  isOpen,
  onClose,
  onConnected,
}) => {
  const { connectRepository, isConnecting, error } = useGitRepo();
  const { addRecent, removeRecent, removeFavorite } = useRecentsFavorites();

  // Form state
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Branch selection state (integrated, not multi-step)
  const [availableBranches, setAvailableBranches] = useState<BranchInfo[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isFetchingBranches, setIsFetchingBranches] = useState(false);
  const [needsAuthentication, setNeedsAuthentication] = useState(false);
  const [branchToPreselect, setBranchToPreselect] = useState<string | null>(null);

  // Connection history state
  const [, setConnectionHistory] = useState<ConnectionHistoryEntry[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<GroupedHistoryRepository[]>([]);

  // Device Flow state
  const [deviceFlowSession, setDeviceFlowSession] = useState<DeviceFlowSessionState | null>(null);
  const [isManuallyChecking, setIsManuallyChecking] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deviceFlowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const currentIntervalRef = useRef<number>(5); // Track current polling interval
  const lastFetchedUrlRef = useRef<string | null>(null); // Track last fetched URL to prevent duplicates

  /**
   * Cleanup Device Flow session and intervals
   */
  const cleanupDeviceFlowSession = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (deviceFlowTimeoutRef.current) {
      clearTimeout(deviceFlowTimeoutRef.current);
      deviceFlowTimeoutRef.current = null;
    }
    if (sessionIdRef.current) {
      window.git.auth.cancelDeviceFlow(sessionIdRef.current).catch(() => {
        // Ignore cancellation errors
      });
      sessionIdRef.current = null;
    }
    setDeviceFlowSession(null);
    currentIntervalRef.current = 5; // Reset interval
  }, []);

  /**
   * Validate repository URL
   */
  const validateUrl = useCallback((urlValue: string): boolean => {
    if (!urlValue.trim()) {
      setValidationError('Repository URL is required');
      return false;
    }

    try {
      const parsedUrl = new URL(urlValue);

      if (parsedUrl.protocol !== 'https:') {
        setValidationError('Only HTTPS URLs are supported');
        return false;
      }

      const hostname = parsedUrl.hostname;
      const isAzureVisualStudio = hostname.endsWith('.visualstudio.com');
      if (hostname !== 'github.com' && hostname !== 'dev.azure.com' && !isAzureVisualStudio) {
        setValidationError('Only GitHub and Azure DevOps repositories are supported');
        return false;
      }

      setValidationError(null);
      return true;
    } catch {
      setValidationError('Invalid URL format');
      return false;
    }
  }, []);

  /**
   * Fetch available branches for the repository
   */
  const fetchBranches = useCallback(async (): Promise<void> => {
    try {
      setIsFetchingBranches(true);
      setValidationError(null);
      setNeedsAuthentication(false);

      console.log('[Fetch Branches] Fetching repository info...');
      const response = await window.git.repo.fetchInfo({
        url: url.trim(),
        authMethod: 'oauth',
      });

      if (!response.success) {
        throw response.error || new Error('Failed to fetch repository information');
      }

      const { branches, defaultBranch } = response.data;
      console.log('[Fetch Branches] Got branches:', branches);

      // Sort branches by priority
      const sortedBranchNames = sortBranchesByPriority(branches.map((b: BranchInfo) => b.name));
      const sortedBranches = sortedBranchNames.map((name: string) =>
        branches.find((b: BranchInfo) => b.name === name)!
      );

      setAvailableBranches(sortedBranches);

      // Select default branch or pre-selected branch
      if (branchToPreselect && sortedBranchNames.includes(branchToPreselect)) {
        setSelectedBranch(branchToPreselect);
        setBranchToPreselect(null); // Clear after using
      } else {
        const defaultBranchToSelect = getDefaultBranch(sortedBranchNames) || defaultBranch;
        setSelectedBranch(defaultBranchToSelect);
      }
    } catch (err: any) {
      console.error('[Fetch Branches] Error:', err);
      // Re-throw auth errors to be handled by caller
      if (err.code === 'AUTH_FAILED' || err.statusCode === 401) {
        throw err;
      }
      setValidationError(err.message || 'Failed to fetch branches');
    } finally {
      setIsFetchingBranches(false);
    }
  }, [url, branchToPreselect]);

  /**
   * Handle fetching branches (auto-triggered or manual)
   */
  const handleFetchBranches = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      // Validate URL
      if (!validateUrl(url)) {
        return;
      }

      try {
        await fetchBranches();
      } catch (err: any) {
        // Check if error is due to missing/invalid credentials
        if (err.code === 'AUTH_FAILED' || err.statusCode === 401) {
          // Set flag to show "Open Repository" button
          setNeedsAuthentication(true);
        } else {
          // Error was already handled in fetchBranches
        }
      }
    },
    [url, validateUrl, fetchBranches]
  );

  /**
   * Check Device Flow status (used by both automatic polling and manual checks)
   */
  const checkDeviceFlowStatus = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const statusResponse = await window.git.auth.checkDeviceFlowStatus({
        sessionId,
      });

      if (!statusResponse.success) {
        return false; // Continue polling
      }

      const status = statusResponse.data;

      // Check if interval has changed (GitHub requested slowdown)
      if (status.interval && status.interval !== currentIntervalRef.current) {
        console.log(`[Device Flow] Interval changed from ${currentIntervalRef.current}s to ${status.interval}s`);
        currentIntervalRef.current = status.interval;

        // Restart polling with new interval
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          startPolling(sessionId, status.interval);
        }
        return false;
      }

      if (status.isComplete) {
        // Clear polling and timeout
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (deviceFlowTimeoutRef.current) {
          clearTimeout(deviceFlowTimeoutRef.current);
          deviceFlowTimeoutRef.current = null;
        }

        if (status.isSuccess) {
          // Device Flow successful - now fetch branches
          setDeviceFlowSession((prev) =>
            prev ? { ...prev, statusMessage: 'Authentication successful! Fetching branches...' } : null
          );

          // Clear Device Flow session
          setDeviceFlowSession(null);

          // Fetch branches now that we're authenticated
          await fetchBranches();
        } else {
          // Device Flow failed
          setDeviceFlowSession(null);
          setValidationError(status.error || 'Authentication failed');
        }
        return true; // Completed
      } else {
        // Update status message
        setDeviceFlowSession((prev) =>
          prev ? { ...prev, statusMessage: 'Waiting for authorization on GitHub...' } : null
        );
        return false; // Continue polling
      }
    } catch (pollError: any) {
      console.error('Error polling Device Flow status:', pollError);
      return false;
    }
  }, [fetchBranches]);

  /**
   * Start or restart polling with the current interval
   */
  const startPolling = useCallback((sessionId: string, intervalSeconds: number) => {
    // Clear existing interval if any
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Update current interval
    currentIntervalRef.current = intervalSeconds;
    console.log(`[Device Flow] Starting polling with ${intervalSeconds}s interval`);

    // Start new polling interval
    pollIntervalRef.current = setInterval(async () => {
      await checkDeviceFlowStatus(sessionId);
    }, intervalSeconds * 1000);
  }, [checkDeviceFlowStatus]);

  /**
   * Initiate Device Flow authentication
   */
  const initiateDeviceFlow = useCallback(async (): Promise<void> => {
    console.log('[Device Flow] Initiating...');

    // Detect provider from URL
    const parsedUrl = new URL(url);
    const isAzureDevOps = parsedUrl.hostname === 'dev.azure.com' ||
                         parsedUrl.hostname.endsWith('.visualstudio.com');

    const provider = isAzureDevOps ? 'azure' : 'github';
    const scopes = isAzureDevOps
      ? ['499b84ac-1321-427f-aa17-267ca6975798/.default'] // Azure DevOps scope
      : ['repo', 'user:email']; // GitHub scopes

    console.log('[Device Flow] Provider:', provider);

    const deviceFlowResponse = await window.git.auth.initiateDeviceFlow({
      provider,
      scopes,
      url: url.trim(), // Pass repository URL for Azure DevOps GCM authentication
    });

    console.log('[Device Flow] Response:', deviceFlowResponse);

    if (!deviceFlowResponse.success) {
      throw new Error(deviceFlowResponse.error?.message || 'Failed to initiate authentication');
    }

    const { sessionId, userCode, verificationUri, expiresIn, interval, browserOpened } = deviceFlowResponse.data;
    console.log('[Device Flow] User code:', userCode);

    // Set initial status message
    const providerName = isAzureDevOps ? 'Microsoft' : 'GitHub';
    const statusMessage = browserOpened
      ? `Opening ${providerName} in your browser...`
      : `Please open ${providerName} manually to authorize`;

    const session = {
      sessionId,
      userCode,
      verificationUri,
      expiresIn,
      interval,
      statusMessage,
    };
    console.log('[Device Flow] Setting session state:', session);
    sessionIdRef.current = sessionId;
    setDeviceFlowSession(session);

    // Set timeout for Device Flow (uses expiresIn from GitHub)
    deviceFlowTimeoutRef.current = setTimeout(() => {
      cleanupDeviceFlowSession();
      setValidationError('Authentication timed out. Please try again.');
    }, expiresIn * 1000);

    // Start polling for Device Flow completion (use interval from provider)
    startPolling(sessionId, interval);
  }, [cleanupDeviceFlowSession, startPolling, url]);

  /**
   * Manually check Device Flow status
   */
  const handleManualCheck = useCallback(async () => {
    if (!sessionIdRef.current || isManuallyChecking) {
      return;
    }

    setIsManuallyChecking(true);
    console.log('[Device Flow] Manual check triggered');

    try {
      await checkDeviceFlowStatus(sessionIdRef.current);
    } finally {
      setIsManuallyChecking(false);
    }
  }, [checkDeviceFlowStatus, isManuallyChecking]);

  /**
   * Load connection history when dialog opens
   */
  useEffect(() => {
    if (isOpen) {
      setConnectionHistory(getConnectionHistory());
      setGroupedHistory(groupConnectionHistory());
    }
  }, [isOpen]);

  /**
   * Cleanup on unmount or when dialog closes
   */
  useEffect(() => {
    return () => {
      cleanupDeviceFlowSession();
    };
  }, [cleanupDeviceFlowSession]);

  /**
   * Auto-fetch branches when URL changes (with debouncing)
   */
  useEffect(() => {
    // Don't auto-fetch if:
    // - Dialog is not open
    // - URL is empty
    // - Already fetching
    // - Device flow is active
    if (!isOpen || !url.trim() || isFetchingBranches || deviceFlowSession) {
      return;
    }

    const trimmedUrl = url.trim();

    // Don't fetch again if we already fetched for this URL
    if (lastFetchedUrlRef.current === trimmedUrl) {
      return;
    }

    // Debounce the fetch (wait for user to finish typing)
    const debounceTimer = setTimeout(() => {
      // Validate before fetching
      if (validateUrl(url)) {
        lastFetchedUrlRef.current = trimmedUrl;
        handleFetchBranches();
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(debounceTimer);
  }, [url, isOpen, isFetchingBranches, deviceFlowSession, validateUrl, handleFetchBranches]);

  /**
   * Handle "Open Repository" button click (initiates OAuth)
   */
  const handleAuthenticateAndFetch = useCallback(async () => {
    try {
      // Detect provider from URL
      const parsedUrl = new URL(url);
      const isAzureDevOps = parsedUrl.hostname === 'dev.azure.com' ||
                           parsedUrl.hostname.endsWith('.visualstudio.com');

      if (isAzureDevOps) {
        // Azure DevOps: Try unauthenticated access first
        setValidationError(null);
        try {
          // Attempt to fetch branches without authentication
          await fetchBranches();
        } catch (err: any) {
          // If it fails with auth error, initiate Device Flow
          if (err.code === 'AUTH_FAILED' || err.statusCode === 401 || err.statusCode === 203) {
            // Use Microsoft Entra ID Device Flow (same as GitHub)
            await initiateDeviceFlow();
          } else {
            // Re-throw non-auth errors
            throw err;
          }
        }
      } else {
        // GitHub: Use OAuth Device Flow
        await initiateDeviceFlow();
      }
    } catch (authErr: any) {
      setValidationError(authErr.message || 'Authentication failed');
    }
  }, [initiateDeviceFlow, url, fetchBranches]);

  /**
   * Handle final connection (open repo branch)
   */
  const handleConnect = useCallback(
    async () => {
      if (!selectedBranch) {
        setValidationError('Please select a branch');
        return;
      }

      try {
        setValidationError(null);

        console.log('[Connect] Connecting to repository with branch:', selectedBranch);
        const request: ConnectRepositoryRequest = {
          url: url.trim(),
          authMethod: 'oauth',
          initialBranch: selectedBranch,
        };

        const response = await connectRepository(request);

        console.log('[Connect] Connection successful, response:', response);
        console.log('[Connect] Calling onConnected callback with repository data...');

        // Success - notify parent with the connected repository data
        if (response) {
          onConnected?.(response);

          // T019: Track repository in recents using Zustand store
          try {
            const repoName = response.displayName || url.split('/').pop() || 'Repository';
            const displayName = `${repoName} (${selectedBranch})`;
            // Include branch in path so each branch is tracked separately
            const pathWithBranch = `${url}#${selectedBranch}`;
            console.log('[RepoConnectDialog] Adding repository to recents:', { path: pathWithBranch, displayName });
            await addRecent({
              path: pathWithBranch,
              type: ItemType.REPO,
              displayName
            });
            console.log('[RepoConnectDialog] Repository added to recents successfully');
          } catch (error) {
            console.error('[RepoConnectDialog] Failed to track repository in recents:', error);
          }
        }
        onClose();

        // Reset form
        setUrl('');
        setAvailableBranches([]);
        setSelectedBranch('');
        setValidationError(null);
        setNeedsAuthentication(false);
        setBranchToPreselect(null);
        lastFetchedUrlRef.current = null; // Clear last fetched URL
      } catch (err: any) {
        setValidationError(err.message || 'An error occurred during connection');
      }
    },
    [url, selectedBranch, connectRepository, onConnected, onClose]
  );

  /**
   * Handle URL input change
   */
  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setValidationError(null);
    setAvailableBranches([]); // Clear branches when URL changes
    setSelectedBranch('');
    setNeedsAuthentication(false);
    lastFetchedUrlRef.current = null; // Clear last fetched URL to allow new fetch
  }, []);

  /**
   * Handle clicking a history entry
   */
  const handleHistoryEntryClick = useCallback(async (historyUrl: string, branch?: string) => {
    setValidationError(null);
    setNeedsAuthentication(false);

    if (branch) {
      // Direct connection: Skip branch fetching and connect immediately
      setUrl(historyUrl);
      setSelectedBranch(branch);
      setAvailableBranches([]);
      lastFetchedUrlRef.current = historyUrl; // Mark as fetched to prevent auto-fetch

      // Connect directly without fetching branches
      const request: ConnectRepositoryRequest = {
        url: historyUrl.trim(),
        authMethod: 'oauth',
        initialBranch: branch,
      };

      try {
        const response = await connectRepository(request);
        if (response) {
          onConnected?.(response);
        }
        onClose();

        // Reset form
        setUrl('');
        setAvailableBranches([]);
        setSelectedBranch('');
        setValidationError(null);
        setNeedsAuthentication(false);
        setBranchToPreselect(null);
        lastFetchedUrlRef.current = null;
      } catch (err: any) {
        const errMsg = err.message || 'An error occurred during connection';
        setValidationError(`This branch has been removed. ${errMsg}`);

        // Auto-remove item from recents, favorites, AND connection history
        try {
          const pathWithBranch = `${historyUrl}#${branch}`;
          await removeRecent(pathWithBranch, ItemType.REPO);
          await removeFavorite(pathWithBranch, ItemType.REPO);
          removeFromConnectionHistory(historyUrl, branch);
          console.log('[RepoConnectDialog] Removed unavailable repository from recents/favorites/history:', pathWithBranch);

          // Reload connection history to reflect the removal
          const history = getConnectionHistory();
          setConnectionHistory(history);
          const grouped = groupConnectionHistory();
          setGroupedHistory(grouped);
        } catch (removeError) {
          console.error('[RepoConnectDialog] Failed to remove unavailable repository:', removeError);
        }
      }
    } else {
      // Show branch selector: Set URL and trigger branch fetch
      setUrl(historyUrl);
      setAvailableBranches([]);
      setSelectedBranch('');
      setBranchToPreselect(null);
      lastFetchedUrlRef.current = null; // Allow branch fetch
    }
  }, [connectRepository, onConnected, onClose]);

  /**
   * Handle close
   */
  const handleClose = useCallback(() => {
    if (!isConnecting && !deviceFlowSession && !isFetchingBranches) {
      cleanupDeviceFlowSession();
      setUrl('');
      setAvailableBranches([]);
      setSelectedBranch('');
      setValidationError(null);
      setNeedsAuthentication(false);
      setBranchToPreselect(null);
      lastFetchedUrlRef.current = null; // Clear last fetched URL
      onClose();
    }
  }, [isConnecting, deviceFlowSession, isFetchingBranches, cleanupDeviceFlowSession, onClose]);

  /**
   * Handle escape key
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && !isConnecting) {
        handleClose();
      }
    },
    [isConnecting, handleClose]
  );

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isConnecting) {
        handleClose();
      }
    },
    [isConnecting, handleClose]
  );

  // Debug log
  console.log('[Device Flow] Render - deviceFlowSession:', deviceFlowSession);

  if (!isOpen) return null;

  return (
    <div
      className="repo-connect-dialog-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      data-testid="repo-connect-dialog-backdrop"
    >
      <div className="repo-connect-dialog" data-testid="repo-connect-dialog">
        {/* Header */}
        <div className="repo-connect-dialog__header">
          <h2 className="repo-connect-dialog__title">Open Repository</h2>
          <button
            className="repo-connect-dialog__close-btn"
            onClick={handleClose}
            disabled={isConnecting}
            type="button"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="repo-connect-dialog__form">
          {/* URL Input (always visible) */}
          <div className="repo-connect-dialog__field">
            <label htmlFor="repo-url" className="repo-connect-dialog__label">
              Repository URL
            </label>
            <input
              id="repo-url"
              type="text"
              className="repo-connect-dialog__input"
              placeholder="https://github.com/owner/repository"
              value={url}
              onChange={handleUrlChange}
              disabled={isFetchingBranches || isConnecting || !!deviceFlowSession}
              autoFocus
            />
            <span className="repo-connect-dialog__hint">
              Supported: GitHub and Azure DevOps repositories
            </span>
          </div>

          {/* Connection History */}
          {!deviceFlowSession && !isFetchingBranches && availableBranches.length === 0 && groupedHistory.length > 0 && (
            <div className="repo-connect-dialog__history">
              <h3 className="repo-connect-dialog__history-title">Recent Connections</h3>
              <div className="repo-connect-dialog__history-list">
                {groupedHistory.map((repo, repoIndex) => (
                  <div key={`${repo.url}-${repoIndex}`} className="repo-connect-dialog__history-group">
                    <button
                      type="button"
                      className="repo-connect-dialog__history-group-header"
                      onClick={() => handleHistoryEntryClick(repo.url)}
                      disabled={isFetchingBranches || isConnecting}
                    >
                      <div className="repo-connect-dialog__history-item-name">
                        {repo.displayName}
                      </div>
                      <div className="repo-connect-dialog__history-item-url">
                        {repo.url}
                      </div>
                    </button>
                    <div className="repo-connect-dialog__history-branches">
                      {repo.branches.map((branchInfo, branchIndex) => (
                        <button
                          key={`${repo.url}-${branchInfo.branch}-${branchIndex}`}
                          type="button"
                          className="repo-connect-dialog__history-branch-item"
                          onClick={() => handleHistoryEntryClick(repo.url, branchInfo.branch)}
                          disabled={isFetchingBranches || isConnecting}
                        >
                          🌿 {branchInfo.branch}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isFetchingBranches && !deviceFlowSession && (
            <div className="repo-connect-dialog__field">
              <div className="repo-connect-dialog__hint">
                Loading branches...
              </div>
            </div>
          )}

          {/* Branch Selection (shown when branches are available) */}
          {availableBranches.length > 0 && !deviceFlowSession && (
            <div className="repo-connect-dialog__branch-selection">
              <div className="repo-connect-dialog__field">
                <label className="repo-connect-dialog__label">
                  Select Branch
                </label>
                <div className="repo-connect-dialog__branch-list">
                  {availableBranches.map((branch) => (
                    <label
                      key={branch.name}
                      className={`repo-connect-dialog__branch-option ${selectedBranch === branch.name ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="branch"
                        value={branch.name}
                        checked={selectedBranch === branch.name}
                        onChange={() => setSelectedBranch(branch.name)}
                        disabled={isConnecting}
                      />
                      <span className="repo-connect-dialog__branch-name">
                        {branch.name}
                        {branch.isDefault && <span className="repo-connect-dialog__branch-badge"> (default)</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* "Open Repository" button (shown when auth is needed) */}
          {needsAuthentication && !deviceFlowSession && (
            <div className="repo-connect-dialog__field">
              <button
                type="button"
                className="repo-connect-dialog__btn repo-connect-dialog__btn--primary repo-connect-dialog__btn--full-width"
                onClick={handleAuthenticateAndFetch}
                disabled={isFetchingBranches || isConnecting}
              >
                Open Repository
              </button>
              <span className="repo-connect-dialog__hint">
                {(() => {
                  try {
                    const parsedUrl = new URL(url);
                    const isAzureDevOps = parsedUrl.hostname === 'dev.azure.com' ||
                                         parsedUrl.hostname.endsWith('.visualstudio.com');
                    return isAzureDevOps
                      ? 'You need to authenticate with Azure DevOps to access this repository'
                      : 'You need to authenticate with GitHub to access this repository';
                  } catch {
                    return 'You need to authenticate to access this repository';
                  }
                })()}
              </span>
            </div>
          )}

          {/* Device Flow Status Display */}
          {(() => {
            console.log('[Device Flow] Checking deviceFlowSession for render:', !!deviceFlowSession);
            return deviceFlowSession && (
            <div className="repo-connect-dialog__device-flow-status" role="status">
              <div className="repo-connect-dialog__device-flow-message">
                {deviceFlowSession.statusMessage}
              </div>
              <div className="repo-connect-dialog__device-code-box">
                <div className="repo-connect-dialog__device-code-label">Enter this code on GitHub:</div>
                <div className="repo-connect-dialog__device-code">{deviceFlowSession.userCode}</div>
                <a
                  href={deviceFlowSession.verificationUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="repo-connect-dialog__device-code-link"
                >
                  Open GitHub to authorize
                </a>
              </div>
              <div className="repo-connect-dialog__polling-info">
                <div className="repo-connect-dialog__polling-interval">
                  Auto-checking every {currentIntervalRef.current} seconds
                </div>
                <button
                  type="button"
                  className="repo-connect-dialog__check-now-btn"
                  onClick={handleManualCheck}
                  disabled={isManuallyChecking}
                >
                  {isManuallyChecking ? 'Checking...' : 'Check Now'}
                </button>
              </div>
            </div>
            );
          })()}

          {/* Error Display */}
          {(validationError || error) && !deviceFlowSession && (
            <div className="repo-connect-dialog__error" role="alert">
              {(validationError || error)?.split('\n').map((line, index) => (
                <React.Fragment key={index}>
                  {line}
                  {index < (validationError || error)!.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="repo-connect-dialog__actions">
            <button
              type="button"
              className="repo-connect-dialog__btn repo-connect-dialog__btn--secondary"
              onClick={deviceFlowSession ? cleanupDeviceFlowSession : handleClose}
              disabled={(isFetchingBranches || isConnecting) && !deviceFlowSession}
            >
              {deviceFlowSession ? 'Cancel Authentication' : 'Cancel'}
            </button>
            {availableBranches.length > 0 && !deviceFlowSession && (
              <button
                type="button"
                className="repo-connect-dialog__btn repo-connect-dialog__btn--primary"
                onClick={handleConnect}
                disabled={isConnecting || !selectedBranch}
              >
                {isConnecting ? 'Opening...' : 'Open Repo Branch'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
