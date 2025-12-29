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

import React, { useState, useCallback } from 'react';
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
  const [authMethod, setAuthMethod] = useState<'oauth' | 'pat'>('oauth');
  const [validationError, setValidationError] = useState<string | null>(null);

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
        const request: ConnectRepositoryRequest = {
          url: url.trim(),
          authMethod,
        };

        await connectRepository(request);

        // Success - close dialog and notify parent
        onConnected?.();
        onClose();

        // Reset form
        setUrl('');
        setValidationError(null);
      } catch (err) {
        // Error is handled by useGitRepo hook and displayed in the dialog
      }
    },
    [url, authMethod, validateUrl, connectRepository, onConnected, onClose]
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
    if (!isConnecting) {
      setUrl('');
      setValidationError(null);
      onClose();
    }
  }, [isConnecting, onClose]);

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

          {/* Auth Method Selection */}
          <div className="repo-connect-dialog__field">
            <label className="repo-connect-dialog__label">
              Authentication Method
            </label>
            <div className="repo-connect-dialog__radio-group">
              <label className="repo-connect-dialog__radio-label">
                <input
                  type="radio"
                  name="authMethod"
                  value="oauth"
                  checked={authMethod === 'oauth'}
                  onChange={() => setAuthMethod('oauth')}
                  disabled={isConnecting}
                />
                <span>OAuth (Recommended)</span>
              </label>
              <label className="repo-connect-dialog__radio-label">
                <input
                  type="radio"
                  name="authMethod"
                  value="pat"
                  checked={authMethod === 'pat'}
                  onChange={() => setAuthMethod('pat')}
                  disabled={isConnecting}
                />
                <span>Personal Access Token</span>
              </label>
            </div>
          </div>

          {/* Error Display */}
          {(validationError || error) && (
            <div className="repo-connect-dialog__error" role="alert">
              {validationError || error}
            </div>
          )}

          {/* Actions */}
          <div className="repo-connect-dialog__actions">
            <button
              type="button"
              className="repo-connect-dialog__btn repo-connect-dialog__btn--secondary"
              onClick={handleClose}
              disabled={isConnecting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="repo-connect-dialog__btn repo-connect-dialog__btn--primary"
              disabled={isConnecting || !url.trim()}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
