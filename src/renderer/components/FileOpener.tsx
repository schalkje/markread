/**
 * FileOpener Component
 * Task: T038
 *
 * Provides UI for opening markdown files via dialog
 * Integrates with file:openFileDialog IPC handler (T035)
 */

import React, { useState } from 'react';
import { useTabsStore } from '../stores/tabs';
import { generateDirectFileTabId } from '../utils/tab-id';
import type { Tab } from '@shared/types/entities';
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

      // Generate deterministic tab ID for direct file
      const tabId = generateDirectFileTabId(filePath);

      // Check if tab already exists
      const { tabs, setActiveTab } = useTabsStore.getState();
      const existingTab = tabs.get(tabId);

      if (existingTab) {
        // Tab already exists, just switch to it
        setActiveTab(tabId);
      } else {
        // Create new tab with deterministic ID
        const newTab: Tab = {
          id: tabId,
          filePath,
          title: fileName,
          scrollPosition: 0,
          zoomLevel: 100,
          searchState: null,
          modificationTimestamp: Date.now(),
          isDirty: false,
          renderCache: null,
          navigationHistory: [],
          currentHistoryIndex: -1,
          forwardHistory: [],
          createdAt: Date.now(),
          folderId: null, // No folder for directly opened files
          isDirectFile: true, // T063g - Mark as direct file
        };

        // Add tab to store
        addTab(newTab);
        // Activate the newly created tab
        setActiveTab(tabId);
      }

      // Notify parent
      onFileOpened?.(filePath, content);

      // Start watching the parent directory for file changes
      console.log('[FileOpener] Starting file watcher setup for:', filePath);
      try {
        // Extract parent directory from file path
        const pathParts = filePath.split(/[\\/]/);
        console.log('[FileOpener] Path parts:', pathParts);
        pathParts.pop(); // Remove filename
        const parentDir = pathParts.join(/\\/.test(filePath) ? '\\' : '/');
        console.log('[FileOpener] Parent directory:', parentDir);

        if (parentDir) {
          console.log('[FileOpener] Calling watchFolder with config:', {
            folderPath: parentDir,
            filePatterns: ['**/*.md', '**/*.markdown'],
            ignorePatterns: ['**/node_modules/**', '**/.git/**'],
            debounceMs: 300,
          });

          const watchResult = await window.electronAPI?.file?.watchFolder({
            folderPath: parentDir,
            filePatterns: ['*.md', '*.markdown', '**/*.md', '**/*.markdown'],
            ignorePatterns: ['**/node_modules/**', '**/.git/**'],
            debounceMs: 300,
          });

          console.log('[FileOpener] Watch result:', watchResult);
          console.log(`[FileOpener] Started watching parent directory: ${parentDir}`);
        } else {
          console.warn('[FileOpener] Parent directory is empty, not starting watcher');
        }
      } catch (watchErr) {
        console.error('[FileOpener] Failed to start file watcher:', watchErr);
        // Don't fail the file opening if watcher fails
      }

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
