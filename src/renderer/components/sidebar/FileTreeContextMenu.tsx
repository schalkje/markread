/**
 * File Tree Context Menu Component
 * Tasks: T163g, T163h, T163k, T163l
 *
 * Displays context menu for file tree items with:
 * - File context menu: Open, Open in New Tab, Open in New Window
 * - Folder context menu: Open as New Folder, Open in New Window
 */

import React, { useEffect, useRef } from 'react';
import './FileTreeContextMenu.css';

export interface FileTreeContextMenuProps {
  /** Type of item (file or folder) */
  type: 'file' | 'folder';
  /** Path to the file or folder */
  path: string;
  /** X position for menu */
  x: number;
  /** Y position for menu */
  y: number;
  /** Callback when open (in current tab) is clicked */
  onOpen?: (path: string) => void;
  /** Callback when open in new tab is clicked */
  onOpenInNewTab?: (path: string) => void;
  /** Callback when open in new window is clicked */
  onOpenInNewWindow?: (path: string) => void;
  /** Callback when open as new folder is clicked */
  onOpenAsNewFolder?: (path: string) => void;
  /** Callback when menu should be hidden */
  onHide: () => void;
}

/**
 * T163g, T163h, T163k, T163l: File tree context menu
 */
export const FileTreeContextMenu: React.FC<FileTreeContextMenuProps> = ({
  type,
  path,
  x,
  y,
  onOpen,
  onOpenInNewTab,
  onOpenInNewWindow,
  onOpenAsNewFolder,
  onHide,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onHide();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onHide();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onHide]);

  const handleOpen = () => {
    onOpen?.(path);
    onHide();
  };

  const handleOpenInNewTab = () => {
    onOpenInNewTab?.(path);
    onHide();
  };

  const handleOpenInNewWindow = () => {
    onOpenInNewWindow?.(path);
    onHide();
  };

  const handleOpenAsNewFolder = () => {
    onOpenAsNewFolder?.(path);
    onHide();
  };

  return (
    <div
      ref={menuRef}
      className="file-tree-context-menu"
      style={{ left: `${x}px`, top: `${y}px` }}
      data-testid="file-tree-context-menu"
    >
      {type === 'file' && (
        <>
          {/* T163h: File context menu options */}
          <button
            className="file-tree-context-menu__item"
            onClick={handleOpen}
            data-testid="file-context-menu-open"
          >
            <span className="file-tree-context-menu__icon">📄</span>
            <span className="file-tree-context-menu__label">Open</span>
            <span className="file-tree-context-menu__shortcut">Enter</span>
          </button>

          <button
            className="file-tree-context-menu__item"
            onClick={handleOpenInNewTab}
            data-testid="file-context-menu-open-new-tab"
          >
            <span className="file-tree-context-menu__icon">📑</span>
            <span className="file-tree-context-menu__label">Open in New Tab</span>
            <span className="file-tree-context-menu__shortcut">Ctrl+Enter</span>
          </button>

          <button
            className="file-tree-context-menu__item"
            onClick={handleOpenInNewWindow}
            data-testid="file-context-menu-open-new-window"
          >
            <span className="file-tree-context-menu__icon">🗔</span>
            <span className="file-tree-context-menu__label">Open in New Window</span>
          </button>
        </>
      )}

      {type === 'folder' && (
        <>
          {/* T163l: Folder context menu options */}
          <button
            className="file-tree-context-menu__item"
            onClick={handleOpenAsNewFolder}
            data-testid="folder-context-menu-open-as-new-folder"
          >
            <span className="file-tree-context-menu__icon">📁</span>
            <span className="file-tree-context-menu__label">Open as New Folder</span>
          </button>

          <button
            className="file-tree-context-menu__item"
            onClick={handleOpenInNewWindow}
            data-testid="folder-context-menu-open-new-window"
          >
            <span className="file-tree-context-menu__icon">🗔</span>
            <span className="file-tree-context-menu__label">Open in New Window</span>
          </button>
        </>
      )}
    </div>
  );
};

export default FileTreeContextMenu;
