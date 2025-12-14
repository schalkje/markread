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

  console.log('IPC handlers registered');
}
