/**
 * ErrorDialog Component
 * Task: T009
 * Displays errors with retry and view logs options
 */

import React from 'react';
import type { ExportError } from '../../shared/types/export';
import './ErrorDialog.css';

export interface ErrorDialogProps {
  error: ExportError;
  onRetry?: () => void;
  onViewLogs?: () => void;
  onClose: () => void;
  title?: string;
}

export const ErrorDialog: React.FC<ErrorDialogProps> = ({
  error,
  onRetry,
  onViewLogs,
  onClose,
  title = 'Error',
}) => {
  return (
    <div className="error-dialog-overlay" onClick={onClose}>
      <div
        className="error-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-dialog-title"
        aria-describedby="error-dialog-description"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="error-dialog__header">
          <span className="error-dialog__icon" aria-hidden="true">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <h2 id="error-dialog-title" className="error-dialog__title">
            {title}
          </h2>
          <button
            type="button"
            className="error-dialog__close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        <div id="error-dialog-description" className="error-dialog__content">
          <p className="error-dialog__message">{error.message}</p>
          {error.details && (
            <details className="error-dialog__details">
              <summary>Technical Details</summary>
              <pre className="error-dialog__code">{error.details}</pre>
            </details>
          )}
          {error.code && (
            <p className="error-dialog__error-code">Error Code: {error.code}</p>
          )}
        </div>

        <div className="error-dialog__actions">
          {error.retryable && onRetry && (
            <button
              type="button"
              className="error-dialog__button error-dialog__button--primary"
              onClick={onRetry}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
              </svg>
              Retry
            </button>
          )}
          {onViewLogs && (
            <button
              type="button"
              className="error-dialog__button error-dialog__button--secondary"
              onClick={onViewLogs}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M3 3a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3Zm2-.5a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5V3a.5.5 0 0 0-.5-.5H5Z" />
              </svg>
              View Logs
            </button>
          )}
          <button
            type="button"
            className="error-dialog__button error-dialog__button--secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorDialog;
