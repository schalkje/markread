/**
 * FolderOpener Component
 * Task: T098
 *
 * Provides UI for opening folders via dialog
 * Integrates with file:openFolderDialog IPC handler
 */

import React, { useState } from 'react';
import { useFoldersStore } from '../stores/folders';
import type { Folder } from '@shared/types/entities';
import './FolderOpener.css';

export interface FolderOpenerProps {
  /** Callback when folder is opened */
  onFolderOpened?: (folderPath: string) => void;
}

/**
 * FolderOpener component with folder dialog integration
 */
export const FolderOpener: React.FC<FolderOpenerProps> = ({ onFolderOpened }) => {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addFolder } = useFoldersStore();

  /**
   * Open folder dialog and add selected folder
   */
  const handleOpenFolder = async () => {
    setIsOpening(true);
    setError(null);

    try {
      // Show folder dialog
      const dialogResult = await window.electronAPI?.file?.openFolderDialog({});

      if (!dialogResult?.success) {
        setError(dialogResult?.error || 'Failed to open folder dialog');
        setIsOpening(false);
        return;
      }

      if (!dialogResult.folderPath) {
        // User cancelled
        setIsOpening(false);
        return;
      }

      const folderPath = dialogResult.folderPath;

      // Extract folder name for display
      const folderName = folderPath.split(/[\\/]/).pop() || 'Untitled';

      // Create folder object
      const newFolder: Folder = {
        id: `folder-${Date.now()}`,
        path: folderPath,
        displayName: folderName,
        fileTreeState: {
          expandedDirectories: new Set<string>(),
          scrollPosition: 0,
          selectedPath: null,
        },
        activeFolderId: null,
        tabCollection: [],
        activeTabId: null,
        recentFiles: [],
        splitLayout: {
          rootPane: {
            id: 'pane-root',
            tabs: [],
            activeTabId: null,
            orientation: 'vertical',
            sizeRatio: 1.0,
            splitChildren: null,
          },
          layoutType: 'single',
        },
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      // Add folder to store
      addFolder(newFolder);

      // Notify parent
      onFolderOpened?.(folderPath);

      setIsOpening(false);
    } catch (err) {
      console.error('Error opening folder:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsOpening(false);
    }
  };

  return (
    <div className="folder-opener">
      <button
        className="folder-opener__button"
        onClick={handleOpenFolder}
        disabled={isOpening}
      >
        {isOpening ? 'Opening...' : 'Open Folder'}
      </button>

      {error && (
        <div className="folder-opener__error">
          <p>Error: {error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
    </div>
  );
};

export default FolderOpener;
