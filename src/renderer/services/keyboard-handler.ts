/**
 * Keyboard Handler Service
 * Tasks: T046 (zoom shortcuts), future tasks for other shortcuts
 *
 * Manages global keyboard shortcuts with:
 * - Event delegation
 * - Shortcut registration
 * - Context-aware enabling/disabling
 */

type KeyboardShortcutHandler = (event: KeyboardEvent) => void | Promise<void>;

interface KeyboardShortcut {
  id: string;
  keys: string[];
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: KeyboardShortcutHandler;
  description?: string;
  whenClause?: () => boolean;
}

class KeyboardHandlerService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private isListening = false;

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: KeyboardShortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);

    // Start listening if not already
    if (!this.isListening) {
      this.startListening();
    }
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(id: string): void {
    this.shortcuts.delete(id);
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    for (const shortcut of this.shortcuts.values()) {
      // Check if context allows this shortcut
      if (shortcut.whenClause && !shortcut.whenClause()) {
        continue;
      }

      // Check modifier keys
      if (shortcut.ctrlKey !== undefined && event.ctrlKey !== shortcut.ctrlKey) {
        continue;
      }
      if (shortcut.shiftKey !== undefined && event.shiftKey !== shortcut.shiftKey) {
        continue;
      }
      if (shortcut.altKey !== undefined && event.altKey !== shortcut.altKey) {
        continue;
      }

      // Check if key matches
      const keyMatches = shortcut.keys.some((key) => {
        // Normalize key names
        const normalizedEventKey = this.normalizeKey(event.key);
        const normalizedShortcutKey = this.normalizeKey(key);
        return normalizedEventKey === normalizedShortcutKey;
      });

      if (keyMatches) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.handler(event);
        break; // Only execute first matching shortcut
      }
    }
  };

  /**
   * Normalize key names for consistent matching
   */
  private normalizeKey(key: string): string {
    const keyMap: Record<string, string> = {
      '+': 'Plus',
      '=': 'Plus', // Shift+= is often used for zoom in
      '-': 'Minus',
      '_': 'Minus',
      '0': 'Digit0',
    };

    return keyMap[key] || key;
  }

  /**
   * Start listening to keyboard events
   */
  private startListening(): void {
    if (this.isListening) return;

    window.addEventListener('keydown', this.handleKeyDown, true);
    this.isListening = true;
  }

  /**
   * Stop listening to keyboard events
   */
  stopListening(): void {
    if (!this.isListening) return;

    window.removeEventListener('keydown', this.handleKeyDown, true);
    this.isListening = false;
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }
}

// Singleton instance
export const keyboardHandler = new KeyboardHandlerService();

/**
 * T046: Register zoom keyboard shortcuts
 * - Ctrl+Plus: Zoom in
 * - Ctrl+Minus: Zoom out
 * - Ctrl+0: Reset zoom
 */
export function registerZoomShortcuts(callbacks: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}): void {
  // Zoom in: Ctrl+Plus or Ctrl+=
  keyboardHandler.register({
    id: 'zoom.in',
    keys: ['Plus', '='],
    ctrlKey: true,
    handler: () => {
      callbacks.onZoomIn();
    },
    description: 'Zoom in',
  });

  // Zoom out: Ctrl+Minus
  keyboardHandler.register({
    id: 'zoom.out',
    keys: ['Minus', '-'],
    ctrlKey: true,
    handler: () => {
      callbacks.onZoomOut();
    },
    description: 'Zoom out',
  });

  // Zoom reset: Ctrl+0
  keyboardHandler.register({
    id: 'zoom.reset',
    keys: ['Digit0', '0'],
    ctrlKey: true,
    handler: () => {
      callbacks.onZoomReset();
    },
    description: 'Reset zoom to 100%',
  });
}

/**
 * Unregister zoom shortcuts
 */
export function unregisterZoomShortcuts(): void {
  keyboardHandler.unregister('zoom.in');
  keyboardHandler.unregister('zoom.out');
  keyboardHandler.unregister('zoom.reset');
}

/**
 * T054: Register navigation keyboard shortcuts
 * - Ctrl+G: Open table of contents / Go to heading
 */
export function registerNavigationShortcuts(callbacks: {
  onOpenTableOfContents: () => void;
}): void {
  // Open Table of Contents: Ctrl+G
  keyboardHandler.register({
    id: 'navigation.tableOfContents',
    keys: ['g', 'G'],
    ctrlKey: true,
    handler: () => {
      callbacks.onOpenTableOfContents();
    },
    description: 'Open table of contents',
  });
}

/**
 * Unregister navigation shortcuts
 */
export function unregisterNavigationShortcuts(): void {
  keyboardHandler.unregister('navigation.tableOfContents');
}

export default keyboardHandler;
