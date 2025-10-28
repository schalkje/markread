import React, { useState } from 'react';
import { FileNode } from '../types';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface FileTreeViewProps {
  rootNode: FileNode;
  onFileSelect: (file: FileNode) => void;
  selectedFileId?: string;
}

export const FileTreeView: React.FC<FileTreeViewProps> = ({
  rootNode,
  onFileSelect,
  selectedFileId
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['root', 'getting-started', 'guides'])
  );

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderNode = (node: FileNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = node.id === selectedFileId;

    if (node.type === 'folder') {
      return (
        <div key={node.id}>
          <button
            onClick={() => toggleFolder(node.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 ${
              level === 0 ? '' : 'ml-' + (level * 4)
            }`}
            style={{ paddingLeft: `${12 + level * 16}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 text-blue-500" />
            )}
            <span className="text-sm">{node.name}</span>
          </button>
          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={node.id}
        onClick={() => onFileSelect(node)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
            : 'hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50'
        }`}
        style={{ paddingLeft: `${12 + level * 16 + 20}px` }}
      >
        <File className="w-4 h-4" />
        <span className="text-sm truncate">{node.name}</span>
      </button>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="py-2">
        {renderNode(rootNode)}
      </div>
    </ScrollArea>
  );
};
