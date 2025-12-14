/**
 * TabBar Component
 * Task: T060
 *
 * Displays open tabs with:
 * - Tab titles and close buttons
 * - Active tab highlighting
 * - Click to switch tabs
 * - Drag to reorder (future enhancement)
 */

import React from 'react';
import { useTabsStore } from '../../stores/tabs';
import type { Tab } from '@shared/types/entities';
import './TabBar.css';

export interface TabBarProps {
  /** Callback when a tab is clicked */
  onTabClick?: (tabId: string) => void;
  /** Callback when a tab close button is clicked */
  onTabClose?: (tabId: string) => void;
}

/**
 * T060: TabBar component with close buttons and active state
 */
export const TabBar: React.FC<TabBarProps> = ({ onTabClick, onTabClose }) => {
  const tabs = useTabsStore((state) => state.getAllTabs());
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const setActiveTab = useTabsStore((state) => state.setActiveTab);
  const removeTab = useTabsStore((state) => state.removeTab);
  const tabCount = useTabsStore((state) => state.getTabCount());
  const canAddTab = useTabsStore((state) => state.canAddTab());

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onTabClick?.(tabId);
  };

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation(); // Prevent tab selection
    removeTab(tabId);
    onTabClose?.(tabId);
  };

  const getTabTitle = (tab: Tab): string => {
    // Extract file name from path
    const fileName = tab.filePath.split(/[/\\]/).pop() || tab.title;
    return fileName.replace(/\.md$/i, ''); // Remove .md extension
  };

  if (tabs.length === 0) {
    return (
      <div className="tab-bar tab-bar--empty" data-testid="tab-bar">
        <div className="tab-bar__empty-state">
          No tabs open. Open a file to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="tab-bar" data-testid="tab-bar">
      <div className="tab-bar__tabs">
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'tab--active' : ''}`}
            data-testid={`tab-${tab.id}`}
            onClick={() => handleTabClick(tab.id)}
            title={tab.filePath}
          >
            <span className="tab__title">{getTabTitle(tab)}</span>

            {tab.isDirty && <span className="tab__dirty-indicator" title="Modified">●</span>}

            <button
              className="tab__close"
              onClick={(e) => handleTabClose(e, tab.id)}
              aria-label={`Close ${getTabTitle(tab)}`}
              title="Close tab (Ctrl+W)"
              data-testid="tab-close"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2.22 2.22a.75.75 0 0 1 1.06 0L6 4.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L7.06 6l2.72 2.72a.75.75 0 1 1-1.06 1.06L6 7.06l-2.72 2.72a.75.75 0 0 1-1.06-1.06L4.94 6 2.22 3.28a.75.75 0 0 1 0-1.06z" />
              </svg>
            </button>

            {index < 9 && (
              <span className="tab__shortcut" title={`Ctrl+${index + 1}`}>
                {index + 1}
              </span>
            )}
          </div>
        ))}
      </div>

      {canAddTab.warning && (
        <div className="tab-bar__warning" title={canAddTab.warning}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575L6.457 1.047zM8 5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5zm0 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
          </svg>
          <span>{tabCount} tabs open</span>
        </div>
      )}
    </div>
  );
};

export default TabBar;
