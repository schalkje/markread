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
import { recentsFavoritesService } from '../services/recents-favorites-service';
import { useRecentsFavorites } from '../hooks/useRecentsFavorites';
import { MarkdownViewer } from './markdown/MarkdownViewer';
import { Home } from './Home';
import { FileTree } from './sidebar/FileTree';
import { HistoryPanel } from './sidebar/HistoryPanel';
import { FolderSwitcher } from './sidebar/FolderSwitcher';
import { TabBar } from './editor/TabBar';
import { Toast } from './common/Toast';
import { TitleBar } from './titlebar/TitleBar';
import { RepoConnectDialog } from './git/RepoConnectDialog';
import { useFileAutoReload, useFileWatcher } from '../hooks/useFileWatcher';
import type { Tab } from '@shared/types/entities';
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
  unregisterHelpShortcuts,
  registerSearchShortcuts,
  unregisterSearchShortcuts
} from '../services/keyboard-handler';
import { ShortcutsReference } from './help/ShortcutsReference';
import { About } from './help/About';
import { FindBar } from './search/FindBar'; // T008: Import FindBar component
import { SearchResults } from './search/SearchResults'; // T035: Import SearchResults component
import { useSearchStore } from '../stores/search'; // T009: Import search store
import {
  registerFileCommands,
  registerNavigationCommands,
  registerViewCommands,
  registerSearchCommands,
  registerApplicationCommands,
} from '../services/command-service';
import { generateDirectFileTabId, generateFolderFileTabId, generateRepoFileTabId } from '../utils/tab-id';
import { removeFromConnectionHistory } from '../utils/connection-history';
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
  const { addRecent, removeRecent, removeFavorite } = useRecentsFavorites();
  const [fileTreeKey, setFileTreeKey] = useState(0); // Key to force FileTree re-render
  const [revealFilePath, setRevealFilePath] = useState<string | null>(null); // File to reveal in sidebar

  // Sidebar view state: 'files', 'history', or 'search'
  const [sidebarView, setSidebarView] = useState<'files' | 'history' | 'search'>('files');

  // Sidebar width state (resizable)
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const minSidebarWidth = 150;
  const maxSidebarWidth = 600;

  // Home view state - tracks if home page is active
  const [showHome, setShowHome] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'warning' | 'error' | 'success' } | null>(null);

  // Shortcuts reference state
  const [showShortcuts, setShowShortcuts] = useState(false);

  // About dialog state
  const [showAbout, setShowAbout] = useState(false);

  // Repository connect dialog state
  const [showRepoConnect, setShowRepoConnect] = useState(false);

  // T009: Search bar visibility state
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);

  // T009: Access search store for find-in-page functionality
  const searchStore = useSearchStore();

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

  // T011: Implement handleSearch callback for FindBar
  const handleSearch = useCallback((query: string, options: { caseSensitive: boolean; wholeWord: boolean; useRegex: boolean }) => {
    console.log('[AppLayout] handleSearch called:', { query, options, currentContent: currentContent?.length });

    if (!query || !currentContent) {
      return { currentIndex: 0, totalMatches: 0 };
    }

    try {
      let searchPattern: RegExp;

      if (options.useRegex) {
        // User provided regex pattern
        const flags = options.caseSensitive ? 'g' : 'gi';
        searchPattern = new RegExp(query, flags);
      } else {
        // Escape special regex characters for literal search
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = options.wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
        const flags = options.caseSensitive ? 'g' : 'gi';
        searchPattern = new RegExp(pattern, flags);
      }

      // Find all matches
      const matches = Array.from(currentContent.matchAll(searchPattern));

      console.log('[AppLayout] Search found matches:', matches.length);

      return {
        currentIndex: matches.length > 0 ? 0 : -1,
        totalMatches: matches.length
      };
    } catch (error) {
      console.error('[AppLayout] Search error:', error);
      return { currentIndex: 0, totalMatches: 0 };
    }
  }, [currentContent]);

  // T016: Handle find next match
  const handleFindNext = useCallback(() => {
    console.log('[AppLayout] handleFindNext called');
    const { findInPageCurrentIndex, findInPageTotalMatches } = searchStore;

    if (findInPageTotalMatches > 0) {
      const nextIndex = (findInPageCurrentIndex + 1) % findInPageTotalMatches;
      searchStore.setFindInPageResults(nextIndex, findInPageTotalMatches);
    }
  }, [searchStore]);

  // T016: Handle find previous match
  const handleFindPrevious = useCallback(() => {
    console.log('[AppLayout] handleFindPrevious called');
    const { findInPageCurrentIndex, findInPageTotalMatches } = searchStore;

    if (findInPageTotalMatches > 0) {
      const prevIndex = findInPageCurrentIndex === 0
        ? findInPageTotalMatches - 1
        : findInPageCurrentIndex - 1;
      searchStore.setFindInPageResults(prevIndex, findInPageTotalMatches);
    }
  }, [searchStore]);

  // T013: Handle closing FindBar
  const handleCloseFindBar = useCallback(() => {
    console.log('[AppLayout] handleCloseFindBar called');
    setIsSearchBarVisible(false);
    searchStore.clearFindInPage();
  }, [searchStore]);

  // T040: Handle multi-file search
  const handleSearchInFiles = useCallback(async (query: string) => {
    console.log('[AppLayout] handleSearchInFiles called:', query);

    if (!query.trim()) {
      return;
    }

    // Determine the folder or repository to search
    let folderPath: string | undefined;
    let repositoryId: string | undefined;
    let branch: string | undefined;
    let activeFolder: Folder | undefined;

    // Priority: active folder > tab's folder > direct file's folder
    if (activeFolderId) {
      activeFolder = folders.find(f => f.id === activeFolderId);
      folderPath = activeFolder?.path;
    } else if (activeTab && !activeTab.isDirectFile) {
      // Tab is from a folder
      const tabFolderId = activeTab.folderId;
      if (tabFolderId) {
        activeFolder = folders.find(f => f.id === tabFolderId);
        folderPath = activeFolder?.path;
      }
    } else if (currentFile) {
      // Direct file - use its parent directory
      const path = window.require('path');
      folderPath = path.dirname(currentFile);
    }

    if (!folderPath && !activeFolder) {
      setToast({
        message: 'No folder is open. Please open a folder to search files.',
        type: 'warning',
      });
      return;
    }

    // Check if this is a repository folder
    if (activeFolder?.type === 'repository') {
      repositoryId = activeFolder.repositoryId;
      branch = activeFolder.currentBranch;
      folderPath = undefined; // Clear folderPath for repository search
    }

    try {
      // T051, T052, T053, T056: Enhanced search with scope support
      const scope = searchStore.searchInFilesOptions.repositoryScope;
      let folderPaths: string[] | undefined;
      let folderScope: 'current' | 'allOpen' | 'allBranches' = 'current';

      // Determine search scope and collect folder paths
      if (scope === 'allRepos') {
        // T056: Search all open folders
        folderScope = 'allOpen';
        folderPaths = folders
          .filter(f => f.type === 'local' && f.path)
          .map(f => f.path!);

        if (folderPaths.length === 0) {
          setToast({
            message: 'No folders are open. Please open folders to search.',
            type: 'warning',
          });
          return;
        }

        console.log('[AppLayout] Multi-folder search across', folderPaths.length, 'folders');
      } else if (scope === 'allBranches') {
        // T053: Search all Git branches (worktrees)
        folderScope = 'allBranches';
        console.log('[AppLayout] Multi-branch search in', folderPath);
      } else {
        // Default: current folder
        folderScope = 'current';
      }

      // T041: Call IPC to start search (supports folder, repository, and multi-folder/branch)
      const response = await window.search.inFiles({
        query,
        folderPath,
        folderPaths,
        folderScope,
        repositoryId,
        branch,
        options: searchStore.searchInFilesOptions,
        maxResults: 1000,
      });

      if (!response.success) {
        console.error('[AppLayout] Search failed:', response.error);
        setToast({
          message: `Search failed: ${response.error}`,
          type: 'error',
        });
        return;
      }

      console.log('[AppLayout] Search started with ID:', response.searchId);

      // Initialize the search in the store
      searchStore.startSearch(response.searchId, query, 'inFiles');

      // Results will be updated via IPC events
    } catch (error: any) {
      console.error('[AppLayout] Search error:', error);
      setToast({
        message: `Search error: ${error.message}`,
        type: 'error',
      });
    }
  }, [activeFolderId, activeTab, currentFile, folders, searchStore, setToast]);

  // T042: Handle search cancellation
  const handleCancelSearch = useCallback(async () => {
    console.log('[AppLayout] handleCancelSearch called');

    const { activeSearch } = searchStore;
    if (!activeSearch || !activeSearch.isActive) {
      return;
    }

    try {
      await window.search.cancel(activeSearch.searchId);
      console.log('[AppLayout] Search cancelled');
    } catch (error: any) {
      console.error('[AppLayout] Cancel search error:', error);
    }
  }, [searchStore]);

  // T038: Handle search panel close
  const handleCloseSearchPanel = useCallback(() => {
    setSidebarView('files'); // Switch back to files view
    // Cancel search if active
    if (searchStore.activeSearch?.isActive) {
      handleCancelSearch();
    }
  }, [searchStore.activeSearch, handleCancelSearch]);

  // Handle sidebar resize
  const handleSidebarResize = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.min(maxSidebarWidth, Math.max(minSidebarWidth, startWidth + deltaX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth, minSidebarWidth, maxSidebarWidth]);

  // T045, T046: Handle search result click with highlighting
  const handleSearchResultClick = useCallback(async (filePath: string, lineNumber: number, event: React.MouseEvent, folderInfo?: { repository?: string; branch?: string }) => {
    console.log('[AppLayout] Search result clicked:', filePath, lineNumber, 'ctrlKey:', event.ctrlKey || event.metaKey, 'folderInfo:', folderInfo);

    try {
      setError(null);
      setIsLoading(true);

      // Find the folder that contains this file
      const { folders: allFolders, setActiveFolder } = useFoldersStore.getState();
      let targetFolderId = activeFolderId;

      // Try to find the folder that contains this file
      const matchingFolder = allFolders.find(folder => {
        // Check if the file path starts with the folder path
        return filePath.startsWith(folder.path);
      });

      if (matchingFolder && matchingFolder.id !== activeFolderId) {
        // Switch to the folder that contains this file
        console.log('[AppLayout] Switching to folder:', matchingFolder.displayName, matchingFolder.id);
        setActiveFolder(matchingFolder.id);
        targetFolderId = matchingFolder.id;
      }

      // Read file content
      const response = await window.electronAPI.file.read({ filePath });

      if (!response.success) {
        throw new Error(response.error || 'Failed to read file');
      }

      const fileContent = response.content;
      setIsLoading(false);
      contentLoadedManually.current = true;

      // Get tab store state
      const { activeTabId: globalActiveTabId, tabs, addTab, setActiveTab, addHistoryEntry, updateTabZoomLevel } = useTabsStore.getState();

      // Find a tab that belongs to the target folder
      let activeTabId = globalActiveTabId;
      if (targetFolderId && targetFolderId !== activeFolderId) {
        // Look for tabs that belong to the target folder
        const folderTabs = Array.from(tabs.values()).filter(tab => tab.folderId === targetFolderId);

        if (folderTabs.length > 0) {
          // Use the first tab from the target folder
          activeTabId = folderTabs[0].id;
          setActiveTab(activeTabId);
          console.log('[AppLayout] Using existing tab from target folder:', activeTabId);
        } else {
          // No tabs for this folder, will create one below
          activeTabId = null;
          console.log('[AppLayout] No tabs found for target folder, will create new tab');
        }
      }

      // Check if Ctrl/Cmd is pressed for opening in new tab
      const openInNewTab = event.ctrlKey || event.metaKey;

      if (openInNewTab) {
        // Create a new tab for this file
        const fileName = filePath.split(/[/\\]/).pop() || 'Untitled';
        const newTabId = `search-result-${Date.now()}`;

        const newTab: Tab = {
          id: newTabId,
          filePath: filePath,
          title: fileName,
          folderId: targetFolderId || null,
          isDirectFile: !targetFolderId,
          scrollPosition: 0,
          scrollLeft: 0,
          zoomLevel: 100,
          searchState: null,
          modificationTimestamp: Date.now(),
          isDirty: false,
          renderCache: null,
          navigationHistory: [{
            filePath: filePath,
            scrollPosition: 0,
            scrollLeft: 0,
            zoomLevel: 100,
            timestamp: Date.now(),
          }],
          currentHistoryIndex: 0,
          forwardHistory: [],
          createdAt: Date.now(),
        };

        addTab(newTab);
        setActiveTab(newTabId);
        setShowHome(false);
        setCurrentFile(filePath);
        contentCacheRef.current.set(filePath, fileContent);
        setCurrentContent(fileContent);
      } else {
        // Navigate in current tab (or create one if none exists)
        if (!activeTabId) {
          // No active tab, create one
          const fileName = filePath.split(/[/\\]/).pop() || 'Untitled';
          const newTabId = `search-result-${Date.now()}`;

          const newTab: Tab = {
            id: newTabId,
            filePath: filePath,
            title: fileName,
            folderId: targetFolderId || null,
            isDirectFile: !targetFolderId,
            scrollPosition: 0,
            scrollLeft: 0,
            zoomLevel: 100,
            searchState: null,
            modificationTimestamp: Date.now(),
            isDirty: false,
            renderCache: null,
            navigationHistory: [{
              filePath: filePath,
              scrollPosition: 0,
              scrollLeft: 0,
              zoomLevel: 100,
              timestamp: Date.now(),
            }],
            currentHistoryIndex: 0,
            forwardHistory: [],
            createdAt: Date.now(),
          };

          addTab(newTab);
          setActiveTab(newTabId);
          setShowHome(false);
        } else {
          // Update existing tab
          const currentTab = tabs.get(activeTabId);

          if (currentTab && currentTab.filePath !== filePath) {
            // Save current file's state to history
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

            // Add new file to history
            addHistoryEntry(activeTabId, {
              filePath: filePath,
              scrollPosition: 0,
              scrollLeft: 0,
              zoomLevel: 100,
              timestamp: Date.now(),
            });

            // Reset zoom for new file
            updateTabZoomLevel(activeTabId, 100);
          }

          // Get fresh tabs after history updates
          const { tabs: freshTabs } = useTabsStore.getState();
          const freshTab = freshTabs.get(activeTabId);

          // Update tab's file path and title
          if (freshTab) {
            const fileName = filePath.split(/[/\\]/).pop() || 'Untitled';
            const updatedTab: Tab = {
              ...freshTab,
              filePath: filePath,
              title: fileName,
              folderId: targetFolderId || freshTab.folderId,
            };
            freshTabs.set(activeTabId, updatedTab);
            useTabsStore.setState({ tabs: new Map(freshTabs) });
          }
        }

        setCurrentFile(filePath);
        contentCacheRef.current.set(filePath, fileContent);
        setCurrentContent(fileContent);
      }

      // Activate FindBar with search query and highlighting
      const { activeSearch } = searchStore;
      if (activeSearch && activeSearch.query) {
        // Find the search result for this file
        const fileResult = activeSearch.results.find(r => r.filePath === filePath);
        let matchIndex = 0;

        if (fileResult) {
          // Find the index of the match with the clicked line number
          const matchIndexInFile = fileResult.matches.findIndex(m => m.lineNumber === lineNumber);
          if (matchIndexInFile >= 0) {
            matchIndex = matchIndexInFile;
          }
        }

        // Set all search state together after content is rendered
        // This prevents the effect from running with default currentIndex=0 before the correct index is set
        setTimeout(() => {
          // Set the search query in FindBar store
          searchStore.setFindInPageQuery(activeSearch.query);

          // Copy search options from multi-file search to in-page search
          searchStore.setFindInPageOptions({
            caseSensitive: searchStore.searchInFilesOptions.caseSensitive,
            wholeWord: searchStore.searchInFilesOptions.wholeWord,
            useRegex: searchStore.searchInFilesOptions.useRegex,
          });

          // Set the match index and total matches
          const totalMatches = fileResult?.matches.length || 0;
          searchStore.setFindInPageResults(matchIndex, totalMatches);

          // Open FindBar to show highlighting (after setting results)
          setIsSearchBarVisible(true);
        }, 100);
      }

    } catch (err: any) {
      console.error('Failed to open search result file:', err);
      setError(err.message || 'Failed to open file');
      setIsLoading(false);
    }
  }, [searchStore, activeFolderId, setShowHome]);

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

  // Handle repository branch already open event from FolderSwitcher
  useEffect(() => {
    const handleBranchAlreadyOpen = (event: CustomEvent) => {
      const { folderId, displayName } = event.detail;

      console.log('[AppLayout] Branch already open event received:', { folderId, displayName });

      // Find and activate the first tab for this folder
      const { tabs, setActiveTab } = useTabsStore.getState();
      const folderTabs = Array.from(tabs.values()).filter(tab => tab.folderId === folderId);

      if (folderTabs.length > 0) {
        // Activate the first tab
        setActiveTab(folderTabs[0].id);
        setCurrentFile(folderTabs[0].filePath);
        setShowHome(false);

        setToast({
          message: `${displayName} is already open. Switched to existing tab.`,
          type: 'info',
        });
      } else {
        // Folder exists but no tabs
        setToast({
          message: `${displayName} is already open. Folder activated.`,
          type: 'info',
        });
      }
    };

    window.addEventListener('repository:branch-already-open', handleBranchAlreadyOpen as EventListener);
    return () => {
      window.removeEventListener('repository:branch-already-open', handleBranchAlreadyOpen as EventListener);
    };
  }, [setCurrentFile, setShowHome, setToast]);

  // Handle repository branch opened event from FolderSwitcher
  useEffect(() => {
    const handleBranchOpened = async (event: CustomEvent) => {
      const { folderId, repositoryId, branchName } = event.detail;

      console.log('[AppLayout] Branch opened event received:', { folderId, repositoryId, branchName });

      // Get fresh folders from store (not stale from component state)
      const { folders: freshFolders } = useFoldersStore.getState();

      // Find the folder that was just created
      const folder = freshFolders.find(f => f.id === folderId);
      if (!folder || folder.type !== 'repository') {
        console.error('[AppLayout] Folder not found or not a repository:', folderId);
        console.error('[AppLayout] Available folders:', freshFolders.map(f => ({ id: f.id, type: f.type })));
        return;
      }

      console.log('[AppLayout] Found folder:', { id: folder.id, displayName: folder.displayName, currentBranch: folder.currentBranch });

      // Fetch the file tree and open the first markdown file
      try {
        console.log('[AppLayout] Fetching tree for new branch:', branchName);
        const treeResult = await window.git?.repo?.fetchTree({
          repositoryId: repositoryId,
          branch: branchName,
          markdownOnly: true,
        });

        console.log('[AppLayout] Tree fetch result:', {
          success: treeResult?.success,
          hasTree: !!treeResult?.data?.tree,
          treeLength: treeResult?.data?.tree?.length,
        });

        if (treeResult?.success && treeResult.data?.tree) {
          // Find the first markdown file
          const findFirstMarkdownFile = (nodes: any[]): string | null => {
            const queue = [...nodes];
            while (queue.length > 0) {
              const levelSize = queue.length;
              for (let i = 0; i < levelSize; i++) {
                const node = queue.shift()!;
                if (node.type === 'file' && node.isMarkdown) {
                  return node.path;
                }
                if (node.children) {
                  queue.push(...node.children);
                }
              }
            }
            return null;
          };

          const firstFilePath = findFirstMarkdownFile(treeResult.data.tree);
          console.log('[AppLayout] First markdown file:', firstFilePath);

          if (firstFilePath) {
            // Fetch the first file's content
            const fileResult = await window.git?.repo?.fetchFile({
              repositoryId: repositoryId,
              filePath: firstFilePath,
              branch: branchName,
            });

            console.log('[AppLayout] File fetch result:', {
              success: fileResult?.success,
              hasData: !!fileResult?.data,
            });

            if (fileResult?.success && fileResult.data) {
              const { tabs, addTab, setActiveTab } = useTabsStore.getState();

              console.log('[AppLayout] Creating tab for new branch:', branchName);

              // Check ALL tabs for one matching this file in this repository folder context
              const existingTab = Array.from(tabs.values()).find(t =>
                t.filePath === firstFilePath && t.folderId === folderId
              );

              if (existingTab) {
                // Tab already exists, just set it as active
                setActiveTab(existingTab.id);
                console.log('[AppLayout] Reusing existing tab:', {
                  tabId: existingTab.id,
                  folderId: existingTab.folderId,
                  filePath: existingTab.filePath,
                });
              } else {
                // Generate deterministic tab ID for repo file
                const tabId = generateRepoFileTabId(repositoryId, branchName, firstFilePath);

                // Create a tab for this file
                const fileName = firstFilePath.split('/').pop() || 'Untitled';
                const newTab = {
                  id: tabId,
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
                  currentHistoryIndex: 0,
                  forwardHistory: [],
                  createdAt: Date.now(),
                  folderId: folderId,
                  isDirectFile: false,
                };

                addTab(newTab);
                setActiveTab(newTab.id);
                setShowHome(false); // Hide home page and show file viewer

                console.log('[AppLayout] Tab created:', {
                  tabId: newTab.id,
                  folderId: newTab.folderId,
                  filePath: newTab.filePath,
                });
              }

              // Set the file content
              setCurrentFile(firstFilePath);
              contentCacheRef.current.set(firstFilePath, fileResult.data.content);
              setCurrentContent(fileResult.data.content);
              setError(null);

              console.log('[AppLayout] File content set for new branch tab');
            }
          }
        }
      } catch (err) {
        console.error('[AppLayout] Error loading branch file:', err);
      }
    };

    window.addEventListener('repository:branch-opened', handleBranchOpened as EventListener);
    return () => {
      window.removeEventListener('repository:branch-opened', handleBranchOpened as EventListener);
    };
  }, [setCurrentFile, setCurrentContent, setError]);

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

  // Listen for connect-repository events from File Menu and Folder Switcher
  useEffect(() => {
    const handleConnectRepository = () => {
      setShowRepoConnect(true);
    };

    window.addEventListener('menu:connect-repository', handleConnectRepository);
    return () => {
      window.removeEventListener('menu:connect-repository', handleConnectRepository);
    };
  }, []);

  // T010: Register CTRL+F event listener for find-in-page
  useEffect(() => {
    const handleFindInPage = () => {
      console.log('[AppLayout] Find in page triggered (CTRL+F)');
      setIsSearchBarVisible(true);
    };

    window.addEventListener('menu:find', handleFindInPage);
    return () => {
      window.removeEventListener('menu:find', handleFindInPage);
    };
  }, []);

  // T037: Register CTRL+SHIFT+F event listener for find-in-files
  useEffect(() => {
    const handleFindInFiles = () => {
      console.log('[AppLayout] Find in files triggered (CTRL+SHIFT+F)');
      setShowSidebar(true); // Ensure sidebar is visible
      setSidebarView('search'); // Switch to search view
    };

    window.addEventListener('menu:find-in-files', handleFindInFiles);
    return () => {
      window.removeEventListener('menu:find-in-files', handleFindInFiles);
    };
  }, []);

  // T041-T044: Wire up IPC event listeners for multi-file search
  useEffect(() => {
    console.log('[AppLayout] Registering search IPC event listeners');

    // T041: Individual search results
    const unsubscribeResult = window.search.onResult((event) => {
      console.log('[AppLayout] Search result:', event);
      searchStore.addSearchResult(event.searchId, event.result);
    });

    // T041: Progress updates
    const unsubscribeProgress = window.search.onProgress((event) => {
      console.log('[AppLayout] Search progress:', event);
      searchStore.updateSearchProgress(
        event.searchId,
        event.filesSearched,
        event.totalFiles,
        event.resultsFound
      );
    });

    // T043: Search completion
    const unsubscribeComplete = window.search.onComplete((event) => {
      console.log('[AppLayout] Search complete:', event);
      searchStore.completeSearch(event.searchId, event.totalMatches);
      // Results are shown in the search panel, no need for toast notification
    });

    // T044: Search errors
    const unsubscribeError = window.search.onError((event) => {
      console.error('[AppLayout] Search error:', event);

      setToast({
        message: `Search error: ${event.error}`,
        type: 'error',
      });
    });

    return () => {
      console.log('[AppLayout] Unregistering search IPC event listeners');
      unsubscribeResult();
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, [searchStore, setToast]);

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
      onFindNext: handleFindNext,
      onFindPrevious: handleFindPrevious,
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
  }, [handleFindNext, handleFindPrevious]);

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
      // Skip repositories - they handle tab creation differently
      const activeFolder = folders.find(f => f.id === activeFolderId);
      if (activeFolder && activeFolder.type !== 'repository') {
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
          const newTitle = `${dirName}/`;
          console.log('[DirectoryListing] Setting tab title:', { directoryPath, dirName, newTitle, virtualPath });
          const updatedTab = {
            ...freshTab, // Use fresh tab with updated history!
            filePath: virtualPath,
            title: newTitle, // Add forward slash to indicate directory
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

    // Mouse back/forward button support
    const handleMouseButtons = (event: MouseEvent) => {
      // Button 3 = Back, Button 4 = Forward
      if (event.button === 3) {
        event.preventDefault();
        handleNavigateBack();
      } else if (event.button === 4) {
        event.preventDefault();
        handleNavigateForward();
      }
    };

    window.addEventListener('mouseup', handleMouseButtons);

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

    // Register search shortcuts (Ctrl+F, F3, Shift+F3, Ctrl+Shift+F)
    registerSearchShortcuts({
      onFindInPage: () => {
        setIsSearchBarVisible(true);
      },
      onFindNext: handleFindNext,
      onFindPrevious: handleFindPrevious,
      onFindInFiles: () => {
        window.dispatchEvent(new CustomEvent('menu:find-in-files'));
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

    // Handle view folder directory from file tree context menu
    const handleViewFolderDirectory = async (event: Event) => {
      const customEvent = event as CustomEvent<{ folderPath: string }>;
      const { folderPath } = customEvent.detail;

      console.log('[AppLayout] Viewing folder directory:', folderPath);

      try {
        // Get directory listing
        const listingResult = await window.electronAPI?.file?.getDirectoryListing({
          directoryPath: folderPath,
        });

        if (listingResult?.success && listingResult.items) {
          // Generate markdown content for directory listing
          const dirName = folderPath.split(/[/\\]/).pop() || 'Directory';
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

          // Create virtual file path for directory index
          const virtualFilePath = `${folderPath}/[Directory Index]`;

          // Dispatch show-directory-listing event
          window.dispatchEvent(new CustomEvent('show-directory-listing', {
            detail: {
              directoryPath: folderPath,
              content: markdown,
              virtualPath: virtualFilePath,
            }
          }));
        } else {
          console.error('[AppLayout] Failed to get directory listing:', listingResult?.error);
        }
      } catch (error) {
        console.error('[AppLayout] Error viewing folder directory:', error);
      }
    };

    window.addEventListener('open-file-in-new-tab', handleOpenFileInNewTab);
    window.addEventListener('open-file-in-new-window', handleOpenFileInNewWindow);
    window.addEventListener('reveal-in-sidebar', handleRevealInSidebar);
    window.addEventListener('view-folder-directory', handleViewFolderDirectory);

    return () => {
      unregisterHistoryShortcuts();
      unregisterTabShortcuts();
      unregisterFileShortcuts();
      unregisterHelpShortcuts();
      unregisterSearchShortcuts();
      window.removeEventListener('mouseup', handleMouseButtons);
      window.removeEventListener('navigate-to-history', handleNavigateToHistory);
      window.removeEventListener('show-directory-listing', handleShowDirectoryListing);
      window.removeEventListener('open-file-in-new-tab', handleOpenFileInNewTab);
      window.removeEventListener('open-file-in-new-window', handleOpenFileInNewWindow);
      window.removeEventListener('reveal-in-sidebar', handleRevealInSidebar);
      window.removeEventListener('view-folder-directory', handleViewFolderDirectory);
    };
  }, [handleFindNext, handleFindPrevious]);

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
   *
   * @param filePath - Path to the file
   * @param content - File content
   * @param forceContext - Force a specific context ('direct' or 'folder'), useful when opening from home page
   */
  const handleFileOpened = async (filePath: string, content: string, forceContext?: 'direct' | 'folder') => {
    setCurrentFile(filePath);
    contentCacheRef.current.set(filePath, content);
    setCurrentContent(content);
    setError(null);

    // T063: Create a tab for this file with deterministic ID based on context
    const { tabs, addTab, setActiveTab } = useTabsStore.getState();
    const fileName = filePath.split(/[/\\]/).pop() || 'Untitled';

    // Determine the context for this file
    const shouldUseFolderContext = forceContext === 'folder' || (forceContext !== 'direct' && activeFolderId);
    const contextFolderId = shouldUseFolderContext && activeFolderId ? activeFolderId : null;

    // Check ALL tabs to find one that matches BOTH file path AND context
    // This allows the same file to exist in different contexts (direct vs folder)
    const existingTab = Array.from(tabs.values()).find(t =>
      t.filePath === filePath && t.folderId === contextFolderId
    );

    if (existingTab) {
      // Tab already exists for this file in this context, just switch to it
      setActiveTab(existingTab.id);
      setShowHome(false); // Hide home page and show file viewer
      return;
    }

    // No existing tab found, create new one with appropriate context
    const tabId = contextFolderId
      ? generateFolderFileTabId(contextFolderId, filePath)
      : generateDirectFileTabId(filePath);

    // Create new tab with deterministic ID
    const newTab = {
      id: tabId,
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
      folderId: shouldUseFolderContext && activeFolderId ? activeFolderId : null,
      isDirectFile: !shouldUseFolderContext, // Mark as direct file based on context
    };
    addTab(newTab);
    setActiveTab(newTab.id); // Activate the newly created tab
    setShowHome(false); // Hide home page and show file viewer

    // T017: Track file in recents
    try {
      const fileName = filePath.split(/[/\\]/).pop() || 'Untitled';
      await recentsFavoritesService.addRecent({
        path: filePath,
        type: 'file',
        lastOpened: Date.now(),
        displayName: fileName
      });
    } catch (error) {
      console.error('[AppLayout] Failed to track file in recents:', error);
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
      // Limit depth to 5 levels to prevent hanging on large directories
      const result = await window.electronAPI?.file?.getFolderTree({
        folderPath,
        includeHidden: false,
        maxDepth: 5,
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
            // Check ALL tabs for one matching this file in this folder context
            const existingTab = Array.from(tabs.values()).find(t =>
              t.filePath === firstFilePath && t.folderId === folderId
            );

            if (existingTab) {
              // Tab already exists, just set it as active
              const { setActiveTab } = useTabsStore.getState();
              setActiveTab(existingTab.id);
              setShowHome(false); // Hide home page and show file viewer
            } else {
              // Generate deterministic tab ID for this folder file
              const tabId = generateFolderFileTabId(folderId, firstFilePath);
              // Create new tab
              const fileName = firstFilePath.split(/[/\\]/).pop() || 'Untitled';
              const newTab = {
                id: tabId,
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
              setShowHome(false); // Hide home page and show file viewer
            }
          }
        } else {
          // No markdown files found - create a tab showing folder overview
          console.log('No markdown files found in folder, creating overview tab');

          const folderName = folderPath.split(/[/\\]/).pop() || 'Folder';
          const overviewPath = `${folderPath}/[Folder Overview]`;

          // Check ALL tabs for folder overview in this folder context
          const existingTab = Array.from(tabs.values()).find(t =>
            t.filePath === overviewPath && t.folderId === folderId
          );

          if (!existingTab) {
            // Generate deterministic tab ID for folder overview
            const tabId = generateFolderFileTabId(folderId, overviewPath);
            const newTab = {
              id: tabId,
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
          } else {
            // Tab already exists, just set it as active
            const { setActiveTab } = useTabsStore.getState();
            setActiveTab(existingTab.id);
          }

          // Set empty content with a message
          setCurrentFile(overviewPath);
          setCurrentContent(`# ${folderName}\n\n*This folder contains no markdown files.*\n\nCreate a markdown file to get started.`);
          setError(null);
        }
      }

      // T018: Track folder in recents
      // Skip repositories - they should be tracked separately as 'repo' type
      const { folders: allFolders } = useFoldersStore.getState();
      const isRepository = allFolders.find(f => f.path === folderPath && f.type === 'repository');

      if (!isRepository) {
        try {
          const folderName = folderPath.split(/[/\\]/).pop() || 'Folder';
          await recentsFavoritesService.addRecent({
            path: folderPath,
            type: 'folder',
            lastOpened: Date.now(),
            displayName: folderName
          });
        } catch (error) {
          console.error('[AppLayout] Failed to track folder in recents:', error);
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

      // Check if content is already cached (e.g., from directory listing)
      const cachedContent = contentCacheRef.current.get(fileToLoad);
      if (cachedContent !== undefined) {
        console.log('[AppLayout] Using cached content for:', fileToLoad);
        setCurrentContent(cachedContent);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Check if active tab belongs to a repository folder
        const activeFolder = activeTab?.folderId
          ? folders.find(f => f.id === activeTab.folderId)
          : null;

        console.log('[AppLayout] loadFile - activeFolder check:', {
          fileToLoad,
          hasActiveTab: !!activeTab,
          activeFolderId: activeTab?.folderId,
          foundFolder: !!activeFolder,
          folderType: activeFolder?.type,
          isRepository: activeFolder?.type === 'repository',
          hasGitAPI: !!window.git,
          repositoryId: activeFolder?.repositoryId,
          currentBranch: activeFolder?.currentBranch,
        });

        let result;
        if (activeFolder?.type === 'repository') {
          // Load file from repository using Git API
          console.log('[AppLayout] Using Git API to fetch file:', {
            repositoryId: activeFolder.repositoryId,
            filePath: fileToLoad,
            branch: activeFolder.currentBranch,
          });

          result = await window.git?.repo?.fetchFile({
            repositoryId: activeFolder.repositoryId!,
            filePath: fileToLoad,
            branch: activeFolder.currentBranch!,
          });

          console.log('[AppLayout] Git API result:', {
            success: result?.success,
            hasData: !!result?.data,
            hasContent: !!(result?.data?.content || result?.content),
            error: result?.error,
          });
        } else {
          // Load file from local file system
          console.log('[AppLayout] Using file system API to read file:', fileToLoad);
          result = await window.electronAPI?.file?.read({ filePath: fileToLoad });
        }

        // Only update content if this is still the current file being displayed
        if (loadingFileRef.current === fileToLoad && currentFile === fileToLoad) {
          if (result?.success && (result.content || result.data?.content)) {
            const content = result.content || result.data.content;
            // Cache the content by filePath
            contentCacheRef.current.set(fileToLoad, content);
            setCurrentContent(content);
            console.log('[AppLayout] Cached content for:', fileToLoad, 'length:', content.length);
          } else {
            setError(result?.error?.message || result?.error || 'Failed to load file');
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
  }, [currentFile, activeTab, folders]);

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
    activeFolderId,
    foldersCount: folders.length,
    tabsCount: tabs.size,
  });

  return (
    <div className="app-layout">
      {/* T159: Custom Title Bar */}
      <TitleBar />

      <div className="app-layout__content">
        {/* Only show sidebar if there are tabs or folders */}
        {showSidebar && hasContent && (
          <div
            className={`sidebar ${sidebarWidth < 200 ? 'sidebar--narrow' : ''}`}
            style={{ width: `${sidebarWidth}px` }}
          >
            <div className="sidebar-header">
            {/* T111-T113: Folder Switcher */}
            {folders.length > 0 && <FolderSwitcher onFolderOpened={handleFolderOpened} />}

            {/* Sidebar view toggle: Files / History / Search */}
            {tabs.size > 0 && (
              <div className="sidebar-view-toggle">
                <button
                  className={`sidebar-view-toggle__button ${sidebarView === 'files' ? 'sidebar-view-toggle__button--active' : ''}`}
                  onClick={() => setSidebarView('files')}
                  title="Show File Tree"
                  type="button"
                  data-sidebar-width={sidebarWidth}
                >
                  <span className="sidebar-view-toggle__icon">📁</span>
                  <span className="sidebar-view-toggle__text">Files</span>
                </button>
                <button
                  className={`sidebar-view-toggle__button ${sidebarView === 'history' ? 'sidebar-view-toggle__button--active' : ''}`}
                  onClick={() => setSidebarView('history')}
                  title="Show Navigation History"
                  type="button"
                  data-sidebar-width={sidebarWidth}
                >
                  <span className="sidebar-view-toggle__icon">🕐</span>
                  <span className="sidebar-view-toggle__text">History</span>
                </button>
                <button
                  className={`sidebar-view-toggle__button ${sidebarView === 'search' ? 'sidebar-view-toggle__button--active' : ''}`}
                  onClick={() => setSidebarView('search')}
                  title="Search in Files"
                  type="button"
                  data-sidebar-width={sidebarWidth}
                >
                  <span className="sidebar-view-toggle__icon">🔍</span>
                  <span className="sidebar-view-toggle__text">Search</span>
                </button>
              </div>
            )}
          </div>
          <div className="sidebar-content">
            {/* Show Search Panel when search view is active */}
            {sidebarView === 'search' && (
              <SearchResults
                isVisible={true}
                onClose={handleCloseSearchPanel}
                onSearch={handleSearchInFiles}
                onCancel={handleCancelSearch}
                onResultClick={handleSearchResultClick}
              />
            )}

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

              console.log('[AppLayout] Sidebar files view - checking modes:', {
                tabsCount: tabs.size,
                activeFolderId,
                isDirectFile,
                activeTabFolderId: activeTab?.folderId,
              });

              // Mode 1: Nothing open (no tabs AND no active folder)
              if (tabs.size === 0 && !activeFolderId) {
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
              console.log('[AppLayout] Mode 3 check - activeFolderId:', activeFolderId);
              if (activeFolderId) {
                console.log('[AppLayout] Rendering FileTree for folder:', activeFolderId);
                return (
                  <FileTree
                    key={fileTreeKey}
                    folderId={activeFolderId}
                    revealFilePath={revealFilePath}
                    onFileSelect={async (filePath) => {
                      try {
                        // Single click: Navigate within current tab, add to history
                        const activeFolder = folders.find(f => f.id === activeFolderId);
                        let fileContent: string | null = null;

                        console.log('[AppLayout] onFileSelect - navigating to:', filePath);

                        if (activeFolder?.type === 'repository') {
                          // Load file from repository using Git API
                          const result = await window.git?.repo?.fetchFile({
                            repositoryId: activeFolder.repositoryId!,
                            filePath: filePath,
                            branch: activeFolder.currentBranch!,
                          });

                          if (result?.success && result.data) {
                            fileContent = result.data.content;
                          }
                        } else {
                          // Load file from local file system
                          const result = await window.electronAPI?.file?.read({ filePath });
                          if (result?.success && result.content) {
                            fileContent = result.content;
                          }
                        }

                        if (fileContent) {
                          contentLoadedManually.current = true;
                          setIsLoading(false);
                          setError(null);

                          // Add to current tab's history
                          const { activeTabId, tabs, addHistoryEntry, updateTabZoomLevel } = useTabsStore.getState();

                          if (activeTabId) {
                            const currentTab = tabs.get(activeTabId);

                            // Add the NEW file to history if navigating to a different file
                            if (currentTab && currentTab.filePath && currentTab.filePath !== filePath) {
                              // Save current file's state to history
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

                              // Add new file to history
                              addHistoryEntry(activeTabId, {
                                filePath: filePath,
                                scrollPosition: 0,
                                scrollLeft: 0,
                                zoomLevel: 100,
                                timestamp: Date.now(),
                              });

                              // Reset zoom for new file
                              updateTabZoomLevel(activeTabId, 100);
                            }
                          }

                          // Update file and content
                          setCurrentFile(filePath);
                          contentCacheRef.current.set(filePath, fileContent);
                          setCurrentContent(fileContent);

                          // Update active tab's file path
                          if (activeTabId) {
                            const { tabs: freshTabs } = useTabsStore.getState();
                            const freshTab = freshTabs.get(activeTabId);
                            if (freshTab) {
                              const fileName = filePath.split(/[/\\\/]/).pop() || 'Untitled';
                              const updatedTab = {
                                ...freshTab,
                                filePath: filePath,
                                title: fileName,
                                folderId: activeFolderId,
                              };
                              freshTabs.set(activeTabId, updatedTab);
                              useTabsStore.setState({ tabs: new Map(freshTabs) });
                            }
                          }
                        } else {
                          setError('Failed to load file');
                        }
                      } catch (error) {
                        console.error('[AppLayout] Error in onFileSelect:', error);
                        setError('Failed to load file');
                        setIsLoading(false);
                      }
                    }}
                    onFileOpen={async (filePath) => {
                      // Double-click: Same as single click (navigate within current tab)
                      // Trigger the same handler
                      const fileTree = document.querySelector('.file-tree');
                      if (fileTree) {
                        fileTree.dispatchEvent(new CustomEvent('file-select', { detail: { filePath } }));
                      }
                    }}
                  />
                );
              }

              // Fallback
              console.log('[AppLayout] Fallback - no folder selected, showing placeholder');
              return (
                <div className="sidebar-placeholder">
                  <p>No folder selected</p>
                  <p className="sidebar-hint">Open a folder to see files</p>
                </div>
              );
            })()}
          </div>
          <div className="sidebar-resize-handle" onMouseDown={handleSidebarResize}></div>
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
            <Home
              onFileOpened={handleFileOpened}
              onFolderOpened={handleFolderOpened}
              onConnectRepository={() => setShowRepoConnect(true)}
              onRepositoryConnected={async (connectedRepository) => {
                // Same logic as RepoConnectDialog's onConnected
                if (!connectedRepository) {
                  console.error('[AppLayout] No connected repository data received');
                  return;
                }

                console.log('[AppLayout] Repository connected from Home:', {
                  repositoryId: connectedRepository.repositoryId,
                  currentBranch: connectedRepository.currentBranch,
                  displayName: connectedRepository.displayName,
                });

                // Check if this repository/branch combination is already open
                const { folders, addFolder, setActiveFolder } = useFoldersStore.getState();
                const targetFolderId = `repo:${connectedRepository.repositoryId}:${connectedRepository.currentBranch}`;

                const existingFolder = folders.find(f => f.id === targetFolderId);

                if (existingFolder) {
                  // This exact repo/branch is already open - activate it
                  setActiveFolder(targetFolderId);

                  // Find and activate the first tab for this folder
                  const { tabs, setActiveTab } = useTabsStore.getState();
                  const folderTabs = Array.from(tabs.values()).filter(tab => tab.folderId === targetFolderId);

                  if (folderTabs.length > 0) {
                    setActiveTab(folderTabs[0].id);
                    setCurrentFile(folderTabs[0].filePath);
                    setShowHome(false);

                    setToast({
                      message: `${existingFolder.displayName} is already open. Switched to existing tab.`,
                      type: 'info',
                    });
                  } else {
                    setToast({
                      message: `${existingFolder.displayName} is already open. Folder activated.`,
                      type: 'info',
                    });
                  }

                  return;
                }

                // Check if same repository but different branch is open
                const sameRepoFolder = folders.find(
                  f => f.type === 'repository' && f.repositoryId === connectedRepository.repositoryId
                );

                if (sameRepoFolder) {
                  // Use openRepositoryBranch for consistency
                  const { openRepositoryBranch } = useFoldersStore.getState();
                  const newFolder = await openRepositoryBranch(
                    connectedRepository.repositoryId,
                    connectedRepository.currentBranch
                  );

                  if (newFolder) {
                    setToast({
                      message: `Opened ${connectedRepository.displayName} (${connectedRepository.currentBranch})`,
                      type: 'success',
                    });

                    // Track this branch in recents
                    try {
                      const pathWithBranch = `${connectedRepository.url}#${connectedRepository.currentBranch}`;
                      await addRecent({
                        path: pathWithBranch,
                        type: 'repo',
                        displayName: `${connectedRepository.displayName} (${connectedRepository.currentBranch})`
                      });
                    } catch (error) {
                      console.error('[AppLayout] Failed to track repository branch in recents:', error);
                    }
                  } else {
                    // Branch opening failed - remove from recents, favorites, and connection history
                    try {
                      const pathWithBranch = `${connectedRepository.url}#${connectedRepository.currentBranch}`;
                      await removeRecent(pathWithBranch, 'repo');
                      await removeFavorite(pathWithBranch, 'repo');
                      removeFromConnectionHistory(connectedRepository.url, connectedRepository.currentBranch);
                      console.log('[AppLayout] Removed unavailable repository branch from recents/favorites/history');
                    } catch (removeError) {
                      console.error('[AppLayout] Failed to remove unavailable repository branch:', removeError);
                    }

                    // Show error toast
                    setToast({
                      message: `This branch has been removed. Failed to load repository branch.`,
                      type: 'error',
                    });
                  }

                  return;
                }

                // Create a folder entry for the repository (first branch only)
                const repoFolder: Folder = {
                  id: `repo:${connectedRepository.repositoryId}:${connectedRepository.currentBranch}`,
                  path: connectedRepository.url,
                  displayName: `${connectedRepository.displayName} (${connectedRepository.currentBranch})`,
                  type: 'repository',
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
                  repositoryId: connectedRepository.repositoryId,
                  currentBranch: connectedRepository.currentBranch,
                  url: connectedRepository.url,
                };

                addFolder(repoFolder);
                setActiveFolder(repoFolder.id);

                // Fetch the file tree and open the first markdown file
                try {
                  console.log('[AppLayout] Home onRepositoryConnected - Fetching tree for branch:', connectedRepository.currentBranch);
                  const treeResult = await window.git?.repo?.fetchTree({
                    repositoryId: connectedRepository.repositoryId,
                    branch: connectedRepository.currentBranch,
                    markdownOnly: true,
                  });

                  console.log('[AppLayout] Home onRepositoryConnected - Tree fetch result:', {
                    success: treeResult?.success,
                    hasData: !!treeResult?.data,
                    hasTree: !!treeResult?.data?.tree,
                    treeLength: treeResult?.data?.tree?.length,
                  });

                  if (treeResult?.success && treeResult.data?.tree) {
                    // Find the first markdown file using breadth-first search
                    const findFirstMarkdownFile = (nodes: any[]): string | null => {
                      const queue = [...nodes];

                      while (queue.length > 0) {
                        const levelSize = queue.length;

                        // Process all nodes at current level before going deeper
                        for (let i = 0; i < levelSize; i++) {
                          const node = queue.shift()!;

                          // Check if this node is a markdown file
                          if (node.type === 'file' && node.isMarkdown) {
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

                    const firstFilePath = findFirstMarkdownFile(treeResult.data.tree);

                    console.log('[AppLayout] Home onRepositoryConnected - First markdown file:', firstFilePath);

                    if (firstFilePath) {
                      // Fetch the first file's content
                      console.log('[AppLayout] Home onRepositoryConnected - Fetching file content for:', firstFilePath);
                      const fileResult = await window.git?.repo?.fetchFile({
                        repositoryId: connectedRepository.repositoryId,
                        filePath: firstFilePath,
                        branch: connectedRepository.currentBranch,
                      });

                      console.log('[AppLayout] Home onRepositoryConnected - File fetch result:', {
                        success: fileResult?.success,
                        hasData: !!fileResult?.data,
                        error: fileResult?.error,
                      });

                      if (fileResult?.success && fileResult.data) {
                        const { tabs, addTab, setActiveTab } = useTabsStore.getState();

                        console.log('[AppLayout] Home onRepositoryConnected - Creating tab for branch:', connectedRepository.currentBranch);
                        console.log('[AppLayout] Home onRepositoryConnected - Folder ID:', repoFolder.id);
                        console.log('[AppLayout] Home onRepositoryConnected - Existing tabs count:', tabs.size);

                        // Check ALL tabs for one matching this file in this repository folder context
                        const existingTab = Array.from(tabs.values()).find(t =>
                          t.filePath === firstFilePath && t.folderId === repoFolder.id
                        );

                        if (existingTab) {
                          // Tab already exists, just set it as active
                          setActiveTab(existingTab.id);
                          console.log('[AppLayout] Home onRepositoryConnected - Reusing existing tab:', {
                            tabId: existingTab.id,
                            folderId: existingTab.folderId,
                            filePath: existingTab.filePath,
                          });
                        } else {
                          // Generate deterministic tab ID for repo file
                          const tabId = generateRepoFileTabId(
                            connectedRepository.repositoryId,
                            connectedRepository.currentBranch,
                            firstFilePath
                          );
                          // Create a tab for this file
                          const fileName = firstFilePath.split('/').pop() || 'Untitled';
                          const newTab = {
                            id: tabId,
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
                            currentHistoryIndex: 0,
                            forwardHistory: [],
                            createdAt: Date.now(),
                            folderId: repoFolder.id,
                            isDirectFile: false,
                          };

                          addTab(newTab);
                          setActiveTab(newTab.id);
                          setShowHome(false); // Hide home page and show file viewer

                          console.log('[AppLayout] Home onRepositoryConnected - Tab created and activated:', {
                            tabId: newTab.id,
                            folderId: newTab.folderId,
                            filePath: newTab.filePath,
                          });
                        }

                        // Set the file content
                        setCurrentFile(firstFilePath);
                        contentCacheRef.current.set(firstFilePath, fileResult.data.content);
                        setCurrentContent(fileResult.data.content);
                        setError(null);

                        console.log('[AppLayout] Home onRepositoryConnected - File content set for tab');

                        // Track repository in recents
                        try {
                          // Include branch in path so each branch is tracked separately
                          const pathWithBranch = `${connectedRepository.url}#${connectedRepository.currentBranch}`;
                          await addRecent({
                            path: pathWithBranch,
                            type: 'repo',
                            displayName: `${connectedRepository.displayName} (${connectedRepository.currentBranch})`
                          });
                        } catch (error) {
                          console.error('[AppLayout] Home onRepositoryConnected - Failed to track repository in recents:', error);
                        }
                      } else {
                        console.warn('[AppLayout] Home onRepositoryConnected - Failed to fetch file or no data:', fileResult?.error);
                      }
                    } else {
                      console.warn('[AppLayout] Home onRepositoryConnected - No markdown files found in tree');
                    }
                  } else {
                    console.warn('[AppLayout] Home onRepositoryConnected - Tree fetch failed or no data:', treeResult?.error);

                    // Tree fetch failed - clean up the failed connection
                    const { removeFolder } = useFoldersStore.getState();
                    removeFolder(repoFolder.id);

                    // Remove from recents, favorites, and connection history
                    try {
                      const pathWithBranch = `${connectedRepository.url}#${connectedRepository.currentBranch}`;
                      await removeRecent(pathWithBranch, 'repo');
                      await removeFavorite(pathWithBranch, 'repo');
                      removeFromConnectionHistory(connectedRepository.url, connectedRepository.currentBranch);
                      console.log('[AppLayout] Home onRepositoryConnected - Removed unavailable repository from recents/favorites/history');
                    } catch (removeError) {
                      console.error('[AppLayout] Home onRepositoryConnected - Failed to remove unavailable repository:', removeError);
                    }

                    // Show error toast
                    const errorMsg = treeResult?.error?.message || 'Failed to load repository';
                    setToast({
                      message: `This branch has been removed. ${errorMsg}`,
                      type: 'error',
                    });

                    return; // Don't show success toast
                  }
                } catch (err) {
                  console.error('[AppLayout] Home onRepositoryConnected - Error loading first repository file:', err);

                  // Clean up on error
                  const { removeFolder } = useFoldersStore.getState();
                  removeFolder(repoFolder.id);

                  // Remove from recents, favorites, and connection history
                  try {
                    const pathWithBranch = `${connectedRepository.url}#${connectedRepository.currentBranch}`;
                    await removeRecent(pathWithBranch, 'repo');
                    await removeFavorite(pathWithBranch, 'repo');
                    removeFromConnectionHistory(connectedRepository.url, connectedRepository.currentBranch);
                    console.log('[AppLayout] Home onRepositoryConnected - Removed unavailable repository from recents/favorites/history');
                  } catch (removeError) {
                    console.error('[AppLayout] Home onRepositoryConnected - Failed to remove unavailable repository:', removeError);
                  }

                  // Show error toast
                  setToast({
                    message: `This branch has been removed. ${err instanceof Error ? err.message : 'Unknown error'}`,
                    type: 'error',
                  });

                  return; // Don't show success toast
                }

                setToast({
                  message: `Connected to ${connectedRepository.displayName} (${connectedRepository.currentBranch})`,
                  type: 'success',
                });
              }}
            />
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

      {/* T012: FindBar for in-page search (CTRL+F) */}
      <FindBar
        isVisible={isSearchBarVisible}
        onClose={handleCloseFindBar}
        onFind={handleSearch}
        onFindNext={handleFindNext}
        onFindPrevious={handleFindPrevious}
      />

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

      {/* Repository Connect Dialog */}
      <RepoConnectDialog
        isOpen={showRepoConnect}
        onClose={() => setShowRepoConnect(false)}
        onConnected={async (connectedRepository) => {
          setShowRepoConnect(false);

          if (!connectedRepository) {
            console.error('[AppLayout] No connected repository data received');
            return;
          }

          console.log('[AppLayout] onConnected called with:', {
            repositoryId: connectedRepository.repositoryId,
            currentBranch: connectedRepository.currentBranch,
            displayName: connectedRepository.displayName,
          });

          // Check if this repository/branch combination is already open
          const { folders, addFolder, setActiveFolder } = useFoldersStore.getState();
          const targetFolderId = `repo:${connectedRepository.repositoryId}:${connectedRepository.currentBranch}`;

          const existingFolder = folders.find(f => f.id === targetFolderId);

          if (existingFolder) {
            // This exact repo/branch is already open
            console.log('[AppLayout] Repository branch already open:', {
              folderId: targetFolderId,
              displayName: existingFolder.displayName,
            });

            // Activate the existing folder
            setActiveFolder(targetFolderId);

            // Find and activate the first tab for this folder
            const { tabs, setActiveTab } = useTabsStore.getState();
            const folderTabs = Array.from(tabs.values()).filter(tab => tab.folderId === targetFolderId);

            if (folderTabs.length > 0) {
              // Activate the first tab
              setActiveTab(folderTabs[0].id);
              setCurrentFile(folderTabs[0].filePath);
              setShowHome(false);

              setToast({
                message: `${existingFolder.displayName} is already open. Switched to existing tab.`,
                type: 'info',
              });
            } else {
              // Folder exists but no tabs - just activate the folder
              setToast({
                message: `${existingFolder.displayName} is already open. Folder activated.`,
                type: 'info',
              });
            }

            return; // Don't create a duplicate folder
          }

          // Check if same repository but different branch is open
          const sameRepoFolder = folders.find(
            f => f.type === 'repository' && f.repositoryId === connectedRepository.repositoryId
          );

          if (sameRepoFolder) {
            console.log('[AppLayout] Same repository already open with different branch:', {
              existingBranch: sameRepoFolder.currentBranch,
              newBranch: connectedRepository.currentBranch,
            });

            // Use openRepositoryBranch for consistency with "Open another Branch" flow
            const { openRepositoryBranch } = useFoldersStore.getState();
            const newFolder = await openRepositoryBranch(
              connectedRepository.repositoryId,
              connectedRepository.currentBranch
            );

            if (newFolder) {
              setToast({
                message: `Opened ${connectedRepository.displayName} (${connectedRepository.currentBranch})`,
                type: 'success',
              });

              // Track this branch in recents
              try {
                const pathWithBranch = `${connectedRepository.url}#${connectedRepository.currentBranch}`;
                await addRecent({
                  path: pathWithBranch,
                  type: 'repo',
                  displayName: `${connectedRepository.displayName} (${connectedRepository.currentBranch})`
                });
                console.log('[AppLayout] Repository branch tracked in recents:', { path: pathWithBranch });
              } catch (error) {
                console.error('[AppLayout] Failed to track repository branch in recents:', error);
              }
            } else {
              console.error('[AppLayout] Failed to open repository branch via openRepositoryBranch');

              // Branch opening failed - remove from recents, favorites, and connection history
              try {
                const pathWithBranch = `${connectedRepository.url}#${connectedRepository.currentBranch}`;
                await removeRecent(pathWithBranch, 'repo');
                await removeFavorite(pathWithBranch, 'repo');
                removeFromConnectionHistory(connectedRepository.url, connectedRepository.currentBranch);
                console.log('[AppLayout] Removed unavailable repository branch from recents/favorites/history');
              } catch (removeError) {
                console.error('[AppLayout] Failed to remove unavailable repository branch:', removeError);
              }

              // Show error toast
              setToast({
                message: `This branch has been removed. Failed to load repository branch.`,
                type: 'error',
              });
            }

            return; // Don't continue with manual folder creation
          }

          // Create a folder entry for the repository (first branch only)

          const repoFolder: Folder = {
            id: `repo:${connectedRepository.repositoryId}:${connectedRepository.currentBranch}`,
            path: connectedRepository.url,
            displayName: `${connectedRepository.displayName} (${connectedRepository.currentBranch})`,
            type: 'repository',
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
            // Repository-specific fields
            repositoryId: connectedRepository.repositoryId,
            repositoryUrl: connectedRepository.url,
            currentBranch: connectedRepository.currentBranch,
            defaultBranch: connectedRepository.defaultBranch,
            repositoryMetadata: {
              branches: connectedRepository.branches.map(b => ({
                name: b.name,
                isDefault: b.isDefault,
                sha: b.sha
              })),
              owner: connectedRepository.owner,
              name: connectedRepository.name,
            },
          };

          addFolder(repoFolder);
          setActiveFolder(repoFolder.id);

          // Fetch the file tree and open the first markdown file
          try {
            console.log('[AppLayout] onConnected - Fetching tree for branch:', connectedRepository.currentBranch);
            const treeResult = await window.git?.repo?.fetchTree({
              repositoryId: connectedRepository.repositoryId,
              branch: connectedRepository.currentBranch,
              markdownOnly: true,
            });

            console.log('[AppLayout] onConnected - Tree fetch result:', {
              success: treeResult?.success,
              hasData: !!treeResult?.data,
              hasTree: !!treeResult?.data?.tree,
              treeLength: treeResult?.data?.tree?.length,
            });

            if (treeResult?.success && treeResult.data?.tree) {
              // Find the first markdown file using breadth-first search
              const findFirstMarkdownFile = (nodes: any[]): string | null => {
                const queue = [...nodes];

                while (queue.length > 0) {
                  const levelSize = queue.length;

                  // Process all nodes at current level before going deeper
                  for (let i = 0; i < levelSize; i++) {
                    const node = queue.shift()!;

                    // Check if this node is a markdown file
                    if (node.type === 'file' && node.isMarkdown) {
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

              const firstFilePath = findFirstMarkdownFile(treeResult.data.tree);

              console.log('[AppLayout] onConnected - First markdown file:', firstFilePath);

              if (firstFilePath) {
                // Fetch the first file's content
                console.log('[AppLayout] onConnected - Fetching file content for:', firstFilePath);
                const fileResult = await window.git?.repo?.fetchFile({
                  repositoryId: connectedRepository.repositoryId,
                  filePath: firstFilePath,
                  branch: connectedRepository.currentBranch,
                });

                console.log('[AppLayout] onConnected - File fetch result:', {
                  success: fileResult?.success,
                  hasData: !!fileResult?.data,
                  error: fileResult?.error,
                });

                if (fileResult?.success && fileResult.data) {
                  const { tabs, addTab, setActiveTab } = useTabsStore.getState();

                  console.log('[AppLayout] onConnected - Creating tab for branch:', connectedRepository.currentBranch);
                  console.log('[AppLayout] onConnected - Folder ID:', repoFolder.id);
                  console.log('[AppLayout] onConnected - Existing tabs count:', tabs.size);

                  // Check ALL tabs for one matching this file in this repository folder context
                  const existingTab = Array.from(tabs.values()).find(t =>
                    t.filePath === firstFilePath && t.folderId === repoFolder.id
                  );

                  if (existingTab) {
                    // Tab already exists, just set it as active
                    setActiveTab(existingTab.id);
                    console.log('[AppLayout] onConnected - Reusing existing tab:', {
                      tabId: existingTab.id,
                      folderId: existingTab.folderId,
                      filePath: existingTab.filePath,
                    });
                  } else {
                    // Generate deterministic tab ID for repo file
                    const tabId = generateRepoFileTabId(
                      connectedRepository.repositoryId,
                      connectedRepository.currentBranch,
                      firstFilePath
                    );
                    // Create a tab for this file
                    const fileName = firstFilePath.split('/').pop() || 'Untitled';
                    const newTab = {
                      id: tabId,
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
                      currentHistoryIndex: 0,
                      forwardHistory: [],
                      createdAt: Date.now(),
                      folderId: repoFolder.id,
                      isDirectFile: false,
                    };

                    addTab(newTab);
                    setActiveTab(newTab.id);
                    setShowHome(false); // Hide home page and show file viewer

                    console.log('[AppLayout] onConnected - Tab created and activated:', {
                      tabId: newTab.id,
                      folderId: newTab.folderId,
                      filePath: newTab.filePath,
                    });
                  }

                  // Set the file content
                  setCurrentFile(firstFilePath);
                  contentCacheRef.current.set(firstFilePath, fileResult.data.content);
                  setCurrentContent(fileResult.data.content);
                  setError(null);

                  console.log('[AppLayout] onConnected - File content set for tab');

                  // Track repository in recents
                  try {
                    // Include branch in path so each branch is tracked separately
                    const pathWithBranch = `${connectedRepository.url}#${connectedRepository.currentBranch}`;
                    await addRecent({
                      path: pathWithBranch,
                      type: 'repo',
                      displayName: `${connectedRepository.displayName} (${connectedRepository.currentBranch})`
                    });
                  } catch (error) {
                    console.error('[AppLayout] Failed to track repository in recents:', error);
                  }
                } else {
                  console.warn('[AppLayout] onConnected - Failed to fetch file or no data:', fileResult?.error);
                }
              } else {
                console.warn('[AppLayout] onConnected - No markdown files found in tree');
              }
            } else {
              console.warn('[AppLayout] onConnected - Tree fetch failed or no data:', treeResult?.error);

              // Tree fetch failed - clean up the failed connection
              const { removeFolder } = useFoldersStore.getState();
              removeFolder(repoFolder.id);

              // Remove from recents, favorites, and connection history
              try {
                const pathWithBranch = `${connectedRepository.url}#${connectedRepository.currentBranch}`;
                await removeRecent(pathWithBranch, 'repo');
                await removeFavorite(pathWithBranch, 'repo');
                removeFromConnectionHistory(connectedRepository.url, connectedRepository.currentBranch);
                console.log('[AppLayout] Removed unavailable repository from recents/favorites/history');
              } catch (removeError) {
                console.error('[AppLayout] Failed to remove unavailable repository:', removeError);
              }

              // Show error toast
              const errorMsg = treeResult?.error?.message || 'Failed to load repository';
              setToast({
                message: `This branch has been removed. ${errorMsg}`,
                type: 'error',
              });

              return; // Don't show success toast
            }
          } catch (err) {
            console.error('[AppLayout] Error loading first repository file:', err);

            // Clean up on error
            const { removeFolder } = useFoldersStore.getState();
            removeFolder(repoFolder.id);

            // Remove from recents, favorites, and connection history
            try {
              const pathWithBranch = `${connectedRepository.url}#${connectedRepository.currentBranch}`;
              await removeRecent(pathWithBranch, 'repo');
              await removeFavorite(pathWithBranch, 'repo');
              removeFromConnectionHistory(connectedRepository.url, connectedRepository.currentBranch);
              console.log('[AppLayout] Removed unavailable repository from recents/favorites/history');
            } catch (removeError) {
              console.error('[AppLayout] Failed to remove unavailable repository:', removeError);
            }

            // Show error toast
            setToast({
              message: `This branch has been removed. ${err instanceof Error ? err.message : 'Unknown error'}`,
              type: 'error',
            });

            return; // Don't show success toast
          }

          // Show success toast
          setToast({
            message: `Connected to ${connectedRepository.displayName}`,
            type: 'success',
          });
        }}
      />
    </div>
  );
};

export default AppLayout;
