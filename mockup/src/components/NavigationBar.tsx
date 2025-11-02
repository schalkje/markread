import React from 'react';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Clock, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { HistoryEntry } from '../types';
import { toast } from 'sonner@2.0.3';

interface NavigationBarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  history: HistoryEntry[];
  onHistorySelect: (entry: HistoryEntry) => void;
  onExportCurrent: () => void;
  onExportFolder: () => void;
  currentFileName?: string;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  history,
  onHistorySelect,
  onExportCurrent,
  onExportFolder,
  currentFileName
}) => {
  const handleExportCurrent = () => {
    onExportCurrent();
    toast.success(`Exporting ${currentFileName} to PDF...`);
  };

  const handleExportFolder = () => {
    onExportFolder();
    toast.success('Exporting folder to PDF...');
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={!canGoBack}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onForward}
          disabled={!canGoForward}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Clock className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[300px]">
            {history.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-neutral-500">
                No history yet
              </div>
            ) : (
              history.slice().reverse().map((entry, index) => (
                <DropdownMenuItem
                  key={`${entry.fileId}-${entry.timestamp}`}
                  onClick={() => onHistorySelect(entry)}
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
      </div>

      <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-2" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={handleExportCurrent} disabled={!currentFileName}>
            Export Current File to PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportFolder}>
            Export Folder to PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
