/**
 * History Panel Component
 *
 * Displays navigation history for the current tab with:
 * - Past and future entries
 * - Current entry auto-scroll and highlighting
 * - Metadata (zoom, scroll positions)
 * - File/folder icons
 */

import React, { useEffect, useRef } from 'react';
import { useTabsStore } from '../../stores/tabs';
import { HistoryEntry } from '@shared/types/entities';
import './HistoryPanel.css';

export interface HistoryPanelProps {
  /** Callback when history entry is clicked */
  onHistoryEntryClick?: (index: number) => void;
}

/**
 * History Panel component showing navigation history for current tab
 */
export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  onHistoryEntryClick,
}) => {
  const { tabs, activeTabId } = useTabsStore();
  const currentEntryRef = useRef<HTMLDivElement>(null);

  const activeTab = activeTabId ? tabs.get(activeTabId) : null;
  const history = activeTab?.navigationHistory || [];
  const currentIndex = activeTab?.currentHistoryIndex ?? -1;

  // Auto-scroll to keep current entry visible with context (3 entries before/after if possible)
  useEffect(() => {
    if (currentEntryRef.current) {
      currentEntryRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentIndex, activeTabId]);

  const handleEntryClick = (index: number) => {
    if (index === currentIndex) return; // Already at this entry
    onHistoryEntryClick?.(index);
  };

  const getFileIcon = (filePath: string): string => {
    if (filePath.includes('[Directory Index]')) {
      return '📂';
    }
    // Check file extension
    if (filePath.endsWith('.md') || filePath.endsWith('.markdown')) {
      return '📄';
    }
    // Default file icon
    return '📄';
  };

  const getEntryTitle = (entry: HistoryEntry): string => {
    const fileName = entry.filePath.split(/[/\\]/).pop() || 'Untitled';
    // Remove [Directory Index] suffix for display
    return fileName.replace(/\[Directory Index\]$/, '').trim() || fileName;
  };

  if (!activeTab || history.length === 0) {
    return (
      <div className="history-panel__empty">
        <p>No history available</p>
        <p className="history-panel__hint">
          Navigate through files to build history
        </p>
      </div>
    );
  }

  return (
    <div className="history-panel" data-testid="history-panel">
      <div className="history-panel__list">
        {history.map((entry, index) => {
          const isCurrent = index === currentIndex;
          const isPast = index < currentIndex;
          const isFuture = index > currentIndex;

          return (
            <div
              key={`${entry.filePath}-${index}`}
              ref={isCurrent ? currentEntryRef : null}
              className={`history-item ${
                isCurrent ? 'history-item--current' : ''
              } ${isPast ? 'history-item--past' : ''} ${
                isFuture ? 'history-item--future' : ''
              }`}
              onClick={() => handleEntryClick(index)}
              title={entry.filePath}
              data-testid={`history-item-${index}`}
            >
              <div className="history-item__header">
                <span className="history-item__index">#{index}</span>
                <span className="history-item__icon">
                  {getFileIcon(entry.filePath)}
                </span>
                <span className="history-item__title">
                  {getEntryTitle(entry)}
                </span>
              </div>

              <div className="history-item__metadata">
                <span className="history-item__meta-item">
                  🔍 {Math.round(entry.zoomLevel || 100)}%
                </span>
                <span className="history-item__meta-item">
                  ↕ {Math.round(entry.scrollPosition || 0)}px
                </span>
                <span className="history-item__meta-item">
                  ↔ {Math.round(entry.scrollLeft || 0)}px
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryPanel;
