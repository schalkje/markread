/**
 * CopyContextMenu Component
 * Task: T054
 * Context menu for text selection with copy format options
 */

import React, { useEffect, useRef } from 'react';
import type { CopyFormat } from './CopyFormatPicker';
import './CopyContextMenu.css';

interface CopyContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onSelect: (format: CopyFormat) => void;
  onClose: () => void;
}

export const CopyContextMenu: React.FC<CopyContextMenuProps> = ({
  isOpen,
  position,
  onSelect,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Use setTimeout to avoid the context menu event from immediately closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      menu.style.left = `${viewportWidth - rect.width - 8}px`;
    }
    if (rect.bottom > viewportHeight) {
      menu.style.top = `${viewportHeight - rect.height - 8}px`;
    }
  }, [isOpen, position]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="copy-context-menu"
      style={{ left: position.x, top: position.y }}
      role="menu"
      aria-label="Copy options"
    >
      <button
        className="copy-context-menu__item"
        onClick={() => onSelect('rich')}
        role="menuitem"
        type="button"
      >
        <span className="copy-context-menu__label">Copy as Rich Text</span>
        <span className="copy-context-menu__shortcut">Ctrl+C</span>
      </button>
      <button
        className="copy-context-menu__item"
        onClick={() => onSelect('markdown')}
        role="menuitem"
        type="button"
      >
        <span className="copy-context-menu__label">Copy as Markdown</span>
        <span className="copy-context-menu__shortcut">Ctrl+Shift+M</span>
      </button>
      <button
        className="copy-context-menu__item"
        onClick={() => onSelect('plain')}
        role="menuitem"
        type="button"
      >
        <span className="copy-context-menu__label">Copy as Plain Text</span>
        <span className="copy-context-menu__shortcut">Ctrl+Shift+T</span>
      </button>
    </div>
  );
};
