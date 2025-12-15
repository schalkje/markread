/**
 * AppLayout Component
 * Tasks: T016, T039
 *
 * Base layout with sidebar/content/toolbar structure
 * Integrates MarkdownViewer with tabs store
 */

import React, { useState, useEffect } from 'react';
import { useTabsStore } from '../stores/tabs';
import { useFoldersStore } from '../stores/folders';
import { MarkdownViewer } from './markdown/MarkdownViewer';
import { FileOpener } from './FileOpener';
import { FolderOpener } from './FolderOpener';
import { FileTree } from './sidebar/FileTree';
import { FolderSwitcher } from './sidebar/FolderSwitcher';
import './AppLayout.css';

// T016: Base layout component with sidebar/content/toolbar structure
// T039: Integrated with Zustand tabs store
const AppLayout: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { tabs } = useTabsStore();
  const { folders, activeFolderId } = useFoldersStore();

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  /**
   * T039: Handle file opened from FileOpener component
   * Updates current file state and loads content
   */
  const handleFileOpened = async (filePath: string, content: string) => {
    setCurrentFile(filePath);
    setCurrentContent(content);
    setError(null);
  };

  /**
   * T098: Handle folder opened from FolderOpener component
   */
  const handleFolderOpened = async (folderPath: string) => {
    console.log('Folder opened:', folderPath);
    // Folder is added to store by FolderOpener component
    // Future: Load file tree for the folder
  };

  /**
   * Load file content when currentFile changes
   * This handles cases where file is selected from tabs
   */
  useEffect(() => {
    if (!currentFile) {
      setCurrentContent('');
      return;
    }

    const loadFile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await window.electronAPI?.file?.read({ filePath: currentFile });

        if (result?.success && result.content) {
          setCurrentContent(result.content);
        } else {
          setError(result?.error || 'Failed to load file');
        }
      } catch (err) {
        console.error('Error loading file:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [currentFile]);

  return (
    <div className="app-layout">
      {showSidebar && (
        <div className="sidebar">
          <div className="sidebar-header">
            <h2>MarkRead</h2>
            {/* T111-T113: Folder Switcher */}
            {folders.length > 0 && <FolderSwitcher />}
          </div>
          <div className="sidebar-content">
            {/* T101-T105: File Tree */}
            {activeFolderId ? (
              <FileTree
                folderId={activeFolderId}
                onFileSelect={(filePath) => setCurrentFile(filePath)}
                onFileOpen={async (filePath) => {
                  // Load and open the file
                  try {
                    const result = await window.electronAPI?.file?.read({ filePath });
                    if (result?.success && result.content) {
                      await handleFileOpened(filePath, result.content);
                    }
                  } catch (err) {
                    console.error('Error opening file:', err);
                  }
                }}
              />
            ) : (
              <div className="sidebar-placeholder">
                <p>No folder open</p>
                <p className="sidebar-hint">Open a folder to see files</p>
              </div>
            )}

            {/* Show open tabs */}
            {tabs.size > 0 && (
              <div className="sidebar-tabs">
                <h3>
                  Open Files ({tabs.size})
                </h3>
                {Array.from(tabs.values()).map((tab) => (
                  <div
                    key={tab.id}
                    className={`sidebar-tab ${currentFile === tab.filePath ? 'sidebar-tab--active' : ''}`}
                    onClick={() => setCurrentFile(tab.filePath)}
                  >
                    {tab.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="main-content">
        <div className="toolbar">
          <FileOpener onFileOpened={handleFileOpened} />
          <FolderOpener onFolderOpened={handleFolderOpened} />
          <button onClick={toggleSidebar}>
            Toggle Sidebar
          </button>
        </div>

        <div className="editor-area">
          {!currentFile ? (
            <div className="welcome">
              <h1>Welcome to MarkRead</h1>
              <p>Open a markdown file or folder to get started</p>
              <div className="welcome-buttons">
                <FileOpener onFileOpened={handleFileOpened} />
                <FolderOpener onFolderOpened={handleFolderOpened} />
              </div>
            </div>
          ) : (
            <MarkdownViewer
              content={currentContent}
              filePath={currentFile}
              isLoading={isLoading}
              error={error}
              onRenderComplete={() => console.log('Markdown rendered successfully')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
