/**
 * Folder Switcher Component
 * Tasks: T111-T113
 *
 * Dropdown to switch between open folders with:
 * - List of all open folders
 * - Repository grouping with branch hierarchy
 * - Active folder highlighting
 * - Folder close buttons
 * - Inline branch picker
 */

import React, { useState, useRef, useEffect } from 'react';
import { useFoldersStore } from '../../stores/folders';
import { useTabsStore } from '../../stores/tabs';
import { useGitStore } from '../../stores/git-store';
import type { Folder } from '@shared/types/entities.d.ts';
import { groupFoldersByRepository, getRepositoryId } from '@shared/utils/repository-utils';
import './FolderSwitcher.css';

export interface FolderSwitcherProps {
  /** Callback when folder is switched */
  onFolderChange?: (folderId: string) => void;
  /** Callback when folder is closed */
  onFolderClose?: (folderId: string) => void;
}

/**
 * T111: Folder switcher component with dropdown
 */
export const FolderSwitcher: React.FC<FolderSwitcherProps> = ({
  onFolderChange,
  onFolderClose,
}) => {
  const folders = useFoldersStore((state) => state.folders);
  const activeFolderId = useFoldersStore((state) => state.activeFolderId);
  const setActiveFolder = useFoldersStore((state) => state.setActiveFolder);
  const removeFolder = useFoldersStore((state) => state.removeFolder);
  const addFolder = useFoldersStore((state) => state.addFolder);
  const openRepositoryBranch = useFoldersStore((state) => state.openRepositoryBranch);

  // T063h: Get active tab to check if it's a direct file
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const tabs = useTabsStore((state) => state.getAllTabs());
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const [isOpen, setIsOpen] = useState(false);
  const [collapsedRepos, setCollapsedRepos] = useState<Set<string>>(new Set());
  const [branchPickerOpen, setBranchPickerOpen] = useState<string | null>(null);
  const [branchSearchQuery, setBranchSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeFolder = folders.find((f) => f.id === activeFolderId);

  // T063h: Determine if showing direct file indicator
  const isDirectFile = activeTab?.isDirectFile === true;

  // Group folders by repository
  const repoGroups = groupFoldersByRepository(folders);
  const localFolders = folders.filter((f) => f.type === 'local');

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
        setBranchPickerOpen(null);
        setBranchSearchQuery('');
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
    setBranchPickerOpen(null);
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

  // Toggle repository group collapsed state
  const toggleRepoCollapse = (e: React.MouseEvent, repoId: string) => {
    e.stopPropagation();
    setCollapsedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  };

  // Open branch picker for a repository
  const handleOpenBranchPicker = (e: React.MouseEvent, repoId: string) => {
    e.stopPropagation();
    setBranchPickerOpen(repoId === branchPickerOpen ? null : repoId);
    setBranchSearchQuery('');
  };

  // Handle branch selection from picker
  const handleBranchSelect = async (repoId: string, branchName: string) => {
    setBranchPickerOpen(null);
    setBranchSearchQuery('');
    setIsOpen(false);

    const result = await openRepositoryBranch(repoId, branchName);
    if (result) {
      onFolderChange?.(result.id);
    }
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
        type: 'local',
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
            id: crypto.randomUUID(),
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
        {/* Show different icon for direct files, repositories, and local folders */}
        <span className="folder-switcher__icon">
          {isDirectFile ? '📄' : (activeFolder?.type === 'repository' ? '🌐' : '📁')}
        </span>
        <span className="folder-switcher__name">
          {isDirectFile
            ? 'Direct File'
            : activeFolder?.type === 'repository'
              ? `${activeFolder.displayName} (${activeFolder.currentBranch})`
              : (activeFolder?.displayName || 'Select folder')
          }
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

          {/* Local folders (non-repository) */}
          {localFolders.map((folder) => (
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

          {/* Repository groups */}
          {Array.from(repoGroups.entries()).map(([repoId, repoFolders]) => {
            const isCollapsed = collapsedRepos.has(repoId);
            const firstFolder = repoFolders[0];
            const hasMultipleBranches = repoFolders.length > 1;
            const metadata = firstFolder.repositoryMetadata;
            const isPickerOpen = branchPickerOpen === repoId;

            // Filter available branches
            const openBranchNames = new Set(repoFolders.map((f) => f.currentBranch));
            const availableBranches = metadata?.branches?.filter(
              (b) => !openBranchNames.has(b.name)
            ) || [];
            const filteredBranches = availableBranches.filter((b) =>
              b.name.toLowerCase().includes(branchSearchQuery.toLowerCase())
            );

            return (
              <div key={repoId} className="folder-switcher__repo-group">
                {/* Repository header (only if multiple branches) */}
                {hasMultipleBranches && (
                  <div
                    className="folder-switcher__repo-header"
                    onClick={(e) => toggleRepoCollapse(e, repoId)}
                  >
                    <span className="folder-switcher__repo-chevron">
                      {isCollapsed ? '▶' : '▼'}
                    </span>
                    <span className="folder-switcher__item-icon">🌐</span>
                    <span className="folder-switcher__repo-name">
                      {firstFolder.displayName}
                    </span>
                    <span className="folder-switcher__repo-count">
                      ({repoFolders.length} branch{repoFolders.length !== 1 ? 'es' : ''})
                    </span>
                  </div>
                )}

                {/* Branches */}
                {(!hasMultipleBranches || !isCollapsed) && (
                  <div className="folder-switcher__repo-branches">
                    {repoFolders.map((folder) => (
                      <div
                        key={folder.id}
                        className={`folder-switcher__item folder-switcher__branch-item ${
                          folder.id === activeFolderId ? 'folder-switcher__item--active' : ''
                        } ${hasMultipleBranches ? 'folder-switcher__branch-item--nested' : ''}`}
                        onClick={() => handleFolderSelect(folder.id)}
                        data-testid={`folder-item-${folder.id}`}
                      >
                        {!hasMultipleBranches && (
                          <span className="folder-switcher__item-icon">🌐</span>
                        )}
                        <span className="folder-switcher__branch-icon">🌿</span>
                        <div className="folder-switcher__item-info">
                          <span className="folder-switcher__item-name">
                            {hasMultipleBranches ? folder.currentBranch : folder.displayName}
                            {folder.currentBranch === folder.defaultBranch && (
                              <span className="folder-switcher__default-badge"> (default)</span>
                            )}
                            {!hasMultipleBranches && (
                              <span className="folder-switcher__branch"> ({folder.currentBranch})</span>
                            )}
                          </span>
                          {!hasMultipleBranches && (
                            <span className="folder-switcher__item-path" title={folder.path}>
                              {folder.path}
                            </span>
                          )}
                        </div>
                        {folder.id === activeFolderId && (
                          <span className="folder-switcher__active-indicator">✓</span>
                        )}
                        <button
                          type="button"
                          className="folder-switcher__close"
                          onClick={(e) => handleFolderClose(e, folder.id)}
                          title="Close branch"
                          aria-label={`Close ${folder.currentBranch}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    {/* Open another branch button/picker */}
                    {!isCollapsed && (
                      <div className="folder-switcher__branch-picker">
                        {!isPickerOpen ? (
                          <button
                            type="button"
                            className="folder-switcher__add-branch"
                            onClick={(e) => handleOpenBranchPicker(e, repoId)}
                          >
                            <span className="folder-switcher__add-icon">+</span>
                            <span>Open another branch...</span>
                          </button>
                        ) : (
                          <div className="folder-switcher__branch-picker-dropdown">
                            <input
                              type="text"
                              className="folder-switcher__branch-search"
                              placeholder="🔍 Search branches..."
                              value={branchSearchQuery}
                              onChange={(e) => setBranchSearchQuery(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                            <div className="folder-switcher__branch-list">
                              {filteredBranches.length === 0 ? (
                                <div className="folder-switcher__branch-empty">
                                  {availableBranches.length === 0
                                    ? 'All branches are already open'
                                    : 'No matching branches'}
                                </div>
                              ) : (
                                filteredBranches.slice(0, 10).map((branch) => (
                                  <div
                                    key={branch.name}
                                    className="folder-switcher__branch-option"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBranchSelect(repoId, branch.name);
                                    }}
                                  >
                                    <span className="folder-switcher__branch-name">
                                      {branch.name}
                                      {branch.isDefault && (
                                        <span className="folder-switcher__default-badge"> ⭐</span>
                                      )}
                                    </span>
                                    <span className="folder-switcher__branch-sha">
                                      {branch.sha.substring(0, 7)}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                            <button
                              type="button"
                              className="folder-switcher__branch-cancel"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBranchPickerOpen(null);
                                setBranchSearchQuery('');
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add folder/repository buttons */}
          <div className="folder-switcher__divider" />
          <button
            className="folder-switcher__add"
            onClick={handleOpenFolder}
          >
            <span className="folder-switcher__add-icon">📂</span>
            <span>Open Folder...</span>
          </button>
          <button
            className="folder-switcher__add"
            onClick={() => {
              setIsOpen(false);
              window.dispatchEvent(new CustomEvent('menu:connect-repository'));
            }}
          >
            <span className="folder-switcher__add-icon">🔗</span>
            <span>Connect to Repository...</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default FolderSwitcher;
