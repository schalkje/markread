/**
 * Export Settings Store
 * Manages persistent export settings using electron-store (dynamic import for ESM compat)
 */

import type Store from 'electron-store';
import type { ExportSettings, RecentExport, PdfStylingOptions } from '../../../shared/types/export';
import { DEFAULT_PDF_STYLING } from '../../../shared/types/export';

interface StoreSchema {
  export: {
    settings: ExportSettings;
  };
}

const DEFAULT_SETTINGS: ExportSettings = {
  defaultPageSize: 'A4',
  defaultMargins: { top: 1, bottom: 1, left: 1, right: 1 },
  printBackground: true,
  includeSubfoldersDefault: true,
  recentExports: [],
  pdfStyling: DEFAULT_PDF_STYLING,
};

/**
 * Deep merge PDF styling options with defaults
 */
function mergePdfStyling(
  current: Partial<PdfStylingOptions> | undefined,
  defaults: PdfStylingOptions
): PdfStylingOptions {
  if (!current) return defaults;
  return {
    coverPage: { ...defaults.coverPage, ...current.coverPage },
    header: { ...defaults.header, ...current.header },
    footer: { ...defaults.footer, ...current.footer },
    toc: { ...defaults.toc, ...current.toc },
    sectionSeparators: { ...defaults.sectionSeparators, ...current.sectionSeparators },
  };
}

export class ExportSettingsStore {
  private store: Store<StoreSchema> | null = null;
  private storePromise: Promise<Store<StoreSchema>> | null = null;

  /**
   * Lazy-load the store using dynamic import (electron-store is ESM-only)
   */
  private async getStore(): Promise<Store<StoreSchema>> {
    if (this.store) {
      return this.store;
    }

    if (!this.storePromise) {
      this.storePromise = (async () => {
        const { default: ElectronStore } = await import('electron-store');
        this.store = new ElectronStore<StoreSchema>({
          name: 'markread-config',
          defaults: {
            export: {
              settings: DEFAULT_SETTINGS
            }
          }
        });
        return this.store;
      })();
    }

    return this.storePromise;
  }

  /**
   * Get current export settings
   */
  getSettings(): ExportSettings {
    // Synchronous access - return defaults if store not yet initialized
    if (!this.store) {
      return DEFAULT_SETTINGS;
    }
    return this.store.get('export.settings', DEFAULT_SETTINGS);
  }

  /**
   * Get settings asynchronously (ensures store is initialized)
   */
  async getSettingsAsync(): Promise<ExportSettings> {
    const store = await this.getStore();
    return store.get('export.settings', DEFAULT_SETTINGS);
  }

  /**
   * Update export settings
   */
  async updateSettings(partial: Partial<ExportSettings>): Promise<void> {
    const store = await this.getStore();
    const current = store.get('export.settings', DEFAULT_SETTINGS);
    const updated: ExportSettings = {
      ...current,
      ...partial,
      // Deep merge PDF styling options
      pdfStyling: partial.pdfStyling
        ? mergePdfStyling(partial.pdfStyling, current.pdfStyling || DEFAULT_PDF_STYLING)
        : current.pdfStyling || DEFAULT_PDF_STYLING,
    };
    store.set('export.settings', updated);
  }

  /**
   * Update PDF styling options specifically
   */
  async updatePdfStyling(partial: Partial<PdfStylingOptions>): Promise<void> {
    const store = await this.getStore();
    const current = store.get('export.settings', DEFAULT_SETTINGS);
    const updatedStyling = mergePdfStyling(partial, current.pdfStyling || DEFAULT_PDF_STYLING);
    store.set('export.settings', { ...current, pdfStyling: updatedStyling });
  }

  /**
   * Add to recent exports list
   */
  addRecentExport(recent: RecentExport): void {
    if (!this.store) {
      // Store not initialized yet, skip
      return;
    }
    const settings = this.store.get('export.settings', DEFAULT_SETTINGS);
    const recentExports = [recent, ...settings.recentExports];
    const trimmed = recentExports.slice(0, 10);
    this.store.set('export.settings', { ...settings, recentExports: trimmed });
  }

  /**
   * Clear recent exports
   */
  async clearRecentExports(): Promise<void> {
    await this.updateSettings({ recentExports: [] });
  }

  /**
   * Reset to default settings
   */
  async resetToDefaults(): Promise<void> {
    const store = await this.getStore();
    store.set('export.settings', DEFAULT_SETTINGS);
  }

  /**
   * Initialize the store eagerly (call during app startup)
   */
  async initialize(): Promise<void> {
    await this.getStore();
  }
}

// Singleton instance
let settingsStoreInstance: ExportSettingsStore | null = null;

export function getExportSettingsStore(): ExportSettingsStore {
  if (!settingsStoreInstance) {
    settingsStoreInstance = new ExportSettingsStore();
  }
  return settingsStoreInstance;
}
