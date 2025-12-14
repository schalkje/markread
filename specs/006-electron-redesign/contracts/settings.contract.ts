/**
 * IPC Contract: Settings Management
 *
 * Defines the communication interface for application settings persistence,
 * validation, and synchronization between main and renderer processes.
 *
 * FR-047-062, FR-076-079
 * Pattern: invoke/handle (async request-response)
 */

import type { Settings } from '../data-model';  // Reference to data model

// ============================================================================
// Requests (Renderer → Main)
// ============================================================================

export namespace SettingsOperations {
  /**
   * Load settings from disk
   * Called on app initialization
   * FR-047, FR-050
   */
  export interface LoadSettingsRequest {
    channel: 'settings:load';
    payload: {
      folderPath?: string;     // Optional: Load folder-specific settings (.markread.json)
    };
  }

  export interface LoadSettingsResponse {
    success: boolean;
    settings?: Settings;       // Loaded settings object (global or folder-specific)
    source: 'global' | 'folder' | 'default';  // Where settings came from
    warnings?: string[];       // Validation warnings for invalid values
    error?: string;
  }

  /**
   * Save settings to disk
   * Called when user changes settings via Settings UI (Ctrl+,)
   * FR-047, FR-057 (atomic writes with backup)
   */
  export interface SaveSettingsRequest {
    channel: 'settings:save';
    payload: {
      settings: Partial<Settings>;  // Updated settings (partial for incremental updates)
      folderPath?: string;           // Optional: Save folder-specific settings
    };
  }

  export interface SaveSettingsResponse {
    success: boolean;
    backupCreated?: boolean;   // Backup .settings.json.bak created
    error?: string;
  }

  /**
   * Validate settings without saving
   * Called on live preview in Settings UI
   * FR-055, FR-061
   */
  export interface ValidateSettingsRequest {
    channel: 'settings:validate';
    payload: {
      settings: Partial<Settings>;  // Settings to validate
      category?: keyof Settings;     // Optional: Validate specific category only
    };
  }

  export interface ValidateSettingsResponse {
    success: boolean;
    errors?: ValidationError[];      // Validation errors
    warnings?: ValidationWarning[];  // Non-fatal warnings
  }

  /**
   * Reset settings to factory defaults
   * FR-059
   */
  export interface ResetSettingsRequest {
    channel: 'settings:reset';
    payload: {
      categories?: (keyof Settings)[];  // Optional: Reset specific categories only
      confirm: boolean;                  // Confirmation flag (must be true)
    };
  }

  export interface ResetSettingsResponse {
    success: boolean;
    settings?: Settings;       // New default settings
    error?: string;
  }

  /**
   * Export settings to JSON file
   * FR-060
   */
  export interface ExportSettingsRequest {
    channel: 'settings:export';
    payload: {
      filePath: string;        // Export destination path
      categories?: (keyof Settings)[];  // Optional: Export specific categories only
    };
  }

  export interface ExportSettingsResponse {
    success: boolean;
    exportedCategories?: (keyof Settings)[];
    error?: string;
  }

  /**
   * Import settings from JSON file
   * FR-060
   */
  export interface ImportSettingsRequest {
    channel: 'settings:import';
    payload: {
      filePath: string;        // Import source path
      mode: 'merge' | 'replace' | 'selective';  // Import mode
      categories?: (keyof Settings)[];          // For selective import
    };
  }

  export interface ImportSettingsResponse {
    success: boolean;
    importedCategories?: (keyof Settings)[];
    errors?: ValidationError[];  // Validation errors for imported data
    warnings?: string[];
    error?: string;
  }

  /**
   * Get default settings
   * Used for comparing with current settings or reset preview
   */
  export interface GetDefaultSettingsRequest {
    channel: 'settings:getDefaults';
    payload: {
      category?: keyof Settings;  // Optional: Get defaults for specific category
    };
  }

  export interface GetDefaultSettingsResponse {
    success: boolean;
    defaults?: Partial<Settings>;
    error?: string;
  }

  /**
   * Apply environment variable overrides
   * FR-058
   */
  export interface GetEnvOverridesRequest {
    channel: 'settings:getEnvOverrides';
    payload: {};
  }

  export interface GetEnvOverridesResponse {
    success: boolean;
    overrides?: {
      MARKREAD_THEME?: string;
      MARKREAD_AUTO_RELOAD?: string;
      MARKREAD_CONFIG_PATH?: string;
      MARKREAD_LOG_LEVEL?: string;
    };
  }

  /**
   * Repair corrupted settings file
   * FR-057 (corruption detection and auto-restore)
   */
  export interface RepairSettingsRequest {
    channel: 'settings:repair';
    payload: {
      attemptBackupRestore: boolean;  // Try restoring from .settings.json.bak
    };
  }

  export interface RepairSettingsResponse {
    success: boolean;
    repairAction: 'backup_restored' | 'reset_to_defaults' | 'manual_fix_required';
    settings?: Settings;
    error?: string;
  }
}

// ============================================================================
// Events (Main → Renderer)
// ============================================================================

export namespace SettingsEvents {
  /**
   * Settings changed event
   * Triggered when settings are updated (from any source)
   * Allows renderer to update UI reactively
   */
  export interface SettingsChangedEvent {
    channel: 'settings:changed';
    payload: {
      changedCategories: (keyof Settings)[];
      newSettings: Settings;
      source: 'user' | 'import' | 'reset' | 'repair' | 'env_override';
    };
  }

  /**
   * Settings file corruption detected
   * Edge case from FR-057
   */
  export interface SettingsCorruptedEvent {
    channel: 'settings:corrupted';
    payload: {
      filePath: string;
      error: string;
      backupAvailable: boolean;
    };
  }

  /**
   * Per-folder settings loaded
   * FR-056
   */
  export interface FolderSettingsLoadedEvent {
    channel: 'settings:folderLoaded';
    payload: {
      folderPath: string;
      settings: Partial<Settings>;
      overrides: (keyof Settings)[];  // Which settings were overridden from global
    };
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface ValidationError {
  category: keyof Settings;
  field: string;               // Field path (e.g., "appearance.contentFontSize")
  value: any;                  // Invalid value
  message: string;             // Human-readable error message
  constraint: string;          // Validation constraint (e.g., "8-24pt")
}

export interface ValidationWarning {
  category: keyof Settings;
  field: string;
  value: any;
  message: string;
  suggestion?: string;         // Suggested fix
}

/**
 * Settings file paths
 * FR-047, FR-053
 */
export const SETTINGS_PATHS = {
  GLOBAL_SETTINGS: '%APPDATA%/MarkRead/settings.json',
  GLOBAL_BACKUP: '%APPDATA%/MarkRead/.settings.json.bak',
  TEMP_WRITE: '%APPDATA%/MarkRead/.settings.tmp.json',
  FOLDER_SETTINGS: '.markread.json',  // In folder root
} as const;

/**
 * Per-folder settings override whitelist
 * FR-056 - only subset of settings allowed in folder config
 */
export const FOLDER_OVERRIDABLE_SETTINGS = [
  'appearance.theme',
  'behavior.autoReload',
  'behavior.autoReloadDebounce',
  'behavior.scrollBehavior',
  'search.excludePatterns',
  'search.includeHiddenFiles',
] as const;

/**
 * Environment variable overrides
 * FR-058
 */
export const ENV_VAR_OVERRIDES = {
  MARKREAD_THEME: 'appearance.theme',
  MARKREAD_AUTO_RELOAD: 'behavior.autoReload',
  MARKREAD_CONFIG_PATH: 'configPath',  // Override global settings location
  MARKREAD_LOG_LEVEL: 'advanced.logLevel',
} as const;

// ============================================================================
// Usage Example
// ============================================================================

/**
 * Example: Renderer loads settings on app start
 *
 * // In renderer (app initialization):
 * const result = await window.electronAPI.settings.load({});
 *
 * if (result.success) {
 *   // Initialize Pinia store with settings
 *   settingsStore.setState(result.settings);
 *
 *   // Check for warnings (invalid values)
 *   if (result.warnings?.length > 0) {
 *     console.warn('Settings validation warnings:', result.warnings);
 *   }
 * }
 *
 *
 * // Example: User changes theme in Settings UI
 * const updatedSettings = {
 *   appearance: {
 *     ...currentSettings.appearance,
 *     theme: 'dark'
 *   }
 * };
 *
 * // Validate first (for live preview)
 * const validation = await window.electronAPI.settings.validate({
 *   settings: updatedSettings,
 *   category: 'appearance'
 * });
 *
 * if (validation.success) {
 *   // Apply to UI immediately (live preview)
 *   applyTheme('dark');
 *
 *   // Save to disk
 *   const saveResult = await window.electronAPI.settings.save({
 *     settings: updatedSettings
 *   });
 * }
 *
 *
 * // Example: Handle settings changed event
 * window.electronAPI.on('settings:changed', (event) => {
 *   console.log('Settings updated from:', event.source);
 *   console.log('Changed categories:', event.changedCategories);
 *
 *   // Update Pinia store
 *   settingsStore.setState(event.newSettings);
 *
 *   // Re-apply theme if appearance changed
 *   if (event.changedCategories.includes('appearance')) {
 *     applyTheme(event.newSettings.appearance.theme);
 *   }
 * });
 */
