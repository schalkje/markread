/**
 * Search Settings Panel
 * Task: T140
 */

import React from 'react';
import { useSettingsStore } from '../../stores/settings';
import './SettingsPanel.css';

export const SearchPanel: React.FC = () => {
  const { settings, updateSearch } = useSettingsStore();

  if (!settings) return <div className="settings-panel__loading">Loading settings...</div>;

  const { search } = settings;

  return (
    <div className="settings-panel" data-testid="search-panel">
      <h3 className="settings-panel__title">Search</h3>
      <p className="settings-panel__description">
        Configure search behavior and exclusions
      </p>

      <div className="settings-section">
        <h4 className="settings-section__title">Search Options</h4>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            className="settings-checkbox__input"
            checked={search.caseSensitiveDefault}
            onChange={(e) => updateSearch({ caseSensitiveDefault: e.target.checked })}
          />
          <div className="settings-checkbox__label">
            Case sensitive by default
          </div>
        </label>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            className="settings-checkbox__input"
            checked={search.includeHiddenFiles}
            onChange={(e) => updateSearch({ includeHiddenFiles: e.target.checked })}
          />
          <div className="settings-checkbox__label">
            Include hidden files in search
          </div>
        </label>

        <div className="settings-field">
          <label className="settings-label" htmlFor="max-results">
            Max Search Results
          </label>
          <div className="settings-number">
            <input
              id="max-results"
              type="number"
              min="100"
              max="5000"
              className="settings-input settings-input--small"
              value={search.globalSearchMaxResults}
              onChange={(e) => updateSearch({ globalSearchMaxResults: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPanel;
