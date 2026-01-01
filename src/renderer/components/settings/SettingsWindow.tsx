/**
 * Settings Window Component
 * Task: T137
 *
 * Main settings dialog with 5 tabs:
 * - Appearance
 * - Behavior
 * - Search
 * - Performance
 * - Keyboard
 */

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settings';
import { AppearancePanel } from './AppearancePanel';
import { BehaviorPanel } from './BehaviorPanel';
import { SearchPanel } from './SearchPanel';
import { PerformancePanel } from './PerformancePanel';
import { KeyboardPanel } from './KeyboardPanel';
import './SettingsWindow.css';

export interface SettingsWindowProps {
  /** Whether the settings window is visible */
  isOpen: boolean;
  /** Callback when window should close */
  onClose: () => void;
  /** Initial tab to show */
  initialTab?: SettingsTab;
}

export type SettingsTab = 'appearance' | 'behavior' | 'search' | 'performance' | 'keyboard';

/**
 * T137: Settings Window with 5 tabs
 */
export const SettingsWindow: React.FC<SettingsWindowProps> = ({
  isOpen,
  onClose,
  initialTab = 'appearance',
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const { settings, isDirty, loadSettings, saveSettings } = useSettingsStore();
  const [isSaving, setIsSaving] = useState(false);

  // Load settings when opened
  useEffect(() => {
    if (isOpen && !settings) {
      loadSettings();
    }
  }, [isOpen, settings, loadSettings]);

  // Handle save and close
  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveSettings();
    setIsSaving(false);

    if (success) {
      onClose();
    }
  };

  // Handle close without saving
  const handleClose = () => {
    if (isDirty) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmClose) return;
    }

    onClose();
  };

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="settings-window-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      data-testid="settings-window-backdrop"
    >
      <div className="settings-window" data-testid="settings-window">
        {/* Header */}
        <div className="settings-window__header">
          <h2 className="settings-window__title">Settings</h2>
          <button
            className="settings-window__close"
            onClick={handleClose}
            aria-label="Close"
            title="Close (Esc)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.22 2.22a.75.75 0 0 1 1.06 0L8 6.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L9.06 8l4.72 4.72a.75.75 0 1 1-1.06 1.06L8 9.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L6.94 8 2.22 3.28a.75.75 0 0 1 0-1.06z" />
            </svg>
          </button>
        </div>

        {/* Content area */}
        <div className="settings-window__content">
          {/* Sidebar tabs */}
          <div className="settings-window__sidebar">
            <SettingsTab
              id="appearance"
              label="Appearance"
              icon="🎨"
              isActive={activeTab === 'appearance'}
              onClick={() => setActiveTab('appearance')}
            />
            <SettingsTab
              id="behavior"
              label="Behavior"
              icon="⚙️"
              isActive={activeTab === 'behavior'}
              onClick={() => setActiveTab('behavior')}
            />
            <SettingsTab
              id="search"
              label="Search"
              icon="🔍"
              isActive={activeTab === 'search'}
              onClick={() => setActiveTab('search')}
            />
            <SettingsTab
              id="performance"
              label="Performance"
              icon="⚡"
              isActive={activeTab === 'performance'}
              onClick={() => setActiveTab('performance')}
            />
            <SettingsTab
              id="keyboard"
              label="Keyboard"
              icon="⌨️"
              isActive={activeTab === 'keyboard'}
              onClick={() => setActiveTab('keyboard')}
            />
          </div>

          {/* Panel area */}
          <div className="settings-window__panel">
            {activeTab === 'appearance' && <AppearancePanel />}
            {activeTab === 'behavior' && <BehaviorPanel />}
            {activeTab === 'search' && <SearchPanel />}
            {activeTab === 'performance' && <PerformancePanel />}
            {activeTab === 'keyboard' && <KeyboardPanel />}
          </div>
        </div>

        {/* Footer with save/cancel */}
        <div className="settings-window__footer">
          <div className="settings-window__status">
            {isDirty && (
              <span className="settings-window__unsaved">
                • Unsaved changes
              </span>
            )}
          </div>
          <div className="settings-window__actions">
            <button
              className="settings-window__button settings-window__button--secondary"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              className="settings-window__button settings-window__button--primary"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Individual tab button
 */
interface SettingsTabProps {
  id: string;
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  id,
  label,
  icon,
  isActive,
  onClick,
}) => {
  return (
    <button
      className={`settings-tab ${isActive ? 'settings-tab--active' : ''}`}
      onClick={onClick}
      data-testid={`settings-tab-${id}`}
    >
      <span className="settings-tab__icon">{icon}</span>
      <span className="settings-tab__label">{label}</span>
    </button>
  );
};

export default SettingsWindow;
