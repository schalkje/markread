import React, { useState } from 'react';

// T016: Base layout component with sidebar/content/toolbar structure
const AppLayout: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const openFile = async () => {
    try {
      const result = await window.electronAPI.file.openFileDialog({});
      if (result.success && result.filePaths && result.filePaths.length > 0) {
        setCurrentFile(result.filePaths[0]);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  return (
    <div className="app-layout">
      {showSidebar && (
        <div className="sidebar">
          <div className="sidebar-header">
            <h2>MarkRead</h2>
          </div>
          <div className="sidebar-content">
            {/* File tree will go here (Phase 7) */}
            <p>File tree (Phase 7)</p>
          </div>
        </div>
      )}

      <div className="main-content">
        <div className="toolbar">
          <button onClick={openFile}>Open File</button>
          <button onClick={toggleSidebar}>Toggle Sidebar</button>
        </div>

        <div className="editor-area">
          {!currentFile ? (
            <div className="welcome">
              <h1>Welcome to MarkRead</h1>
              <p>Open a markdown file to get started</p>
              <button onClick={openFile} className="open-btn">
                Open File
              </button>
            </div>
          ) : (
            <div className="markdown-viewer">
              {/* Markdown viewer will go here (Phase 3 - US1) */}
              <p>File: {currentFile}</p>
              <p>Markdown viewer coming in Phase 3 (User Story 1)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
