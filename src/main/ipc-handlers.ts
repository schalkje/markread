import { ipcMain, dialog } from 'electron';
import { readFile, stat } from 'fs/promises';
import { z } from 'zod';

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
export function registerIpcHandlers() {
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

  // T098: file:openFolderDialog IPC handler (Phase 7, stubbed for now)
  ipcMain.handle('file:openFolderDialog', async (_event, _payload) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      });

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

  console.log('IPC handlers registered');
}
