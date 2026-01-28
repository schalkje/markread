/**
 * ExportProgressDialog Component
 * Task: T017
 * Displays export progress with cancel option
 */

import React from 'react';
import type { ExportProgress } from '../../shared/types/export';
import './ExportProgressDialog.css';

export interface ExportProgressDialogProps {
  visible: boolean;
  progress: ExportProgress;
  status: string;
  onCancel?: () => void;
  onClose: () => void;
  onOpenFile?: () => void;
}

export const ExportProgressDialog: React.FC<ExportProgressDialogProps> = ({
  visible,
  progress,
  status,
  onCancel,
  onClose,
  onOpenFile,
}) => {
  if (!visible) return null;

  const isComplete = status === 'completed';
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';
  const isFinished = isComplete || isFailed || isCancelled;

  const getStatusMessage = (): string => {
    switch (status) {
      case 'pending':
        return 'Preparing export...';
      case 'in-progress':
        if (progress.currentStage) {
          return progress.currentStage;
        }
        if (progress.currentFile) {
          return `Exporting: ${progress.currentFile}`;
        }
        return `Exporting... (${progress.filesProcessed}/${progress.totalFiles})`;
      case 'completed':
        return 'Export completed successfully!';
      case 'failed':
        return 'Export failed.';
      case 'cancelled':
        return 'Export cancelled.';
      default:
        return 'Exporting...';
    }
  };

  const getDetailMessage = (): string | null => {
    if (status !== 'in-progress') return null;
    if (progress.currentFile && progress.currentStage) {
      return progress.currentFile;
    }
    return null;
  };

  const getStatusIcon = (): React.ReactNode => {
    if (isComplete) {
      return (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" className="progress-icon progress-icon--success">
          <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.751.751 0 0 0-.018-1.042.751.751 0 0 0-1.042-.018L6.75 9.19 5.28 7.72a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042l2 2a.75.75 0 0 0 1.06 0Z" />
        </svg>
      );
    }
    if (isFailed) {
      return (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" className="progress-icon progress-icon--error">
          <path d="M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94Z" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="export-progress-overlay" onClick={isFinished ? onClose : undefined}>
      <div
        className="export-progress-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-progress-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="export-progress-title" className="export-progress__title">
          {getStatusIcon()}
          Export to PDF
        </h3>

        <div className="export-progress__content">
          <p className="export-progress__message">{getStatusMessage()}</p>
          {getDetailMessage() && (
            <p className="export-progress__detail">{getDetailMessage()}</p>
          )}

          {!isFinished && (
            <div className="export-progress__bar-container">
              <div
                className="export-progress__bar"
                style={{ width: `${progress.percentComplete}%` }}
                role="progressbar"
                aria-valuenow={progress.percentComplete}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          )}

          {!isFinished && (
            <p className="export-progress__percent">{Math.round(progress.percentComplete)}%</p>
          )}
        </div>

        <div className="export-progress__actions">
          {!isFinished && onCancel && (
            <button
              type="button"
              className="export-progress__button export-progress__button--cancel"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          {isComplete && onOpenFile && (
            <button
              type="button"
              className="export-progress__button export-progress__button--open"
              onClick={onOpenFile}
            >
              Open File
            </button>
          )}
          {isFinished && (
            <button
              type="button"
              className="export-progress__button export-progress__button--close"
              onClick={onClose}
            >
              {isComplete ? 'Done' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportProgressDialog;
