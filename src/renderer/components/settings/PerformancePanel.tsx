/**
 * Performance Settings Panel
 * Task: T141
 */

import React from 'react';
import { useSettingsStore } from '../../stores/settings';
import './SettingsPanel.css';

export const PerformancePanel: React.FC = () => {
  const { settings, updatePerformance } = useSettingsStore();

  if (!settings) return <div className="settings-panel__loading">Loading settings...</div>;

  const { performance } = settings;

  return (
    <div className="settings-panel" data-testid="performance-panel">
      <h3 className="settings-panel__title">Performance</h3>
      <p className="settings-panel__description">
        Configure performance and optimization settings
      </p>

      <div className="settings-section">
        <h4 className="settings-section__title">Optimization</h4>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            className="settings-checkbox__input"
            checked={performance.enableIndexing}
            onChange={(e) => updatePerformance({ enableIndexing: e.target.checked })}
          />
          <div className="settings-checkbox__label">
            Enable file indexing
            <span className="settings-checkbox__hint">
              Build search index for faster file searches (uses more memory)
            </span>
          </div>
        </label>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            className="settings-checkbox__input"
            checked={performance.warnOnLargeFiles}
            onChange={(e) => updatePerformance({ warnOnLargeFiles: e.target.checked })}
          />
          <div className="settings-checkbox__label">
            Warn when opening large files
          </div>
        </label>

        <div className="settings-field">
          <label className="settings-label" htmlFor="large-file-threshold">
            Large File Threshold (MB)
          </label>
          <div className="settings-number">
            <input
              id="large-file-threshold"
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              className="settings-input settings-input--small"
              value={(performance.largeFileThreshold / 1048576).toFixed(1)}
              onChange={(e) => updatePerformance({ largeFileThreshold: Math.floor(Number(e.target.value) * 1048576) })}
            />
            <span className="settings-unit">MB</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformancePanel;
