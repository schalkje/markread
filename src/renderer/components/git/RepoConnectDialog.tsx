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
import type { ConnectRepositoryRequest } from '../../../shared/types/git-contracts';
import './RepoConnectDialog.css';

export interface RepoConnectDialogProps {
  /** Whether the dialog is visible */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when successfully connected */
  onConnected?: () => void;
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

  // Form state
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Device Flow state
  const [deviceFlowSession, setDeviceFlowSession] = useState<DeviceFlowSessionState | null>(null);
  const [isManuallyChecking, setIsManuallyChecking] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deviceFlowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const currentIntervalRef = useRef<number>(5); // Track current polling interval

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
          // Device Flow successful - now connect to repository
          setDeviceFlowSession((prev) =>
            prev ? { ...prev, statusMessage: 'Authentication successful! Connecting...' } : null
          );

          const request: ConnectRepositoryRequest = {
            url: url.trim(),
            authMethod: 'oauth',
          };

          await connectRepository(request);

          // Success - close dialog and notify parent
          onConnected?.();
          onClose();

          // Reset form
          setUrl('');
          setDeviceFlowSession(null);
          setValidationError(null);
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
  }, [url, connectRepository, onConnected, onClose]);

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
   * Cleanup on unmount or when dialog closes
   */
  useEffect(() => {
    return () => {
      cleanupDeviceFlowSession();
    };
  }, [cleanupDeviceFlowSession]);

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
      if (hostname !== 'github.com' && hostname !== 'dev.azure.com') {
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
   * Handle form submission
   */
  const handleConnect = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate URL
      if (!validateUrl(url)) {
        return;
      }

      try {
        setValidationError(null);

        // Initiate Device Flow
        console.log('[Device Flow] Initiating...');
        const deviceFlowResponse = await window.git.auth.initiateDeviceFlow({
          provider: 'github',
          scopes: ['repo', 'user:email'],
        });

        console.log('[Device Flow] Response:', deviceFlowResponse);

        if (!deviceFlowResponse.success) {
          throw new Error(deviceFlowResponse.error?.message || 'Failed to initiate authentication');
        }

        const { sessionId, userCode, verificationUri, expiresIn, interval, browserOpened } = deviceFlowResponse.data;
        console.log('[Device Flow] User code:', userCode);

        // Set initial status message
        const statusMessage = browserOpened
          ? 'Opening GitHub in your browser...'
          : 'Please open GitHub manually to authorize';

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

        // Start polling for Device Flow completion (use interval from GitHub)
        startPolling(sessionId, interval);

        return;
      } catch (err: any) {
        cleanupDeviceFlowSession();
        setValidationError(err.message || 'An error occurred during authentication');
      }
    },
    [url, validateUrl, connectRepository, onConnected, onClose, cleanupDeviceFlowSession, startPolling]
  );

  /**
   * Handle URL input change
   */
  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setValidationError(null);
  }, []);

  /**
   * Handle close
   */
  const handleClose = useCallback(() => {
    if (!isConnecting && !deviceFlowSession) {
      cleanupDeviceFlowSession();
      setUrl('');
      setValidationError(null);
      onClose();
    }
  }, [isConnecting, deviceFlowSession, cleanupDeviceFlowSession, onClose]);

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
          <h2 className="repo-connect-dialog__title">Connect to Repository</h2>
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
        <form className="repo-connect-dialog__form" onSubmit={handleConnect}>
          {/* URL Input */}
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
              disabled={isConnecting}
              autoFocus
            />
            <span className="repo-connect-dialog__hint">
              Supported: GitHub and Azure DevOps repositories
            </span>
          </div>

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
              disabled={isConnecting && !deviceFlowSession}
            >
              {deviceFlowSession ? 'Cancel Authentication' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="repo-connect-dialog__btn repo-connect-dialog__btn--primary"
              disabled={isConnecting || !url.trim() || !!deviceFlowSession}
            >
              {isConnecting ? 'Connecting...' : deviceFlowSession ? 'Waiting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
