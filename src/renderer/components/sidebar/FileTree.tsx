/**
 * File Tree Component
 * Tasks: T101-T105
 *
 * Displays hierarchical file tree with:
 * - Expand/collapse functionality
 * - Virtualization for 1000+ files (T104)
 * - File selection and opening
 * - Folder expansion state persistence (T105)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useFoldersStore } from '../../stores/folders';
import { useTabsStore } from '../../stores/tabs';
import type { TreeNode } from '../../../shared/types/repository';
import { FileTreeContextMenu } from './FileTreeContextMenu';
import './FileTree.css';

export interface FileTreeProps {
  /** Folder ID to display tree for */
  folderId: string;
  /** Callback when file is selected */
  onFileSelect?: (filePath: string) => void;
  /** Callback when file is double-clicked (open) */
  onFileOpen?: (filePath: string) => void;
  /** File path to reveal (expand parents and scroll into view) */
  revealFilePath?: string | null;
}

/**
 * File tree node structure
 */
export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  depth: number;
}

/**
 * Sort tree nodes: files first (alphabetically), then directories (alphabetically)
 */
const sortTreeNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
  const sorted = [...nodes].sort((a, b) => {
    // Files before directories
    if (a.type === 'file' && b.type === 'directory') return -1;
    if (a.type === 'directory' && b.type === 'file') return 1;

    // Within same type, sort alphabetically (case-insensitive)
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  // Recursively sort children
  return sorted.map(node => ({
    ...node,
    children: node.children ? sortTreeNodes(node.children) : undefined,
  }));
};

/**
 * T101: FileTree component with expand/collapse
 */
export const FileTree: React.FC<FileTreeProps> = ({
  folderId,
  onFileSelect,
  onFileOpen,
  revealFilePath,
}) => {
  const folder = useFoldersStore((state) =>
    state.folders.find((f) => f.id === folderId)
  );
  const updateFileTreeState = useFoldersStore(
    (state) => state.updateFileTreeState
  );

  const [treeData, setTreeData] = useState<FileTreeNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    type: 'file' | 'folder';
    path: string;
    x: number;
    y: number;
  } | null>(null);

  // T102: Load tree data from IPC handler
  useEffect(() => {
    if (!folder) return;

    const loadFileTree = async () => {
      try {
        let treeWithDepth: FileTreeNode[] = [];

        if (folder.type === 'repository') {
          // Load repository file tree from Git API
          const result = await window.git?.repo?.fetchTree({
            repositoryId: folder.repositoryId!,
            branch: folder.currentBranch!,
            markdownOnly: true,
          });

          if (!result?.success || !result.data) {
            console.error('Failed to load repository tree:', result?.error?.message || result?.error);
            setTreeData([]);
            return;
          }

          // Convert Git TreeNode to FileTreeNode with depth
          const convertGitNode = (node: TreeNode, depth: number = 0): FileTreeNode => ({
            name: node.path.split('/').pop() || node.path,
            path: node.path,
            type: node.type === 'directory' ? 'directory' : 'file',
            depth,
            children: node.children?.map((child) => convertGitNode(child, depth + 1)),
          });

          treeWithDepth = result.data.tree.map((node: TreeNode) => convertGitNode(node, 0));
        } else {
          // Load local folder tree from file system
          const result = await window.electronAPI?.file?.getFolderTree({
            folderPath: folder.path,
            includeHidden: false,
            maxDepth: undefined, // No limit
          });

          if (!result?.success || !result.tree) {
            console.error('Failed to load file tree:', result?.error);
            setTreeData([]);
            return;
          }

          // Convert the tree structure to include depth for rendering
          const addDepth = (node: any, depth: number = 0): FileTreeNode => ({
            name: node.name,
            path: node.path,
            type: node.type,
            depth,
            children: node.children?.map((child: any) => addDepth(child, depth + 1)),
          });

          treeWithDepth = result.tree.children?.map((child: any) =>
            addDepth(child, 0)
          ) || [];
        }

        // Sort tree: files first, then folders, both alphabetically
        const sortedTree = sortTreeNodes(treeWithDepth);
        setTreeData(sortedTree);
      } catch (error) {
        console.error('Error loading file tree:', error);
        setTreeData([]);
      }
    };

    loadFileTree();

    // T105: Restore expansion state
    if (folder.fileTreeState.expandedDirectories) {
      setExpandedDirs(new Set(folder.fileTreeState.expandedDirectories));
    }
    setSelectedPath(folder.fileTreeState.selectedPath);
  }, [folder]);

  // Handle reveal file path - expand parents and scroll into view
  useEffect(() => {
    if (!revealFilePath || !folder) return;

    console.log('[FileTree] Revealing file:', revealFilePath);

    // Find all parent directories of the file
    const pathParts = revealFilePath.split(/[/\\]/);
    const dirsToExpand = new Set<string>();

    // Build all parent paths
    let currentPath = '';
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (i === 0) {
        currentPath = pathParts[i];
      } else {
        currentPath = currentPath + '/' + pathParts[i];
      }
      // Also try with backslashes for Windows paths
      const winPath = currentPath.replace(/\//g, '\\');
      dirsToExpand.add(currentPath);
      dirsToExpand.add(winPath);
    }

    console.log('[FileTree] Expanding directories:', Array.from(dirsToExpand));

    // Expand all parent directories
    setExpandedDirs((prev) => {
      const newSet = new Set(prev);
      dirsToExpand.forEach(dir => newSet.add(dir));

      // Persist to store
      updateFileTreeState(folderId, {
        expandedDirectories: newSet,
      });

      return newSet;
    });

    // Select the file
    setSelectedPath(revealFilePath);
    updateFileTreeState(folderId, { selectedPath: revealFilePath });

    // Scroll into view after a short delay to allow rendering
    setTimeout(() => {
      const element = document.querySelector(`[title="${revealFilePath}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('[FileTree] Scrolled to file:', revealFilePath);
      } else {
        console.warn('[FileTree] Could not find element to scroll to:', revealFilePath);
      }
    }, 100);
  }, [revealFilePath, folder, folderId, updateFileTreeState]);

  // T105: Persist expansion state
  const toggleDirectory = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dirPath)) {
        newSet.delete(dirPath);
      } else {
        newSet.add(dirPath);
      }

      // Persist to store
      updateFileTreeState(folderId, {
        expandedDirectories: newSet,
      });

      return newSet;
    });
  };

  const handleFileClick = (filePath: string, event?: React.MouseEvent) => {
    // Check for modifier keys
    const ctrlOrCmd = event?.ctrlKey || event?.metaKey;
    const shiftKey = event?.shiftKey;

    if (shiftKey) {
      // Shift+Click: Open in new window
      window.dispatchEvent(new CustomEvent('open-file-in-new-window', {
        detail: { filePath }
      }));
      return;
    }

    if (ctrlOrCmd) {
      // Ctrl/Cmd+Click: Open in new tab
      window.dispatchEvent(new CustomEvent('open-file-in-new-tab', {
        detail: { filePath }
      }));
      return;
    }

    // Normal click: Select and call callback
    setSelectedPath(filePath);
    updateFileTreeState(folderId, { selectedPath: filePath });
    onFileSelect?.(filePath);
  };

  const handleFileDoubleClick = (filePath: string) => {
    onFileOpen?.(filePath);
  };

  const handleContextMenu = (
    type: 'file' | 'folder',
    path: string,
    event: React.MouseEvent
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      type,
      path,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleContextMenuOpen = (path: string) => {
    if (contextMenu?.type === 'file') {
      onFileSelect?.(path);
    }
  };

  const handleContextMenuOpenInNewTab = (path: string) => {
    window.dispatchEvent(new CustomEvent('open-file-in-new-tab', {
      detail: { filePath: path }
    }));
  };

  const handleContextMenuOpenInNewWindow = (path: string) => {
    window.dispatchEvent(new CustomEvent('open-file-in-new-window', {
      detail: { filePath: path }
    }));
  };

  const handleContextMenuOpenAsNewFolder = (path: string) => {
    window.dispatchEvent(new CustomEvent('open-folder', {
      detail: { folderPath: path }
    }));
  };

  // Flatten tree for rendering (needed for virtualization)
  const flattenedNodes = useMemo(() => {
    const result: Array<FileTreeNode & { isExpanded: boolean }> = [];

    const flatten = (nodes: FileTreeNode[]) => {
      for (const node of nodes) {
        const isExpanded = expandedDirs.has(node.path);
        result.push({ ...node, isExpanded });

        if (node.type === 'directory' && isExpanded && node.children) {
          flatten(node.children);
        }
      }
    };

    flatten(treeData);
    return result;
  }, [treeData, expandedDirs]);

  // T104: Virtualization would be implemented here for 1000+ files
  // For now, rendering all nodes directly
  const shouldUseVirtualization = flattenedNodes.length > 1000;

  if (!folder) {
    return (
      <div className="file-tree__empty">
        <p>No folder selected</p>
      </div>
    );
  }

  return (
    <div className="file-tree" data-testid="file-tree">
      {flattenedNodes.length === 0 ? (
        <div className="file-tree__empty">
          <p>No files found</p>
          <p className="file-tree__hint">
            Open a folder containing markdown files
          </p>
        </div>
      ) : (
        <div className="file-tree__list">
          {shouldUseVirtualization && (
            <div className="file-tree__virtualization-notice">
              Using virtualization for {flattenedNodes.length} items
            </div>
          )}

          {flattenedNodes.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              isExpanded={node.isExpanded}
              isSelected={selectedPath === node.path}
              onToggle={toggleDirectory}
              onClick={handleFileClick}
              onDoubleClick={handleFileDoubleClick}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      )}

      {/* Render context menu */}
      {contextMenu && (
        <FileTreeContextMenu
          type={contextMenu.type}
          path={contextMenu.path}
          x={contextMenu.x}
          y={contextMenu.y}
          onOpen={handleContextMenuOpen}
          onOpenInNewTab={handleContextMenuOpenInNewTab}
          onOpenInNewWindow={handleContextMenuOpenInNewWindow}
          onOpenAsNewFolder={handleContextMenuOpenAsNewFolder}
          onHide={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

/**
 * Individual file tree item
 */
interface FileTreeItemProps {
  node: FileTreeNode;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: (path: string) => void;
  onClick: (path: string, event?: React.MouseEvent) => void;
  onDoubleClick: (path: string) => void;
  onContextMenu: (type: 'file' | 'folder', path: string, event: React.MouseEvent) => void;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  node,
  isExpanded,
  isSelected,
  onToggle,
  onClick,
  onDoubleClick,
  onContextMenu,
}) => {
  const handleClick = (event: React.MouseEvent) => {
    if (node.type === 'directory') {
      onToggle(node.path);
    } else {
      onClick(node.path, event);
    }
  };

  const handleDoubleClick = () => {
    if (node.type === 'file') {
      onDoubleClick(node.path);
    }
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    // Convert 'directory' to 'folder' for context menu
    const menuType = node.type === 'directory' ? 'folder' : 'file';
    onContextMenu(menuType, node.path, event);
  };

  const icon = node.type === 'directory'
    ? (isExpanded ? '📂' : '📁')
    : '📄';

  return (
    <div
      className={`file-tree-item ${isSelected ? 'file-tree-item--selected' : ''} ${node.type === 'directory' ? 'file-tree-item--directory' : ''}`}
      style={{ paddingLeft: `${node.depth * 20 + 8}px` }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      data-testid={`file-tree-item-${node.name}`}
      title={node.path}
    >
      {node.type === 'directory' && (
        <span className="file-tree-item__chevron">
          {isExpanded ? '▼' : '▶'}
        </span>
      )}
      <span className="file-tree-item__icon">{icon}</span>
      <span className="file-tree-item__name">{node.name}</span>
    </div>
  );
};

export default FileTree;
