/**
 * Clipboard-related type definitions for MarkRead
 * Defines interfaces for multi-format clipboard operations
 */

export type ClipboardMimeType = 'text/plain' | 'text/html' | 'text/markdown' | 'image/png' | 'image/svg+xml';
export type DiagramFormat = 'png' | 'svg';
export type DiagramActionType = 'copy-png' | 'copy-svg' | 'copy-code' | 'download' | 'open-tab';

export interface ClipboardContent {
  formats: ClipboardFormat[];
  sourceElement?: HTMLElement;
  timestamp: Date;
}

export interface ClipboardFormat {
  mimeType: ClipboardMimeType;
  data: Blob;
}

export interface TextClipboardContent extends ClipboardContent {
  plainText: string;
  markdownText?: string;
  htmlText?: string;
}

export interface ImageClipboardContent extends ClipboardContent {
  imageBlob: Blob;
  format: DiagramFormat;
  dimensions?: { width: number; height: number };
}

export interface DiagramAction {
  id: string;
  type: DiagramActionType;
  label: string;
  icon: string;
  handler: (diagram: HTMLElement) => Promise<void>;
  enabled: boolean;
}

export interface DiagramActionResult {
  success: boolean;
  action: DiagramAction;
  error?: Error;
  executionTime: number;
}

export interface DiagramHoverState {
  diagramId: string;
  isHovering: boolean;
  isVisible: boolean;
  showTimeout?: NodeJS.Timeout;
  hideTimeout?: NodeJS.Timeout;
  position: { x: number; y: number };
}

export enum ClipboardErrorCode {
  PERMISSION_DENIED = 'CLIPBOARD_PERMISSION_DENIED',
  NOT_SUPPORTED = 'CLIPBOARD_NOT_SUPPORTED',
  CAPTURE_FAILED = 'CLIPBOARD_CAPTURE_FAILED',
  WRITE_FAILED = 'CLIPBOARD_WRITE_FAILED',
  INVALID_DATA = 'CLIPBOARD_INVALID_DATA'
}

export class ClipboardError extends Error {
  code: ClipboardErrorCode;
  retryable: boolean;

  constructor(code: ClipboardErrorCode, message: string, retryable: boolean) {
    super(message);
    this.name = 'ClipboardError';
    this.code = code;
    this.retryable = retryable;
  }
}
