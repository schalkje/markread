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
import { Home } from './Home';
import { FileTree } from './sidebar/FileTree';
import { HistoryPanel } from './sidebar/HistoryPanel';
import { FolderSwitcher } from './sidebar/FolderSwitcher';
import { TabBar } from './editor/TabBar';
import { Toast } from './common/Toast';
import { TitleBar } from './titlebar/TitleBar';
import { useFileAutoReload, useFileWatcher } from '../hooks/useFileWatcher';
import {
  registerHistoryShortcuts,
  unregisterHistoryShortcuts,
  registerTabShortcuts,
  unregisterTabShortcuts,
  registerContentZoomShortcuts,
  unregisterContentZoomShortcuts,
  registerGlobalZoomShortcuts,
  unregisterGlobalZoomShortcuts,
  registerFileShortcuts,
  unregisterFileShortcuts,
  registerHelpShortcuts,
  unregisterHelpShortcuts
} from '../services/keyboard-handler';
import { ShortcutsReference } from './help/ShortcutsReference';
import { About } from './help/About';
import {
  registerFileCommands,
  registerNavigationCommands,
  registerViewCommands,
  registerSearchCommands,
  registerApplicationCommands,
} from '../services/command-service';
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

  const { tabs, activeTabId } = useTabsStore();
  const activeTab = activeTabId ? tabs.get(activeTabId) : null;
  const { folders, activeFolderId } = useFoldersStore();
  const [fileTreeKey, setFileTreeKey] = useState(0); // Key to force FileTree re-render
  const [revealFilePath, setRevealFilePath] = useState<string | null>(null); // File to reveal in sidebar

  // Sidebar view state: 'files' or 'history'
  const [sidebarView, setSidebarView] = useState<'files' | 'history'>('files');

  // Home view state - tracks if home page is active
  const [showHome, setShowHome] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'warning' | 'error' | 'success' } | null>(null);

  // Shortcuts reference state
  const [showShortcuts, setShowShortcuts] = useState(false);

  // About dialog state
  const [showAbout, setShowAbout] = useState(false);

  // Ref to track if content was manually set (to avoid double-loading)
  const contentLoadedManually = useRef(false);

  // Ref to track which file is currently being loaded (prevents race conditions)
  const loadingFileRef = useRef<string | null>(null);

  // Ref to cache file content by filePath (prevents stale content from being passed to MarkdownViewer)
  const contentCacheRef = useRef<Map<string, string>>(new Map());

  // Stable zoom change handler (prevents wheel handler from re-registering constantly)
  const handleZoomChange = useCallback((newZoom: number) => {
    console.log('[AppLayout] handleZoomChange called:', { activeTabId, newZoom });
    if (activeTabId) {
      const { updateTabZoomLevel } = useTabsStore.getState();
      updateTabZoomLevel(activeTabId, newZoom);
    }
  }, [activeTabId]);

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

  // Listen for show-history events from TitleBar
  useEffect(() => {
    const handleShowHistory = () => {
      setShowSidebar(true);
      setSidebarView('history');
    };

    window.addEventListener('show-history', handleShowHistory);
    return () => {
      window.removeEventListener('show-history', handleShowHistory);
    };
  }, []);

  // Listen for show-files events from TitleBar
  useEffect(() => {
    const handleShowFiles = () => {
      setShowSidebar(true);
      setSidebarView('files');
    };

    window.addEventListener('show-files', handleShowFiles);
    return () => {
      window.removeEventListener('show-files', handleShowFiles);
    };
  }, []);

  // Listen for menu:shortcuts events from Help menu
  useEffect(() => {
    const handleShowShortcuts = () => {
      setShowShortcuts(true);
    };

    window.addEventListener('menu:shortcuts', handleShowShortcuts);
    return () => {
      window.removeEventListener('menu:shortcuts', handleShowShortcuts);
    };
  }, []);

  // Listen for menu:about events from Help menu
  useEffect(() => {
    const handleShowAbout = () => {
      setShowAbout(true);
    };

    window.addEventListener('menu:about', handleShowAbout);
    return () => {
      window.removeEventListener('menu:about', handleShowAbout);
    };
  }, []);

  // Register all commands for the shortcuts reference
  useEffect(() => {
    // File commands
    registerFileCommands({
      onOpenFile: () => {
        const fileOpenerButton = document.querySelector('.file-opener__button') as HTMLButtonElement;
        fileOpenerButton?.click();
      },
      onOpenFolder: () => {
        const folderOpenerButton = document.querySelector('.folder-opener__button') as HTMLButtonElement;
        folderOpenerButton?.click();
      },
      onCloseTab: () => {
        const { activeTabId, removeTab } = useTabsStore.getState();
        if (activeTabId) removeTab(activeTabId);
      },
      onCloseAllTabs: () => {
        const { tabs, removeTab } = useTabsStore.getState();
        Array.from(tabs.keys()).forEach(tabId => removeTab(tabId));
      },
      onSaveAsPDF: () => {
        console.log('Save as PDF not implemented yet');
      },
      onCopyFilePath: () => {
        const { activeTabId, tabs } = useTabsStore.getState();
        if (activeTabId) {
          const tab = tabs.get(activeTabId);
          if (tab) navigator.clipboard.writeText(tab.filePath);
        }
      },
      onRevealInExplorer: () => {
        const { activeTabId, tabs } = useTabsStore.getState();
        if (activeTabId) {
          const tab = tabs.get(activeTabId);
          if (tab) {
            // TODO: Implement reveal in explorer
            console.log('Reveal in explorer:', tab.filePath);
          }
        }
      },
      onReload: () => {
        const { activeTabId, tabs } = useTabsStore.getState();
        if (activeTabId) {
          const tab = tabs.get(activeTabId);
          if (tab) window.location.reload();
        }
      },
    });

    // Navigation commands
    registerNavigationCommands({
      onNextTab: () => {
        const { tabs, activeTabId, setActiveTab } = useTabsStore.getState();
        if (!activeTabId || tabs.size === 0) return;
        const tabIds = Array.from(tabs.keys());
        const currentIndex = tabIds.indexOf(activeTabId);
        const nextIndex = (currentIndex + 1) % tabIds.length;
        setActiveTab(tabIds[nextIndex]);
      },
      onPreviousTab: () => {
        const { tabs, activeTabId, setActiveTab } = useTabsStore.getState();
        if (!activeTabId || tabs.size === 0) return;
        const tabIds = Array.from(tabs.keys());
        const currentIndex = tabIds.indexOf(activeTabId);
        const prevIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
        setActiveTab(tabIds[prevIndex]);
      },
      onJumpToTab: (index: number) => {
        const { tabs, setActiveTab } = useTabsStore.getState();
        const tabIds = Array.from(tabs.keys());
        if (index < tabIds.length) setActiveTab(tabIds[index]);
      },
      onNavigateBack: () => {
        window.dispatchEvent(new CustomEvent('navigation:back'));
      },
      onNavigateForward: () => {
        window.dispatchEvent(new CustomEvent('navigation:forward'));
      },
      onGoToLine: () => {
        console.log('Go to line not implemented yet');
      },
      onGoToHeading: () => {
        window.dispatchEvent(new CustomEvent('toggle-toc'));
      },
      onSplitVertical: () => {
        console.log('Split vertical not implemented yet');
      },
      onSplitHorizontal: () => {
        console.log('Split horizontal not implemented yet');
      },
      onClosePane: () => {
        console.log('Close pane not implemented yet');
      },
      onFocusNextPane: () => {
        console.log('Focus next pane not implemented yet');
      },
      onFocusPreviousPane: () => {
        console.log('Focus previous pane not implemented yet');
      },
    });

    // View commands
    registerViewCommands({
      onZoomIn: () => {
        const { activeTabId, updateTabZoomLevel, tabs } = useTabsStore.getState();
        if (activeTabId) {
          const tab = tabs.get(activeTabId);
          if (tab) {
            const newZoom = Math.min(2000, (tab.zoomLevel || 100) + 10);
            updateTabZoomLevel(activeTabId, newZoom);
          }
        }
      },
      onZoomOut: () => {
        const { activeTabId, updateTabZoomLevel, tabs } = useTabsStore.getState();
        if (activeTabId) {
          const tab = tabs.get(activeTabId);
          if (tab) {
            const newZoom = Math.max(10, (tab.zoomLevel || 100) - 10);
            updateTabZoomLevel(activeTabId, newZoom);
          }
        }
      },
      onZoomReset: () => {
        const { activeTabId, updateTabZoomLevel } = useTabsStore.getState();
        if (activeTabId) updateTabZoomLevel(activeTabId, 100);
      },
      onToggleSidebar: () => {
        setShowSidebar(prev => !prev);
      },
      onToggleFileTree: () => {
        setShowSidebar(true);
        setSidebarView('files');
      },
      onToggleTableOfContents: () => {
        window.dispatchEvent(new CustomEvent('toggle-toc'));
      },
      onChangeTheme: () => {
        console.log('Change theme not implemented yet');
      },
      onToggleFullScreen: () => {
        window.dispatchEvent(new CustomEvent('menu:toggle-fullscreen'));
      },
    });

    // Search commands
    registerSearchCommands({
      onFindInPage: () => {
        window.dispatchEvent(new CustomEvent('menu:find'));
      },
      onFindNext: () => {
        console.log('Find next not implemented yet');
      },
      onFindPrevious: () => {
        console.log('Find previous not implemented yet');
      },
      onReplace: () => {
        console.log('Replace not implemented yet');
      },
      onFindInFiles: () => {
        window.dispatchEvent(new CustomEvent('menu:find-in-files'));
      },
      onReplaceInFiles: () => {
        console.log('Replace in files not implemented yet');
      },
    });

    // Application commands
    registerApplicationCommands({
      onOpenCommandPalette: () => {
        console.log('Command palette not implemented yet');
      },
      onOpenSettings: () => {
        console.log('Settings not implemented yet');
      },
      onShowShortcuts: () => {
        setShowShortcuts(true);
      },
      onCheckForUpdates: () => {
        console.log('Check for updates not implemented yet');
      },
      onAbout: () => {
        window.dispatchEvent(new CustomEvent('menu:about'));
      },
      onQuit: () => {
        window.close();
      },
    });
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

    // T051k-view: Content zoom menu handlers
    const handleContentZoomIn = () => {
      const { activeTabId, updateTabZoomLevel, tabs } = useTabsStore.getState();
      if (activeTabId) {
        const tab = tabs.get(activeTabId);
        if (tab) {
          const newZoom = Math.min(2000, (tab.zoomLevel || 100) + 10);
          updateTabZoomLevel(activeTabId, newZoom);
        }
      }
    };

    const handleContentZoomOut = () => {
      const { activeTabId, updateTabZoomLevel, tabs } = useTabsStore.getState();
      if (activeTabId) {
        const tab = tabs.get(activeTabId);
        if (tab) {
          const newZoom = Math.max(10, (tab.zoomLevel || 100) - 10);
          updateTabZoomLevel(activeTabId, newZoom);
        }
      }
    };

    const handleContentZoomReset = () => {
      const { activeTabId, updateTabZoomLevel } = useTabsStore.getState();
      if (activeTabId) {
        updateTabZoomLevel(activeTabId, 100);
      }
    };

    const handleContentZoomPreset = (_event: any, zoom: number) => {
      const { activeTabId, updateTabZoomLevel } = useTabsStore.getState();
      if (activeTabId) {
        updateTabZoomLevel(activeTabId, zoom);
      }
    };

    // T051k-view: Global zoom menu handlers
    const handleGlobalZoomIn = async () => {
      const { useUIStore } = await import('../stores/ui');
      const { incrementGlobalZoom } = useUIStore.getState();
      incrementGlobalZoom(10);
    };

    const handleGlobalZoomOut = async () => {
      const { useUIStore } = await import('../stores/ui');
      const { incrementGlobalZoom } = useUIStore.getState();
      incrementGlobalZoom(-10);
    };

    const handleGlobalZoomReset = async () => {
      const { useUIStore } = await import('../stores/ui');
      const { resetGlobalZoom } = useUIStore.getState();
      resetGlobalZoom();
    };

    const handleGlobalZoomPreset = async (_event: any, zoom: number) => {
      const { useUIStore } = await import('../stores/ui');
      const { setGlobalZoom } = useUIStore.getState();
      setGlobalZoom(zoom);
    };

    // Register event listeners for menu commands
    window.addEventListener('menu:open-file', handleMenuOpenFile);
    window.addEventListener('menu:open-folder', handleMenuOpenFolder);
    window.addEventListener('menu:close-current', handleMenuCloseCurrent);
    window.addEventListener('menu:close-folder', handleMenuCloseFolder);
    window.addEventListener('menu:close-all', handleMenuCloseAll);

    // T051k-view: Register zoom menu event listeners
    window.electronAPI?.on('menu:content-zoom-in', handleContentZoomIn);
    window.electronAPI?.on('menu:content-zoom-out', handleContentZoomOut);
    window.electronAPI?.on('menu:content-zoom-reset', handleContentZoomReset);
    window.electronAPI?.on('menu:content-zoom-preset', handleContentZoomPreset);
    window.electronAPI?.on('menu:global-zoom-in', handleGlobalZoomIn);
    window.electronAPI?.on('menu:global-zoom-out', handleGlobalZoomOut);
    window.electronAPI?.on('menu:global-zoom-reset', handleGlobalZoomReset);
    window.electronAPI?.on('menu:global-zoom-preset', handleGlobalZoomPreset);

    // Cleanup
    return () => {
      window.removeEventListener('menu:open-file', handleMenuOpenFile);
      window.removeEventListener('menu:open-folder', handleMenuOpenFolder);
      window.removeEventListener('menu:close-current', handleMenuCloseCurrent);
      window.removeEventListener('menu:close-folder', handleMenuCloseFolder);
      window.removeEventListener('menu:close-all', handleMenuCloseAll);
    };
  }, [activeFolderId]);

  // T110: Auto-reload current file when it changes on disk
  const handleFileReload = useCallback(async (filePath: string) => {
    try {
      const result = await window.electronAPI?.file?.read({ filePath });
      if (result?.success && result.content) {
        contentCacheRef.current.set(filePath, result.content);
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

  // Track folders seen by auto-switch to prevent switching away from newly added folders
  const autoSwitchSeenFoldersRef = useRef<Set<string>>(new Set());

  // Auto-switch folder when active tab changes (only for user-initiated tab switches)
  useEffect(() => {
    if (!activeTab || !activeTabId) return;

    // Check if the current active folder has been seen before by this effect
    const wasFolderJustAdded = activeFolderId && !autoSwitchSeenFoldersRef.current.has(activeFolderId);

    // Mark current folder as seen
    if (activeFolderId) {
      autoSwitchSeenFoldersRef.current.add(activeFolderId);
    }

    // Only auto-switch if:
    // - The tab has a different folder than the current active folder
    // - The current active folder is not being initialized
    // - The current active folder was not just added
    if (activeTab.folderId &&
        activeTab.folderId !== activeFolderId &&
        activeFolderId &&
        !initializingFoldersRef.current.has(activeFolderId) &&
        !wasFolderJustAdded) {
      const { setActiveFolder } = useFoldersStore.getState();
      setActiveFolder(activeTab.folderId);
    }
  }, [activeTabId, activeFolderId]); // Depend on both to detect newly added folders

  // Track folders that are currently being initialized to prevent duplicate tab creation
  const initializingFoldersRef = useRef<Set<string>>(new Set());

  // Track if we're in the middle of cleanup to prevent auto-create from interfering
  const isCleaningUpRef = useRef<boolean>(false);

  // Track the previous folders list to detect newly added folders
  const previousFoldersRef = useRef<Folder[]>([]);

  // Monitor tab removals and handle folder cleanup - RUNS FIRST to set flags
  const previousTabsRef = useRef<Map<string, any>>(new Map());
  useEffect(() => {
    // Check if a tab was removed
    const previousTabs = previousTabsRef.current;
    const currentTabIds = new Set(tabs.keys());
    const previousTabIds = new Set(previousTabs.keys());

    // Find removed tabs
    const removedTabIds = Array.from(previousTabIds).filter(id => !currentTabIds.has(id));

    if (removedTabIds.length > 0) {
      console.log('[AppLayout] Tabs removed, checking for cleanup:', removedTabIds);

      // Set cleanup flag IMMEDIATELY and SYNCHRONOUSLY to prevent auto-create
      isCleaningUpRef.current = true;

      // Handle cleanup asynchronously but properly
      (async () => {
        for (const removedTabId of removedTabIds) {
          const removedTab = previousTabs.get(removedTabId);
          console.log('[AppLayout] Removed tab:', removedTab);

          if (!removedTab) continue;

          // Skip if tab has no folder (direct file)
          if (!removedTab.folderId) {
            console.log('[AppLayout] Removed tab has no folderId, skipping');
            // If this was the last tab, show welcome screen
            if (tabs.size === 0) {
              console.log('[AppLayout] All tabs closed (direct file), showing welcome screen');
              setCurrentFile(null);
              setCurrentContent('');
              setError(null);
            }
            isCleaningUpRef.current = false;
            continue;
          }

          // Check if this was the last tab for the folder
          const remainingTabsForFolder = Array.from(tabs.values()).filter(
            tab => tab.folderId === removedTab.folderId
          );

          console.log('[AppLayout] Remaining tabs for folder:', remainingTabsForFolder.length);

          if (remainingTabsForFolder.length === 0) {
            // This was the last tab for the folder
            const folder = folders.find(f => f.id === removedTab.folderId);
            if (!folder) {
              console.warn('[AppLayout] Folder not found:', removedTab.folderId);
              isCleaningUpRef.current = false;
              continue;
            }

            console.log(`[AppLayout] Last tab closed for folder: ${folder.displayName}, automatically closing folder`);

            // Automatically close the folder (no dialog)
            const { removeFolder, setActiveFolder } = useFoldersStore.getState();

            removeFolder(removedTab.folderId);

            // Get folders AFTER removal to get the correct remaining list
            const { folders: currentFolders } = useFoldersStore.getState();

            if (currentFolders.length > 0) {
              // Switch to another folder if available
              setActiveFolder(currentFolders[0].id);
            } else {
              // No folders left - show welcome screen
              console.log('[AppLayout] All folders closed, showing welcome screen');
              setCurrentFile(null);
              setCurrentContent('');
              setError(null);
            }

            // Clear cleanup flag after a delay to prevent auto-create from running
            setTimeout(() => {
              isCleaningUpRef.current = false;
            }, 0);
          } else {
            // There are still tabs for this folder, clear the cleanup flag
            console.log('[AppLayout] Still has tabs, clearing cleanup flag');
            setTimeout(() => {
              isCleaningUpRef.current = false;
            }, 0);
          }
        }
      })();
    }

    // Update the ref for next comparison
    previousTabsRef.current = new Map(tabs);
  }, [tabs, folders]);

  // Create tab when folder is selected but has no tabs - RUNS AFTER cleanup
  useEffect(() => {
    if (!activeFolderId) return;

    const tabsForFolder = Array.from(tabs.values()).filter(tab => tab.folderId === activeFolderId);

    // Detect if this folder was just added (to prevent double tab creation on folder open)
    const previousFolders = previousFoldersRef.current;
    const wasJustAdded = !previousFolders.some(f => f.id === activeFolderId);

    // Update the previous folders ref
    previousFoldersRef.current = folders;

    // If the active folder has no tabs and we should create one
    // Don't create if:
    // - We're already initializing this folder
    // - We're in cleanup mode (showing dialog)
    // - The folder was just added (handleFolderOpened will be called)
    // - ALL tabs are closed (user intentionally closed everything, show welcome screen)
    if (tabsForFolder.length === 0 &&
        !initializingFoldersRef.current.has(activeFolderId) &&
        !isCleaningUpRef.current &&
        !wasJustAdded &&
        tabs.size > 0) {  // Don't auto-create if all tabs were closed
      console.log(`[AppLayout] Active folder ${activeFolderId} has no tabs (manual switch), creating one`);

      // Mark folder as being initialized
      initializingFoldersRef.current.add(activeFolderId);

      // Call handleFolderOpened to create a tab for this folder
      const activeFolder = folders.find(f => f.id === activeFolderId);
      if (activeFolder) {
        handleFolderOpened(activeFolder.path).finally(() => {
          // Remove from initializing set after tab is created
          initializingFoldersRef.current.delete(activeFolderId);
        });
      }
    }
  }, [activeFolderId, tabs, folders]);

  // T066: Register navigation history keyboard shortcuts (Alt+Left, Alt+Right)
  useEffect(() => {
    const handleNavigateBack = async () => {
      const { activeTabId, navigateBack } = useTabsStore.getState();
      if (activeTabId) {
        // History is already kept in sync by onScrollChange/onZoomChange, just navigate
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
        // History is already kept in sync by onScrollChange/onZoomChange, just navigate
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

        // Check if this is a virtual directory listing path
        const isDirectoryListing = entry.filePath.includes('[Directory Index]');

        // For regular files, let the sync effect + file load effect handle it
        // Only manually handle directory listings
        if (!isDirectoryListing) {
          console.log('[handleNavigateToHistory] Regular file - letting sync effect handle it');
          return;
        }

        // Mark as manually loaded to prevent useEffect from loading again
        contentLoadedManually.current = true;

        // Navigate to the history entry
        setCurrentFile(entry.filePath);

        // Re-generate directory listing with race condition prevention
        const fileToLoad = entry.filePath;
          loadingFileRef.current = fileToLoad;

          const directoryPath = entry.filePath.replace(/[/\\]\[Directory Index\]$/, '');
          console.log('[handleNavigateToHistory] Re-generating directory listing for:', directoryPath);

          const listingResult = await window.electronAPI?.file?.getDirectoryListing({
            directoryPath: directoryPath,
          });

          // Only update content if this is still the file we want to display
          if (loadingFileRef.current === fileToLoad && currentFile === fileToLoad) {
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

              contentCacheRef.current.set(fileToLoad, markdown);
              setCurrentContent(markdown);
              console.log('[handleNavigateToHistory] Directory listing generated');

              // Update the active tab and restore zoom level
              const { activeTabId, tabs, updateTabZoomLevel } = useTabsStore.getState();
              if (activeTabId) {
                const activeTab = tabs.get(activeTabId);
                if (activeTab) {
                  const updatedTab = {
                    ...activeTab,
                    filePath: fileToLoad,
                    title: `${dirName}\\`, // Add backslash to indicate directory
                    scrollPosition: entry.scrollPosition,
                    scrollLeft: entry.scrollLeft || 0, // Restore horizontal scroll from history
                    zoomLevel: entry.zoomLevel || 100, // Restore zoom from history
                  };
                  tabs.set(activeTabId, updatedTab);
                  useTabsStore.setState({ tabs: new Map(tabs) });

                  // Restore zoom level
                  updateTabZoomLevel(activeTabId, entry.zoomLevel || 100);
                }
              }
            }
          } else {
            console.log('[handleNavigateToHistory] Ignoring stale directory listing for:', fileToLoad, '(current:', loadingFileRef.current, ')');
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
      contentCacheRef.current.set(virtualPath, content);
      setCurrentContent(content);

      // Add directory listing to navigation history
      const { activeTabId, tabs, addHistoryEntry, updateTabZoomLevel } = useTabsStore.getState();
      if (activeTabId) {
        const currentTab = tabs.get(activeTabId);

        // Add the directory to history if navigating to a different location
        if (currentTab && currentTab.filePath && currentTab.filePath !== virtualPath) {
          // First, update CURRENT file's history entry with current scroll/zoom
          const viewer = document.querySelector('.markdown-viewer') as HTMLElement;
          const currentScrollTop = viewer?.scrollTop || currentTab.scrollPosition || 0;
          const currentScrollLeft = viewer?.scrollLeft || currentTab.scrollLeft || 0;
          addHistoryEntry(activeTabId, {
            filePath: currentTab.filePath,
            scrollPosition: currentScrollTop,
            scrollLeft: currentScrollLeft,
            zoomLevel: currentTab.zoomLevel || 100,
            timestamp: Date.now(),
          });

          console.log('[DirectoryListing] Adding history entry for directory:', virtualPath);
          // Then add directory to history with reset zoom
          addHistoryEntry(activeTabId, {
            filePath: virtualPath,
            scrollPosition: 0,
            scrollLeft: 0,
            zoomLevel: 100,     // Reset zoom to 100%
            timestamp: Date.now(),
          });

          // Reset zoom for directory view
          updateTabZoomLevel(activeTabId, 100);
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

    // T061, T063n: Register tab navigation shortcuts
    const handleNextTab = () => {
      const { tabOrder, activeTabId, setActiveTab } = useTabsStore.getState();
      if (tabOrder.length === 0) return;

      const currentIndex = tabOrder.indexOf(activeTabId || '');
      const nextIndex = (currentIndex + 1) % tabOrder.length;
      setActiveTab(tabOrder[nextIndex]);
    };

    const handlePreviousTab = () => {
      const { tabOrder, activeTabId, setActiveTab } = useTabsStore.getState();
      if (tabOrder.length === 0) return;

      const currentIndex = tabOrder.indexOf(activeTabId || '');
      const prevIndex = currentIndex <= 0 ? tabOrder.length - 1 : currentIndex - 1;
      setActiveTab(tabOrder[prevIndex]);
    };

    const handleJumpToTab = (index: number) => {
      const { tabOrder, setActiveTab } = useTabsStore.getState();
      if (index < tabOrder.length) {
        setActiveTab(tabOrder[index]);
      }
    };

    const handleCloseTab = () => {
      const { activeTabId, removeTab } = useTabsStore.getState();
      if (activeTabId) {
        removeTab(activeTabId);
      }
    };

    // T063n: Move tab left/right handlers
    const handleMoveTabLeft = () => {
      const { tabOrder, activeTabId, reorderTab } = useTabsStore.getState();
      if (tabOrder.length === 0 || !activeTabId) return;

      const currentIndex = tabOrder.indexOf(activeTabId);
      if (currentIndex > 0) {
        // Move tab one position to the left
        reorderTab(currentIndex, currentIndex - 1);
      }
    };

    const handleMoveTabRight = () => {
      const { tabOrder, activeTabId, reorderTab } = useTabsStore.getState();
      if (tabOrder.length === 0 || !activeTabId) return;

      const currentIndex = tabOrder.indexOf(activeTabId);
      if (currentIndex < tabOrder.length - 1) {
        // Move tab one position to the right
        reorderTab(currentIndex, currentIndex + 1);
      }
    };

    registerTabShortcuts({
      onNextTab: handleNextTab,
      onPreviousTab: handlePreviousTab,
      onJumpToTab: handleJumpToTab,
      onCloseTab: handleCloseTab,
      onMoveTabLeft: handleMoveTabLeft,
      onMoveTabRight: handleMoveTabRight,
    });

    // Register file menu shortcuts (Ctrl+O, Ctrl+Shift+O, Ctrl+Shift+W)
    registerFileShortcuts({
      onOpenFile: () => {
        window.dispatchEvent(new CustomEvent('menu:open-file'));
      },
      onOpenFolder: () => {
        window.dispatchEvent(new CustomEvent('menu:open-folder'));
      },
      onCloseAll: () => {
        window.dispatchEvent(new CustomEvent('menu:close-all'));
      },
    });

    // Register help shortcuts (F1)
    registerHelpShortcuts({
      onShowShortcuts: () => {
        setShowShortcuts(true);
      },
    });

    // Listen for navigate-to-history events (for Home navigation)
    window.addEventListener('navigate-to-history', handleNavigateToHistory);
    // Listen for directory listing events
    window.addEventListener('show-directory-listing', handleShowDirectoryListing);

    // Handle Ctrl+Click to open file in new tab
    const handleOpenFileInNewTab = async (event: Event) => {
      const customEvent = event as CustomEvent<{ filePath: string }>;
      const { filePath } = customEvent.detail;
      const { openFileInNewTab } = useTabsStore.getState();
      const { activeFolderId } = useFoldersStore.getState();

      console.log('[AppLayout] Opening file in new tab:', filePath);
      await openFileInNewTab(filePath, activeFolderId || undefined);
    };

    // Handle Shift+Click to open file in new window
    const handleOpenFileInNewWindow = async (event: Event) => {
      const customEvent = event as CustomEvent<{ filePath: string }>;
      const { filePath } = customEvent.detail;
      const { openFileInNewWindow } = useTabsStore.getState();
      const { activeFolderId } = useFoldersStore.getState();

      console.log('[AppLayout] Opening file in new window:', filePath);
      await openFileInNewWindow(filePath, activeFolderId || undefined);
    };

    // Handle reveal in sidebar
    const handleRevealInSidebar = (event: Event) => {
      const customEvent = event as CustomEvent<{ filePath: string; folderId?: string }>;
      const { filePath, folderId } = customEvent.detail;

      console.log('[AppLayout] Revealing file in sidebar:', filePath, folderId);

      // Switch to the folder if needed
      if (folderId && folderId !== activeFolderId) {
        const { setActiveFolder } = useFoldersStore.getState();
        setActiveFolder(folderId);
      }

      // Show files view if not already
      setSidebarView('files');

      // Trigger reveal
      setRevealFilePath(filePath);

      // Clear reveal path after a short delay to allow it to be triggered again
      setTimeout(() => setRevealFilePath(null), 500);
    };

    window.addEventListener('open-file-in-new-tab', handleOpenFileInNewTab);
    window.addEventListener('open-file-in-new-window', handleOpenFileInNewWindow);
    window.addEventListener('reveal-in-sidebar', handleRevealInSidebar);

    return () => {
      unregisterHistoryShortcuts();
      unregisterTabShortcuts();
      unregisterFileShortcuts();
      unregisterHelpShortcuts();
      window.removeEventListener('navigate-to-history', handleNavigateToHistory);
      window.removeEventListener('show-directory-listing', handleShowDirectoryListing);
      window.removeEventListener('open-file-in-new-tab', handleOpenFileInNewTab);
      window.removeEventListener('open-file-in-new-window', handleOpenFileInNewWindow);
      window.removeEventListener('reveal-in-sidebar', handleRevealInSidebar);
    };
  }, []);

  // Register zoom keyboard shortcuts (Ctrl+=/-/0 for document, Ctrl+Alt+=/-/0 for application)
  useEffect(() => {
    // Document zoom shortcuts
    registerContentZoomShortcuts({
      onZoomIn: () => {
        const { activeTabId, updateTabZoomLevel, tabs } = useTabsStore.getState();
        if (activeTabId) {
          const tab = tabs.get(activeTabId);
          if (tab) {
            const newZoom = Math.min(2000, (tab.zoomLevel || 100) + 10);
            updateTabZoomLevel(activeTabId, newZoom);
          }
        }
      },
      onZoomOut: () => {
        const { activeTabId, updateTabZoomLevel, tabs } = useTabsStore.getState();
        if (activeTabId) {
          const tab = tabs.get(activeTabId);
          if (tab) {
            const newZoom = Math.max(10, (tab.zoomLevel || 100) - 10);
            updateTabZoomLevel(activeTabId, newZoom);
          }
        }
      },
      onZoomReset: () => {
        const { activeTabId, updateTabZoomLevel } = useTabsStore.getState();
        if (activeTabId) {
          updateTabZoomLevel(activeTabId, 100);
        }
      },
    });

    // Application zoom shortcuts
    registerGlobalZoomShortcuts({
      onGlobalZoomIn: async () => {
        const { useUIStore } = await import('../stores/ui');
        const { incrementGlobalZoom } = useUIStore.getState();
        incrementGlobalZoom(10);
      },
      onGlobalZoomOut: async () => {
        const { useUIStore } = await import('../stores/ui');
        const { incrementGlobalZoom } = useUIStore.getState();
        incrementGlobalZoom(-10);
      },
      onGlobalZoomReset: async () => {
        const { useUIStore } = await import('../stores/ui');
        const { resetGlobalZoom } = useUIStore.getState();
        resetGlobalZoom();
      },
    });

    return () => {
      unregisterContentZoomShortcuts();
      unregisterGlobalZoomShortcuts();
    };
  }, []);

  /**
   * T039: Handle file opened from FileOpener component
   * Updates current file state and loads content
   * T063: Also creates a tab for the opened file
   */
  const handleFileOpened = async (filePath: string, content: string) => {
    setCurrentFile(filePath);
    contentCacheRef.current.set(filePath, content);
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
          scrollLeft: 0,
          zoomLevel: 100,
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
        const { activeTabId, tabs, addHistoryEntry, updateTabZoomLevel } = useTabsStore.getState();

        if (activeTabId) {
          const currentTab = tabs.get(activeTabId);

          // Add the NEW file to history if navigating to a different file
          if (currentTab && currentTab.filePath && currentTab.filePath !== filePath) {
            // First, update CURRENT file's history entry with current scroll/zoom
            const viewer = document.querySelector('.markdown-viewer') as HTMLElement;
            const currentScrollTop = viewer?.scrollTop || currentTab.scrollPosition || 0;
            const currentScrollLeft = viewer?.scrollLeft || currentTab.scrollLeft || 0;
            addHistoryEntry(activeTabId, {
              filePath: currentTab.filePath,
              scrollPosition: currentScrollTop,
              scrollLeft: currentScrollLeft,
              zoomLevel: currentTab.zoomLevel || 100,
              timestamp: Date.now(),
            });

            console.log('[LinkClick] Adding history entry for new file:', filePath);
            // Then add NEW file to history with reset zoom
            addHistoryEntry(activeTabId, {
              filePath: filePath, // Add the NEW file, not the current one!
              scrollPosition: 0,  // New file starts at top
              scrollLeft: 0,      // New file starts at left
              zoomLevel: 100,     // Reset zoom to 100%
              timestamp: Date.now(),
            });

            // Reset zoom for new file
            updateTabZoomLevel(activeTabId, 100);
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
        contentCacheRef.current.set(filePath, result.content);
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
    try {
      // Get the folder ID that was just added (FolderOpener already added it to the store)
      const { folders, activeFolderId: currentActiveFolderId } = useFoldersStore.getState();
      const addedFolder = folders.find(f => f.path === folderPath);
      const folderId = addedFolder?.id || currentActiveFolderId;

      // Mark folder as being initialized to prevent auto-switch
      if (folderId) {
        initializingFoldersRef.current.add(folderId);
      }

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
        const { tabs, addTab } = useTabsStore.getState();

        if (firstFilePath) {
          // Read and open the first file
          const fileResult = await window.electronAPI?.file?.read({ filePath: firstFilePath });
          if (fileResult?.success && fileResult.content) {
            setCurrentFile(firstFilePath);
            contentCacheRef.current.set(firstFilePath, fileResult.content);
            setCurrentContent(fileResult.content);
            setError(null);

            // Create a tab for this file with the correct folder ID
            const existingTab = Array.from(tabs.values()).find(t => t.filePath === firstFilePath);

            if (existingTab) {
              // Tab already exists, just set it as active
              const { setActiveTab } = useTabsStore.getState();
              setActiveTab(existingTab.id);
            } else {
              // Create new tab
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
                  scrollLeft: 0,
                  zoomLevel: 100,
                  timestamp: Date.now(),
                }],
                currentHistoryIndex: 0, // Start at position 0 (home)
                forwardHistory: [],
                createdAt: Date.now(),
                folderId: folderId, // Use the folder ID we just got
                isDirectFile: false, // This is from a folder, not a direct file
              };
              addTab(newTab);

              // Set the new tab as active so it's visible
              const { setActiveTab } = useTabsStore.getState();
              setActiveTab(newTab.id);
            }
          }
        } else {
          // No markdown files found - create a tab showing folder overview
          console.log('No markdown files found in folder, creating overview tab');

          const folderName = folderPath.split(/[/\\]/).pop() || 'Folder';
          const overviewPath = `${folderPath}/[Folder Overview]`;

          // Check if tab already exists for this folder
          const existingTab = Array.from(tabs.values()).find(t =>
            t.folderId === folderId && t.filePath.includes('[Folder Overview]')
          );

          if (!existingTab) {
            const newTab = {
              id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              filePath: overviewPath,
              title: `${folderName}/`,
              scrollPosition: 0,
              zoomLevel: 100,
              searchState: null,
              modificationTimestamp: Date.now(),
              isDirty: false,
              renderCache: null,
              navigationHistory: [{
                filePath: overviewPath,
                scrollPosition: 0,
                scrollLeft: 0,
                zoomLevel: 100,
                timestamp: Date.now(),
              }],
              currentHistoryIndex: 0,
              forwardHistory: [],
              createdAt: Date.now(),
              folderId: folderId,
              isDirectFile: false,
            };
            addTab(newTab);

            // Set the new tab as active so it's visible
            const { setActiveTab } = useTabsStore.getState();
            setActiveTab(newTab.id);
          }

          // Set empty content with a message
          setCurrentFile(overviewPath);
          setCurrentContent(`# ${folderName}\n\n*This folder contains no markdown files.*\n\nCreate a markdown file to get started.`);
          setError(null);
        }
      }
    } catch (err) {
      console.error('Error auto-opening first file:', err);
    } finally {
      // Clear initializing flag
      const { folders } = useFoldersStore.getState();
      const addedFolder = folders.find(f => f.path === folderPath);
      if (addedFolder) {
        initializingFoldersRef.current.delete(addedFolder.id);
      }
    }
  };

  /**
   * Sync currentFile with active tab's filePath
   * This ensures that when history navigation updates the tab's filePath,
   * the AppLayout's currentFile state triggers file loading
   */
  useEffect(() => {
    if (activeTab && activeTab.filePath && activeTab.filePath !== currentFile) {
      console.log('[AppLayout] Syncing currentFile with tab filePath:', {
        from: currentFile,
        to: activeTab.filePath,
      });
      // Don't mark as manually loaded - let the file load effect handle it
      setCurrentFile(activeTab.filePath);
    }
  }, [activeTab?.filePath, activeTab?.id]);

  /**
   * Load file content when currentFile changes
   * This handles cases where file is selected from tabs
   */
  useEffect(() => {
    if (!currentFile) {
      setCurrentContent('');
      loadingFileRef.current = null;
      return;
    }

    // Skip loading if content was manually set (e.g., from link click)
    if (contentLoadedManually.current) {
      contentLoadedManually.current = false;
      return;
    }

    const loadFile = async () => {
      // Track which file we're loading to prevent race conditions
      const fileToLoad = currentFile;
      loadingFileRef.current = fileToLoad;

      setIsLoading(true);
      setError(null);

      try {
        const result = await window.electronAPI?.file?.read({ filePath: fileToLoad });

        // Only update content if this is still the current file being displayed
        if (loadingFileRef.current === fileToLoad && currentFile === fileToLoad) {
          if (result?.success && result.content) {
            // Cache the content by filePath
            contentCacheRef.current.set(fileToLoad, result.content);
            setCurrentContent(result.content);
            console.log('[AppLayout] Cached content for:', fileToLoad, 'length:', result.content.length);
          } else {
            setError(result?.error || 'Failed to load file');
          }
        }
      } catch (err) {
        // Only update error if this is still the current file
        if (loadingFileRef.current === fileToLoad && currentFile === fileToLoad) {
          console.error('Error loading file:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        // Only clear loading if this is still the current file
        if (loadingFileRef.current === fileToLoad && currentFile === fileToLoad) {
          setIsLoading(false);
        }
      }
    };

    loadFile();
  }, [currentFile]);

  // Check if we should show UI elements
  const hasTabs = tabs.size > 0;
  const hasFolders = folders.length > 0;
  const hasContent = hasTabs || hasFolders;

  // Get content from cache for current file (prevents stale content from being passed to MarkdownViewer)
  const contentForCurrentFile = currentFile ? (contentCacheRef.current.get(currentFile) || currentContent) : currentContent;
  console.log('[AppLayout] Rendering with:', {
    currentFile,
    currentContentLength: currentContent.length,
    cachedContentLength: contentForCurrentFile.length,
    isFromCache: currentFile ? contentCacheRef.current.has(currentFile) : false,
  });

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
            {folders.length > 0 && <FolderSwitcher onFolderOpened={handleFolderOpened} />}

            {/* Sidebar view toggle: Files / History */}
            {tabs.size > 0 && (
              <div className="sidebar-view-toggle">
                <button
                  className={`sidebar-view-toggle__button ${sidebarView === 'files' ? 'sidebar-view-toggle__button--active' : ''}`}
                  onClick={() => setSidebarView('files')}
                  title="Show File Tree"
                  type="button"
                >
                  📁 Files
                </button>
                <button
                  className={`sidebar-view-toggle__button ${sidebarView === 'history' ? 'sidebar-view-toggle__button--active' : ''}`}
                  onClick={() => setSidebarView('history')}
                  title="Show Navigation History"
                  type="button"
                >
                  🕐 History
                </button>
              </div>
            )}
          </div>
          <div className="sidebar-content">
            {/* Show History Panel when history view is active */}
            {sidebarView === 'history' && tabs.size > 0 && (
              <HistoryPanel
                onHistoryEntryClick={(index) => {
                  // Navigate to the selected history entry
                  const { activeTabId, navigateToIndex } = useTabsStore.getState();
                  if (activeTabId) {
                    const entry = navigateToIndex(activeTabId, index);
                    if (entry) {
                      window.dispatchEvent(new CustomEvent('navigate-to-history', { detail: entry }));
                    }
                  }
                }}
              />
            )}

            {/* Show File Tree when files view is active */}
            {sidebarView === 'files' && (() => {
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
                    revealFilePath={revealFilePath}
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
                          const { activeTabId, tabs, addHistoryEntry, updateTabZoomLevel } = useTabsStore.getState();

                          if (activeTabId) {
                            const currentTab = tabs.get(activeTabId);

                            // Add the NEW file to history if navigating to a different file
                            if (currentTab && currentTab.filePath && currentTab.filePath !== filePath) {
                              // First, update CURRENT file's history entry with current scroll/zoom
                              const viewer = document.querySelector('.markdown-viewer') as HTMLElement;
                              const currentScrollTop = viewer?.scrollTop || currentTab.scrollPosition || 0;
                              const currentScrollLeft = viewer?.scrollLeft || currentTab.scrollLeft || 0;
                              addHistoryEntry(activeTabId, {
                                filePath: currentTab.filePath,
                                scrollPosition: currentScrollTop,
                                scrollLeft: currentScrollLeft,
                                zoomLevel: currentTab.zoomLevel || 100,
                                timestamp: Date.now(),
                              });

                              console.log('[FileTree] Adding history entry for new file:', filePath);
                              // Then add NEW file to history with reset zoom
                              addHistoryEntry(activeTabId, {
                                filePath: filePath, // Add the NEW file, not the current one!
                                scrollPosition: 0,  // New file starts at top
                                scrollLeft: 0,      // New file starts at left
                                zoomLevel: 100,     // Reset zoom to 100%
                                timestamp: Date.now(),
                              });

                              // Reset zoom for new file
                              updateTabZoomLevel(activeTabId, 100);
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
                          contentCacheRef.current.set(filePath, result.content);
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
              setShowHome(false); // Hide home when clicking a regular tab
              const { getTab, setActiveTab } = useTabsStore.getState();
              const tab = getTab(tabId);
              if (tab) {
                // IMPORTANT: Set active tab first, then update file
                setActiveTab(tabId);
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
            onHomeClick={() => {
              setShowHome(true);
              setCurrentFile(null); // Clear current file to ensure home is shown
              // Deselect any active tab
              const { setActiveTab } = useTabsStore.getState();
              setActiveTab(null);
            }}
            isHomeActive={showHome}
          />
        )}

        <div className="editor-area">
          {showHome || !currentFile ? (
            <Home onFileOpened={handleFileOpened} onFolderOpened={handleFolderOpened} />
          ) : (
            <MarkdownViewer
              content={contentForCurrentFile}
              filePath={currentFile}
              isLoading={isLoading}
              error={error}
              zoomLevel={activeTab?.zoomLevel || 100}
              scrollTop={activeTab?.scrollPosition}
              scrollLeft={activeTab?.scrollLeft}
              onRenderComplete={handleRenderComplete}
              onFileLink={handleLinkClick}
              onScrollChange={(scrollTop, scrollLeft) => {
                // Save scroll positions to BOTH tab state AND current history entry
                console.log('[onScrollChange] Called with:', { scrollTop, scrollLeft, activeTabId });
                if (activeTabId) {
                  const { tabs } = useTabsStore.getState();
                  const tab = tabs.get(activeTabId);
                  console.log('[onScrollChange] Tab state:', {
                    hasTab: !!tab,
                    currentIndex: tab?.currentHistoryIndex,
                    historyLength: tab?.navigationHistory?.length
                  });
                  if (tab) {
                    // Update both scroll positions in tab state and current history entry
                    // Do this in ONE atomic operation to avoid race conditions
                    const newTabs = new Map(tabs);
                    const history = tab.navigationHistory;
                    const currentIndex = tab.currentHistoryIndex;

                    // Update current history entry immediately (not just on navigation)
                    // Create NEW array with updated entry (don't mutate!)
                    let newHistory = history;
                    if (history && currentIndex >= 0 && currentIndex < history.length) {
                      console.log('[onScrollChange] Updating history entry at index:', currentIndex);
                      newHistory = [...history];
                      newHistory[currentIndex] = {
                        ...history[currentIndex],
                        scrollPosition: scrollTop,
                        scrollLeft: scrollLeft,
                        zoomLevel: tab.zoomLevel || 100,
                      };
                      console.log('[onScrollChange] Updated history entry:', newHistory[currentIndex]);
                    } else {
                      console.warn('[onScrollChange] Cannot update history - invalid state:', {
                        hasHistory: !!history,
                        currentIndex,
                        historyLength: history?.length
                      });
                    }

                    newTabs.set(activeTabId, {
                      ...tab,
                      scrollPosition: Math.max(0, scrollTop),
                      scrollLeft,
                      navigationHistory: newHistory
                    });
                    useTabsStore.setState({ tabs: newTabs });
                  }
                }
              }}
              onZoomChange={handleZoomChange}
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

      {/* Keyboard Shortcuts Reference */}
      <ShortcutsReference
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* About Dialog */}
      <About
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />
    </div>
  );
};

export default AppLayout;
