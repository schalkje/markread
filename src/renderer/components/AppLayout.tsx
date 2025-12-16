/**
 * AppLayout Component
 * Tasks: T016, T039
 *
 * Base layout with sidebar/content/toolbar structure
 * Integrates MarkdownViewer with tabs store
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTabsStore } from '../stores/tabs';
import { useFoldersStore } from '../stores/folders';
import { MarkdownViewer } from './markdown/MarkdownViewer';
import { FileOpener } from './FileOpener';
import { FolderOpener } from './FolderOpener';
import { FileTree } from './sidebar/FileTree';
import { FolderSwitcher } from './sidebar/FolderSwitcher';
import { TabBar } from './editor/TabBar';
import { Toast } from './common/Toast';
import { TitleBar } from './titlebar/TitleBar';
import { useFileAutoReload, useFileWatcher } from '../hooks/useFileWatcher';
import { registerHistoryShortcuts, unregisterHistoryShortcuts } from '../services/keyboard-handler';
import type { Folder } from '@shared/types/entities.d.ts';
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
  const [fileTreeKey, setFileTreeKey] = useState(0); // Key to force FileTree re-render

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'warning' | 'error' | 'success' } | null>(null);

  // Ref to track if content was manually set (to avoid double-loading)
  const contentLoadedManually = useRef(false);

  const toggleSidebar = useCallback(() => {
    setShowSidebar(!showSidebar);
  }, [showSidebar]);

  // Listen for toggle-sidebar events from TitleBar
  useEffect(() => {
    const handleToggleSidebar = () => {
      setShowSidebar((prev) => !prev);
    };

    window.addEventListener('toggle-sidebar', handleToggleSidebar);
    return () => {
      window.removeEventListener('toggle-sidebar', handleToggleSidebar);
    };
  }, []);

  // Memoize callback to prevent unnecessary re-renders
  const handleRenderComplete = useCallback(() => {
    console.log('Markdown rendered successfully');
  }, []);

  // Menu command handlers
  useEffect(() => {
    // Handler for Open File menu command
    const handleMenuOpenFile = () => {
      // Trigger file opener by clicking the button
      const fileOpenerButton = document.querySelector('.file-opener__button') as HTMLButtonElement;
      if (fileOpenerButton) {
        fileOpenerButton.click();
      }
    };

    // Handler for Open Folder menu command
    const handleMenuOpenFolder = () => {
      // Trigger folder opener by clicking the button
      const folderOpenerButton = document.querySelector('.folder-opener__button') as HTMLButtonElement;
      if (folderOpenerButton) {
        folderOpenerButton.click();
      }
    };

    // Handler for Close Current menu command
    const handleMenuCloseCurrent = () => {
      const { activeTabId, removeTab, tabs } = useTabsStore.getState();
      if (activeTabId) {
        removeTab(activeTabId);

        // Switch to another tab if available
        if (tabs.size > 0) {
          const remainingTabs = Array.from(tabs.values());
          if (remainingTabs.length > 0) {
            setCurrentFile(remainingTabs[0].filePath);
          }
        } else {
          setCurrentFile(null);
          setCurrentContent('');
        }
      }
    };

    // Handler for Close Folder menu command
    const handleMenuCloseFolder = () => {
      const { removeFolder } = useFoldersStore.getState();
      const { tabs, removeTab } = useTabsStore.getState();

      if (activeFolderId) {
        // Close all tabs from this folder
        const tabsToClose = Array.from(tabs.values()).filter(t => t.folderId === activeFolderId);
        tabsToClose.forEach(tab => removeTab(tab.id));

        // Remove the folder
        removeFolder(activeFolderId);

        // Clear current file if it was from this folder
        setCurrentFile(null);
        setCurrentContent('');
      }
    };

    // Handler for Close All menu command
    const handleMenuCloseAll = () => {
      const { tabs, removeTab } = useTabsStore.getState();
      const { folders, removeFolder } = useFoldersStore.getState();

      // Close all tabs
      Array.from(tabs.keys()).forEach(tabId => removeTab(tabId));

      // Remove all folders
      folders.forEach(folder => removeFolder(folder.id));

      // Clear current file
      setCurrentFile(null);
      setCurrentContent('');
    };

    // Register event listeners
    window.electronAPI?.on('menu:open-file', handleMenuOpenFile);
    window.electronAPI?.on('menu:open-folder', handleMenuOpenFolder);
    window.electronAPI?.on('menu:close-current', handleMenuCloseCurrent);
    window.electronAPI?.on('menu:close-folder', handleMenuCloseFolder);
    window.electronAPI?.on('menu:close-all', handleMenuCloseAll);

    // Cleanup (note: electron IPC doesn't have removeListener in this simple implementation)
    return () => {
      // No cleanup needed with current implementation
    };
  }, [activeFolderId]);

  // T110: Auto-reload current file when it changes on disk
  const handleFileReload = useCallback(async (filePath: string) => {
    try {
      const result = await window.electronAPI?.file?.read({ filePath });
      if (result?.success && result.content) {
        setCurrentContent(result.content);
        console.log('File auto-reloaded:', filePath);
      }
    } catch (err) {
      console.error('Error reloading file:', err);
      setError('File was modified but failed to reload');
    }
  }, []);

  useFileAutoReload(currentFile, handleFileReload);

  // T110: Handle file changes to refresh file tree
  useFileWatcher(
    (event) => {
      // Refresh file tree when files are added, changed, or removed
      console.log(`File tree update triggered by: ${event.eventType} ${event.filePath}`);
      setFileTreeKey((prev) => prev + 1); // Force FileTree to reload
    },
    (error) => {
      console.error('File watch error:', error);
    }
  );

  // T066: Register navigation history keyboard shortcuts (Alt+Left, Alt+Right)
  useEffect(() => {
    const handleNavigateBack = async () => {
      const { activeTabId, navigateBack } = useTabsStore.getState();
      if (activeTabId) {
        const entry = navigateBack(activeTabId);
        if (entry) {
          // Dispatch to handleNavigateToHistory for unified handling
          window.dispatchEvent(new CustomEvent('navigate-to-history', { detail: entry }));
        }
      }
    };

    const handleNavigateForward = async () => {
      const { activeTabId, navigateForward } = useTabsStore.getState();
      if (activeTabId) {
        const entry = navigateForward(activeTabId);
        if (entry) {
          // Dispatch to handleNavigateToHistory for unified handling
          window.dispatchEvent(new CustomEvent('navigate-to-history', { detail: entry }));
        }
      }
    };

    const handleNavigateToHistory = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const entry = customEvent.detail;
      if (entry && entry.filePath) {
        console.log('[handleNavigateToHistory] Navigating to:', entry.filePath);

        // Mark as manually loaded to prevent useEffect from loading again
        contentLoadedManually.current = true;

        // Navigate to the history entry
        setCurrentFile(entry.filePath);

        // Check if this is a virtual directory listing path
        const isDirectoryListing = entry.filePath.includes('[Directory Index]');

        if (isDirectoryListing) {
          // Re-generate directory listing
          const directoryPath = entry.filePath.replace(/[/\\]\[Directory Index\]$/, '');
          console.log('[handleNavigateToHistory] Re-generating directory listing for:', directoryPath);

          const listingResult = await window.electronAPI?.file?.getDirectoryListing({
            directoryPath: directoryPath,
          });

          if (listingResult?.success && listingResult.items) {
            // Generate markdown content for directory listing
            const dirName = directoryPath.split(/[/\\]/).pop() || 'Directory';
            let markdown = `# ${dirName}\n\n`;

            // Add directories
            const directories = listingResult.items.filter((item: any) => item.isDirectory);
            if (directories.length > 0) {
              markdown += '## Folders\n\n';
              directories.forEach((item: any) => {
                const label = item.title || item.name;
                markdown += `- [${label}/](${item.name}/)\n`;
              });
              markdown += '\n';
            }

            // Add files
            const files = listingResult.items.filter((item: any) => !item.isDirectory);
            if (files.length > 0) {
              markdown += '## Files\n\n';
              files.forEach((item: any) => {
                const label = item.title || item.name;
                markdown += `- [${label}](${item.name})\n`;
              });
            }

            setCurrentContent(markdown);
            console.log('[handleNavigateToHistory] Directory listing generated');

            // Update the active tab
            const { activeTabId, tabs } = useTabsStore.getState();
            if (activeTabId) {
              const activeTab = tabs.get(activeTabId);
              if (activeTab) {
                const updatedTab = {
                  ...activeTab,
                  filePath: entry.filePath,
                  title: `${dirName}\\`, // Add backslash to indicate directory
                  scrollPosition: entry.scrollPosition,
                };
                tabs.set(activeTabId, updatedTab);
                useTabsStore.setState({ tabs: new Map(tabs) });
              }
            }
          }
        } else {
          // Load regular file content
          const result = await window.electronAPI?.file?.read({ filePath: entry.filePath });
          if (result?.success && result.content) {
            setCurrentContent(result.content);
            console.log('[handleNavigateToHistory] Content loaded for:', entry.filePath);

            // Update the active tab to reflect the new file
            const { activeTabId, tabs } = useTabsStore.getState();
            if (activeTabId) {
              const activeTab = tabs.get(activeTabId);
              if (activeTab) {
                const fileName = entry.filePath.split(/[/\\]/).pop() || 'Untitled';
                const updatedTab = {
                  ...activeTab,
                  filePath: entry.filePath,
                  title: fileName,
                  scrollPosition: entry.scrollPosition,
                };
                tabs.set(activeTabId, updatedTab);
                useTabsStore.setState({ tabs: new Map(tabs) });
              }
            }
          }
        }
      }
    };

    const handleShowDirectoryListing = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { directoryPath, content, virtualPath } = customEvent.detail;

      console.log('[DirectoryListing] Showing directory:', directoryPath);

      // Mark as manually loaded
      contentLoadedManually.current = true;

      // Set the virtual file path and generated content
      setCurrentFile(virtualPath);
      setCurrentContent(content);

      // Add directory listing to navigation history
      const { activeTabId, tabs, addHistoryEntry } = useTabsStore.getState();
      if (activeTabId) {
        const currentTab = tabs.get(activeTabId);

        // Add the directory to history if navigating to a different location
        if (currentTab && currentTab.filePath && currentTab.filePath !== virtualPath) {
          console.log('[DirectoryListing] Adding history entry for directory:', virtualPath);
          addHistoryEntry(activeTabId, {
            filePath: virtualPath,
            scrollPosition: 0,
            timestamp: Date.now(),
          });
        }

        // Update the active tab to reflect the directory view
        // IMPORTANT: Get FRESH state after addHistoryEntry to avoid overwriting history!
        const { tabs: freshTabs } = useTabsStore.getState();
        const freshTab = freshTabs.get(activeTabId);
        if (freshTab) {
          const dirName = directoryPath.split(/[/\\]/).pop() || 'Directory';
          const newTitle = `${dirName}\\`;
          console.log('[DirectoryListing] Setting tab title:', { directoryPath, dirName, newTitle, virtualPath });
          const updatedTab = {
            ...freshTab, // Use fresh tab with updated history!
            filePath: virtualPath,
            title: newTitle, // Add backslash to indicate directory
          };
          freshTabs.set(activeTabId, updatedTab);
          useTabsStore.setState({ tabs: new Map(freshTabs) });
        }
      }
    };

    registerHistoryShortcuts({
      onNavigateBack: handleNavigateBack,
      onNavigateForward: handleNavigateForward,
    });

    // Listen for navigate-to-history events (for Home navigation)
    window.addEventListener('navigate-to-history', handleNavigateToHistory);
    // Listen for directory listing events
    window.addEventListener('show-directory-listing', handleShowDirectoryListing);

    return () => {
      unregisterHistoryShortcuts();
      window.removeEventListener('navigate-to-history', handleNavigateToHistory);
      window.removeEventListener('show-directory-listing', handleShowDirectoryListing);
    };
  }, []);

  /**
   * T039: Handle file opened from FileOpener component
   * Updates current file state and loads content
   * T063: Also creates a tab for the opened file
   */
  const handleFileOpened = async (filePath: string, content: string) => {
    setCurrentFile(filePath);
    setCurrentContent(content);
    setError(null);

    // T063: Create a tab for this file if it doesn't exist
    const { tabs, addTab } = useTabsStore.getState();
    const existingTab = Array.from(tabs.values()).find(t => t.filePath === filePath);

    if (!existingTab) {
      const fileName = filePath.split(/[/\\]/).pop() || 'Untitled';
      const newTab = {
        id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        filePath,
        title: fileName,
        scrollPosition: 0,
        zoomLevel: 100,
        searchState: null,
        modificationTimestamp: Date.now(),
        isDirty: false,
        renderCache: null,
        navigationHistory: [{
          filePath,
          scrollPosition: 0,
          timestamp: Date.now(),
        }],
        currentHistoryIndex: 0, // Start at position 0 (home)
        forwardHistory: [],
        createdAt: Date.now(),
        folderId: activeFolderId, // Connect to active folder if available
        isDirectFile: !activeFolderId, // Mark as direct file if no active folder
      };
      addTab(newTab);
    }
  };

  /**
   * Handle link clicks from markdown content (relative file links)
   * Updates the current tab to show the linked file
   */
  const handleLinkClick = async (filePath: string) => {
    try {
      const result = await window.electronAPI?.file?.read({ filePath });
      if (result?.success && result.content) {
        // Mark that content was manually loaded to prevent double-loading
        contentLoadedManually.current = true;

        // Clear loading and error states
        setIsLoading(false);
        setError(null);

        // T065: Add NEW location to navigation history
        const { activeTabId, tabs, addHistoryEntry } = useTabsStore.getState();

        if (activeTabId) {
          const currentTab = tabs.get(activeTabId);

          // Add the NEW file to history if navigating to a different file
          if (currentTab && currentTab.filePath && currentTab.filePath !== filePath) {
            console.log('[LinkClick] Adding history entry for new file:', filePath);
            addHistoryEntry(activeTabId, {
              filePath: filePath, // Add the NEW file, not the current one!
              scrollPosition: 0,  // New file starts at top
              timestamp: Date.now(),
            });
          } else {
            console.log('[LinkClick] Skipped history:', {
              hasTab: !!currentTab,
              currentFilePath: currentTab?.filePath,
              newFilePath: filePath,
              sameFile: currentTab?.filePath === filePath
            });
          }
        }

        // Update file and content atomically (React will batch these)
        setCurrentFile(filePath);
        setCurrentContent(result.content);

        // Update the active tab to reflect the new file
        // IMPORTANT: Get FRESH state after addHistoryEntry to avoid overwriting history!
        if (activeTabId) {
          const { tabs: freshTabs } = useTabsStore.getState(); // Get fresh state!
          const freshTab = freshTabs.get(activeTabId);
          if (freshTab) {
            const fileName = filePath.split(/[/\\]/).pop() || 'Untitled';
            const updatedTab = {
              ...freshTab, // Use fresh tab with updated history!
              filePath: filePath,
              title: fileName,
              modificationTimestamp: Date.now(),
            };
            freshTabs.set(activeTabId, updatedTab);
            useTabsStore.setState({ tabs: new Map(freshTabs) });
          }
        }
      } else {
        // Show toast notification for missing file instead of error screen
        const fileName = filePath.split(/[/\\]/).pop() || 'Unknown file';
        const errorMsg = result?.error || 'File not found';
        console.warn('Failed to open linked file:', errorMsg);
        setToast({
          message: `Cannot open "${fileName}": ${errorMsg}`,
          type: 'warning',
        });
      }
    } catch (err) {
      // Show toast notification for errors instead of error screen
      const fileName = filePath.split(/[/\\]/).pop() || 'Unknown file';
      console.error('Error opening linked file:', err);
      setToast({
        message: `Cannot open "${fileName}": ${err instanceof Error ? err.message : 'Unknown error'}`,
        type: 'error',
      });
    }
  };

  /**
   * T098: Handle folder opened from FolderOpener component
   * Auto-opens the first markdown file in the folder
   */
  const handleFolderOpened = async (folderPath: string) => {
    console.log('Folder opened:', folderPath);

    try {
      // Get the folder ID that was just added (FolderOpener already added it to the store)
      const { folders, activeFolderId: currentActiveFolderId } = useFoldersStore.getState();
      const addedFolder = folders.find(f => f.path === folderPath);
      const folderId = addedFolder?.id || currentActiveFolderId;

      // Get the folder tree to find the first markdown file
      const result = await window.electronAPI?.file?.getFolderTree({
        folderPath,
        includeHidden: false,
        maxDepth: undefined,
      });

      if (result?.success && result.tree) {
        // Find the first markdown file using breadth-first search
        // This checks root folder first, then first-level subfolders, etc.
        const findFirstMarkdownFile = (rootNode: any): string | null => {
          const queue = [rootNode];

          while (queue.length > 0) {
            const levelSize = queue.length;

            // Process all nodes at current level before going deeper
            for (let i = 0; i < levelSize; i++) {
              const node = queue.shift()!;

              // Check if this node is a markdown file
              if (node.type === 'file' && /\.(md|markdown)$/i.test(node.name)) {
                return node.path;
              }

              // Add children to queue for next level
              if (node.children) {
                queue.push(...node.children);
              }
            }
          }

          return null;
        };

        const firstFilePath = findFirstMarkdownFile(result.tree);

        if (firstFilePath) {
          // Read and open the first file
          const fileResult = await window.electronAPI?.file?.read({ filePath: firstFilePath });
          if (fileResult?.success && fileResult.content) {
            setCurrentFile(firstFilePath);
            setCurrentContent(fileResult.content);
            setError(null);

            // Create a tab for this file with the correct folder ID
            const { tabs, addTab } = useTabsStore.getState();
            const existingTab = Array.from(tabs.values()).find(t => t.filePath === firstFilePath);

            if (!existingTab) {
              const fileName = firstFilePath.split(/[/\\]/).pop() || 'Untitled';
              const newTab = {
                id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                filePath: firstFilePath,
                title: fileName,
                scrollPosition: 0,
                zoomLevel: 100,
                searchState: null,
                modificationTimestamp: Date.now(),
                isDirty: false,
                renderCache: null,
                navigationHistory: [{
                  filePath: firstFilePath,
                  scrollPosition: 0,
                  timestamp: Date.now(),
                }],
                currentHistoryIndex: 0, // Start at position 0 (home)
                forwardHistory: [],
                createdAt: Date.now(),
                folderId: folderId, // Use the folder ID we just got
                isDirectFile: false, // This is from a folder, not a direct file
              };
              addTab(newTab);
            }

            console.log('Auto-opened first file:', firstFilePath, 'with folderId:', folderId);
          }
        } else {
          console.log('No markdown files found in folder');
        }
      }
    } catch (err) {
      console.error('Error auto-opening first file:', err);
    }
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

    // Skip loading if content was manually set (e.g., from link click)
    if (contentLoadedManually.current) {
      contentLoadedManually.current = false;
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

  // Check if we should show UI elements
  const hasTabs = tabs.size > 0;
  const hasFolders = folders.length > 0;
  const hasContent = hasTabs || hasFolders;

  return (
    <div className="app-layout">
      {/* T159: Custom Title Bar */}
      <TitleBar />

      <div className="app-layout__content">
        {/* Only show sidebar if there are tabs or folders */}
        {showSidebar && hasContent && (
          <div className="sidebar">
            <div className="sidebar-header">
            {/* T111-T113: Folder Switcher */}
            {folders.length > 0 && <FolderSwitcher />}
          </div>
          <div className="sidebar-content">
            {/* T101-T105: File Tree */}
            {(() => {
              const activeTabId = useTabsStore.getState().activeTabId;
              const activeTab = tabs.size > 0 ? Array.from(tabs.values()).find(t => t.id === activeTabId) : null;
              const isDirectFile = activeTab?.isDirectFile === true;

              // Mode 1: Nothing open
              if (tabs.size === 0) {
                return (
                  <div className="sidebar-placeholder">
                    <p>No files or folders open</p>
                    <p className="sidebar-hint">Open a file or folder to get started</p>
                  </div>
                );
              }

              // Mode 2: Direct file mode
              if (isDirectFile) {
                const directFileTabs = Array.from(tabs.values()).filter(t => t.isDirectFile);
                const { setActiveTab } = useTabsStore.getState();

                const handleOpenFolderForFile = async () => {
                  if (!activeTab) return;

                  try {
                    const filePath = activeTab.filePath;
                    // Get the folder path from the file path
                    const folderPath = filePath.split(/[/\\]/).slice(0, -1).join(filePath.includes('\\') ? '\\' : '/');
                    const folderName = folderPath.split(/[\\/]/).pop() || 'Untitled';

                    // Check if this folder is already open
                    const { folders, addFolder, setActiveFolder } = useFoldersStore.getState();
                    const existingFolder = folders.find(f => f.path === folderPath);

                    let folderId: string;

                    if (existingFolder) {
                      // Folder already exists, just use it
                      folderId = existingFolder.id;
                      setActiveFolder(folderId);
                    } else {
                      // Create new folder
                      const fileName = filePath.split(/[\\/]/).pop() || 'Untitled';
                      const newFolder: Folder = {
                        id: `folder-${Date.now()}`,
                        path: folderPath,
                        displayName: folderName,
                        fileTreeState: {
                          expandedDirectories: new Set<string>(),
                          scrollPosition: 0,
                          selectedPath: filePath, // Select the current file
                        },
                        activeFolderId: null,
                        tabCollection: [],
                        activeTabId: null,
                        recentFiles: [{
                          id: `recent-${Date.now()}`,
                          path: filePath,
                          type: 'file',
                          displayName: fileName,
                          lastAccessedAt: Date.now(),
                          folderId: null,
                        }],
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
                      folderId = newFolder.id;

                      // Start watching the folder
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
                    }

                    // Convert all direct file tabs for files in this folder to folder-associated tabs
                    const tabsStore = useTabsStore.getState();
                    const tabsToConvert = Array.from(tabsStore.tabs.values()).filter(
                      t => t.isDirectFile && t.filePath.startsWith(folderPath)
                    );

                    // Update each tab to associate it with the folder
                    tabsStore.tabs.forEach((tab) => {
                      if (tab.isDirectFile && tab.filePath.startsWith(folderPath)) {
                        const updatedTab = {
                          ...tab,
                          folderId: folderId,
                          isDirectFile: false,
                        };
                        tabsStore.tabs.set(tab.id, updatedTab);
                      }
                    });

                    // Trigger a re-render by updating the store
                    useTabsStore.setState({ tabs: new Map(tabsStore.tabs) });

                    // Force FileTree to reload
                    setFileTreeKey((prev) => prev + 1);

                    console.log(`Opened folder for file: ${folderPath}, converted ${tabsToConvert.length} tab(s)`);
                  } catch (err) {
                    console.error('Error opening folder for file:', err);
                  }
                };

                return (
                  <div className="sidebar-direct-file-mode">
                    <div className="sidebar-direct-file-content">
                      <span className="sidebar-direct-file-icon">📄</span>
                      <h3 className="sidebar-direct-file-title">Direct File Mode</h3>
                      <p className="sidebar-direct-file-message">
                        This file was opened directly, not from a folder.
                      </p>

                      <button
                        className="sidebar-open-folder-button"
                        onClick={handleOpenFolderForFile}
                        type="button"
                      >
                        📁 Open Folder for This File
                      </button>

                      {/* List of open direct files */}
                      {directFileTabs.length > 0 && (
                        <div className="sidebar-open-files">
                          <h4 className="sidebar-open-files-title">Open Files ({directFileTabs.length})</h4>
                          <div className="sidebar-open-files-list">
                            {directFileTabs.map((tab) => (
                              <div
                                key={tab.id}
                                className={`sidebar-open-file-item ${tab.id === activeTabId ? 'sidebar-open-file-item--active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                                title={tab.filePath}
                              >
                                <span className="sidebar-open-file-icon">📄</span>
                                <span className="sidebar-open-file-name">{tab.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="sidebar-direct-file-hint">
                        Opening a folder will enable file navigation and folder features.
                      </p>
                    </div>
                  </div>
                );
              }

              // Mode 3: Folder mode
              if (activeFolderId) {
                return (
                  <FileTree
                    key={fileTreeKey}
                    folderId={activeFolderId}
                    onFileSelect={async (filePath) => {
                      try {
                        // Load file content first
                        const result = await window.electronAPI?.file?.read({ filePath });
                        if (result?.success && result.content) {
                          // Mark as manually loaded
                          contentLoadedManually.current = true;

                          // Clear loading and error states
                          setIsLoading(false);
                          setError(null);

                          // T065: Add NEW location to navigation history
                          const { activeTabId, tabs, addHistoryEntry } = useTabsStore.getState();

                          if (activeTabId) {
                            const currentTab = tabs.get(activeTabId);

                            // Add the NEW file to history if navigating to a different file
                            if (currentTab && currentTab.filePath && currentTab.filePath !== filePath) {
                              console.log('[FileTree] Adding history entry for new file:', filePath);
                              addHistoryEntry(activeTabId, {
                                filePath: filePath, // Add the NEW file, not the current one!
                                scrollPosition: 0,  // New file starts at top
                                timestamp: Date.now(),
                              });
                            } else {
                              console.log('[FileTree] Skipped history:', {
                                hasTab: !!currentTab,
                                currentFilePath: currentTab?.filePath,
                                newFilePath: filePath,
                                sameFile: currentTab?.filePath === filePath
                              });
                            }
                          }

                          // Update file and content atomically
                          setCurrentFile(filePath);
                          setCurrentContent(result.content);

                          // Update active tab to reflect the new file being viewed
                          // IMPORTANT: Get FRESH state after addHistoryEntry to avoid overwriting history!
                          if (activeTabId) {
                            const { tabs: freshTabs } = useTabsStore.getState(); // Get fresh state!
                            const freshTab = freshTabs.get(activeTabId);
                            if (freshTab) {
                              const fileName = filePath.split(/[/\\]/).pop() || 'Untitled';
                              const updatedTab = {
                                ...freshTab, // Use fresh tab with updated history!
                                filePath: filePath,
                                title: fileName,
                              };
                              freshTabs.set(activeTabId, updatedTab);
                              useTabsStore.setState({ tabs: new Map(freshTabs) });
                            }
                          }
                        } else {
                          setError('Failed to load file');
                        }
                      } catch (err) {
                        console.error('Error loading file from tree:', err);
                        setError('Failed to load file');
                        setIsLoading(false);
                      }
                    }}
                    onFileOpen={async (filePath) => {
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
                );
              }

              // Fallback
              return (
                <div className="sidebar-placeholder">
                  <p>No folder selected</p>
                  <p className="sidebar-hint">Open a folder to see files</p>
                </div>
              );
            })()}
          </div>
          </div>
        )}

        <div className="main-content">
        {/* T060, T063a-T063o: TabBar with enhanced features - only show if there are tabs */}
        {hasTabs && (
          <TabBar
            onTabClick={(tabId) => {
              const tab = useTabsStore.getState().getTab(tabId);
              if (tab) {
                setCurrentFile(tab.filePath);
              }
            }}
            onTabClose={(tabId) => {
              // If closing the active tab, switch to another tab
              const { activeTabId, tabs } = useTabsStore.getState();
              if (tabId === activeTabId && tabs.size > 1) {
                const remainingTabs = Array.from(tabs.values()).filter(t => t.id !== tabId);
                if (remainingTabs.length > 0) {
                  setCurrentFile(remainingTabs[0].filePath);
                }
              }
            }}
          />
        )}

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
              key={currentFile || 'no-file'}
              content={currentContent}
              filePath={currentFile}
              isLoading={isLoading}
              error={error}
              onRenderComplete={handleRenderComplete}
              onFileLink={handleLinkClick}
            />
          )}
        </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default AppLayout;
