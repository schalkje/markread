/**
 * Settings Manager
 * Handles persistence of application settings using electron-store
 * Uses dynamic import for ESM compatibility
 */

import type Store from 'electron-store';
import type { Settings, BehaviorSettings } from '@shared/types/entities';
import { LogLevel } from '@shared/types/entities';
import { createDefaultExclusionPatterns } from '@shared/constants/folderExclusions';
import { createDefaultFileEntries } from '@shared/constants/defaultFiles';

/**
 * Create default settings object
 */
function createDefaultSettings(): Settings {
  return {
    version: '1.0.0',
    appearance: {
      theme: 'system',
      followSystemTheme: true,
      contentFontFamily: 'Segoe UI',
      contentFontSize: 14,
      codeFontFamily: 'Consolas',
      codeFontSize: 12,
      lineHeight: 1.6,
      maxContentWidth: 800,
      contentPadding: 24,
      syntaxHighlightThemeLight: 'github',
      syntaxHighlightThemeDark: 'github-dark',
      sidebarWidth: 250,
    },
    behavior: {
      autoReload: true,
      autoReloadDebounce: 300,
      restoreTabsOnLaunch: true,
      confirmCloseMultipleTabs: true,
      defaultTabBehavior: 'new',
      showFileTree: true,
      scrollBehavior: 'smooth',
      externalLinksBehavior: 'browser',
      folderExclusionPatterns: createDefaultExclusionPatterns(),
      defaultFilesToOpen: createDefaultFileEntries(),
    },
    search: {
      caseSensitiveDefault: false,
      searchHistorySize: 50,
      globalSearchMaxResults: 1000,
      excludePatterns: [],
      includeHiddenFiles: false,
    },
    performance: {
      enableIndexing: true,
      largeFileThreshold: 1048576,
      warnOnLargeFiles: true,
    },
    keyboard: {
      shortcuts: [],
    },
    advanced: {
      customCssEnabled: false,
      customCssPath: null,
      loggingEnabled: true,
      logLevel: LogLevel.Info,
      logFilePath: '%APPDATA%/MarkRead/logs/app.log',
      logMaxSize: 10485760,
      updateCheckFrequency: 'OnStartup',
      allowPreReleaseUpdates: false,
      animationsEnabled: true,
      animationDuration: 200,
      reducedMotion: false,
    },
  };
}

interface SettingsStore {
  settings: Settings;
}

export class SettingsManager {
  private store: Store<SettingsStore> | null = null;
  private static instance: SettingsManager | null = null;

  /**
   * Get singleton instance
   */
  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * Lazy-load the store using dynamic import (electron-store is ESM-only)
   */
  private async getStore(): Promise<Store<SettingsStore>> {
    if (!this.store) {
      try {
        const { default: ElectronStore } = await import('electron-store');
        this.store = new ElectronStore<SettingsStore>({
          name: 'settings',
        });
      } catch (error) {
        console.error('[SettingsManager] Failed to initialize store:', error);
        throw error;
      }
    }
    return this.store;
  }

  /**
   * Load settings from store, merging with defaults
   */
  async loadSettings(): Promise<{ settings: Settings; warnings: string[] }> {
    const warnings: string[] = [];
    const defaults = createDefaultSettings();

    try {
      const store = await this.getStore();
      const stored = (store.get('settings') || {}) as Partial<Settings>;

      // Deep merge stored settings with defaults
      const settings = this.mergeSettings(defaults, stored);

      // Ensure folder exclusion patterns exist (migration for existing users)
      if (!settings.behavior.folderExclusionPatterns || settings.behavior.folderExclusionPatterns.length === 0) {
        settings.behavior.folderExclusionPatterns = createDefaultExclusionPatterns();
        warnings.push('Folder exclusion patterns were missing, restored defaults');
      }

      // Ensure default files to open exist (migration for existing users)
      if (!settings.behavior.defaultFilesToOpen || settings.behavior.defaultFilesToOpen.length === 0) {
        settings.behavior.defaultFilesToOpen = createDefaultFileEntries();
        warnings.push('Default files to open were missing, restored defaults');
      }

      return { settings, warnings };
    } catch (error) {
      console.error('[SettingsManager] Error loading settings:', error);
      return { settings: defaults, warnings: ['Failed to load settings, using defaults'] };
    }
  }

  /**
   * Save settings to store
   */
  async saveSettings(settings: Settings): Promise<void> {
    const store = await this.getStore();
    store.set('settings', settings);
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<Settings> {
    const defaults = createDefaultSettings();
    const store = await this.getStore();
    store.set('settings', defaults);
    return defaults;
  }

  /**
   * Deep merge stored settings with defaults
   */
  private mergeSettings(defaults: Settings, stored: Partial<Settings>): Settings {
    return {
      version: stored.version || defaults.version,
      appearance: { ...defaults.appearance, ...stored.appearance },
      behavior: { ...defaults.behavior, ...stored.behavior } as BehaviorSettings,
      search: { ...defaults.search, ...stored.search },
      performance: { ...defaults.performance, ...stored.performance },
      keyboard: { ...defaults.keyboard, ...stored.keyboard },
      advanced: { ...defaults.advanced, ...stored.advanced },
    };
  }
}
