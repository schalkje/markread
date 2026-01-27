/**
 * Settings IPC Handlers
 *
 * Electron IPC handlers for application settings operations.
 * Provides load, save, and reset functionality with error handling.
 */

import { ipcMain } from 'electron';
import { z } from 'zod';
import { SettingsManager } from '../services/storage/settings-manager';

// Get singleton instance
const settingsManager = SettingsManager.getInstance();

// Validation schemas
const SaveSettingsSchema = z.object({
  settings: z.object({}).passthrough(),
});

const ResetSettingsSchema = z.object({
  confirm: z.boolean(),
});

/**
 * Register all Settings IPC handlers
 */
export function registerSettingsHandlers(): void {
  /**
   * Load settings from store
   * Channel: settings:load
   */
  ipcMain.handle('settings:load', async () => {
    try {
      const { settings, warnings } = await settingsManager.loadSettings();
      return {
        success: true,
        settings,
        warnings,
      };
    } catch (error: any) {
      console.error('[IPC] Error loading settings:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Save settings to store
   * Channel: settings:save
   */
  ipcMain.handle('settings:save', async (_event, payload) => {
    try {
      const { settings } = SaveSettingsSchema.parse(payload);
      await settingsManager.saveSettings(settings as any);
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('[IPC] Error saving settings:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Reset settings to defaults
   * Channel: settings:reset
   */
  ipcMain.handle('settings:reset', async (_event, payload) => {
    try {
      const { confirm } = ResetSettingsSchema.parse(payload);
      if (!confirm) {
        return {
          success: false,
          error: 'Reset not confirmed',
        };
      }

      const settings = await settingsManager.resetSettings();
      return {
        success: true,
        settings,
      };
    } catch (error: any) {
      console.error('[IPC] Error resetting settings:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  });
}
