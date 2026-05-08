# Export API Contract

**Version**: 1.0.0  
**Date**: 2026-01-22

## IPC Channels

All export operations use Electron IPC for main ↔ renderer communication.

### Export Operations

#### `export:pdf:single`

Export a single markdown document to PDF.

**Direction**: Renderer → Main

**Request**:
```typescript
{
  source: string;        // Absolute path to markdown file
  destination: string;   // Absolute path for output PDF
  options: {
    pageSize: 'A4' | 'Letter';
    margins: { top: number; bottom: number; left: number; right: number };
    printBackground: boolean;
  };
}
```

**Response**:
```typescript
{
  jobId: string;         // UUID for tracking
  status: 'pending';
}
```

**Errors**:
- `EXPORT_FILE_NOT_FOUND`: Source file doesn't exist
- `EXPORT_PERMISSION_DENIED`: Cannot read source or write destination
- `EXPORT_INVALID_OPTIONS`: Invalid options provided

---

#### `export:pdf:folder`

Export an entire folder of markdown files to a single PDF.

**Direction**: Renderer → Main

**Request**:
```typescript
{
  folderPath: string;    // Absolute path to folder
  destination: string;   // Absolute path for output PDF
  options: {
    pageSize: 'A4' | 'Letter';
    margins: { top: number; bottom: number; left: number; right: number };
    printBackground: boolean;
    includeSubfolders: boolean;
    generateTOC: boolean;
    coverPage?: {
      title: string;
      subtitle?: string;
      author?: string;
    };
  };
}
```

**Response**:
```typescript
{
  jobId: string;         // UUID for tracking
  status: 'pending';
  fileCount: number;     // Number of markdown files found
}
```

**Errors**:
- `EXPORT_FILE_NOT_FOUND`: Folder doesn't exist
- `EXPORT_PERMISSION_DENIED`: Cannot read folder or write destination
- `EXPORT_INVALID_OPTIONS`: Invalid options provided
- `EXPORT_NO_FILES`: No markdown files found in folder

---

#### `export:cancel`

Cancel an ongoing export operation.

**Direction**: Renderer → Main

**Request**:
```typescript
{
  jobId: string;
}
```

**Response**:
```typescript
{
  cancelled: boolean;
}
```

**Errors**:
- `EXPORT_NOT_FOUND`: Job ID doesn't exist
- `EXPORT_ALREADY_COMPLETED`: Job already finished

---

### Progress Events

#### `export:progress`

Sent from main process to renderer as export progresses.

**Direction**: Main → Renderer

**Payload**:
```typescript
{
  jobId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  progress: {
    currentFile?: string;
    filesProcessed: number;
    totalFiles: number;
    percentComplete: number;  // 0-100
  };
  error?: {
    code: string;
    message: string;
    details?: string;
    retryable: boolean;
  };
  completedAt?: string;  // ISO 8601 timestamp
}
```

**Frequency**: 
- Sent on status change
- Sent every 500ms during processing
- Final event when completed/failed/cancelled

---

### Settings Operations

#### `export:settings:get`

Retrieve current export settings.

**Direction**: Renderer → Main

**Request**: (none)

**Response**:
```typescript
{
  defaultPageSize: 'A4' | 'Letter';
  defaultMargins: { top: number; bottom: number; left: number; right: number };
  printBackground: boolean;
  defaultOutputDirectory?: string;
  includeSubfoldersDefault: boolean;
  recentExports: Array<{
    source: string;
    destination: string;
    timestamp: string;  // ISO 8601
    type: 'single-pdf' | 'folder-pdf';
  }>;
}
```

---

#### `export:settings:update`

Update export settings.

**Direction**: Renderer → Main

**Request**:
```typescript
{
  defaultPageSize?: 'A4' | 'Letter';
  defaultMargins?: { top: number; bottom: number; left: number; right: number };
  printBackground?: boolean;
  defaultOutputDirectory?: string;
  includeSubfoldersDefault?: boolean;
}
```

**Response**:
```typescript
{
  success: boolean;
}
```

**Errors**:
- `EXPORT_INVALID_OPTIONS`: Invalid settings provided

---

### Logging Operations

#### `export:logs:get`

Retrieve recent export log entries.

**Direction**: Renderer → Main

**Request**:
```typescript
{
  limit?: number;  // Default: 100, max: 1000
}
```

**Response**:
```typescript
{
  logs: Array<{
    timestamp: string;  // ISO 8601
    jobId: string;
    type: 'single-pdf' | 'folder-pdf';
    source: string;
    destination: string;
    status: 'completed' | 'failed' | 'cancelled';
    duration: number;  // milliseconds
    filesProcessed: number;
    error?: {
      code: string;
      message: string;
    };
  }>;
}
```

---

#### `export:logs:open-folder`

Open the logs folder in file explorer.

**Direction**: Renderer → Main

**Request**: (none)

**Response**:
```typescript
{
  success: boolean;
}
```

---

## Preload Script Exposure

The following API is exposed to the renderer process via contextBridge:

```typescript
declare global {
  interface Window {
    exportApi: {
      // Export operations
      exportToPdf(
        source: string,
        destination: string,
        options: ExportOptions
      ): Promise<{ jobId: string; status: string }>;
      
      exportFolderToPdf(
        folderPath: string,
        destination: string,
        options: FolderExportOptions
      ): Promise<{ jobId: string; status: string; fileCount: number }>;
      
      cancelExport(jobId: string): Promise<{ cancelled: boolean }>;
      
      // Progress monitoring
      onExportProgress(
        callback: (progress: ExportProgress) => void
      ): () => void;  // Returns unsubscribe function
      
      // Settings
      getExportSettings(): Promise<ExportSettings>;
      updateExportSettings(settings: Partial<ExportSettings>): Promise<{ success: boolean }>;
      
      // Logs
      getExportLogs(limit?: number): Promise<{ logs: ExportLogEntry[] }>;
      openLogsFolder(): Promise<{ success: boolean }>;
    };
  }
}
```

---

## Error Handling

### Standard Error Format

All errors follow this structure:

```typescript
{
  code: string;         // Machine-readable error code
  message: string;      // User-friendly message
  details?: string;     // Technical details for logging
  retryable: boolean;   // Whether operation can be retried
}
```

### Error Codes

| Code | Message | Retryable | Description |
|------|---------|-----------|-------------|
| `EXPORT_FILE_NOT_FOUND` | "File not found" | No | Source file doesn't exist |
| `EXPORT_PERMISSION_DENIED` | "Permission denied" | Yes | Cannot read/write file |
| `EXPORT_DISK_FULL` | "Disk space full" | Yes | Not enough disk space |
| `EXPORT_MEMORY_EXCEEDED` | "Document too large" | No | Document exceeds memory limits |
| `EXPORT_RENDER_FAILED` | "Failed to render" | Yes | PDF rendering failed |
| `EXPORT_INVALID_OPTIONS` | "Invalid options" | No | Validation failed |
| `EXPORT_CANCELLED` | "Export cancelled" | No | User cancelled operation |
| `EXPORT_UNKNOWN` | "Unknown error" | Yes | Unexpected error |

---

## Rate Limiting

To prevent resource exhaustion:
- Maximum 3 concurrent export jobs
- Maximum 1 folder export at a time
- Folder exports limited to 50 files (configurable)

Exceeding limits returns:
```typescript
{
  code: 'EXPORT_RATE_LIMITED',
  message: 'Too many export operations in progress',
  retryable: true
}
```

---

## Timeouts

- Single document export: 60 seconds
- Folder export: 300 seconds (5 minutes)
- PDF render per document: 30 seconds

Timeouts return:
```typescript
{
  code: 'EXPORT_TIMEOUT',
  message: 'Export operation timed out',
  retryable: true
}
```
