/**
 * Command Palette Component
 * Tasks: T083-T087
 *
 * Displays searchable command palette with:
 * - Fuzzy search (T084)
 * - Keyboard navigation (T085)
 * - Shortcut display (T086)
 * - Recent commands priority (T087)
 */

import React, { useState, useEffect, useRef } from 'react';
import { commandService } from '../../services/command-service';
import type { Command, CommandContext, CommandSearchResult } from '@shared/types/commands';
import './CommandPalette.css';

export interface CommandPaletteProps {
  /** Whether the palette is visible */
  isOpen: boolean;
  /** Callback when palette should close */
  onClose: () => void;
  /** Current command context */
  context?: CommandContext;
}

/**
 * T083: Command Palette with fuzzy search
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  context,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommandSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
      performSearch('');
    }
  }, [isOpen]);

  // T084: Perform fuzzy search
  const performSearch = (searchQuery: string) => {
    const searchResults = commandService.search(searchQuery, context);
    setResults(searchResults);
    setSelectedIndex(0);
  };

  // Handle search input change
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    performSearch(newQuery);
  };

  // T085: Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        scrollToSelected(selectedIndex + 1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        scrollToSelected(selectedIndex - 1);
        break;

      case 'Enter':
        e.preventDefault();
        executeSelected();
        break;

      case 'Escape':
        e.preventDefault();
        onClose();
        break;

      default:
        break;
    }
  };

  // Scroll to selected item
  const scrollToSelected = (index: number) => {
    if (!listRef.current) return;

    const items = listRef.current.querySelectorAll('.command-palette__item');
    const selectedItem = items[index];

    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  // Execute selected command
  const executeSelected = async () => {
    if (selectedIndex < 0 || selectedIndex >= results.length) return;

    const selected = results[selectedIndex];
    onClose();

    try {
      await commandService.execute(selected.command.id, context);
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  };

  // Execute command on click
  const handleCommandClick = async (command: Command) => {
    onClose();

    try {
      await commandService.execute(command.id, context);
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="command-palette-backdrop"
      onClick={handleBackdropClick}
      data-testid="command-palette-backdrop"
    >
      <div className="command-palette" data-testid="command-palette">
        {/* Search input */}
        <div className="command-palette__search">
          <svg
            className="command-palette__search-icon"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="command-palette__input"
            placeholder="Type a command or search..."
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            data-testid="command-palette-input"
          />
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="command-palette__results"
          data-testid="command-palette-results"
        >
          {results.length === 0 ? (
            <div className="command-palette__empty">
              No commands found
            </div>
          ) : (
            results.map((result, index) => (
              <CommandItem
                key={result.command.id}
                result={result}
                isSelected={index === selectedIndex}
                onClick={() => handleCommandClick(result.command)}
              />
            ))
          )}
        </div>

        {/* Keyboard hints */}
        <div className="command-palette__footer">
          <span className="command-palette__hint">
            <kbd>↑↓</kbd> Navigate
          </span>
          <span className="command-palette__hint">
            <kbd>Enter</kbd> Execute
          </span>
          <span className="command-palette__hint">
            <kbd>Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Individual command item
 */
interface CommandItemProps {
  result: CommandSearchResult;
  isSelected: boolean;
  onClick: () => void;
}

const CommandItem: React.FC<CommandItemProps> = ({ result, isSelected, onClick }) => {
  const { command } = result;

  return (
    <div
      className={`command-palette__item ${isSelected ? 'command-palette__item--selected' : ''}`}
      onClick={onClick}
      data-testid={`command-item-${command.id}`}
    >
      {/* Command icon */}
      {command.icon && (
        <span className="command-palette__icon" aria-hidden="true">
          {getCategoryIcon(command.category)}
        </span>
      )}

      {/* Command label with highlighted matches */}
      <span className="command-palette__label">
        {command.label}
      </span>

      {/* Category badge */}
      <span className="command-palette__category">
        {command.category}
      </span>

      {/* T086: Keyboard shortcut display */}
      {command.defaultShortcut && (
        <span className="command-palette__shortcut">
          {formatShortcut(command.defaultShortcut)}
        </span>
      )}
    </div>
  );
};

/**
 * Get icon for category
 */
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    file: '📄',
    nav: '🧭',
    tabs: '📑',
    search: '🔍',
    view: '👁',
    app: '⚙',
    edit: '✏',
    help: '❓',
  };

  return icons[category] || '•';
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
    .replace(/ArrowDown/g, '↓');
}

export default CommandPalette;
