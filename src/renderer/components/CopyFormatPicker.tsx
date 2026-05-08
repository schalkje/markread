/**
 * CopyFormatPicker Component
 * Tasks: T050, T056
 * Shows a floating picker for selecting copy format (plain, markdown, rich text)
 */

import React, { useEffect, useRef } from 'react';
import './CopyFormatPicker.css';

export type CopyFormat = 'rich' | 'markdown' | 'plain';

interface CopyFormatPickerProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onSelect: (format: CopyFormat) => void;
  onClose: () => void;
}

export const CopyFormatPicker: React.FC<CopyFormatPickerProps> = ({
  isOpen,
  position,
  onSelect,
  onClose,
}) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!isOpen || !pickerRef.current) return;
    const picker = pickerRef.current;
    const rect = picker.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      picker.style.left = `${viewportWidth - rect.width - 8}px`;
    }
    if (rect.bottom > viewportHeight) {
      picker.style.top = `${viewportHeight - rect.height - 8}px`;
    }
  }, [isOpen, position]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      className="copy-format-picker"
      style={{ left: position.x, top: position.y }}
      role="menu"
      aria-label="Copy format options"
    >
      <button
        className="copy-format-picker__option"
        onClick={() => onSelect('rich')}
        role="menuitem"
        type="button"
      >
        <span className="copy-format-picker__icon">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3h10M2 6h7M2 9h10M2 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </span>
        <span className="copy-format-picker__label">Rich Text</span>
        <span className="copy-format-picker__shortcut">Ctrl+C</span>
      </button>
      <button
        className="copy-format-picker__option"
        onClick={() => onSelect('markdown')}
        role="menuitem"
        type="button"
      >
        <span className="copy-format-picker__icon">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 3l2.5 8L7 3l3.5 8L13 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="copy-format-picker__label">Markdown</span>
        <span className="copy-format-picker__shortcut">Ctrl+Shift+M</span>
      </button>
      <button
        className="copy-format-picker__option"
        onClick={() => onSelect('plain')}
        role="menuitem"
        type="button"
      >
        <span className="copy-format-picker__icon">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 2h8M7 2v10M5 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </span>
        <span className="copy-format-picker__label">Plain Text</span>
        <span className="copy-format-picker__shortcut">Ctrl+Shift+T</span>
      </button>
    </div>
  );
};
