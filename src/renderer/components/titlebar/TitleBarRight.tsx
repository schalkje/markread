/**
 * TitleBarRight Component
 * Task: T159c, T159j
 *
 * Right section of title bar:
 * - Theme toggle button
 * - Search button
 * - Download button (PDF export)
 * - Window controls (minimize, maximize/restore, close)
 */

import React, { useState, useEffect } from 'react';
import { useThemeStore } from '../../stores/theme';
import './TitleBar.css';

export const TitleBarRight: React.FC = () => {
  const { currentTheme, availableThemes, setTheme } = useThemeStore();
  const [isMaximized, setIsMaximized] = useState(false);

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
    const newTheme = availableThemes.find((t) => t.type === (isDark ? 'light' : 'dark'));
    if (newTheme) {
      setTheme(newTheme.id);
    }
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

      {/* Search button */}
      <button
        className="title-bar__button title-bar__icon-button"
        onClick={handleSearchClick}
        title="Find in Page (Ctrl+F)"
        type="button"
      >
        🔍
      </button>

      {/* Download button */}
      <button
        className="title-bar__button title-bar__icon-button"
        onClick={handleDownloadClick}
        title="Export to PDF"
        type="button"
      >
        ⬇️
      </button>

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
