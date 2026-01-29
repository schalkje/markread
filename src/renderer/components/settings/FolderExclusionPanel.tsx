/**
 * Folder Exclusion Settings Panel
 * Allows users to view and modify the list of folders excluded from browsing
 */

import React, { useState } from 'react';
import { useSettingsStore } from '../../stores/settings';
import type { FolderExclusionPattern } from '@shared/types/entities';
import './SettingsPanel.css';
import './FolderExclusionPanel.css';

export const FolderExclusionPanel: React.FC = () => {
  const { settings, updateBehavior, resetFolderExclusions } = useSettingsStore();
  const [newPattern, setNewPattern] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  if (!settings) return <div className="settings-panel__loading">Loading settings...</div>;

  const { folderExclusionPatterns } = settings.behavior;

  const handleTogglePattern = (id: string) => {
    const updatedPatterns = folderExclusionPatterns.map((p) =>
      p.id === id ? { ...p, isEnabled: !p.isEnabled } : p
    );
    updateBehavior({ folderExclusionPatterns: updatedPatterns });
  };

  const handleRemovePattern = (id: string) => {
    const updatedPatterns = folderExclusionPatterns.filter((p) => p.id !== id);
    updateBehavior({ folderExclusionPatterns: updatedPatterns });
  };

  const handleAddPattern = () => {
    const trimmedPattern = newPattern.trim();
    if (!trimmedPattern) return;

    // Check if pattern already exists
    if (folderExclusionPatterns.some((p) => p.pattern === trimmedPattern)) {
      return;
    }

    const newPatternObj: FolderExclusionPattern = {
      id: `pattern-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      pattern: trimmedPattern,
      isEnabled: true,
      description: `Exclude ${trimmedPattern} folder`,
    };

    updateBehavior({
      folderExclusionPatterns: [...folderExclusionPatterns, newPatternObj],
    });
    setNewPattern('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPattern();
    }
  };

  const handleResetToDefaults = () => {
    resetFolderExclusions();
    setShowConfirmReset(false);
  };

  const enabledCount = folderExclusionPatterns.filter((p) => p.isEnabled).length;

  return (
    <div className="settings-panel" data-testid="folder-exclusion-panel">
      <h3 className="settings-panel__title">Folders</h3>
      <p className="settings-panel__description">
        Configure which folders are excluded when browsing directories
      </p>

      <div className="settings-section">
        <h4 className="settings-section__title">Excluded Folders</h4>
        <p className="settings-hint" style={{ marginBottom: '16px' }}>
          These folders will be hidden when opening a folder or repository.
          {enabledCount > 0 && ` ${enabledCount} folder${enabledCount !== 1 ? 's' : ''} currently excluded.`}
        </p>

        {/* Add new pattern */}
        <div className="folder-exclusion__add">
          <input
            type="text"
            className="settings-input"
            placeholder="Enter folder name (e.g., .cache)"
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="settings-button"
            onClick={handleAddPattern}
            disabled={!newPattern.trim()}
          >
            Add
          </button>
        </div>

        {/* Pattern list */}
        <div className="folder-exclusion__list">
          {folderExclusionPatterns.length === 0 ? (
            <div className="folder-exclusion__empty">
              No folder exclusions configured. Click &quot;Reset to Defaults&quot; to restore the default list.
            </div>
          ) : (
            folderExclusionPatterns.map((pattern) => (
              <div
                key={pattern.id}
                className={`folder-exclusion__item ${!pattern.isEnabled ? 'folder-exclusion__item--disabled' : ''}`}
              >
                <label className="folder-exclusion__toggle">
                  <input
                    type="checkbox"
                    checked={pattern.isEnabled}
                    onChange={() => handleTogglePattern(pattern.id)}
                  />
                  <span className="folder-exclusion__pattern">{pattern.pattern}</span>
                </label>
                <button
                  className="folder-exclusion__remove"
                  onClick={() => handleRemovePattern(pattern.id)}
                  title="Remove pattern"
                  aria-label={`Remove ${pattern.pattern}`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2.22 2.22a.75.75 0 0 1 1.06 0L8 6.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L9.06 8l4.72 4.72a.75.75 0 1 1-1.06 1.06L8 9.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L6.94 8 2.22 3.28a.75.75 0 0 1 0-1.06z" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Reset button */}
        <div className="folder-exclusion__actions">
          {!showConfirmReset ? (
            <button
              className="settings-button settings-button--secondary"
              onClick={() => setShowConfirmReset(true)}
            >
              Reset to Defaults
            </button>
          ) : (
            <div className="folder-exclusion__confirm">
              <span>Reset all folder exclusions to defaults?</span>
              <button
                className="settings-button"
                onClick={handleResetToDefaults}
              >
                Confirm
              </button>
              <button
                className="settings-button settings-button--secondary"
                onClick={() => setShowConfirmReset(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FolderExclusionPanel;
