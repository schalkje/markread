/**
 * Tab Context Menu Component
 * Task: T063c
 *
 * Displays context menu for tabs with:
 * - Close
 * - Duplicate
 * - Move to New Window
 */

import React, { useEffect, useRef } from 'react';
import './TabContextMenu.css';

export interface TabContextMenuProps {
  /** Tab ID for this context menu */
  tabId: string;
  /** X position for menu */
  x: number;
  /** Y position for menu */
  y: number;
  /** Callback when close is clicked */
  onClose: (tabId: string) => void;
  /** Callback when duplicate is clicked */
  onDuplicate: (tabId: string) => void;
  /** Callback when move to new window is clicked */
  onMoveToNewWindow: (tabId: string) => void;
  /** Callback when menu should be hidden */
  onHide: () => void;
}

/**
 * T063c: Tab context menu with Close, Duplicate, Move to New Window (FR-013d)
 */
export const TabContextMenu: React.FC<TabContextMenuProps> = ({
  tabId,
  x,
  y,
  onClose,
  onDuplicate,
  onMoveToNewWindow,
  onHide,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onHide();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onHide();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onHide]);

  const handleClose = () => {
    onClose(tabId);
    onHide();
  };

  const handleDuplicate = () => {
    onDuplicate(tabId);
    onHide();
  };

  const handleMoveToNewWindow = () => {
    onMoveToNewWindow(tabId);
    onHide();
  };

  return (
    <div
      ref={menuRef}
      className="tab-context-menu"
      style={{ left: `${x}px`, top: `${y}px` }}
      data-testid="tab-context-menu"
    >
      <button
        className="tab-context-menu__item"
        onClick={handleClose}
        data-testid="tab-context-menu-close"
      >
        <span className="tab-context-menu__icon">×</span>
        <span className="tab-context-menu__label">Close</span>
        <span className="tab-context-menu__shortcut">Ctrl+W</span>
      </button>

      <button
        className="tab-context-menu__item"
        onClick={handleDuplicate}
        data-testid="tab-context-menu-duplicate"
      >
        <span className="tab-context-menu__icon">📋</span>
        <span className="tab-context-menu__label">Duplicate</span>
      </button>

      <div className="tab-context-menu__divider" />

      <button
        className="tab-context-menu__item"
        onClick={handleMoveToNewWindow}
        data-testid="tab-context-menu-move-to-new-window"
      >
        <span className="tab-context-menu__icon">🗔</span>
        <span className="tab-context-menu__label">Move to New Window</span>
      </button>
    </div>
  );
};

export default TabContextMenu;
