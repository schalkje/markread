/**
 * useCopyShortcuts Hook
 * Tasks: T051-T053
 * Handles keyboard shortcuts for multi-format text copying
 */

import React, { useCallback, useEffect, useState } from 'react';
import { getTextSelectionService } from '../services/TextSelectionService';
import { getClipboardService } from '../services/ClipboardService';
import type { CopyFormat } from '../components/CopyFormatPicker';

interface UseCopyShortcutsOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  enabled?: boolean;
  onCopySuccess?: (format: CopyFormat) => void;
  onCopyError?: (error: Error) => void;
}

interface UseCopyShortcutsResult {
  showFormatPicker: boolean;
  pickerPosition: { x: number; y: number };
  closeFormatPicker: () => void;
  copyAs: (format: CopyFormat) => Promise<void>;
}

export function useCopyShortcuts({
  containerRef,
  enabled = true,
  onCopySuccess,
  onCopyError,
}: UseCopyShortcutsOptions): UseCopyShortcutsResult {
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });

  const copyAs = useCallback(async (format: CopyFormat) => {
    const selectionService = getTextSelectionService();
    const clipboardService = getClipboardService();

    const content = selectionService.getSelection(containerRef.current || undefined);
    if (!content.hasSelection) return;

    try {
      switch (format) {
        case 'rich':
          // Copy with both HTML and plain text for rich paste
          await clipboardService.copyText({
            plainText: content.plainText,
            htmlText: content.htmlText,
            formats: [],
            timestamp: new Date(),
          });
          break;
        case 'markdown':
          // Copy markdown as plain text (for pasting into editors)
          await clipboardService.copyText({
            plainText: content.markdownText,
            formats: [],
            timestamp: new Date(),
          });
          break;
        case 'plain':
          // Copy plain text only
          await clipboardService.copyText({
            plainText: content.plainText,
            formats: [],
            timestamp: new Date(),
          });
          break;
      }
      onCopySuccess?.(format);
    } catch (error) {
      onCopyError?.(error instanceof Error ? error : new Error(String(error)));
    }

    setShowFormatPicker(false);
  }, [containerRef, onCopySuccess, onCopyError]);

  const closeFormatPicker = useCallback(() => {
    setShowFormatPicker(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const selectionService = getTextSelectionService();
      if (!selectionService.hasSelection(container)) return;

      // T052: Ctrl+C - copy as rich text (with HTML format)
      if (e.key === 'c' && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        copyAs('rich');
        return;
      }

      // T053: Ctrl+Shift+C - show format picker
      if (e.key === 'C' && (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey) {
        e.preventDefault();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setPickerPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + 4,
          });
        }
        setShowFormatPicker(true);
        return;
      }

      // Ctrl+Shift+M - copy as markdown
      if (e.key === 'M' && (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey) {
        e.preventDefault();
        copyAs('markdown');
        return;
      }

      // Ctrl+Shift+T - copy as plain text
      if (e.key === 'T' && (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey) {
        e.preventDefault();
        copyAs('plain');
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, containerRef, copyAs]);

  return {
    showFormatPicker,
    pickerPosition,
    closeFormatPicker,
    copyAs,
  };
}
