/**
 * Folder Switcher Component
 * Tasks: T111-T113
 *
 * Dropdown to switch between open folders with:
 * - List of all open folders
 * - Active folder highlighting
 * - Folder close buttons
 */

import React, { useState, useRef, useEffect } from 'react';
import { useFoldersStore } from '../../stores/folders';
import { useTabsStore } from '../../stores/tabs';
import type { Folder } from '@shared/types/entities.d.ts';
import './FolderSwitcher.css';

export interface FolderSwitcherProps {
  /** Callback when folder is switched */
  onFolderChange?: (folderId: string) => void;
  /** Callback when folder is closed */
  onFolderClose?: (folderId: string) => void;
  /** Callback when folder is opened */
  onFolderOpened?: (folderPath: string) => void;
}

/**
 * T111: Folder switcher component with dropdown
 */
export const FolderSwitcher: React.FC<FolderSwitcherProps> = ({
  onFolderChange,
  onFolderClose,
  onFolderOpened,
}) => {
  const folders = useFoldersStore((state) => state.folders);
  const activeFolderId = useFoldersStore((state) => state.activeFolderId);
  const setActiveFolder = useFoldersStore((state) => state.setActiveFolder);
  const removeFolder = useFoldersStore((state) => state.removeFolder);
  const addFolder = useFoldersStore((state) => state.addFolder);

  // T063h: Get active tab to check if it's a direct file
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const tabs = useTabsStore((state) => state.getAllTabs());
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeFolder = folders.find((f) => f.id === activeFolderId);

  // T063h: Determine if showing direct file indicator
  const isDirectFile = activeTab?.isDirectFile === true;

  // Update active folder when active tab changes
  useEffect(() => {
    if (activeTab && activeTab.folderId && !activeTab.isDirectFile) {
      // If the active tab belongs to a folder, make that folder active
      if (activeFolderId !== activeTab.folderId) {
        setActiveFolder(activeTab.folderId);
      }
    }
  }, [activeTab, activeFolderId, setActiveFolder]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // T113: Switch active folder on selection and activate first tab from that folder
  const handleFolderSelect = (folderId: string) => {
    setActiveFolder(folderId);
    setIsOpen(false);
    onFolderChange?.(folderId);

    // Activate the first tab from this folder
    const folderTabs = tabs.filter(t => t.folderId === folderId && !t.isDirectFile);
    if (folderTabs.length > 0) {
      const { setActiveTab } = useTabsStore.getState();
      setActiveTab(folderTabs[0].id);
    }
  };

  // Handle selecting "Direct File" pseudo-folder
  const handleDirectFileSelect = () => {
    setIsOpen(false);

    // Activate the first direct file tab
    const directFileTabs = tabs.filter(t => t.isDirectFile);
    if (directFileTabs.length > 0) {
      const { setActiveTab } = useTabsStore.getState();
      setActiveTab(directFileTabs[0].id);
    }
  };

  // Handle folder close
  const handleFolderClose = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    removeFolder(folderId);
    onFolderClose?.(folderId);
  };

  // T098: Handle opening a new folder
  const handleOpenFolder = async () => {
    setIsOpen(false);

    try {
      const result = await window.electronAPI?.file?.openFolderDialog({});

      if (!result?.success || !result.folderPath) {
        // User cancelled or error occurred
        return;
      }

      const folderPath = result.folderPath;
      const folderName = folderPath.split(/[\\/]/).pop() || 'Untitled';

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

      addFolder(newFolder);

      // T108: Start watching the folder for file changes
      try {
        const watchResult = await window.electronAPI?.file?.watchFolder({
          folderPath,
          filePatterns: ['**/*.md', '**/*.markdown'],
          ignorePatterns: ['**/node_modules/**', '**/.git/**'],
          debounceMs: 300,
        });

        if (watchResult?.success && watchResult.watcherId) {
          console.log(`Started watching folder: ${folderPath} (ID: ${watchResult.watcherId})`);
        }
      } catch (err) {
        console.error('Failed to start watching folder:', err);
      }

      // Notify parent to handle tab creation
      onFolderOpened?.(folderPath);
    } catch (err) {
      console.error('Error opening folder:', err);
    }
  };

  if (folders.length === 0) {
    return (
      <div className="folder-switcher folder-switcher--empty">
        <span className="folder-switcher__label">No folders open</span>
      </div>
    );
  }

  return (
    <div className="folder-switcher" ref={dropdownRef} data-testid="folder-switcher">
      {/* T112: Display active folder */}
      <button
        className="folder-switcher__button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-haspopup="true"
        type="button"
      >
        {/* T063h: Show different icon and text for direct files */}
        <span className="folder-switcher__icon">
          {isDirectFile ? '📄' : '📁'}
        </span>
        <span className="folder-switcher__name">
          {isDirectFile ? 'Direct File' : (activeFolder?.displayName || 'Select folder')}
        </span>
        <span className="folder-switcher__chevron">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown list */}
      {isOpen && (
        <div className="folder-switcher__dropdown" data-testid="folder-switcher-dropdown">
          {/* Direct File option - show when there are direct file tabs */}
          {(() => {
            const directFileTabs = tabs.filter(t => t.isDirectFile);
            if (directFileTabs.length > 0) {
              return (
                <div
                  className={`folder-switcher__item ${isDirectFile ? 'folder-switcher__item--active' : ''}`}
                  onClick={handleDirectFileSelect}
                  data-testid="folder-item-direct-file"
                >
                  <span className="folder-switcher__item-icon">📄</span>
                  <div className="folder-switcher__item-info">
                    <span className="folder-switcher__item-name">
                      Direct File
                    </span>
                    <span className="folder-switcher__item-path" title="Files opened directly">
                      {directFileTabs.length} file{directFileTabs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Separator between direct files and folders if both exist */}
          {tabs.filter(t => t.isDirectFile).length > 0 && folders.length > 0 && (
            <div className="folder-switcher__divider" />
          )}

          {/* Regular folders */}
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`folder-switcher__item ${folder.id === activeFolderId ? 'folder-switcher__item--active' : ''}`}
              onClick={() => handleFolderSelect(folder.id)}
              data-testid={`folder-item-${folder.id}`}
            >
              <span className="folder-switcher__item-icon">📁</span>
              <div className="folder-switcher__item-info">
                <span className="folder-switcher__item-name">
                  {folder.displayName}
                </span>
                <span className="folder-switcher__item-path" title={folder.path}>
                  {folder.path}
                </span>
              </div>
              <button
                className="folder-switcher__close"
                onClick={(e) => handleFolderClose(e, folder.id)}
                title="Close folder"
                aria-label={`Close ${folder.displayName}`}
              >
                ×
              </button>
            </div>
          ))}

          {/* Add folder button */}
          <div className="folder-switcher__divider" />
          <button
            className="folder-switcher__add"
            onClick={handleOpenFolder}
          >
            <span className="folder-switcher__add-icon">+</span>
            <span>Open Folder...</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default FolderSwitcher;
