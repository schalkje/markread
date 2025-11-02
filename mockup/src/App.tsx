import React, { useState, useEffect } from 'react';
import { FileTreeView } from './components/FileTreeView';
import { MarkdownViewer } from './components/MarkdownViewer';
import { InPageSearch } from './components/InPageSearch';
import { GlobalSearch } from './components/GlobalSearch';
import { TabBar } from './components/TabBar';
import { mockFileSystem } from './data/mockFileSystem';
import { FileNode, OpenFile, HistoryEntry } from './types';
import { Toaster } from './components/ui/sonner';
import { Search, Menu, X, Moon, Sun, ChevronLeft, ChevronRight, Clock, Download, Minus, Square, Maximize2 } from 'lucide-react';
import { Button } from './components/ui/button';
import { useTheme } from './hooks/useTheme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';
import { Separator } from './components/ui/separator';
import { toast } from 'sonner';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [searchVisible, setSearchVisible] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const activeFile = openFiles.find(f => f.id === activeFileId);

  // Window control handlers (mock for web, would be real in Electron/WPF)
  const handleMinimize = () => {
    toast.info('Minimize window');
    // In Electron: window.electron.minimize()
    // In WPF: this would call the actual minimize function
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    toast.info(isMaximized ? 'Restore window' : 'Maximize window');
    // In Electron: window.electron.maximize()
    // In WPF: this would call the actual maximize function
  };

  const handleClose = () => {
    toast.info('Close window');
    // In Electron: window.electron.close()
    // In WPF: this would call Application.Current.Shutdown()
  };

  const handleFileSelect = (file: FileNode) => {
    console.log('File selected:', file.name, 'Type:', file.type, 'Has content:', !!file.content);
    
    if (file.type !== 'file' || !file.content) {
      console.log('Skipping - not a file or no content');
      return;
    }

    // Check if file is already open
    const existingFile = openFiles.find(f => f.id === file.id);
    if (existingFile) {
      console.log('File already open, switching to tab');
      setActiveFileId(file.id);
      addToHistory(file);
      toast.info(`Switched to ${file.name}`);
      return;
    }

    // Open new file
    console.log('Opening new file in tab');
    const newFile: OpenFile = {
      id: file.id,
      name: file.name,
      path: file.path,
      content: file.content
    };

    setOpenFiles(prev => [...prev, newFile]);
    setActiveFileId(file.id);
    addToHistory(file);
    toast.success(`Opened ${file.name}`);
  };

  const addToHistory = (file: FileNode) => {
    const entry: HistoryEntry = {
      fileId: file.id,
      fileName: file.name,
      path: file.path,
      timestamp: Date.now()
    };

    setHistory(prev => {
      // Remove any entries after current index
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new entry
      newHistory.push(entry);
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  };

  const handleTabClose = (fileId: string) => {
    setOpenFiles(prev => {
      const filtered = prev.filter(f => f.id !== fileId);
      
      // If closing active tab, switch to another tab
      if (fileId === activeFileId) {
        if (filtered.length > 0) {
          const index = prev.findIndex(f => f.id === fileId);
          const newActiveId = filtered[Math.max(0, index - 1)]?.id || filtered[0]?.id;
          setActiveFileId(newActiveId);
        } else {
          setActiveFileId(null);
        }
      }
      
      return filtered;
    });
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const entry = history[newIndex];
      
      // Find and open the file
      const findNode = (node: FileNode): FileNode | null => {
        if (node.id === entry.fileId) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = findNode(child);
            if (found) return found;
          }
        }
        return null;
      };

      const fileNode = findNode(mockFileSystem);
      if (fileNode && fileNode.content) {
        const existingFile = openFiles.find(f => f.id === fileNode.id);
        if (!existingFile) {
          setOpenFiles(prev => [...prev, {
            id: fileNode.id,
            name: fileNode.name,
            path: fileNode.path,
            content: fileNode.content!
          }]);
        }
        setActiveFileId(entry.fileId);
      }
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const entry = history[newIndex];
      
      const findNode = (node: FileNode): FileNode | null => {
        if (node.id === entry.fileId) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = findNode(child);
            if (found) return found;
          }
        }
        return null;
      };

      const fileNode = findNode(mockFileSystem);
      if (fileNode && fileNode.content) {
        const existingFile = openFiles.find(f => f.id === fileNode.id);
        if (!existingFile) {
          setOpenFiles(prev => [...prev, {
            id: fileNode.id,
            name: fileNode.name,
            path: fileNode.path,
            content: fileNode.content!
          }]);
        }
        setActiveFileId(entry.fileId);
      }
    }
  };

  const handleHistorySelect = (entry: HistoryEntry) => {
    const index = history.findIndex(h => h.fileId === entry.fileId && h.timestamp === entry.timestamp);
    if (index !== -1) {
      setHistoryIndex(index);
      const findNode = (node: FileNode): FileNode | null => {
        if (node.id === entry.fileId) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = findNode(child);
            if (found) return found;
          }
        }
        return null;
      };

      const fileNode = findNode(mockFileSystem);
      if (fileNode && fileNode.content) {
        const existingFile = openFiles.find(f => f.id === fileNode.id);
        if (!existingFile) {
          setOpenFiles(prev => [...prev, {
            id: fileNode.id,
            name: fileNode.name,
            path: fileNode.path,
            content: fileNode.content!
          }]);
        }
        setActiveFileId(entry.fileId);
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F for in-page search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setSearchVisible(true);
      }
      // Shift+Ctrl+F for global search
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
      // Alt+Left for back
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (historyIndex > 0) handleBack();
      }
      // Alt+Right for forward
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (historyIndex < history.length - 1) handleForward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history.length]);

  const handleExportCurrent = () => {
    toast.success(`Exporting ${activeFile?.name} to PDF...`);
  };

  const handleExportFolder = () => {
    toast.success('Exporting folder to PDF...');
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* Unified Title/Navigation Bar */}
      <div className="h-12 flex items-center bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        {/* Left Section: Menu + Title + Navigation */}
        <div className="flex-1 flex items-center gap-1 px-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8 p-0"
          >
            {sidebarCollapsed ? <Menu className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
          
          <h1 className="text-sm px-3">Markdown Viewer</h1>
          
          {/* Navigation Controls - Only show when file is active */}
          {activeFile && (
            <>
              <Separator orientation="vertical" className="h-6 mx-1" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={historyIndex <= 0}
                className="h-8 w-8 p-0"
                title="Back (Alt+←)"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleForward}
                disabled={historyIndex >= history.length - 1}
                className="h-8 w-8 p-0"
                title="Forward (Alt+→)"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    title="History"
                  >
                    <Clock className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[300px]">
                  {history.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-neutral-500">
                      No history yet
                    </div>
                  ) : (
                    history.slice().reverse().map((entry) => (
                      <DropdownMenuItem
                        key={`${entry.fileId}-${entry.timestamp}`}
                        onClick={() => handleHistorySelect(entry)}
                        className="flex flex-col items-start py-2"
                      >
                        <span className="text-sm truncate w-full">{entry.fileName}</span>
                        <span className="text-xs text-neutral-500 truncate w-full">
                          {entry.path}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {/* Center Section: Current File Path */}
        {activeFile && (
          <div className="flex-1 flex items-center justify-center px-4">
            <span className="text-xs text-neutral-500 truncate max-w-md">
              {activeFile.path}
            </span>
          </div>
        )}

        {/* Right Section: Export + Search + Theme + Window Controls */}
        <div className="flex items-center">
          <div className="flex items-center gap-1 px-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-3 gap-2"
                  title="Export to PDF"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-xs">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCurrent} disabled={!activeFile}>
                  Export Current File to PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportFolder}>
                  Export Folder to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Separator orientation="vertical" className="h-6 mx-1" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGlobalSearchOpen(true)}
              className="h-8 px-3 gap-2"
              title="Search in files (Shift+Ctrl+F)"
            >
              <Search className="w-4 h-4" />
              <span className="text-xs hidden xl:inline">Search</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-8 w-8 p-0"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Window Controls */}
          <div className="flex h-12">
            <button
              onClick={handleMinimize}
              className="h-12 w-12 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
              title="Minimize"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={handleMaximize}
              className="h-12 w-12 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
              title={isMaximized ? "Restore Down" : "Maximize"}
            >
              {isMaximized ? (
                <Square className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={handleClose}
              className="h-12 w-12 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <TabBar
        openFiles={openFiles}
        activeFileId={activeFileId}
        onTabClick={setActiveFileId}
        onTabClose={handleTabClose}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {!sidebarCollapsed && (
          <div className="w-64 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
            <div className="h-10 flex items-center px-4 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Files</span>
            </div>
            <FileTreeView
              rootNode={mockFileSystem}
              onFileSelect={handleFileSelect}
              selectedFileId={activeFileId || undefined}
            />
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <InPageSearch
            content={activeFile?.content || ''}
            onSearch={(term, match) => {
              setSearchTerm(term);
              setCurrentMatch(match);
            }}
            isVisible={searchVisible && !!activeFile}
            onClose={() => {
              setSearchVisible(false);
              setSearchTerm('');
            }}
          />

          {/* Markdown Content */}
          {activeFile ? (
            <MarkdownViewer
              content={activeFile.content}
              searchTerm={searchTerm}
              currentMatch={currentMatch}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-500">
              <div className="text-center">
                <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="mb-2">No file selected</p>
                <p className="text-sm">Select a markdown file from the sidebar to begin</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Search */}
      <GlobalSearch
        isOpen={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        rootNode={mockFileSystem}
        onFileSelect={handleFileSelect}
      />

      <Toaster />
    </div>
  );
}
