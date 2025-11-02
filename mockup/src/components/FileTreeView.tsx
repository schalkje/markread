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
  console.log('FileTreeView rendered with onFileSelect:', typeof onFileSelect);
  
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
            className="w-full flex items-center gap-2 py-1.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-neutral-900 dark:text-neutral-100"
            style={{ paddingLeft: `${8 + level * 16}px`, paddingRight: '8px' }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
        onClick={(e) => {
          console.log('FileTreeView: File button clicked:', node.name, node);
          e.stopPropagation();
          onFileSelect(node);
        }}
        className={`w-full flex items-center gap-2 py-1.5 text-left transition-colors rounded-md ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-medium'
            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
        }`}
        style={{ paddingLeft: `${8 + level * 16 + 20}px`, paddingRight: '8px' }}
      >
        <File className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
        <span className="text-sm truncate">{node.name}</span>
      </button>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="py-2 px-2">
        <button
          onClick={() => {
            console.log('TEST BUTTON CLICKED');
            alert('Test button works! onFileSelect type: ' + typeof onFileSelect);
          }}
          className="w-full mb-2 py-2 px-4 bg-red-500 text-white rounded"
        >
          TEST CLICK ME
        </button>
        {renderNode(rootNode)}
      </div>
    </ScrollArea>
  );
};
