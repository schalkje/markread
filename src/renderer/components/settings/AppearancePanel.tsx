/**
 * Appearance Settings Panel
 * Task: T138
 *
 * Settings for theme, fonts, line height, and sidebar width
 */

import React from 'react';
import { useSettingsStore } from '../../stores/settings';
import { useThemeStore } from '../../stores/theme';
import { themeManager } from '../../services/theme-manager';
import './SettingsPanel.css';

/**
 * T138: Appearance Panel (theme, fonts, line height, sidebar width)
 */
export const AppearancePanel: React.FC = () => {
  const { settings, updateAppearance } = useSettingsStore();
  const { getAllThemes } = useThemeStore();

  if (!settings) return <div className="settings-panel__loading">Loading settings...</div>;

  const { appearance } = settings;
  const availableThemes = getAllThemes();

  // T143: Live preview - apply theme immediately
  const handleThemeChange = (themeId: string) => {
    updateAppearance({ theme: themeId as any });
    themeManager.switchTheme(themeId);
  };

  return (
    <div className="settings-panel" data-testid="appearance-panel">
      <h3 className="settings-panel__title">Appearance</h3>
      <p className="settings-panel__description">
        Customize the visual appearance of MarkRead
      </p>

      {/* Theme Selection */}
      <div className="settings-section">
        <h4 className="settings-section__title">Theme</h4>

        <div className="settings-field">
          <label className="settings-label" htmlFor="theme-select">
            Color Theme
          </label>
          <select
            id="theme-select"
            className="settings-select"
            value={appearance.followSystemTheme ? 'system' : appearance.theme}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'system') {
                updateAppearance({ followSystemTheme: true });
              } else {
                updateAppearance({ followSystemTheme: false, theme: value as any });
                handleThemeChange(value);
              }
            }}
          >
            <option value="system">System (Auto)</option>
            <option value="system-light">Light</option>
            <option value="system-dark">Dark</option>
            <option value="high-contrast-light">High Contrast Light</option>
            <option value="high-contrast-dark">High Contrast Dark</option>
          </select>
          <p className="settings-hint">
            Choose between light, dark, or high contrast themes. System follows your OS preference.
          </p>
        </div>

        {/* Theme Preview */}
        {availableThemes.length > 0 && (
          <div className="settings-field">
            <div className="theme-preview">
              <div className="theme-preview__grid">
                {availableThemes.map((theme) => (
                  <button
                    key={theme.id}
                    className={`theme-preview__item ${appearance.theme === theme.id ? 'theme-preview__item--active' : ''}`}
                    onClick={() => handleThemeChange(theme.id)}
                    title={theme.name}
                  >
                    <div
                      className="theme-preview__swatch"
                      style={{
                        background: `linear-gradient(135deg, ${theme.colorMappings.background} 0%, ${theme.colorMappings.accent} 100%)`,
                        border: `2px solid ${theme.colorMappings.foreground}`,
                      }}
                    />
                    <span className="theme-preview__name">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Font Settings */}
      <div className="settings-section">
        <h4 className="settings-section__title">Fonts</h4>

        <div className="settings-field">
          <label className="settings-label" htmlFor="content-font">
            Content Font Family
          </label>
          <input
            id="content-font"
            type="text"
            className="settings-input"
            value={appearance.contentFontFamily}
            onChange={(e) => updateAppearance({ contentFontFamily: e.target.value })}
          />
          <p className="settings-hint">
            Font family for markdown content. Use system fonts or Google Fonts.
          </p>
        </div>

        <div className="settings-field">
          <label className="settings-label" htmlFor="content-font-size">
            Content Font Size
          </label>
          <div className="settings-number">
            <input
              id="content-font-size"
              type="number"
              min="8"
              max="24"
              className="settings-input settings-input--small"
              value={appearance.contentFontSize}
              onChange={(e) => updateAppearance({ contentFontSize: Number(e.target.value) })}
            />
            <span className="settings-unit">pt</span>
          </div>
          <input
            type="range"
            min="8"
            max="24"
            className="settings-slider"
            value={appearance.contentFontSize}
            onChange={(e) => updateAppearance({ contentFontSize: Number(e.target.value) })}
          />
        </div>

        <div className="settings-field">
          <label className="settings-label" htmlFor="code-font">
            Code Font Family
          </label>
          <input
            id="code-font"
            type="text"
            className="settings-input"
            value={appearance.codeFontFamily}
            onChange={(e) => updateAppearance({ codeFontFamily: e.target.value })}
          />
          <p className="settings-hint">
            Monospace font for code blocks. Examples: Consolas, Monaco, Fira Code
          </p>
        </div>

        <div className="settings-field">
          <label className="settings-label" htmlFor="code-font-size">
            Code Font Size
          </label>
          <div className="settings-number">
            <input
              id="code-font-size"
              type="number"
              min="8"
              max="20"
              className="settings-input settings-input--small"
              value={appearance.codeFontSize}
              onChange={(e) => updateAppearance({ codeFontSize: Number(e.target.value) })}
            />
            <span className="settings-unit">pt</span>
          </div>
          <input
            type="range"
            min="8"
            max="20"
            className="settings-slider"
            value={appearance.codeFontSize}
            onChange={(e) => updateAppearance({ codeFontSize: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* Layout Settings */}
      <div className="settings-section">
        <h4 className="settings-section__title">Layout</h4>

        <div className="settings-field">
          <label className="settings-label" htmlFor="line-height">
            Line Height
          </label>
          <div className="settings-number">
            <input
              id="line-height"
              type="number"
              min="1.0"
              max="2.5"
              step="0.1"
              className="settings-input settings-input--small"
              value={appearance.lineHeight}
              onChange={(e) => updateAppearance({ lineHeight: Number(e.target.value) })}
            />
          </div>
          <input
            type="range"
            min="1.0"
            max="2.5"
            step="0.1"
            className="settings-slider"
            value={appearance.lineHeight}
            onChange={(e) => updateAppearance({ lineHeight: Number(e.target.value) })}
          />
          <p className="settings-hint">
            Spacing between lines in markdown content
          </p>
        </div>

        <div className="settings-field">
          <label className="settings-label" htmlFor="max-width">
            Max Content Width
          </label>
          <select
            id="max-width"
            className="settings-select"
            value={appearance.maxContentWidth}
            onChange={(e) => {
              const value = e.target.value;
              updateAppearance({
                maxContentWidth: value === 'full' ? 'full' : Number(value),
              });
            }}
          >
            <option value="full">Full Width</option>
            <option value="600">600px</option>
            <option value="800">800px (Recommended)</option>
            <option value="1000">1000px</option>
          </select>
          <p className="settings-hint">
            Maximum width of markdown content for better readability
          </p>
        </div>

        <div className="settings-field">
          <label className="settings-label" htmlFor="sidebar-width">
            Sidebar Width
          </label>
          <div className="settings-number">
            <input
              id="sidebar-width"
              type="number"
              min="150"
              max="500"
              className="settings-input settings-input--small"
              value={appearance.sidebarWidth}
              onChange={(e) => updateAppearance({ sidebarWidth: Number(e.target.value) })}
            />
            <span className="settings-unit">px</span>
          </div>
          <input
            type="range"
            min="150"
            max="500"
            className="settings-slider"
            value={appearance.sidebarWidth}
            onChange={(e) => updateAppearance({ sidebarWidth: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
};

export default AppearancePanel;
