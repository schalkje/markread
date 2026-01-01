/**
 * TitleBarRight Component
 * Task: T159c, T159j, T051k
 *
 * Right section of title bar:
 * - Theme toggle button
 * - Search button
 * - Content zoom controls (T051k)
 * - Download button (PDF export)
 * - Window controls (minimize, maximize/restore, close)
 */

import React, { useState, useEffect } from 'react';
import { useThemeStore } from '../../stores/theme';
import { themeManager } from '../../services/theme-manager';
import { useTabsStore } from '../../stores/tabs';
import './TitleBar.css';

export const TitleBarRight: React.FC = () => {
  const { currentTheme } = useThemeStore();
  const [isMaximized, setIsMaximized] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);

  // Get active tab ID and document zoom level
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const contentZoom = useTabsStore((state) => {
    const activeId = state.activeTabId;
    const tab = activeId ? state.tabs.get(activeId) : null;
    return tab?.zoomLevel || 100;
  });

  // Check maximized state on mount
  useEffect(() => {
    const checkMaximized = async () => {
      const result = await window.electronAPI?.window?.isMaximized();
      if (result?.success) {
        setIsMaximized(result.isMaximized);
      }
    };
    checkMaximized();
  }, []);

  // T159g: Theme toggle
  const handleThemeToggle = () => {
    // Toggle between light and dark themes
    const isDark = currentTheme?.type === 'dark';
    const newThemeId = isDark ? 'system-light' : 'system-dark';
    themeManager.switchTheme(newThemeId);
  };

  // T159h: Search button
  const handleSearchClick = () => {
    // Dispatch event to open search panel (Ctrl+F)
    window.dispatchEvent(new CustomEvent('menu:find'));
  };

  // T159i: Download button (PDF export)
  const handleDownloadClick = () => {
    // Dispatch event to trigger PDF export
    window.dispatchEvent(new CustomEvent('menu:export-pdf'));
  };

  // Document zoom handlers (content zoom)
  const handleZoomIn = () => {
    if (!activeTabId) return;
    const newZoom = Math.min(2000, contentZoom + 10);
    const { updateTabZoomLevel } = useTabsStore.getState();
    updateTabZoomLevel(activeTabId, newZoom);
  };

  const handleZoomOut = () => {
    if (!activeTabId) return;
    const newZoom = Math.max(10, contentZoom - 10);
    const { updateTabZoomLevel } = useTabsStore.getState();
    updateTabZoomLevel(activeTabId, newZoom);
  };

  const handleZoomPreset = (zoom: number) => {
    if (!activeTabId) return;
    const { updateTabZoomLevel } = useTabsStore.getState();
    updateTabZoomLevel(activeTabId, zoom);
    setShowZoomMenu(false);
  };

  const handleZoomReset = () => {
    if (!activeTabId) return;
    const { updateTabZoomLevel } = useTabsStore.getState();
    updateTabZoomLevel(activeTabId, 100);
    setShowZoomMenu(false);
  };

  // Close zoom menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showZoomMenu && !(e.target as Element).closest('.title-bar__zoom-controls')) {
        setShowZoomMenu(false);
      }
    };

    if (showZoomMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showZoomMenu]);

  // T159j: Window control handlers
  const handleMinimize = async () => {
    await window.electronAPI?.window?.minimize();
  };

  const handleMaximize = async () => {
    const result = await window.electronAPI?.window?.maximize();
    if (result?.success) {
      setIsMaximized(result.isMaximized);
    }
  };

  const handleClose = async () => {
    await window.electronAPI?.window?.close();
  };

  const isDarkTheme = currentTheme?.type === 'dark';

  return (
    <div className="title-bar__right">
      {/* Theme toggle */}
      <button
        className="title-bar__button title-bar__icon-button"
        onClick={handleThemeToggle}
        title={`Switch to ${isDarkTheme ? 'Light' : 'Dark'} Theme`}
        type="button"
      >
        {isDarkTheme ? '☀️' : '🌙'}
      </button>

      {/* Search button - only visible when there's an active document */}
      {activeTabId && (
        <button
          className="title-bar__button title-bar__icon-button"
          onClick={handleSearchClick}
          title="Find in Page (Ctrl+F)"
          type="button"
        >
          🔍
        </button>
      )}

      {/* Download button - only visible when there's an active document */}
      {activeTabId && (
        <button
          className="title-bar__button title-bar__icon-button"
          onClick={handleDownloadClick}
          title="Export to PDF"
          type="button"
        >
          ⬇️
        </button>
      )}

      {/* Document zoom controls */}
      {activeTabId && (
        <div className="title-bar__zoom-controls">
          <button
            className="title-bar__button title-bar__zoom-button"
            onClick={handleZoomOut}
            title="Document Zoom Out (Ctrl+-)"
            type="button"
            disabled={contentZoom <= 10}
          >
            ⊖
          </button>
          <button
            className="title-bar__button title-bar__zoom-display"
            onClick={() => setShowZoomMenu(!showZoomMenu)}
            title="Document Zoom Level - Click for presets"
            type="button"
          >
            {Math.round(contentZoom)}% ▾
          </button>
          <button
            className="title-bar__button title-bar__zoom-button"
            onClick={handleZoomIn}
            title="Document Zoom In (Ctrl+=)"
            type="button"
            disabled={contentZoom >= 2000}
          >
            ⊕
          </button>

          {/* Zoom preset menu - Document zoom levels (10-2000%) */}
          {showZoomMenu && (
            <div className="title-bar__zoom-menu">
              <div className="title-bar__zoom-menu-section">
                <button type="button" onClick={() => handleZoomPreset(10)}>10%</button>
                <button type="button" onClick={() => handleZoomPreset(25)}>25%</button>
                <button type="button" onClick={() => handleZoomPreset(50)}>50%</button>
                <button type="button" onClick={() => handleZoomPreset(75)}>75%</button>
                <button type="button" onClick={() => handleZoomPreset(100)}>100% (Default)</button>
                <button type="button" onClick={() => handleZoomPreset(125)}>125%</button>
                <button type="button" onClick={() => handleZoomPreset(150)}>150%</button>
                <button type="button" onClick={() => handleZoomPreset(200)}>200%</button>
                <button type="button" onClick={() => handleZoomPreset(400)}>400%</button>
                <button type="button" onClick={() => handleZoomPreset(800)}>800%</button>
              </div>
              <div className="title-bar__zoom-menu-divider"></div>
              <div className="title-bar__zoom-menu-section">
                <button type="button" onClick={handleZoomReset}>Reset to 100%</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Window controls */}
      <div className="title-bar__window-controls">
        <button
          className="title-bar__button title-bar__window-button"
          onClick={handleMinimize}
          title="Minimize"
          type="button"
        >
          ─
        </button>
        <button
          className="title-bar__button title-bar__window-button"
          onClick={handleMaximize}
          title={isMaximized ? 'Restore' : 'Maximize'}
          type="button"
        >
          {isMaximized ? '❐' : '□'}
        </button>
        <button
          className="title-bar__button title-bar__window-button title-bar__window-button--close"
          onClick={handleClose}
          title="Close"
          type="button"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
