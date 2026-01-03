/**
 * Repository File Tree Component
 * Phase 3 - T050
 *
 * Displays Git repository file tree with:
 * - Hierarchical tree structure
 * - Expand/collapse directories
 * - File selection and opening
 * - Markdown file filtering
 * - Loading and error states
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useGitRepo } from '../../hooks/useGitRepo';
import type { TreeNode } from '../../../shared/types/repository';
import './RepoFileTree.css';

/**
 * Sort tree nodes: files first (alphabetically), then directories (alphabetically)
 */
const sortTreeNodes = (nodes: TreeNode[]): TreeNode[] => {
  const sorted = [...nodes].sort((a, b) => {
    // Files before directories
    if (a.type === 'file' && b.type === 'directory') return -1;
    if (a.type === 'directory' && b.type === 'file') return 1;

    // Within same type, sort alphabetically (case-insensitive)
    const aName = a.path.split('/').pop() || '';
    const bName = b.path.split('/').pop() || '';
    return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
  });

  // Recursively sort children
  return sorted.map(node => ({
    ...node,
    children: node.children ? sortTreeNodes(node.children) : undefined,
  }));
};

export interface RepoFileTreeProps {
  /** Callback when file is clicked */
  onFileClick?: (filePath: string) => void;
  /** Whether to show only markdown files */
  markdownOnly?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * T050: Repository File Tree Component
 *
 * Usage:
 * ```typescript
 * <RepoFileTree
 *   onFileClick={(path) => fetchAndDisplayFile(path)}
 *   markdownOnly={true}
 * />
 * ```
 */
export const RepoFileTree: React.FC<RepoFileTreeProps> = ({
  onFileClick,
  markdownOnly = false,
  className = '',
}) => {
  const {
    repositoryId,
    currentBranch,
    fileTree,
    treeFromCache,
    isFetchingTree,
    isRefreshingTree,
    error,
    fetchTree,
  } = useGitRepo();

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  /**
   * Load file tree when repository or branch changes
   */
  useEffect(() => {
    if (repositoryId && currentBranch) {
      fetchTree({
        repositoryId,
        branch: currentBranch,
        markdownOnly,
      }).catch((err) => {
        console.error('Failed to fetch file tree:', err);
      });
    }
  }, [repositoryId, currentBranch, markdownOnly, fetchTree]);

  /**
   * Toggle directory expansion
   */
  const toggleDirectory = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  /**
   * Handle file click
   */
  const handleFileClick = useCallback(
    (path: string) => {
      setSelectedPath(path);
      onFileClick?.(path);
    },
    [onFileClick]
  );

  /**
   * Render a tree node (file or directory)
   */
  const renderNode = useCallback(
    (node: TreeNode, depth: number = 0): React.ReactNode => {
      const isDirectory = node.type === 'directory';
      const isExpanded = expandedDirs.has(node.path);
      const isSelected = selectedPath === node.path;
      const hasChildren = node.children && node.children.length > 0;

      return (
        <div key={node.path} className="repo-file-tree__node-container">
          <div
            className={`repo-file-tree__node ${
              isDirectory ? 'repo-file-tree__node--directory' : 'repo-file-tree__node--file'
            } ${isSelected ? 'repo-file-tree__node--selected' : ''}`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() =>
              isDirectory ? toggleDirectory(node.path) : handleFileClick(node.path)
            }
            role={isDirectory ? 'button' : 'treeitem'}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                isDirectory ? toggleDirectory(node.path) : handleFileClick(node.path);
              }
            }}
          >
            {/* Icon */}
            <span className="repo-file-tree__icon">
              {isDirectory ? (isExpanded ? '📂' : '📁') : node.isMarkdown ? '📝' : '📄'}
            </span>

            {/* Name */}
            <span className="repo-file-tree__name">{node.path.split('/').pop()}</span>

            {/* Expand/Collapse Indicator */}
            {isDirectory && hasChildren && (
              <span className="repo-file-tree__expand-indicator">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
          </div>

          {/* Children */}
          {isDirectory && isExpanded && hasChildren && (
            <div className="repo-file-tree__children">
              {node.children!.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    },
    [expandedDirs, selectedPath, toggleDirectory, handleFileClick]
  );

  /**
   * Render the file tree
   */
  const renderTree = useMemo(() => {
    if (!fileTree || fileTree.length === 0) {
      return null;
    }

    // Sort tree: files first, then folders, both alphabetically
    const sortedTree = sortTreeNodes(fileTree);
    return sortedTree.map((node) => renderNode(node, 0));
  }, [fileTree, renderNode]);

  // No repository connected
  if (!repositoryId) {
    return (
      <div className={`repo-file-tree ${className}`}>
        <div className="repo-file-tree__empty">
          <p>No repository connected</p>
          <p className="repo-file-tree__hint">Connect to a repository to browse files</p>
        </div>
      </div>
    );
  }

  // Loading state (only show full loading when there's no cached tree)
  if (isFetchingTree && !fileTree) {
    return (
      <div className={`repo-file-tree ${className}`}>
        <div className="repo-file-tree__loading">
          <div className="repo-file-tree__spinner" />
          <p>Loading file tree...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`repo-file-tree ${className}`}>
        <div className="repo-file-tree__error">
          <p>Failed to load file tree</p>
          <p className="repo-file-tree__error-message">{error}</p>
          <button
            className="repo-file-tree__retry-btn"
            onClick={() =>
              fetchTree({
                repositoryId,
                branch: currentBranch!,
                markdownOnly,
              })
            }
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty tree
  if (!fileTree || fileTree.length === 0) {
    return (
      <div className={`repo-file-tree ${className}`}>
        <div className="repo-file-tree__empty">
          <p>No files found</p>
          {markdownOnly && (
            <p className="repo-file-tree__hint">
              No markdown files found in this repository
            </p>
          )}
        </div>
      </div>
    );
  }

  // Render tree
  return (
    <div className={`repo-file-tree ${className}`} role="tree">
      {/* Refresh indicator for background updates */}
      {isRefreshingTree && (
        <div className="repo-file-tree__refresh-indicator">
          <div className="repo-file-tree__refresh-spinner" />
          <span>Refreshing...</span>
        </div>
      )}
      {renderTree}
    </div>
  );
};
