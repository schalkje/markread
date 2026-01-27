/**
 * Default Files Settings Panel
 * Allows users to configure which files are opened by default when opening a folder
 */

import React, { useState } from 'react';
import { useSettingsStore } from '../../stores/settings';
import type { DefaultFileEntry } from '@shared/types/entities';
import './SettingsPanel.css';
import './DefaultFilesPanel.css';

export const DefaultFilesPanel: React.FC = () => {
  const { settings, updateBehavior, resetDefaultFiles, reorderDefaultFile } = useSettingsStore();
  const [newFilename, setNewFilename] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!settings) return <div className="settings-panel__loading">Loading settings...</div>;

  const { defaultFilesToOpen } = settings.behavior;

  const handleToggleEntry = (id: string) => {
    const updatedEntries = defaultFilesToOpen.map((e) =>
      e.id === id ? { ...e, isEnabled: !e.isEnabled } : e
    );
    updateBehavior({ defaultFilesToOpen: updatedEntries });
  };

  const handleRemoveEntry = (id: string) => {
    const updatedEntries = defaultFilesToOpen.filter((e) => e.id !== id);
    updateBehavior({ defaultFilesToOpen: updatedEntries });
  };

  const handleAddEntry = () => {
    const trimmedFilename = newFilename.trim();
    if (!trimmedFilename) return;

    // Check if filename already exists (case-insensitive)
    const exists = defaultFilesToOpen.some(
      (e) => e.filename.toLowerCase() === trimmedFilename.toLowerCase()
    );
    if (exists) return;

    const newEntry: DefaultFileEntry = {
      id: `default-file-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      filename: trimmedFilename,
      isEnabled: true,
    };

    updateBehavior({
      defaultFilesToOpen: [...defaultFilesToOpen, newEntry],
    });
    setNewFilename('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEntry();
    }
  };

  const handleResetToDefaults = () => {
    resetDefaultFiles();
    setShowConfirmReset(false);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      reorderDefaultFile(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const enabledCount = defaultFilesToOpen.filter((e) => e.isEnabled).length;

  return (
    <div className="settings-panel" data-testid="default-files-panel">
      <h3 className="settings-panel__title">Default File to Open</h3>
      <p className="settings-panel__description">
        When opening a folder, these files are checked in priority order (top to bottom).
        The first match will be opened automatically.
      </p>

      <div className="settings-section">
        <h4 className="settings-section__title">Priority List</h4>
        <p className="settings-hint" style={{ marginBottom: '16px' }}>
          File names are matched case-insensitively. Drag to reorder priority.
          {enabledCount > 0 && ` ${enabledCount} file${enabledCount !== 1 ? 's' : ''} enabled.`}
        </p>

        {/* Add new entry */}
        <div className="default-files__add">
          <input
            type="text"
            className="settings-input"
            placeholder="Enter file name (e.g., DOCS.md)"
            value={newFilename}
            onChange={(e) => setNewFilename(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="settings-button"
            onClick={handleAddEntry}
            disabled={!newFilename.trim()}
          >
            Add
          </button>
        </div>

        {/* Entry list */}
        <div className="default-files__list">
          {defaultFilesToOpen.length === 0 ? (
            <div className="default-files__empty">
              No default files configured. Click "Reset to Defaults" to restore the default list.
            </div>
          ) : (
            defaultFilesToOpen.map((entry, index) => (
              <div
                key={entry.id}
                className={`default-files__item ${!entry.isEnabled ? 'default-files__item--disabled' : ''} ${draggedIndex === index ? 'default-files__item--dragging' : ''} ${dragOverIndex === index ? 'default-files__item--drag-over' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <span className="default-files__drag-handle" title="Drag to reorder">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5 3h2v2H5V3zm4 0h2v2H9V3zM5 7h2v2H5V7zm4 0h2v2H9V7zm-4 4h2v2H5v-2zm4 0h2v2H9v-2z" />
                  </svg>
                </span>
                <span className="default-files__priority">{index + 1}</span>
                <label className="default-files__toggle">
                  <input
                    type="checkbox"
                    checked={entry.isEnabled}
                    onChange={() => handleToggleEntry(entry.id)}
                  />
                  <span className="default-files__filename">{entry.filename}</span>
                </label>
                <button
                  className="default-files__remove"
                  onClick={() => handleRemoveEntry(entry.id)}
                  title="Remove entry"
                  aria-label={`Remove ${entry.filename}`}
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
        <div className="default-files__actions">
          {!showConfirmReset ? (
            <button
              className="settings-button settings-button--secondary"
              onClick={() => setShowConfirmReset(true)}
            >
              Reset to Defaults
            </button>
          ) : (
            <div className="default-files__confirm">
              <span>Reset default files to defaults?</span>
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

export default DefaultFilesPanel;
