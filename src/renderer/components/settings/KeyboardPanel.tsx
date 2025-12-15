/**
 * Keyboard Settings Panel
 * Task: T142
 */

import React from 'react';
import { commandService } from '../../services/command-service';
import './SettingsPanel.css';

export const KeyboardPanel: React.FC = () => {
  const allCommands = commandService.getAllCommands();
  const commandsWithShortcuts = allCommands.filter(cmd => cmd.defaultShortcut);

  return (
    <div className="settings-panel" data-testid="keyboard-panel">
      <h3 className="settings-panel__title">Keyboard Shortcuts</h3>
      <p className="settings-panel__description">
        View and customize keyboard shortcuts
      </p>

      <div className="settings-section">
        <h4 className="settings-section__title">All Shortcuts ({commandsWithShortcuts.length})</h4>
        <p className="settings-hint" style={{ marginBottom: '16px' }}>
          Shortcut customization will be available in a future update. For now, you can view all shortcuts by pressing <kbd style={{ padding: '2px 6px', background: 'var(--kbd-bg, #f6f8fa)', border: '1px solid var(--border-color, #d0d7de)', borderRadius: '3px' }}>F1</kbd>
        </p>

        <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid var(--border-color, #d0d7de)', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--header-bg, #f6f8fa)', borderBottom: '2px solid var(--border-color, #d0d7de)' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Command</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>Shortcut</th>
              </tr>
            </thead>
            <tbody>
              {commandsWithShortcuts.map((cmd, index) => (
                <tr
                  key={cmd.id}
                  style={{
                    borderBottom: index < commandsWithShortcuts.length - 1 ? '1px solid var(--border-light, #eaeef2)' : 'none',
                  }}
                >
                  <td style={{ padding: '12px', fontSize: '13px' }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{cmd.label}</div>
                    {cmd.description && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary, #57606a)' }}>
                        {cmd.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <kbd
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        background: 'var(--kbd-bg, #f6f8fa)',
                        border: '1px solid var(--border-color, #d0d7de)',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cmd.defaultShortcut}
                    </kbd>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default KeyboardPanel;
