/**
 * PdfExportService
 * Tasks: T011, T012, T013
 * Handles PDF export using Electron's printToPDF API with progress tracking
 */

import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
import type {
  ExportJob,
  ExportOptions,
  ExportError,
} from '../../../shared/types/export';
import { ExportErrorCode } from '../../../shared/types/export';
import { getExportLogger } from './ExportLogger';
import { getExportSettingsStore } from './ExportSettingsStore';

// Maximum concurrent export jobs
const MAX_CONCURRENT_EXPORTS = 3;

export class PdfExportService extends EventEmitter {
  private activeJobs: Map<string, ExportJob> = new Map();

  /**
   * Export a single document to PDF
   * Takes rendered HTML content and produces a PDF file
   */
  async exportToPdf(
    htmlContent: string,
    destination: string,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportJob> {
    // Check concurrent job limit
    const activeCount = Array.from(this.activeJobs.values()).filter(
      (j) => j.status === 'in-progress'
    ).length;
    if (activeCount >= MAX_CONCURRENT_EXPORTS) {
      throw this.createError(
        ExportErrorCode.RATE_LIMITED,
        'Maximum number of concurrent exports reached. Please wait for an export to complete.',
        true
      );
    }

    // Merge with default settings
    const settingsStore = getExportSettingsStore();
    const defaults = settingsStore.getSettings();
    const mergedOptions: ExportOptions = {
      pageSize: options.pageSize || defaults.defaultPageSize,
      margins: options.margins || defaults.defaultMargins,
      printBackground: options.printBackground ?? defaults.printBackground,
      includeSubfolders: options.includeSubfolders,
      generateTOC: options.generateTOC,
    };

    // Create job
    const job: ExportJob = {
      id: crypto.randomUUID(),
      type: 'single-pdf',
      status: 'pending',
      source: 'current-document',
      destination,
      options: mergedOptions,
      progress: {
        filesProcessed: 0,
        totalFiles: 1,
        percentComplete: 0,
      },
      createdAt: new Date(),
    };

    this.activeJobs.set(job.id, job);
    this.emitProgress(job);

    let pdfWindow: BrowserWindow | null = null;

    try {
      // Update status to in-progress
      job.status = 'in-progress';
      job.startedAt = new Date();
      job.progress.percentComplete = 10;
      this.emitProgress(job);

      // Ensure destination directory exists
      const destDir = path.dirname(destination);
      await fs.mkdir(destDir, { recursive: true });

      // Create hidden window for PDF rendering
      pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          offscreen: true,
        },
      });

      job.progress.percentComplete = 20;
      this.emitProgress(job);

      // Load HTML content
      await pdfWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
      );

      // Wait for content to finish rendering (including async elements like diagrams)
      await this.waitForContentReady(pdfWindow);

      job.progress.percentComplete = 50;
      this.emitProgress(job);

      // Generate PDF using Chromium's printToPDF API
      const pdfData = await pdfWindow.webContents.printToPDF({
        pageSize: mergedOptions.pageSize,
        printBackground: mergedOptions.printBackground,
        margins: {
          top: mergedOptions.margins.top,
          right: mergedOptions.margins.right,
          bottom: mergedOptions.margins.bottom,
          left: mergedOptions.margins.left,
        },
        landscape: false,
      });

      job.progress.percentComplete = 80;
      this.emitProgress(job);

      // Write PDF to file
      await fs.writeFile(destination, pdfData);

      // Update job as completed
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress.filesProcessed = 1;
      job.progress.percentComplete = 100;
      this.emitProgress(job);

      // Log the export
      await this.logExport(job);

      // Add to recent exports
      settingsStore.addRecentExport({
        source: job.source,
        destination: job.destination,
        timestamp: new Date(),
        type: 'single-pdf',
      });

      return job;
    } catch (error) {
      // Handle errors
      const exportError = this.handleError(error);
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = exportError;
      this.emitProgress(job);
      await this.logExport(job);
      throw exportError;
    } finally {
      // Clean up hidden window
      if (pdfWindow && !pdfWindow.isDestroyed()) {
        pdfWindow.close();
      }
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Cancel an active export job
   */
  async cancelExport(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw this.createError(
        ExportErrorCode.NOT_FOUND,
        'Export job not found',
        false
      );
    }

    if (job.status === 'completed' || job.status === 'failed') {
      throw this.createError(
        ExportErrorCode.ALREADY_COMPLETED,
        'Export job has already completed',
        false
      );
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    this.emitProgress(job);
    this.activeJobs.delete(jobId);
  }

  /**
   * Get the current status of a job
   */
  getJobStatus(jobId: string): ExportJob | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * Wait for page content to be fully rendered.
   * loadURL() already resolves after the page finishes loading,
   * so we just need a delay for async content (images, scripts) to render.
   */
  private waitForContentReady(_window: BrowserWindow): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  }

  /**
   * Emit progress event for a job
   */
  private emitProgress(job: ExportJob): void {
    this.emit('progress', {
      jobId: job.id,
      status: job.status,
      progress: { ...job.progress },
      error: job.error,
    });
  }

  /**
   * Log export operation
   */
  private async logExport(job: ExportJob): Promise<void> {
    const logger = getExportLogger();
    await logger.log({
      timestamp: new Date(),
      jobId: job.id,
      type: job.type,
      source: job.source,
      destination: job.destination,
      status: job.status === 'completed' ? 'completed' : job.status === 'cancelled' ? 'cancelled' : 'failed',
      duration: job.completedAt && job.startedAt
        ? job.completedAt.getTime() - job.startedAt.getTime()
        : 0,
      filesProcessed: job.progress.filesProcessed,
      error: job.error ? { code: job.error.code, message: job.error.message } : undefined,
    });
  }

  /**
   * Handle errors and convert to ExportError
   */
  private handleError(error: unknown): ExportError {
    if (error instanceof Error) {
      if (error.message.includes('EACCES') || error.message.includes('permission')) {
        return this.createError(
          ExportErrorCode.PERMISSION_DENIED,
          'Permission denied. Please check file permissions and try again.',
          true
        );
      }
      if (error.message.includes('ENOSPC') || error.message.includes('disk full')) {
        return this.createError(
          ExportErrorCode.DISK_FULL,
          'Disk is full. Free up space and try again.',
          true
        );
      }
      if (error.message.includes('ENOMEM') || error.message.includes('memory')) {
        return this.createError(
          ExportErrorCode.MEMORY_EXCEEDED,
          'Not enough memory for this export. Try a smaller document.',
          false
        );
      }
      return this.createError(
        ExportErrorCode.UNKNOWN,
        `Export failed: ${error.message}`,
        true,
        error.stack
      );
    }
    return this.createError(
      ExportErrorCode.UNKNOWN,
      'An unknown error occurred during export.',
      true
    );
  }

  /**
   * Create a structured ExportError
   */
  private createError(
    code: ExportErrorCode,
    message: string,
    retryable: boolean,
    details?: string
  ): ExportError {
    return { code, message, retryable, details };
  }
}

// Singleton instance
let pdfExportServiceInstance: PdfExportService | null = null;

export function getPdfExportService(): PdfExportService {
  if (!pdfExportServiceInstance) {
    pdfExportServiceInstance = new PdfExportService();
  }
  return pdfExportServiceInstance;
}
