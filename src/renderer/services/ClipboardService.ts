/**
 * Clipboard Service
 * Handles multi-format clipboard operations for text and images
 */

import type {
  TextClipboardContent,
  ImageClipboardContent,
  ClipboardFormat
} from '../../shared/types/clipboard';
import { ClipboardError, ClipboardErrorCode } from '../../shared/types/clipboard';

export class ClipboardService {
  /**
   * Check if clipboard API is available
   */
  canCopy(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.clipboard !== 'undefined';
  }

  /**
   * Check clipboard permission state
   */
  async checkPermission(): Promise<PermissionState> {
    if (!this.canCopy()) {
      return 'denied';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
      return permission.state;
    } catch {
      // If permission API not available, assume granted if clipboard exists
      return 'granted';
    }
  }

  /**
   * Copy text in multiple formats to clipboard
   */
  async copyText(content: TextClipboardContent): Promise<void> {
    if (!this.canCopy()) {
      throw new ClipboardError(
        ClipboardErrorCode.NOT_SUPPORTED,
        'Clipboard API not supported in this environment',
        false
      );
    }

    if (!content.plainText || content.plainText.length === 0) {
      throw new ClipboardError(
        ClipboardErrorCode.INVALID_DATA,
        'Plain text cannot be empty',
        false
      );
    }

    try {
      const formats: Record<string, Blob> = {
        'text/plain': new Blob([content.plainText], { type: 'text/plain' })
      };

      if (content.htmlText) {
        formats['text/html'] = new Blob([content.htmlText], { type: 'text/html' });
      }

      if (content.markdownText) {
        formats['text/markdown'] = new Blob([content.markdownText], { type: 'text/markdown' });
      }

      const clipboardItem = new ClipboardItem(formats);
      await navigator.clipboard.write([clipboardItem]);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        throw new ClipboardError(
          ClipboardErrorCode.PERMISSION_DENIED,
          'Clipboard access denied. Please check browser permissions.',
          true
        );
      }

      throw new ClipboardError(
        ClipboardErrorCode.WRITE_FAILED,
        'Failed to write to clipboard. Please try again.',
        true
      );
    }
  }

  /**
   * Copy image to clipboard
   */
  async copyImage(content: ImageClipboardContent): Promise<void> {
    if (!this.canCopy()) {
      throw new ClipboardError(
        ClipboardErrorCode.NOT_SUPPORTED,
        'Clipboard API not supported in this environment',
        false
      );
    }

    if (!content.imageBlob || content.imageBlob.size === 0) {
      throw new ClipboardError(
        ClipboardErrorCode.INVALID_DATA,
        'Image data cannot be empty',
        false
      );
    }

    // Verify MIME type matches format
    const expectedType = content.format === 'png' ? 'image/png' : 'image/svg+xml';
    if (content.imageBlob.type !== expectedType) {
      throw new ClipboardError(
        ClipboardErrorCode.INVALID_DATA,
        "MIME type doesn't match format",
        false
      );
    }

    try {
      const clipboardItem = new ClipboardItem({
        [content.imageBlob.type]: content.imageBlob
      });

      await navigator.clipboard.write([clipboardItem]);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        throw new ClipboardError(
          ClipboardErrorCode.PERMISSION_DENIED,
          'Clipboard access denied. Please check browser permissions.',
          true
        );
      }

      throw new ClipboardError(
        ClipboardErrorCode.WRITE_FAILED,
        'Failed to write image to clipboard. Please try again.',
        true
      );
    }
  }

  /**
   * Copy content in multiple custom formats
   */
  async copyMultiFormat(formats: ClipboardFormat[]): Promise<void> {
    if (!this.canCopy()) {
      throw new ClipboardError(
        ClipboardErrorCode.NOT_SUPPORTED,
        'Clipboard API not supported in this environment',
        false
      );
    }

    if (formats.length === 0) {
      throw new ClipboardError(
        ClipboardErrorCode.INVALID_DATA,
        'At least one format must be provided',
        false
      );
    }

    // Validate all formats
    for (const format of formats) {
      if (!format.data || format.data.size === 0) {
        throw new ClipboardError(
          ClipboardErrorCode.INVALID_DATA,
          'Format data cannot be empty',
          false
        );
      }
    }

    try {
      const formatMap: Record<string, Blob> = {};
      for (const format of formats) {
        formatMap[format.mimeType] = format.data;
      }

      const clipboardItem = new ClipboardItem(formatMap);
      await navigator.clipboard.write([clipboardItem]);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        throw new ClipboardError(
          ClipboardErrorCode.PERMISSION_DENIED,
          'Clipboard access denied. Please check browser permissions.',
          true
        );
      }

      throw new ClipboardError(
        ClipboardErrorCode.WRITE_FAILED,
        'Failed to write to clipboard. Please try again.',
        true
      );
    }
  }
}

// Singleton instance for convenience
let clipboardServiceInstance: ClipboardService | null = null;

export function getClipboardService(): ClipboardService {
  if (!clipboardServiceInstance) {
    clipboardServiceInstance = new ClipboardService();
  }
  return clipboardServiceInstance;
}
