/**
 * TitleBarMiddle Component
 * Task: T159b
 *
 * Middle section of title bar:
 * - Displays active folder name or file name
 */

import React from 'react';
import { useTabsStore } from '../../stores/tabs';
import { useFoldersStore } from '../../stores/folders';
import './TitleBar.css';

export const TitleBarMiddle: React.FC = () => {
  const { activeTabId, tabs } = useTabsStore();
  const { folders, activeFolderId } = useFoldersStore();

  const activeTab = activeTabId ? tabs.get(activeTabId) : null;
  const activeFolder = activeFolderId
    ? folders.find((f) => f.id === activeFolderId)
    : null;

  let displayText = 'MarkRead';

  if (activeTab) {
    if (activeFolder) {
      // Show folder name and file name
      displayText = `${activeFolder.displayName || 'Untitled'} - ${activeTab.title}`;
    } else {
      // Show just the file name
      displayText = activeTab.title;
    }
  } else if (activeFolder) {
    // Show just the folder name
    displayText = activeFolder.displayName || 'Untitled';
  }

  return (
    <div className="title-bar__middle">
      <span className="title-bar__title" title={displayText}>
        {displayText}
      </span>
    </div>
  );
};
