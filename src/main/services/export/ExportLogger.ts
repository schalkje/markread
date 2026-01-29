/**
 * Export Logger Service
 * Handles logging of export operations to JSON Lines format
 */

import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ExportLogEntry } from '../../../shared/types/export';

export class ExportLogger {
  private logPath: string;
  private logFile: string;

  constructor() {
    // Store logs in app data directory
    this.logPath = path.join(app.getPath('userData'), 'logs');
    this.logFile = path.join(this.logPath, 'export.jsonl');
  }

  /**
   * Initialize logger by ensuring log directory exists
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.logPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * Log an export operation
   */
  async log(entry: ExportLogEntry): Promise<void> {
    try {
      // Ensure log directory exists
      await this.initialize();

      // Convert to JSON line
      const line = JSON.stringify({
        ...entry,
        timestamp: entry.timestamp.toISOString()
      }) + '\n';

      // Append to log file
      await fs.appendFile(this.logFile, line, 'utf8');

      // Rotate logs if file is too large (>10MB)
      await this.rotateIfNeeded();
    } catch (error) {
      console.error('Failed to write export log:', error);
    }
  }

  /**
   * Get recent log entries
   */
  async getRecentLogs(limit: number = 100): Promise<ExportLogEntry[]> {
    try {
      // Read log file
      const content = await fs.readFile(this.logFile, 'utf8');
      
      // Parse JSON lines
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      const entries = lines
        .map(line => {
          try {
            const parsed = JSON.parse(line);
            return {
              ...parsed,
              timestamp: new Date(parsed.timestamp)
            };
          } catch {
            return null;
          }
        })
        .filter((entry): entry is ExportLogEntry => entry !== null);

      // Return most recent entries
      return entries.slice(-limit).reverse();
    } catch {
      // Log file doesn't exist or can't be read
      return [];
    }
  }

  /**
   * Rotate log file if it exceeds size limit
   */
  private async rotateIfNeeded(): Promise<void> {
    try {
      const stats = await fs.stat(this.logFile);
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (stats.size > maxSize) {
        // Create backup with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(this.logPath, `export-${timestamp}.jsonl`);
        
        // Copy current log to backup
        await fs.copyFile(this.logFile, backupFile);
        
        // Clear current log
        await fs.writeFile(this.logFile, '', 'utf8');

        console.log(`Rotated export log to: ${backupFile}`);
      }
    } catch {
      // File doesn't exist yet or stats failed - ignore
    }
  }

  /**
   * Open logs folder in file explorer
   */
  async openLogsFolder(): Promise<void> {
    const { shell } = await import('electron');
    await shell.openPath(this.logPath);
  }
}

// Singleton instance
let loggerInstance: ExportLogger | null = null;

export function getExportLogger(): ExportLogger {
  if (!loggerInstance) {
    loggerInstance = new ExportLogger();
  }
  return loggerInstance;
}
