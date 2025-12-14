/**
 * Pinia Store: Settings
 * Manages application settings with validation and persistence
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Settings } from '@shared/types/entities';

// Default settings (will be replaced with actual defaults from main process)
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
    logLevel: 'Info',
    logFilePath: '%APPDATA%/MarkRead/logs/app.log',
    logMaxSize: 10485760, // 10MB
    updateCheckFrequency: 'OnStartup',
    allowPreReleaseUpdates: false,
    animationsEnabled: true,
    animationDuration: 200,
    reducedMotion: false,
  },
});

export const useSettingsStore = defineStore('settings', () => {
  // State
  const settings = ref<Settings>(createDefaultSettings());
  const isLoading = ref(false);
  const isDirty = ref(false);

  // Actions
  const loadSettings = async () => {
    isLoading.value = true;
    try {
      const result = await window.electronAPI.settings.load({});
      if (result.success && result.settings) {
        settings.value = result.settings;
        isDirty.value = false;

        // Log warnings if any
        if (result.warnings && result.warnings.length > 0) {
          console.warn('Settings validation warnings:', result.warnings);
        }
      } else {
        console.error('Failed to load settings:', result.error);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      isLoading.value = false;
    }
  };

  const saveSettings = async () => {
    try {
      const result = await window.electronAPI.settings.save({
        settings: settings.value,
      });

      if (result.success) {
        isDirty.value = false;
        return true;
      } else {
        console.error('Failed to save settings:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  };

  const updateAppearance = (updates: Partial<Settings['appearance']>) => {
    settings.value.appearance = { ...settings.value.appearance, ...updates };
    isDirty.value = true;
  };

  const updateBehavior = (updates: Partial<Settings['behavior']>) => {
    settings.value.behavior = { ...settings.value.behavior, ...updates };
    isDirty.value = true;
  };

  const updateSearch = (updates: Partial<Settings['search']>) => {
    settings.value.search = { ...settings.value.search, ...updates };
    isDirty.value = true;
  };

  const updatePerformance = (updates: Partial<Settings['performance']>) => {
    settings.value.performance = { ...settings.value.performance, ...updates };
    isDirty.value = true;
  };

  const updateAdvanced = (updates: Partial<Settings['advanced']>) => {
    settings.value.advanced = { ...settings.value.advanced, ...updates };
    isDirty.value = true;
  };

  const resetSettings = async () => {
    try {
      const result = await window.electronAPI.settings.reset({
        confirm: true,
      });

      if (result.success && result.settings) {
        settings.value = result.settings;
        isDirty.value = false;
        return true;
      } else {
        console.error('Failed to reset settings:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      return false;
    }
  };

  const validateSettings = async (
    settingsToValidate: Partial<Settings>,
    category?: keyof Settings
  ) => {
    try {
      const result = await window.electronAPI.settings.validate({
        settings: settingsToValidate,
        category,
      });

      return result;
    } catch (error) {
      console.error('Error validating settings:', error);
      return { success: false, errors: [], warnings: [] };
    }
  };

  return {
    // State
    settings,
    isLoading,
    isDirty,

    // Actions
    loadSettings,
    saveSettings,
    updateAppearance,
    updateBehavior,
    updateSearch,
    updatePerformance,
    updateAdvanced,
    resetSettings,
    validateSettings,
  };
});
