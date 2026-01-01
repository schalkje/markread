/**
 * Zustand Store: Settings
 * Manages application settings with validation and persistence
 */

import { create } from 'zustand';
import type { Settings } from '@shared/types/entities.d.ts';
import { LogLevel } from '@shared/types/entities.d.ts';

// Default settings
const createDefaultSettings = (): Settings => ({
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
    largeFileThreshold: 1048576, // 1MB
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
    logMaxSize: 10485760, // 10MB
    updateCheckFrequency: 'OnStartup',
    allowPreReleaseUpdates: false,
    animationsEnabled: true,
    animationDuration: 200,
    reducedMotion: false,
  },
});

interface SettingsState {
  settings: Settings;
  isLoading: boolean;
  isDirty: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<boolean>;
  updateAppearance: (updates: Partial<Settings['appearance']>) => void;
  updateBehavior: (updates: Partial<Settings['behavior']>) => void;
  updateSearch: (updates: Partial<Settings['search']>) => void;
  updatePerformance: (updates: Partial<Settings['performance']>) => void;
  updateAdvanced: (updates: Partial<Settings['advanced']>) => void;
  resetSettings: () => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: createDefaultSettings(),
  isLoading: false,
  isDirty: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const result = await window.electronAPI.settings.load({});
      if (result.success && result.settings) {
        set({ settings: result.settings, isDirty: false });

        if (result.warnings && result.warnings.length > 0) {
          console.warn('Settings validation warnings:', result.warnings);
        }
      } else {
        console.error('Failed to load settings:', result.error);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  saveSettings: async () => {
    const { settings } = get();
    try {
      const result = await window.electronAPI.settings.save({ settings });
      if (result.success) {
        set({ isDirty: false });
        return true;
      } else {
        console.error('Failed to save settings:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  },

  updateAppearance: (updates) => {
    set((state) => ({
      settings: {
        ...state.settings,
        appearance: { ...state.settings.appearance, ...updates },
      },
      isDirty: true,
    }));
  },

  updateBehavior: (updates) => {
    set((state) => ({
      settings: {
        ...state.settings,
        behavior: { ...state.settings.behavior, ...updates },
      },
      isDirty: true,
    }));
  },

  updateSearch: (updates) => {
    set((state) => ({
      settings: {
        ...state.settings,
        search: { ...state.settings.search, ...updates },
      },
      isDirty: true,
    }));
  },

  updatePerformance: (updates) => {
    set((state) => ({
      settings: {
        ...state.settings,
        performance: { ...state.settings.performance, ...updates },
      },
      isDirty: true,
    }));
  },

  updateAdvanced: (updates) => {
    set((state) => ({
      settings: {
        ...state.settings,
        advanced: { ...state.settings.advanced, ...updates },
      },
      isDirty: true,
    }));
  },

  resetSettings: async () => {
    try {
      const result = await window.electronAPI.settings.reset({ confirm: true });
      if (result.success && result.settings) {
        set({ settings: result.settings, isDirty: false });
        return true;
      } else {
        console.error('Failed to reset settings:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      return false;
    }
  },
}));
