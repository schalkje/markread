import React, { useState, useEffect } from 'react';
import { FileNode, SearchResult } from '../types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Search, File } from 'lucide-react';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  rootNode: FileNode;
  onFileSelect: (file: FileNode) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  rootNode,
  onFileSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  const searchInNode = (node: FileNode, term: string, results: SearchResult[] = []): SearchResult[] => {
    if (node.type === 'file' && node.content) {
      const lowerContent = node.content.toLowerCase();
      const lowerTerm = term.toLowerCase();
      const matches = (lowerContent.match(new RegExp(lowerTerm, 'gi')) || []).length;

      if (matches > 0) {
        const index = lowerContent.indexOf(lowerTerm);
        const start = Math.max(0, index - 50);
        const end = Math.min(node.content.length, index + term.length + 50);
        const preview = '...' + node.content.substring(start, end) + '...';

        results.push({
          fileId: node.id,
          fileName: node.name,
          filePath: node.path,
          matches,
          preview
        });
      }
    }

    if (node.children) {
      node.children.forEach(child => searchInNode(child, term, results));
    }

    return results;
  };

  useEffect(() => {
    if (searchTerm.trim()) {
      const searchResults = searchInNode(rootNode, searchTerm);
      setResults(searchResults);
    } else {
      setResults([]);
    }
  }, [searchTerm, rootNode]);

  const handleFileClick = (result: SearchResult) => {
    const findNode = (node: FileNode): FileNode | null => {
      if (node.id === result.fileId) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child);
          if (found) return found;
        }
      }
      return null;
    };

    const fileNode = findNode(rootNode);
    if (fileNode) {
      onFileSelect(fileNode);
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>Search in Files</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              type="text"
              placeholder="Search across all files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
          <div className="text-sm text-neutral-500">
            {searchTerm && `${results.length} file(s) found`}
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-2">
              {results.map((result) => (
                <button
                  key={result.fileId}
                  onClick={() => handleFileClick(result)}
                  className="w-full text-left p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <File className="w-4 h-4 mt-1 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm truncate">{result.fileName}</span>
                        <span className="text-xs text-neutral-500">
                          {result.matches} match{result.matches !== 1 ? 'es' : ''}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-400 truncate mt-1">
                        {result.filePath}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-2">
                        {result.preview}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
