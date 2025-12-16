import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import { readFile, stat, readdir } from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { startWatching, stopWatching } from './file-watcher';
import { createWindow } from './window-manager';
import { loadUIState, saveUIState } from './ui-state-manager';

// T011: IPC handler registration system with Zod validation (research.md Section 6)

// Helper: Validate IPC payload with Zod schema
function validatePayload<T>(schema: z.ZodSchema<T>, payload: unknown): T {
  return schema.parse(payload);
}

// T034: file:read IPC handler
const ReadFilePayloadSchema = z.object({
  filePath: z.string().min(1),
});

// Export registration function
export function registerIpcHandlers(mainWindow: BrowserWindow) {
  // T034: file:read IPC handler
  ipcMain.handle('file:read', async (_event, payload) => {
    try {
      const { filePath } = validatePayload(ReadFilePayloadSchema, payload);

      const content = await readFile(filePath, 'utf-8');
      const stats = await stat(filePath);

      return {
        success: true,
        content,
        modificationTime: stats.mtimeMs,
        fileSize: stats.size,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // T035: file:openFileDialog IPC handler
  ipcMain.handle('file:openFileDialog', async (_event, _payload) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Markdown Files', extensions: ['md', 'markdown'] }],
      });

      return {
        success: true,
        filePaths: result.filePaths,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // T098: file:openFolderDialog IPC handler
  ipcMain.handle('file:openFolderDialog', async (_event, payload) => {
    try {
      const OpenFolderPayloadSchema = z.object({
        defaultPath: z.string().optional(),
      });

      const { defaultPath } = validatePayload(OpenFolderPayloadSchema, payload);

      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        defaultPath,
      });

      // Handle user cancellation
      if (result.canceled || result.filePaths.length === 0) {
        return {
          success: true,
          folderPath: undefined,
        };
      }

      return {
        success: true,
        folderPath: result.filePaths[0],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // T036: file:resolvePath IPC handler for image resolution
  ipcMain.handle('file:resolvePath', async (_event, payload) => {
    try {
      const ResolvePathSchema = z.object({
        basePath: z.string().min(1),
        relativePath: z.string().min(1),
      });

      const { basePath, relativePath } = validatePayload(ResolvePathSchema, payload);

      // Import path and fs modules
      const path = await import('path');
      const fs = await import('fs/promises');

      // Resolve relative path based on the directory of basePath
      const baseDir = path.dirname(basePath);
      const absolutePath = path.resolve(baseDir, relativePath);

      // Sanitize path to prevent directory traversal attacks (T032)
      // Ensure the resolved path is safe and normalize it
      const normalizedAbsolute = path.normalize(absolutePath);

      // Additional security: prevent path traversal outside allowed areas
      // This is a basic check - in production, you might want stricter validation
      if (normalizedAbsolute.includes('..')) {
        return {
          success: false,
          error: 'Path traversal detected - relative paths with ".." are not allowed',
        };
      }

      // Check if file exists
      let exists = false;
      try {
        await fs.access(normalizedAbsolute);
        exists = true;
      } catch {
        exists = false;
      }

      return {
        success: true,
        absolutePath: normalizedAbsolute,
        exists,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // T102: file:getFolderTree IPC handler for file tree sidebar
  ipcMain.handle('file:getFolderTree', async (_event, payload) => {
    try {
      const GetFolderTreeSchema = z.object({
        folderPath: z.string().min(1),
        includeHidden: z.boolean(),
        maxDepth: z.number().optional(),
      });

      const { folderPath, includeHidden, maxDepth } = validatePayload(
        GetFolderTreeSchema,
        payload
      );

      // Validate that the folder path exists
      try {
        const stats = await stat(folderPath);
        if (!stats.isDirectory()) {
          return {
            success: false,
            error: 'Path is not a directory',
          };
        }
      } catch (error: any) {
        return {
          success: false,
          error: `Folder not found: ${error.message}`,
        };
      }

      let totalFiles = 0;

      // Recursive function to build file tree
      async function buildTree(
        dirPath: string,
        currentDepth: number = 0
      ): Promise<any> {
        const name = path.basename(dirPath);
        const node: any = {
          name,
          path: dirPath,
          type: 'directory',
          children: [],
        };

        // Check max depth
        if (maxDepth !== undefined && currentDepth >= maxDepth) {
          return node;
        }

        try {
          const entries = await readdir(dirPath, { withFileTypes: true });

          for (const entry of entries) {
            // Skip hidden files if not included
            if (!includeHidden && entry.name.startsWith('.')) {
              continue;
            }

            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
              // Recursively process subdirectories
              const childNode = await buildTree(fullPath, currentDepth + 1);
              if (childNode.children && childNode.children.length > 0) {
                // Only include directories that contain markdown files
                node.children.push(childNode);
              }
            } else if (entry.isFile() && isMarkdownFile(entry.name)) {
              // Include markdown files
              totalFiles++;
              const stats = await stat(fullPath);
              node.children.push({
                name: entry.name,
                path: fullPath,
                type: 'file',
                size: stats.size,
                modificationTime: stats.mtimeMs,
              });
            }
          }

          // Sort children: directories first, then files, alphabetically
          node.children.sort((a: any, b: any) => {
            if (a.type === b.type) {
              return a.name.localeCompare(b.name, undefined, {
                numeric: true,
                sensitivity: 'base',
              });
            }
            return a.type === 'directory' ? -1 : 1;
          });
        } catch (error: any) {
          // If we can't read a directory (permissions, etc), return empty
          console.error(`Error reading directory ${dirPath}:`, error.message);
        }

        return node;
      }

      // Helper to check if file is markdown
      function isMarkdownFile(fileName: string): boolean {
        const ext = path.extname(fileName).toLowerCase();
        return ext === '.md' || ext === '.markdown';
      }

      const tree = await buildTree(folderPath);

      return {
        success: true,
        tree,
        totalFiles,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // T108: file:watchFolder IPC handler
  ipcMain.handle('file:watchFolder', async (_event, payload) => {
    try {
      const WatchFolderSchema = z.object({
        folderPath: z.string().min(1),
        filePatterns: z.array(z.string()),
        ignorePatterns: z.array(z.string()),
        debounceMs: z.number().min(100).max(2000),
      });

      const { folderPath, filePatterns, ignorePatterns, debounceMs } = validatePayload(
        WatchFolderSchema,
        payload
      );

      // Generate unique watcher ID
      const watcherId = `watcher-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      // Start watching
      await startWatching(
        {
          watcherId,
          folderPath,
          filePatterns,
          ignorePatterns,
          debounceMs,
        },
        mainWindow
      );

      return {
        success: true,
        watcherId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // T108: file:stopWatching IPC handler
  ipcMain.handle('file:stopWatching', async (_event, payload) => {
    try {
      const StopWatchingSchema = z.object({
        watcherId: z.string().min(1),
      });

      const { watcherId } = validatePayload(StopWatchingSchema, payload);

      await stopWatching(watcherId);

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // shell:openExternal IPC handler for opening external URLs
  ipcMain.handle('shell:openExternal', async (_event, payload) => {
    try {
      const OpenExternalSchema = z.object({
        url: z.string().url(),
      });

      const { url } = validatePayload(OpenExternalSchema, payload);

      // Security: Only allow http and https URLs
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return {
          success: false,
          error: 'Only HTTP and HTTPS URLs are allowed',
        };
      }

      await shell.openExternal(url);

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // T159j: Window control IPC handlers for custom title bar
  ipcMain.handle('window:minimize', async () => {
    try {
      mainWindow.minimize();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  ipcMain.handle('window:maximize', async () => {
    try {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      return {
        success: true,
        isMaximized: mainWindow.isMaximized(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  ipcMain.handle('window:close', async () => {
    try {
      mainWindow.close();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  ipcMain.handle('window:isMaximized', async () => {
    try {
      return {
        success: true,
        isMaximized: mainWindow.isMaximized(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // T163b: window:createNew IPC handler for spawning new windows
  ipcMain.handle('window:createNew', async (_event, payload) => {
    try {
      const CreateNewWindowSchema = z.object({
        filePath: z.string().optional(),
        folderPath: z.string().optional(),
        tabState: z.any().optional(), // Tab state to transfer
      });

      const { filePath, folderPath, tabState } = validatePayload(
        CreateNewWindowSchema,
        payload
      );

      // Create new window
      const newWindow = createWindow();

      // Wait for window to be ready
      await new Promise<void>((resolve) => {
        newWindow.once('ready-to-show', () => {
          resolve();
        });
      });

      // If initial state is provided, send it to the new window
      if (filePath || folderPath || tabState) {
        newWindow.webContents.send('window:initialState', {
          filePath,
          folderPath,
          tabState,
        });
      }

      return {
        success: true,
        windowId: newWindow.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // T165: uiState:load IPC handler
  ipcMain.handle('uiState:load', async (_event, _payload) => {
    try {
      const uiState = await loadUIState();
      return {
        success: true,
        uiState,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // T165: uiState:save IPC handler
  ipcMain.handle('uiState:save', async (_event, payload) => {
    try {
      const SaveUIStateSchema = z.object({
        uiState: z.any(), // Partial<UIState>
      });

      const { uiState } = validatePayload(SaveUIStateSchema, payload);

      await saveUIState(uiState);

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // T173: PDF export via Chromium print-to-PDF
  ipcMain.handle('file:exportToPDF', async (_event, payload) => {
    try {
      const ExportToPDFSchema = z.object({
        filePath: z.string().min(1),
        htmlContent: z.string().min(1),
      });

      const { filePath, htmlContent } = validatePayload(ExportToPDFSchema, payload);

      // Create a hidden window for PDF generation
      const pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Load the HTML content
      await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      // Wait for content to be ready
      await new Promise<void>((resolve) => {
        pdfWindow.webContents.once('did-finish-load', () => {
          // Give time for any async rendering (diagrams, etc)
          setTimeout(() => resolve(), 500);
        });
      });

      // Generate PDF
      const pdfData = await pdfWindow.webContents.printToPDF({
        margins: {
          top: 0.5,
          right: 0.5,
          bottom: 0.5,
          left: 0.5,
        },
        printBackground: true,
        landscape: false,
        pageSize: 'A4',
      });

      // Save PDF to disk
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, pdfData);

      // Close the hidden window
      pdfWindow.close();

      return {
        success: true,
        filePath,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  console.log('IPC handlers registered');
}
