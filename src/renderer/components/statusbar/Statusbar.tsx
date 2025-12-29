/**
 * Statusbar Component
 * Task: T051f
 *
 * Displays global and content zoom levels
 */

import React from 'react';
import { useUIStore } from '../../stores/ui';
import { useTabsStore } from '../../stores/tabs';
import { OfflineBadge } from '../git/OfflineBadge';
import { useGitRepo } from '../../hooks/useGitRepo';
import './Statusbar.css';

export interface StatusbarProps {
  className?: string;
}

/**
 * T051f: Statusbar with zoom indicators
 * Shows "UI: 100% | Content: 150%"
 */
export const Statusbar: React.FC<StatusbarProps> = ({ className = '' }) => {
  const globalZoomLevel = useUIStore((state) => state.globalZoomLevel);
  const activeTab = useTabsStore((state) => {
    const activeId = state.activeTabId;
    return activeId ? state.tabs.get(activeId) : null;
  });
  const { connectedRepository } = useGitRepo();

  const contentZoom = activeTab?.zoomLevel || 100;
  const showContentZoom = contentZoom !== 100;

  return (
    <div className={`statusbar ${className}`} data-testid="statusbar">
      <div className="statusbar__left">
        {/* Show offline badge when repository is connected */}
        {connectedRepository && <OfflineBadge />}
      </div>

      <div className="statusbar__right">
        <div className="statusbar__zoom-indicators">
          <span className="statusbar__zoom-item" title="Global UI zoom level">
            UI: {Math.round(globalZoomLevel)}%
          </span>
          {showContentZoom && (
            <>
              <span className="statusbar__separator">|</span>
              <span
                className="statusbar__zoom-item statusbar__zoom-item--content"
                title="Content zoom level"
              >
                Content: {Math.round(contentZoom)}%
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Statusbar;
