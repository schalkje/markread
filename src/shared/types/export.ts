/**
 * Export-related type definitions for MarkRead
 * Defines interfaces for PDF export operations, progress tracking, and error handling
 */

export type ExportJobType = 'single-pdf' | 'folder-pdf';
export type ExportJobStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
export type PageSize = 'A4' | 'Letter';

export interface ExportJob {
  id: string;
  type: ExportJobType;
  status: ExportJobStatus;
  source: string;
  destination: string;
  options: ExportOptions;
  progress: ExportProgress;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: ExportError;
}

export interface ExportOptions {
  pageSize: PageSize;
  margins: { top: number; bottom: number; left: number; right: number };
  printBackground: boolean;
  includeSubfolders?: boolean;
  generateTOC?: boolean;
}

export interface ExportProgress {
  currentFile?: string;
  filesProcessed: number;
  totalFiles: number;
  percentComplete: number;
}

export interface ExportError {
  code: string;
  message: string;
  details?: string;
  retryable: boolean;
}

export interface FolderExportOptions extends ExportOptions {
  includeSubfolders: boolean;
  generateTOC: boolean;
  coverPage?: {
    title: string;
    subtitle?: string;
    author?: string;
  };
  /** Git repository and branch info for the cover page */
  gitInfo?: {
    repoName?: string;
    branch?: string;
  };
  /** When exporting a subfolder, this is the path relative to the root */
  subfolderPath?: string;
}

export interface MarkdownFile {
  path: string;
  relativePath: string;
  title: string;
  content: string;
  renderedHtml?: string;
  order: number;
}

export interface CoverPage {
  title: string;
  subtitle?: string;
  date: Date;
  author?: string;
  logo?: string;
}

export interface TOCEntry {
  title: string;
  level: number;
  pageNumber?: number;
  anchor: string;
  children: TOCEntry[];
}

export interface ExportSettings {
  defaultPageSize: PageSize;
  defaultMargins: { top: number; bottom: number; left: number; right: number };
  printBackground: boolean;
  defaultOutputDirectory?: string;
  includeSubfoldersDefault: boolean;
  recentExports: RecentExport[];
}

export interface RecentExport {
  source: string;
  destination: string;
  timestamp: Date;
  type: ExportJobType;
}

export interface ExportLogEntry {
  timestamp: Date;
  jobId: string;
  type: ExportJobType;
  source: string;
  destination: string;
  status: 'completed' | 'failed' | 'cancelled';
  duration: number;
  filesProcessed: number;
  error?: {
    code: string;
    message: string;
  };
}

export enum ExportErrorCode {
  PERMISSION_DENIED = 'EXPORT_PERMISSION_DENIED',
  FILE_NOT_FOUND = 'EXPORT_FILE_NOT_FOUND',
  DISK_FULL = 'EXPORT_DISK_FULL',
  MEMORY_EXCEEDED = 'EXPORT_MEMORY_EXCEEDED',
  RENDER_FAILED = 'EXPORT_RENDER_FAILED',
  INVALID_OPTIONS = 'EXPORT_INVALID_OPTIONS',
  CANCELLED = 'EXPORT_CANCELLED',
  TIMEOUT = 'EXPORT_TIMEOUT',
  RATE_LIMITED = 'EXPORT_RATE_LIMITED',
  NO_FILES = 'EXPORT_NO_FILES',
  NOT_FOUND = 'EXPORT_NOT_FOUND',
  ALREADY_COMPLETED = 'EXPORT_ALREADY_COMPLETED',
  UNKNOWN = 'EXPORT_UNKNOWN'
}
