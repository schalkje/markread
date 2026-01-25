/**
 * Export Settings Panel
 *
 * Settings for PDF export options including cover page, header, footer,
 * table of contents, and section separators styling
 */

import React, { useState, useEffect } from 'react';
import type { ExportSettings, PdfStylingOptions } from '../../../shared/types/export';
import { DEFAULT_PDF_STYLING } from '../../../shared/types/export';
import './SettingsPanel.css';

/** Deep partial type for nested objects */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Export Panel for PDF generation settings
 */
export const ExportPanel: React.FC = () => {
  const [settings, setSettings] = useState<ExportSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load export settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const result = await window.exportApi.getSettings();
      if (result.success && result.settings) {
        setSettings(result.settings);
      } else {
        setError(result.error || 'Failed to load export settings');
      }
    } catch (err) {
      setError('Failed to load export settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStyling = async (updates: DeepPartial<PdfStylingOptions>) => {
    if (!settings) return;

    const currentStyling = settings.pdfStyling || DEFAULT_PDF_STYLING;
    const newStyling: PdfStylingOptions = {
      coverPage: { ...currentStyling.coverPage, ...updates.coverPage },
      header: { ...currentStyling.header, ...updates.header },
      footer: { ...currentStyling.footer, ...updates.footer },
      toc: { ...currentStyling.toc, ...updates.toc },
      sectionSeparators: { ...currentStyling.sectionSeparators, ...updates.sectionSeparators },
    };

    // Update local state immediately for responsive UI
    setSettings({ ...settings, pdfStyling: newStyling });

    // Persist to store
    try {
      const result = await window.exportApi.updateSettings({ pdfStyling: newStyling });
      if (!result.success) {
        setError(result.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings');
    }
  };

  if (isLoading) {
    return <div className="settings-panel__loading">Loading export settings...</div>;
  }

  if (error) {
    return (
      <div className="settings-panel__loading">
        Error: {error}
        <button onClick={loadSettings} style={{ marginLeft: 8 }}>Retry</button>
      </div>
    );
  }

  if (!settings) {
    return <div className="settings-panel__loading">No settings available</div>;
  }

  const styling = settings.pdfStyling || DEFAULT_PDF_STYLING;

  return (
    <div className="settings-panel" data-testid="export-panel">
      <h3 className="settings-panel__title">Export</h3>
      <p className="settings-panel__description">
        Configure PDF export styling and layout options
      </p>

      {/* Cover Page Settings */}
      <div className="settings-section">
        <h4 className="settings-section__title">Cover Page</h4>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            className="settings-checkbox__input"
            checked={styling.coverPage.showLogo}
            onChange={(e) => updateStyling({
              coverPage: { showLogo: e.target.checked },
            })}
          />
          <div className="settings-checkbox__label">
            Show MarkRead logo
            <span className="settings-checkbox__hint">
              Display the MarkRead logo on the cover page
            </span>
          </div>
        </label>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            className="settings-checkbox__input"
            checked={styling.coverPage.showBranding}
            onChange={(e) => updateStyling({
              coverPage: { showBranding: e.target.checked },
            })}
          />
          <div className="settings-checkbox__label">
            Show branding
            <span className="settings-checkbox__hint">
              Display MarkRead version and website at the bottom of the cover page
            </span>
          </div>
        </label>
      </div>

      {/* Footer Settings */}
      <div className="settings-section">
        <h4 className="settings-section__title">Page Footer</h4>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            className="settings-checkbox__input"
            checked={styling.footer.enabled}
            onChange={(e) => updateStyling({
              footer: { enabled: e.target.checked },
            })}
          />
          <div className="settings-checkbox__label">
            Enable page footer
            <span className="settings-checkbox__hint">
              Show footer information at the bottom of each page
            </span>
          </div>
        </label>

        {styling.footer.enabled && (
          <>
            <label className="settings-checkbox">
              <input
                type="checkbox"
                className="settings-checkbox__input"
                checked={styling.footer.showPageNumbers}
                onChange={(e) => updateStyling({
                  footer: { showPageNumbers: e.target.checked },
                })}
              />
              <div className="settings-checkbox__label">
                Show page numbers
                <span className="settings-checkbox__hint">
                  Display page numbers in the footer
                </span>
              </div>
            </label>

            <label className="settings-checkbox">
              <input
                type="checkbox"
                className="settings-checkbox__input"
                checked={styling.footer.showBranding}
                onChange={(e) => updateStyling({
                  footer: { showBranding: e.target.checked },
                })}
              />
              <div className="settings-checkbox__label">
                Show MarkRead branding
                <span className="settings-checkbox__hint">
                  Display "Generated by MarkRead" text in the footer
                </span>
              </div>
            </label>

            <div className="settings-field">
              <label className="settings-label" htmlFor="footer-custom">
                Custom Footer Text
              </label>
              <input
                id="footer-custom"
                type="text"
                className="settings-input"
                placeholder="Leave empty for automatic footer"
                value={styling.footer.customText || ''}
                onChange={(e) => updateStyling({
                  footer: { customText: e.target.value || undefined },
                })}
              />
              <p className="settings-hint">
                Add custom text to the footer (appears alongside page numbers)
              </p>
            </div>
          </>
        )}
      </div>

      {/* Table of Contents Settings */}
      <div className="settings-section">
        <h4 className="settings-section__title">Table of Contents</h4>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            className="settings-checkbox__input"
            checked={styling.toc.showPageNumbers}
            onChange={(e) => updateStyling({
              toc: { showPageNumbers: e.target.checked },
            })}
          />
          <div className="settings-checkbox__label">
            Show page numbers in TOC
            <span className="settings-checkbox__hint">
              Display page numbers next to each entry in the table of contents
            </span>
          </div>
        </label>
      </div>

      {/* Section Separator Settings */}
      <div className="settings-section">
        <h4 className="settings-section__title">Section Separators</h4>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            className="settings-checkbox__input"
            checked={styling.sectionSeparators.showPageNumbers}
            onChange={(e) => updateStyling({
              sectionSeparators: { showPageNumbers: e.target.checked },
            })}
          />
          <div className="settings-checkbox__label">
            Show page numbers on separator pages
            <span className="settings-checkbox__hint">
              Display page numbers on subfolder separator pages
            </span>
          </div>
        </label>
      </div>

      {/* Default Export Settings */}
      <div className="settings-section">
        <h4 className="settings-section__title">Default Export Options</h4>

        <div className="settings-field">
          <label className="settings-label" htmlFor="page-size">
            Default Page Size
          </label>
          <select
            id="page-size"
            className="settings-select"
            value={settings.defaultPageSize}
            onChange={async (e) => {
              const newSettings = { ...settings, defaultPageSize: e.target.value as 'A4' | 'Letter' };
              setSettings(newSettings);
              await window.exportApi.updateSettings({ defaultPageSize: newSettings.defaultPageSize });
            }}
          >
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
          </select>
          <p className="settings-hint">
            Default paper size for PDF exports
          </p>
        </div>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            className="settings-checkbox__input"
            checked={settings.printBackground}
            onChange={async (e) => {
              const newSettings = { ...settings, printBackground: e.target.checked };
              setSettings(newSettings);
              await window.exportApi.updateSettings({ printBackground: newSettings.printBackground });
            }}
          />
          <div className="settings-checkbox__label">
            Print background colors and images
            <span className="settings-checkbox__hint">
              Include background colors and images in PDF output
            </span>
          </div>
        </label>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            className="settings-checkbox__input"
            checked={settings.includeSubfoldersDefault}
            onChange={async (e) => {
              const newSettings = { ...settings, includeSubfoldersDefault: e.target.checked };
              setSettings(newSettings);
              await window.exportApi.updateSettings({ includeSubfoldersDefault: newSettings.includeSubfoldersDefault });
            }}
          />
          <div className="settings-checkbox__label">
            Include subfolders by default
            <span className="settings-checkbox__hint">
              When exporting a folder, include markdown files from subfolders
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};

export default ExportPanel;
