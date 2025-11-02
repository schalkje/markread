export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  children?: FileNode[];
}

export interface OpenFile {
  id: string;
  name: string;
  path: string;
  content: string;
}

export interface SearchResult {
  fileId: string;
  fileName: string;
  filePath: string;
  matches: number;
  preview: string;
}

export interface HistoryEntry {
  fileId: string;
  fileName: string;
  path: string;
  timestamp: number;
}
