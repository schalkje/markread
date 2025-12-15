/**
 * Behavior Settings Panel
 * Task: T139
 */

import React from 'react';
import { useSettingsStore } from '../../stores/settings';
import './SettingsPanel.css';

export const BehaviorPanel: React.FC = () => {
  const { settings, updateBehavior } = useSettingsStore();

  if (!settings) return <div className="settings-panel__loading">Loading settings...</div>;

  const { behavior } = settings;

  return (
    <div className="settings-panel" data-testid="behavior-panel">
      <h3 className="settings-panel__title">Behavior</h3>
      <p className="settings-panel__description">
        Configure how MarkRead behaves
      </p>

      <div className="settings-section">
        <h4 className="settings-section__title">File Handling</h4>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            className="settings-checkbox__input"
            checked={behavior.autoReload}
            onChange={(e) => updateBehavior({ autoReload: e.target.checked })}
          />
          <div className="settings-checkbox__label">
            Auto-reload files when changed
            <span className="settings-checkbox__hint">
              Automatically reload markdown files when they change on disk
            </span>
          </div>
        </label>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            className="settings-checkbox__input"
            checked={behavior.restoreTabsOnLaunch}
            onChange={(e) => updateBehavior({ restoreTabsOnLaunch: e.target.checked })}
          />
          <div className="settings-checkbox__label">
            Restore tabs on launch
            <span className="settings-checkbox__hint">
              Reopen tabs from your last session when starting MarkRead
            </span>
          </div>
        </label>
      </div>

      <div className="settings-section">
        <h4 className="settings-section__title">Tab Behavior</h4>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            className="settings-checkbox__input"
            checked={behavior.confirmCloseMultipleTabs}
            onChange={(e) => updateBehavior({ confirmCloseMultipleTabs: e.target.checked })}
          />
          <div className="settings-checkbox__label">
            Confirm before closing multiple tabs
          </div>
        </label>

        <div className="settings-field">
          <label className="settings-label">Scroll Behavior</label>
          <select
            className="settings-select"
            value={behavior.scrollBehavior}
            onChange={(e) => updateBehavior({ scrollBehavior: e.target.value as any })}
          >
            <option value="smooth">Smooth</option>
            <option value="instant">Instant</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default BehaviorPanel;
