/**
 * AppLayout Component
 * Tasks: T016, T039
 *
 * Base layout with sidebar/content/toolbar structure
 * Integrates MarkdownViewer with tabs store
 */

import React, { useState, useEffect } from 'react';
import { useTabsStore } from '../stores/tabs';
import { MarkdownViewer } from './markdown/MarkdownViewer';
import { FileOpener } from './FileOpener';
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
          </div>
          <div className="sidebar-content">
            {/* File tree will go here (Phase 7) */}
            <p className="sidebar-placeholder">
              File tree (Phase 7)
            </p>

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
          <button onClick={toggleSidebar}>
            Toggle Sidebar
          </button>
        </div>

        <div className="editor-area">
          {!currentFile ? (
            <div className="welcome">
              <h1>Welcome to MarkRead</h1>
              <p>Open a markdown file to get started</p>
              <FileOpener onFileOpened={handleFileOpened} />
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
