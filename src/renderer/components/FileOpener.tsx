/**
 * FileOpener Component
 * Task: T038
 *
 * Provides UI for opening markdown files via dialog
 * Integrates with file:openFileDialog IPC handler (T035)
 */

import React, { useState } from 'react';
import { useTabsStore } from '../stores/tabs';
import type { Tab } from '@shared/types/entities.d.ts';
import './FileOpener.css';

export interface FileOpenerProps {
  /** Callback when file is opened */
  onFileOpened?: (filePath: string, content: string) => void;
}

/**
 * T038: FileOpener component with file dialog integration
 */
export const FileOpener: React.FC<FileOpenerProps> = ({ onFileOpened }) => {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addTab } = useTabsStore();

  /**
   * Open file dialog and load selected file
   */
  const handleOpenFile = async () => {
    setIsOpening(true);
    setError(null);

    try {
      // Step 1: Show file dialog (T035)
      const dialogResult = await window.electronAPI?.file?.openFileDialog({
        filters: [{ name: 'Markdown Files', extensions: ['md', 'markdown'] }],
        multiSelect: false,
      });

      if (!dialogResult?.success) {
        setError(dialogResult?.error || 'Failed to open file dialog');
        setIsOpening(false);
        return;
      }

      if (!dialogResult.filePaths || dialogResult.filePaths.length === 0) {
        // User cancelled
        setIsOpening(false);
        return;
      }

      const filePath = dialogResult.filePaths[0];

      // Step 2: Read file content (T034)
      const readResult = await window.electronAPI?.file?.read({ filePath });

      if (!readResult?.success) {
        setError(readResult?.error || 'Failed to read file');
        setIsOpening(false);
        return;
      }

      const content = readResult.content || '';

      // Step 3: Create tab for the file (T039, T063 - integration with tabs store)
      const fileName = filePath.split(/[\\/]/).pop() || 'Untitled';

      const newTab: Tab = {
        id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        filePath,
        title: fileName,
        scrollPosition: 0,
        zoomLevel: 100,
        searchState: null,
        modificationTimestamp: Date.now(),
        isDirty: false,
        renderCache: null,
        navigationHistory: [],
        forwardHistory: [],
        createdAt: Date.now(),
        folderId: null, // No folder for directly opened files
        isDirectFile: true, // T063g - Mark as direct file
      };

      // Add tab to store
      addTab(newTab);

      // Notify parent
      onFileOpened?.(filePath, content);

      setIsOpening(false);
    } catch (err) {
      console.error('Error opening file:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsOpening(false);
    }
  };

  return (
    <div className="file-opener">
      <button
        className="file-opener__button"
        onClick={handleOpenFile}
        disabled={isOpening}
      >
        {isOpening ? 'Opening...' : 'Open File'}
      </button>

      {error && (
        <div className="file-opener__error">
          <p>Error: {error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
    </div>
  );
};

export default FileOpener;
