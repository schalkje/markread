import React, { useState, useEffect } from 'react';
import { FileOpener } from './FileOpener';
import { FolderOpener } from './FolderOpener';
import { CategoryList } from './home/CategoryList';
import { Toast } from './common/Toast';
import { useRecentsFavorites } from '../hooks/useRecentsFavorites';
import { useGitRepo } from '../hooks/useGitRepo';
import { useFoldersStore } from '../stores/folders';
import type { RecentItem, Favorite } from '@shared/types/recents-favorites';
import type { Folder } from '@shared/types/entities.d.ts';
import type { ConnectRepositoryRequest, ConnectRepositoryResponse } from '@shared/types/git-contracts';
import './Home.css';
import './home/styles.css';

interface HomeProps {
  onFileOpened: (filePath: string, content: string) => void;
  onFolderOpened: (folderPath: string) => void;
  onConnectRepository?: () => void;
  onRepositoryConnected?: (response: ConnectRepositoryResponse) => void;
}

export const Home: React.FC<HomeProps> = ({ onFileOpened, onFolderOpened, onConnectRepository, onRepositoryConnected }) => {
  const { recents, favorites, removeRecent, removeFavorite, addFavorite, addRecent, isFavorite, loading, loadAll } = useRecentsFavorites();
  const { connectRepository } = useGitRepo();
  const { addFolder } = useFoldersStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load recents and favorites on mount
  useEffect(() => {
    loadAll();
  }, []);

  // T032: Performance measurement for home page load
  useEffect(() => {
    const startTime = performance.now();
    performance.mark('home-load-start');

    // Measure when loading completes
    if (!loading) {
      const endTime = performance.now();
      performance.mark('home-load-end');

      try {
        performance.measure('home-page-load', 'home-load-start', 'home-load-end');
        const duration = endTime - startTime;

        console.log(`[Home] Page loaded in ${duration.toFixed(2)}ms`);

        if (duration > 500) {
          console.warn(`[Home] Performance warning: Page load took ${duration.toFixed(2)}ms (target: <500ms)`);
        }
      } catch (error) {
        // Marks might not exist on first render, ignore
      }
    }
  }, [loading]);

  // T020: Implement item navigation on click
  const handleItemClick = async (item: RecentItem | Favorite) => {
    try {
      setErrorMessage(null);

      if (item.type === 'file') {
        // Open file as a direct file (not associated with active folder)
        const filePath = item.path;

        // Read file content
        const result = await window.electronAPI?.file?.read({ filePath });

        // T021: Error handling for unavailable items
        if (!result?.success || !result.content) {
          throw new Error('File no longer exists or cannot be read');
        }

        const content = result.content || '';

        // Call parent handler with 'direct' context to ensure it creates a direct file tab
        // This prevents it from associating with the currently active folder
        (onFileOpened as (path: string, content: string, context?: 'direct' | 'folder') => void)(
          filePath,
          content,
          'direct'
        );
      } else if (item.type === 'folder') {
        // Open folder by replicating FolderOpener logic
        const folderPath = item.path;
        const folderName = folderPath.split(/[\\/]/).pop() || 'Untitled';

        // Create folder object
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

        // Add folder to store
        addFolder(newFolder);

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
          // Non-fatal error - folder still opens, just without watching
        }

        // Call parent handler to open first file
        onFolderOpened(folderPath);
      } else if (item.type === 'repo') {
        // Extract URL and branch from path (format: url#branch)
        const [repoUrl, branchFromPath] = item.path.split('#');

        // Also parse branch from display name as fallback (format: "repoName (branchName)")
        const match = item.displayName.match(/^(.+?)\s*\((.+?)\)$/);
        const branch = branchFromPath || (match ? match[2] : 'main');

        // Validate that it's a URL, not a local path
        if (repoUrl.includes('\\') || repoUrl.startsWith('/') || repoUrl.match(/^[A-Za-z]:/)) {
          // This is a local path, not a URL - we can't use it
          setErrorMessage('Invalid repository URL in history. Please use "Open Repository" to reconnect.');
          setTimeout(() => setErrorMessage(null), 5000);
          return;
        }

        // Connect directly to repository with the specific branch
        const request: ConnectRepositoryRequest = {
          url: repoUrl,
          authMethod: 'oauth',
          initialBranch: branch,
        };

        try {
          const response = await connectRepository(request);
          console.log('[Home] Repository connected:', response);

          if (response && onRepositoryConnected) {
            onRepositoryConnected(response);

            // Update recents with the correct repository URL from the response
            const repoName = response.displayName || response.url.split('/').pop() || 'Repository';
            // Include branch in path so each branch is tracked separately
            const pathWithBranch = `${response.url}#${branch}`;
            console.log('[Home] Adding repository to recents:', { path: pathWithBranch, displayName: `${repoName} (${branch})` });

            await addRecent({
              path: pathWithBranch, // Include branch in path for separate tracking
              type: 'repo',
              displayName: `${repoName} (${branch})`
            });

            console.log('[Home] Repository added to recents successfully');
          }
        } catch (repoError) {
          // If connection fails, show error
          console.error('[Home] Error connecting to repository:', repoError);
          const errMsg = repoError instanceof Error ? repoError.message : 'Failed to connect to repository';
          setErrorMessage(errMsg);
          setTimeout(() => setErrorMessage(null), 5000);
        }
      }
    } catch (err) {
      // T021: Show error and auto-remove unavailable items
      const errMsg = err instanceof Error ? err.message : 'Item no longer exists';
      setErrorMessage(`Cannot open "${item.displayName}": ${errMsg}`);

      // Auto-remove item from recents if it's no longer accessible
      try {
        await removeRecent(item.path, item.type);
      } catch (removeError) {
        console.error('Failed to remove unavailable item:', removeError);
      }

      // Clear error after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handleItemRemove = async (item: RecentItem | Favorite) => {
    try {
      // Remove from recents (not favorites)
      await removeRecent(item.path, item.type);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleAddToFavorites = async (item: RecentItem | Favorite) => {
    try {
      const result = await addFavorite({
        path: item.path,
        type: item.type,
        displayName: item.displayName
      });
      if (!result.success) {
        setErrorMessage(result.error || 'Failed to add to favorites');
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } catch (error) {
      console.error('Failed to add to favorites:', error);
    }
  };

  const handleRemoveFromFavorites = async (item: RecentItem | Favorite) => {
    try {
      await removeFavorite(item.path, item.type);
    } catch (error) {
      console.error('Failed to remove from favorites:', error);
    }
  };

  const handleFileOpened = async (filePath: string, content: string) => {
    // Add to recents
    const fileName = filePath.split(/[\\/]/).pop() || filePath;
    await addRecent({
      path: filePath,
      type: 'file',
      displayName: fileName
    });

    // Call parent handler
    onFileOpened(filePath, content);
  };

  const handleFolderOpened = async (folderPath: string) => {
    // Add to recents
    const folderName = folderPath.split(/[\\/]/).pop() || folderPath;
    await addRecent({
      path: folderPath,
      type: 'folder',
      displayName: folderName
    });

    // Call parent handler
    onFolderOpened(folderPath);
  };

  return (
    <div className="welcome">
      <h1>Welcome to MarkRead</h1>
      <p>Open a markdown file or folder to get started</p>

      {/* T034: Error message display with Toast */}
      {errorMessage && (
        <Toast
          message={errorMessage}
          type="error"
          onClose={() => setErrorMessage(null)}
        />
      )}

      {/* Three-column layout: Files, Folders, Repos */}
      <div className="recents-favorites-container">
        {/* Files Column */}
        <CategoryList
          openerButton={<FileOpener onFileOpened={handleFileOpened} />}
          favorites={favorites.file || []}
          recents={recents.file || []}
          onItemClick={handleItemClick}
          onItemRemove={handleItemRemove}
          onAddToFavorites={handleAddToFavorites}
          onRemoveFromFavorites={handleRemoveFromFavorites}
        />

        {/* Folders Column */}
        <CategoryList
          openerButton={<FolderOpener onFolderOpened={handleFolderOpened} />}
          favorites={favorites.folder || []}
          recents={recents.folder || []}
          onItemClick={handleItemClick}
          onItemRemove={handleItemRemove}
          onAddToFavorites={handleAddToFavorites}
          onRemoveFromFavorites={handleRemoveFromFavorites}
        />

        {/* Repos Column */}
        {onConnectRepository && (
          <CategoryList
            openerButton={
              <button type="button" className="connect-repo-button" onClick={onConnectRepository}>
                Open Repository
              </button>
            }
            favorites={favorites.repo || []}
            recents={recents.repo || []}
            onItemClick={handleItemClick}
            onItemRemove={handleItemRemove}
            onAddToFavorites={handleAddToFavorites}
            onRemoveFromFavorites={handleRemoveFromFavorites}
            isRepositoryList={true}
          />
        )}
      </div>
    </div>
  );
};
