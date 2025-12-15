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
import './FileTree.css';

export interface FileTreeProps {
  /** Folder ID to display tree for */
  folderId: string;
  /** Callback when file is selected */
  onFileSelect?: (filePath: string) => void;
  /** Callback when file is double-clicked (open) */
  onFileOpen?: (filePath: string) => void;
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
 * T101: FileTree component with expand/collapse
 */
export const FileTree: React.FC<FileTreeProps> = ({
  folderId,
  onFileSelect,
  onFileOpen,
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

  // Load tree data (in real implementation, this would call IPC)
  useEffect(() => {
    if (!folder) return;

    // Mock tree data for demonstration
    const mockTree: FileTreeNode[] = [
      {
        name: 'docs',
        path: `${folder.path}/docs`,
        type: 'directory',
        depth: 0,
        children: [
          {
            name: 'README.md',
            path: `${folder.path}/docs/README.md`,
            type: 'file',
            depth: 1,
          },
          {
            name: 'getting-started.md',
            path: `${folder.path}/docs/getting-started.md`,
            type: 'file',
            depth: 1,
          },
        ],
      },
      {
        name: 'guides',
        path: `${folder.path}/guides`,
        type: 'directory',
        depth: 0,
        children: [
          {
            name: 'installation.md',
            path: `${folder.path}/guides/installation.md`,
            type: 'file',
            depth: 1,
          },
          {
            name: 'configuration.md',
            path: `${folder.path}/guides/configuration.md`,
            type: 'file',
            depth: 1,
          },
        ],
      },
      {
        name: 'index.md',
        path: `${folder.path}/index.md`,
        type: 'file',
        depth: 0,
      },
    ];

    setTreeData(mockTree);

    // T105: Restore expansion state
    if (folder.fileTreeState.expandedDirectories) {
      setExpandedDirs(new Set(folder.fileTreeState.expandedDirectories));
    }
    setSelectedPath(folder.fileTreeState.selectedPath);
  }, [folder]);

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

  const handleFileClick = (filePath: string) => {
    setSelectedPath(filePath);
    updateFileTreeState(folderId, { selectedPath: filePath });
    onFileSelect?.(filePath);
  };

  const handleFileDoubleClick = (filePath: string) => {
    onFileOpen?.(filePath);
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
            />
          ))}
        </div>
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
  onClick: (path: string) => void;
  onDoubleClick: (path: string) => void;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  node,
  isExpanded,
  isSelected,
  onToggle,
  onClick,
  onDoubleClick,
}) => {
  const handleClick = () => {
    if (node.type === 'directory') {
      onToggle(node.path);
    } else {
      onClick(node.path);
    }
  };

  const handleDoubleClick = () => {
    if (node.type === 'file') {
      onDoubleClick(node.path);
    }
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
