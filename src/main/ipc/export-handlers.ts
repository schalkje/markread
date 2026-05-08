/**
 * Export IPC Handlers
 * Task: T014
 * Handles IPC communication for export operations between main and renderer
 */

import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import * as fs from 'fs';
import { z } from 'zod';
import { getPdfExportService } from '../services/export/PdfExportService';
import { getFolderExportService } from '../services/export/FolderExportService';
import { getExportSettingsStore } from '../services/export/ExportSettingsStore';
import { getExportLogger } from '../services/export/ExportLogger';
import { SettingsManager } from '../services/storage/settings-manager';
import type { ExportOptions, FolderExportOptions } from '../../shared/types/export';

// Validation schemas
const ExportPdfSingleSchema = z.object({
  htmlContent: z.string().min(1),
  defaultFilename: z.string().optional(),
  options: z.object({
    pageSize: z.enum(['A4', 'Letter']).optional(),
    margins: z.object({
      top: z.number().min(0),
      bottom: z.number().min(0),
      left: z.number().min(0),
      right: z.number().min(0),
    }).optional(),
    printBackground: z.boolean().optional(),
  }).optional(),
});

const CancelExportSchema = z.object({
  jobId: z.string().min(1),
});

// PDF styling options schema
const PdfStylingSchema = z.object({
  coverPage: z.object({
    showLogo: z.boolean().optional(),
    showBackgroundImage: z.boolean().optional(),
    customBackgroundImage: z.string().optional(),
    backgroundOpacity: z.number().min(0).max(1).optional(),
  }).optional(),
  header: z.object({
    enabled: z.boolean().optional(),
    showFolderInfo: z.boolean().optional(),
    showRelativePath: z.boolean().optional(),
    customText: z.string().optional(),
  }).optional(),
  footer: z.object({
    enabled: z.boolean().optional(),
    showPageNumbers: z.boolean().optional(),
    showBranding: z.boolean().optional(),
    customText: z.string().optional(),
  }).optional(),
  toc: z.object({
    showPageNumbers: z.boolean().optional(),
  }).optional(),
  sectionSeparators: z.object({
    showPageNumbers: z.boolean().optional(),
  }).optional(),
}).optional();

const ExportPdfSingleFileSchema = z.object({
  filePath: z.string().min(1),
  defaultFilename: z.string().optional(),
  options: z.object({
    pageSize: z.enum(['A4', 'Letter']).optional(),
    margins: z.object({
      top: z.number().min(0),
      bottom: z.number().min(0),
      left: z.number().min(0),
      right: z.number().min(0),
    }).optional(),
    printBackground: z.boolean().optional(),
    coverPage: z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      author: z.string().optional(),
    }).optional(),
    pdfStyling: PdfStylingSchema,
  }).optional(),
});

const UpdateSettingsSchema = z.object({
  settings: z.object({
    defaultPageSize: z.enum(['A4', 'Letter']).optional(),
    defaultMargins: z.object({
      top: z.number().min(0),
      bottom: z.number().min(0),
      left: z.number().min(0),
      right: z.number().min(0),
    }).optional(),
    printBackground: z.boolean().optional(),
    defaultOutputDirectory: z.string().optional(),
    includeSubfoldersDefault: z.boolean().optional(),
    pdfStyling: PdfStylingSchema,
  }),
});

const ExportPdfFolderSchema = z.object({
  folderPath: z.string().min(1),
  defaultFilename: z.string().optional(),
  options: z.object({
    pageSize: z.enum(['A4', 'Letter']).optional(),
    margins: z.object({
      top: z.number().min(0),
      bottom: z.number().min(0),
      left: z.number().min(0),
      right: z.number().min(0),
    }).optional(),
    printBackground: z.boolean().optional(),
    includeSubfolders: z.boolean().optional(),
    generateTOC: z.boolean().optional(),
    coverPage: z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      author: z.string().optional(),
    }).optional(),
    gitInfo: z.object({
      repoName: z.string().optional(),
      repoUrl: z.string().optional(),
      branch: z.string().optional(),
    }).optional(),
    subfolderPath: z.string().optional(),
    pdfStyling: PdfStylingSchema,
    repositoryInfo: z.object({
      repositoryId: z.string(),
      branch: z.string(),
      provider: z.enum(['github', 'azure']),
      owner: z.string().optional(),
      name: z.string().optional(),
      organization: z.string().optional(),
      project: z.string().optional(),
      azureRepositoryId: z.string().optional(),
    }).optional(),
  }).optional(),
});

const GetLogsSchema = z.object({
  limit: z.number().min(1).max(500).optional(),
});

/**
 * Register all export-related IPC handlers
 */
export function registerExportHandlers(mainWindow: BrowserWindow): void {
  const exportService = getPdfExportService();
  const folderExportService = getFolderExportService();
  const settingsStore = getExportSettingsStore();
  const logger = getExportLogger();

  // Forward progress events to renderer
  exportService.on('progress', (progressData) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('export:progress', progressData);
    }
  });

  // T068: Forward folder export progress events to renderer
  folderExportService.on('progress', (progressData) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('export:progress', progressData);
    }
  });

  // T014: export:pdf:single - Export single document to PDF
  ipcMain.handle('export:pdf:single', async (_event, payload) => {
    try {
      const { htmlContent, defaultFilename, options } = ExportPdfSingleSchema.parse(payload);

      // Show save dialog for destination
      const saveResult = await dialog.showSaveDialog(mainWindow, {
        title: 'Export to PDF',
        defaultPath: defaultFilename || 'document.pdf',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });

      if (saveResult.canceled || !saveResult.filePath) {
        return { success: false, cancelled: true };
      }

      const exportOptions: Partial<ExportOptions> = {};
      if (options?.pageSize) exportOptions.pageSize = options.pageSize;
      if (options?.margins) exportOptions.margins = options.margins;
      if (options?.printBackground !== undefined) exportOptions.printBackground = options.printBackground;

      const job = await exportService.exportToPdf(
        htmlContent,
        saveResult.filePath,
        exportOptions
      );

      return {
        success: true,
        job: {
          id: job.id,
          status: job.status,
          destination: job.destination,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'EXPORT_UNKNOWN',
          message: error.message || 'Export failed',
          retryable: error.retryable ?? true,
          details: error.details || error.stack,
        },
      };
    }
  });

  // export:pdf:singleFile - Export a single markdown file to PDF (with cover page).
  // Routes through FolderExportService so the result has a header page and
  // server-side rendered content (fixes empty-PDF bug from CDN/DOM-grab paths).
  ipcMain.handle('export:pdf:singleFile', async (_event, payload) => {
    try {
      const { filePath, defaultFilename, options } = ExportPdfSingleFileSchema.parse(payload);

      const fileName = filePath.split(/[/\\]/).pop() || 'document';
      const baseName = fileName.replace(/\.(md|markdown|mdown|mkd)$/i, '');

      const saveResult = await dialog.showSaveDialog(mainWindow, {
        title: 'Export to PDF',
        defaultPath: defaultFilename || `${baseName}.pdf`,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });

      if (saveResult.canceled || !saveResult.filePath) {
        return { success: false, cancelled: true };
      }

      const settings = await settingsStore.getSettingsAsync();

      const fileOptions: Partial<import('../../shared/types/export').FolderExportOptions> = {};
      if (options?.pageSize) fileOptions.pageSize = options.pageSize;
      if (options?.margins) fileOptions.margins = options.margins;
      if (options?.printBackground !== undefined) fileOptions.printBackground = options.printBackground;
      if (options?.coverPage) fileOptions.coverPage = options.coverPage;
      // Inherit styling defaults from settings, allow per-call overrides
      if (options?.pdfStyling || settings.pdfStyling) {
        fileOptions.pdfStyling = {
          coverPage: { ...settings.pdfStyling?.coverPage, ...options?.pdfStyling?.coverPage },
          header: { ...settings.pdfStyling?.header, ...options?.pdfStyling?.header },
          footer: { ...settings.pdfStyling?.footer, ...options?.pdfStyling?.footer },
          toc: { ...settings.pdfStyling?.toc, ...options?.pdfStyling?.toc },
          sectionSeparators: { ...settings.pdfStyling?.sectionSeparators, ...options?.pdfStyling?.sectionSeparators },
        } as import('../../shared/types/export').FolderExportOptions['pdfStyling'];
      }

      const job = await folderExportService.exportSingleFileToPdf(
        filePath,
        saveResult.filePath,
        fileOptions
      );

      return {
        success: true,
        job: {
          id: job.id,
          status: job.status,
          destination: job.destination,
          filesProcessed: job.progress.filesProcessed,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'EXPORT_UNKNOWN',
          message: error.message || 'Export failed',
          retryable: error.retryable ?? true,
          details: error.details || error.stack,
        },
      };
    }
  });

  // T068: export:pdf:folder - Export folder of markdown files to single PDF
  ipcMain.handle('export:pdf:folder', async (_event, payload) => {
    try {
      console.log('[Export] Received folder export payload:', JSON.stringify(payload, null, 2));
      const { folderPath, defaultFilename, options } = ExportPdfFolderSchema.parse(payload);
      console.log('[Export] Parsed options.repositoryInfo:', options?.repositoryInfo);

      // Show save dialog for destination
      const saveResult = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Folder to PDF',
        defaultPath: defaultFilename || 'folder-export.pdf',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });

      if (saveResult.canceled || !saveResult.filePath) {
        return { success: false, cancelled: true };
      }

      // Get default styling from settings
      const settings = await settingsStore.getSettingsAsync();

      // Get default files configuration for priority ordering
      const settingsManager = SettingsManager.getInstance();
      const { settings: appSettings } = await settingsManager.loadSettings();

      const folderOptions: Partial<FolderExportOptions> = {};
      if (options?.pageSize) folderOptions.pageSize = options.pageSize;
      if (options?.margins) folderOptions.margins = options.margins;
      if (options?.printBackground !== undefined) folderOptions.printBackground = options.printBackground;
      if (options?.includeSubfolders !== undefined) folderOptions.includeSubfolders = options.includeSubfolders;
      if (options?.generateTOC !== undefined) folderOptions.generateTOC = options.generateTOC;
      if (options?.coverPage) folderOptions.coverPage = options.coverPage;
      if (options?.gitInfo) folderOptions.gitInfo = options.gitInfo;
      if (options?.subfolderPath) folderOptions.subfolderPath = options.subfolderPath;
      // Use provided styling or fall back to settings defaults (deep merge)
      if (options?.pdfStyling || settings.pdfStyling) {
        folderOptions.pdfStyling = {
          coverPage: { ...settings.pdfStyling?.coverPage, ...options?.pdfStyling?.coverPage },
          header: { ...settings.pdfStyling?.header, ...options?.pdfStyling?.header },
          footer: { ...settings.pdfStyling?.footer, ...options?.pdfStyling?.footer },
          toc: { ...settings.pdfStyling?.toc, ...options?.pdfStyling?.toc },
          sectionSeparators: { ...settings.pdfStyling?.sectionSeparators, ...options?.pdfStyling?.sectionSeparators },
        } as FolderExportOptions['pdfStyling'];
      }
      // Pass default files configuration for priority ordering in export
      if (appSettings.behavior.defaultFilesToOpen) {
        folderOptions.defaultFilesToOpen = appSettings.behavior.defaultFilesToOpen;
      }
      // Pass repository info for git repository exports
      if (options?.repositoryInfo) {
        folderOptions.repositoryInfo = options.repositoryInfo;
      }

      const job = await folderExportService.exportFolderToPdf(
        folderPath,
        saveResult.filePath,
        folderOptions
      );

      return {
        success: true,
        job: {
          id: job.id,
          status: job.status,
          destination: job.destination,
          filesProcessed: job.progress.filesProcessed,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'EXPORT_UNKNOWN',
          message: error.message || 'Folder export failed',
          retryable: error.retryable ?? true,
          details: error.details || error.stack,
        },
      };
    }
  });

  // export:cancel - Cancel an active export (tries both single and folder services)
  ipcMain.handle('export:cancel', async (_event, payload) => {
    try {
      const { jobId } = CancelExportSchema.parse(payload);
      try {
        await exportService.cancelExport(jobId);
      } catch {
        await folderExportService.cancelExport(jobId);
      }
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to cancel export',
      };
    }
  });

  // export:settings:get - Get export settings
  ipcMain.handle('export:settings:get', async () => {
    try {
      const settings = await settingsStore.getSettingsAsync();
      return { success: true, settings };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // export:settings:update - Update export settings
  ipcMain.handle('export:settings:update', async (_event, payload) => {
    try {
      const { settings } = UpdateSettingsSchema.parse(payload);
      // Cast to allow partial pdfStyling - the store handles the deep merge
      await settingsStore.updateSettings(settings as Parameters<typeof settingsStore.updateSettings>[0]);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // export:logs:get - Get recent export logs
  ipcMain.handle('export:logs:get', async (_event, payload) => {
    try {
      const { limit } = GetLogsSchema.parse(payload || {});
      const logs = await logger.getRecentLogs(limit || 100);
      return { success: true, logs };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // export:logs:open-folder - Open logs folder in file explorer
  ipcMain.handle('export:logs:open-folder', async () => {
    try {
      await logger.openLogsFolder();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // export:open-file - Open exported file with default application
  ipcMain.handle('export:open-file', async (_event, payload) => {
    try {
      const { filePath } = payload as { filePath: string };
      await shell.openPath(filePath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // diagram:save - Show save dialog and write diagram file (SVG or PNG)
  ipcMain.handle('diagram:save', async (_event, payload) => {
    try {
      const { defaultFilename, svgData, pngDataBase64 } = payload as {
        defaultFilename?: string;
        svgData: string;
        pngDataBase64: string;
      };

      const saveResult = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Diagram',
        defaultPath: defaultFilename || 'diagram.svg',
        filters: [
          { name: 'SVG Image', extensions: ['svg'] },
          { name: 'PNG Image', extensions: ['png'] },
        ],
      });

      if (saveResult.canceled || !saveResult.filePath) {
        return { success: false, cancelled: true };
      }

      const filePath = saveResult.filePath;

      if (filePath.endsWith('.png')) {
        const buffer = Buffer.from(pngDataBase64, 'base64');
        fs.writeFileSync(filePath, buffer);
      } else {
        fs.writeFileSync(filePath, svgData, 'utf-8');
      }

      return { success: true, filePath };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to save diagram',
      };
    }
  });

  console.log('[Export] IPC handlers registered');
}
