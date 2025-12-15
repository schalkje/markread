/**
 * Shortcuts Reference Component
 * Tasks: T088, T090-T092
 *
 * Displays all keyboard shortcuts organized by category with:
 * - Category grouping
 * - Search/filter capability
 * - Conflict detection highlighting
 */

import React, { useState, useMemo } from 'react';
import { commandService } from '../../services/command-service';
import type { Command } from '@shared/types/commands';
import './ShortcutsReference.css';

export interface ShortcutsReferenceProps {
  /** Whether the reference is visible */
  isOpen: boolean;
  /** Callback when reference should close */
  onClose: () => void;
}

interface ShortcutGroup {
  category: string;
  shortcuts: Command[];
}

/**
 * T090: Shortcuts Reference organized by category
 */
export const ShortcutsReference: React.FC<ShortcutsReferenceProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get all commands with shortcuts
  const allCommands = useMemo(() => {
    return commandService
      .getAllCommands()
      .filter(cmd => cmd.defaultShortcut !== null)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // T092: Detect shortcut conflicts
  const conflicts = useMemo(() => {
    const shortcutMap = new Map<string, string[]>();

    allCommands.forEach(cmd => {
      if (!cmd.defaultShortcut) return;

      const existing = shortcutMap.get(cmd.defaultShortcut) || [];
      existing.push(cmd.id);
      shortcutMap.set(cmd.defaultShortcut, existing);
    });

    const conflictSet = new Set<string>();
    shortcutMap.forEach((commandIds, shortcut) => {
      if (commandIds.length > 1) {
        commandIds.forEach(id => conflictSet.add(id));
      }
    });

    return conflictSet;
  }, [allCommands]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const filtered = allCommands.filter(cmd => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        cmd.label.toLowerCase().includes(query) ||
        cmd.description?.toLowerCase().includes(query) ||
        cmd.defaultShortcut?.toLowerCase().includes(query)
      );
    });

    const groups = new Map<string, Command[]>();

    filtered.forEach(cmd => {
      const existing = groups.get(cmd.category) || [];
      existing.push(cmd);
      groups.set(cmd.category, existing);
    });

    return Array.from(groups.entries())
      .map(([category, shortcuts]) => ({ category, shortcuts }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [allCommands, searchQuery]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="shortcuts-reference-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      data-testid="shortcuts-reference-backdrop"
    >
      <div className="shortcuts-reference" data-testid="shortcuts-reference">
        {/* Header */}
        <div className="shortcuts-reference__header">
          <h2 className="shortcuts-reference__title">Keyboard Shortcuts</h2>
          <button
            className="shortcuts-reference__close"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.22 2.22a.75.75 0 0 1 1.06 0L8 6.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L9.06 8l4.72 4.72a.75.75 0 1 1-1.06 1.06L8 9.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L6.94 8 2.22 3.28a.75.75 0 0 1 0-1.06z" />
            </svg>
          </button>
        </div>

        {/* Search bar */}
        <div className="shortcuts-reference__search">
          <svg
            className="shortcuts-reference__search-icon"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
          </svg>
          <input
            type="text"
            className="shortcuts-reference__search-input"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Conflict warning */}
        {conflicts.size > 0 && (
          <div className="shortcuts-reference__warning">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575L6.457 1.047zM8 5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5zm0 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
            </svg>
            <span>
              {conflicts.size} shortcut conflict{conflicts.size > 1 ? 's' : ''} detected
            </span>
          </div>
        )}

        {/* Category tabs */}
        <div className="shortcuts-reference__categories">
          <button
            className={`shortcuts-reference__category-tab ${!selectedCategory ? 'shortcuts-reference__category-tab--active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {groupedCommands.map(group => (
            <button
              key={group.category}
              className={`shortcuts-reference__category-tab ${selectedCategory === group.category ? 'shortcuts-reference__category-tab--active' : ''}`}
              onClick={() => setSelectedCategory(group.category)}
            >
              {formatCategory(group.category)}
            </button>
          ))}
        </div>

        {/* Shortcuts list */}
        <div className="shortcuts-reference__content">
          {groupedCommands
            .filter(group => !selectedCategory || group.category === selectedCategory)
            .map(group => (
              <div key={group.category} className="shortcuts-reference__group">
                <h3 className="shortcuts-reference__group-title">
                  {formatCategory(group.category)}
                </h3>
                <div className="shortcuts-reference__group-items">
                  {group.shortcuts.map(cmd => (
                    <ShortcutItem
                      key={cmd.id}
                      command={cmd}
                      hasConflict={conflicts.has(cmd.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Individual shortcut item
 */
interface ShortcutItemProps {
  command: Command;
  hasConflict: boolean;
}

const ShortcutItem: React.FC<ShortcutItemProps> = ({ command, hasConflict }) => {
  return (
    <div
      className={`shortcut-item ${hasConflict ? 'shortcut-item--conflict' : ''}`}
      data-testid={`shortcut-item-${command.id}`}
    >
      <div className="shortcut-item__info">
        <span className="shortcut-item__label">{command.label}</span>
        {command.description && (
          <span className="shortcut-item__description">{command.description}</span>
        )}
      </div>
      <div className="shortcut-item__keys">
        {command.defaultShortcut && (
          <kbd className="shortcut-item__kbd">
            {formatShortcut(command.defaultShortcut)}
          </kbd>
        )}
        {hasConflict && (
          <span className="shortcut-item__conflict-badge" title="Shortcut conflict detected">
            ⚠
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Format category name for display
 */
function formatCategory(category: string): string {
  const names: Record<string, string> = {
    file: 'File',
    nav: 'Navigation',
    tabs: 'Tabs',
    search: 'Search',
    view: 'View',
    app: 'Application',
    edit: 'Edit',
    help: 'Help',
  };

  return names[category] || category;
}

/**
 * Format keyboard shortcut for display
 */
function formatShortcut(shortcut: string): string {
  return shortcut
    .replace(/Ctrl\+/g, 'Ctrl+')
    .replace(/Shift\+/g, 'Shift+')
    .replace(/Alt\+/g, 'Alt+')
    .replace(/ArrowLeft/g, '←')
    .replace(/ArrowRight/g, '→')
    .replace(/ArrowUp/g, '↑')
    .replace(/ArrowDown/g, '↓')
    .replace(/Plus/g, '+')
    .replace(/Minus/g, '-');
}

export default ShortcutsReference;
