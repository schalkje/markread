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
  // Chord support: first key combination to trigger chord mode
  chordKey?: string;
  chordCtrlKey?: boolean;
  chordShiftKey?: boolean;
  chordAltKey?: boolean;
}

class KeyboardHandlerService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private isListening = false;
  private chordMode: string | null = null; // Current chord key pressed
  private chordTimeout: number | null = null;

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
    // Check for chord shortcuts first
    for (const shortcut of this.shortcuts.values()) {
      // Skip if context doesn't allow
      if (shortcut.whenClause && !shortcut.whenClause()) {
        continue;
      }

      // Handle chord mode
      if (this.chordMode) {
        // In chord mode, check if this is the second key of a chord
        if (shortcut.chordKey === this.chordMode) {
          // Check modifier keys for second part
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
            const normalizedEventKey = this.normalizeKey(event.key);
            const normalizedShortcutKey = this.normalizeKey(key);
            return normalizedEventKey === normalizedShortcutKey;
          });

          if (keyMatches) {
            event.preventDefault();
            event.stopPropagation();
            this.exitChordMode();
            shortcut.handler(event);
            return;
          }
        }
      } else if (shortcut.chordKey) {
        // Not in chord mode yet, check if this is the first key of a chord
        const chordKeyMatches = this.normalizeKey(event.key) === this.normalizeKey(shortcut.chordKey);
        const chordModifiersMatch =
          (!shortcut.chordCtrlKey || event.ctrlKey) &&
          (!shortcut.chordShiftKey || event.shiftKey) &&
          (!shortcut.chordAltKey || event.altKey);

        if (chordKeyMatches && chordModifiersMatch) {
          event.preventDefault();
          event.stopPropagation();
          this.enterChordMode(shortcut.chordKey);
          return;
        }
      }
    }

    // If in chord mode but no match, exit chord mode
    if (this.chordMode) {
      this.exitChordMode();
      return;
    }

    // Handle regular (non-chord) shortcuts
    for (const shortcut of this.shortcuts.values()) {
      // Skip chord shortcuts in regular mode
      if (shortcut.chordKey) {
        continue;
      }

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
   * Enter chord mode (waiting for second key)
   */
  private enterChordMode(chordKey: string): void {
    this.chordMode = chordKey;

    // Clear existing timeout
    if (this.chordTimeout) {
      clearTimeout(this.chordTimeout);
    }

    // Exit chord mode after 2 seconds if no second key pressed
    this.chordTimeout = window.setTimeout(() => {
      this.exitChordMode();
    }, 2000);
  }

  /**
   * Exit chord mode
   */
  private exitChordMode(): void {
    this.chordMode = null;
    if (this.chordTimeout) {
      clearTimeout(this.chordTimeout);
      this.chordTimeout = null;
    }
  }

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
      '\\': 'Backslash',
      '|': 'Backslash', // Shift+\ produces |
      'k': 'KeyK',
      'K': 'KeyK',
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
 * Register DOCUMENT zoom keyboard shortcuts
 * - Ctrl+= or Ctrl++: Zoom in document (both work)
 * - Ctrl+- or Ctrl+_: Zoom out document (both work)
 * - Ctrl+0: Reset document zoom
 */
export function registerContentZoomShortcuts(callbacks: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}): void {
  // Document zoom in: Ctrl+= or Ctrl++ (accepts with or without Shift)
  keyboardHandler.register({
    id: 'zoom.content.in',
    keys: ['=', '+'],
    ctrlKey: true,
    altKey: false,
    // Don't specify shiftKey - accept both with and without Shift
    handler: () => {
      callbacks.onZoomIn();
    },
    description: 'Zoom in document (Ctrl+= or Ctrl++)',
  });

  // Document zoom out: Ctrl+- or Ctrl+_ (accepts with or without Shift)
  keyboardHandler.register({
    id: 'zoom.content.out',
    keys: ['-', '_'],
    ctrlKey: true,
    altKey: false,
    // Don't specify shiftKey - accept both with and without Shift
    handler: () => {
      callbacks.onZoomOut();
    },
    description: 'Zoom out document (Ctrl+- or Ctrl+_)',
  });

  // Document zoom reset: Ctrl+0 (no Shift required)
  keyboardHandler.register({
    id: 'zoom.content.reset',
    keys: ['Digit0', '0'],
    ctrlKey: true,
    altKey: false,
    shiftKey: false, // Explicitly require NO shift
    handler: () => {
      callbacks.onZoomReset();
    },
    description: 'Reset document zoom to 100%',
  });
}

/**
 * Register APPLICATION zoom keyboard shortcuts
 * - Ctrl+Alt+= or Ctrl+Alt++: Zoom in application (both work)
 * - Ctrl+Alt+- or Ctrl+Alt+_: Zoom out application (both work)
 * - Ctrl+Alt+0: Reset application zoom
 */
export function registerGlobalZoomShortcuts(callbacks: {
  onGlobalZoomIn: () => void;
  onGlobalZoomOut: () => void;
  onGlobalZoomReset: () => void;
}): void {
  // Application zoom in: Ctrl+Alt+= or Ctrl+Alt++ (accepts with or without Shift)
  keyboardHandler.register({
    id: 'zoom.global.in',
    keys: ['Plus', '=', '+'],
    ctrlKey: true,
    altKey: true,
    // Don't specify shiftKey - accept both with and without Shift
    handler: () => {
      callbacks.onGlobalZoomIn();
    },
    description: 'Application zoom in (Ctrl+Alt+= or Ctrl+Alt++)',
  });

  // Application zoom out: Ctrl+Alt+- or Ctrl+Alt+_ (accepts with or without Shift)
  keyboardHandler.register({
    id: 'zoom.global.out',
    keys: ['Minus', '-', '_'],
    ctrlKey: true,
    altKey: true,
    // Don't specify shiftKey - accept both with and without Shift
    handler: () => {
      callbacks.onGlobalZoomOut();
    },
    description: 'Application zoom out (Ctrl+Alt+- or Ctrl+Alt+_)',
  });

  // Application zoom reset: Ctrl+Alt+0 (no Shift required)
  keyboardHandler.register({
    id: 'zoom.global.reset',
    keys: ['Digit0', '0'],
    ctrlKey: true,
    altKey: true,
    shiftKey: false, // Explicitly require NO shift
    handler: () => {
      callbacks.onGlobalZoomReset();
    },
    description: 'Reset application zoom to 100%',
  });
}

/**
 * Unregister content zoom shortcuts
 */
export function unregisterContentZoomShortcuts(): void {
  keyboardHandler.unregister('zoom.content.in');
  keyboardHandler.unregister('zoom.content.out');
  keyboardHandler.unregister('zoom.content.reset');
}

/**
 * Unregister global zoom shortcuts
 */
export function unregisterGlobalZoomShortcuts(): void {
  keyboardHandler.unregister('zoom.global.in');
  keyboardHandler.unregister('zoom.global.out');
  keyboardHandler.unregister('zoom.global.reset');
}

// Legacy function for backwards compatibility
export const registerZoomShortcuts = registerContentZoomShortcuts;
export const unregisterZoomShortcuts = unregisterContentZoomShortcuts;

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

/**
 * T061, T063n: Register tab switching keyboard shortcuts
 * - Ctrl+Tab: Next tab
 * - Ctrl+Shift+Tab: Previous tab
 * - Ctrl+1-9: Jump to tab by index
 * - Ctrl+W: Close current tab
 * - Ctrl+Shift+Left: Move tab left (T063n)
 * - Ctrl+Shift+Right: Move tab right (T063n)
 */
export function registerTabShortcuts(callbacks: {
  onNextTab: () => void;
  onPreviousTab: () => void;
  onJumpToTab: (index: number) => void;
  onCloseTab: () => void;
  onMoveTabLeft?: () => void;
  onMoveTabRight?: () => void;
}): void {
  // Next tab: Ctrl+Tab
  keyboardHandler.register({
    id: 'tabs.next',
    keys: ['Tab'],
    ctrlKey: true,
    shiftKey: false,
    handler: () => {
      callbacks.onNextTab();
    },
    description: 'Switch to next tab',
  });

  // Previous tab: Ctrl+Shift+Tab
  keyboardHandler.register({
    id: 'tabs.previous',
    keys: ['Tab'],
    ctrlKey: true,
    shiftKey: true,
    handler: () => {
      callbacks.onPreviousTab();
    },
    description: 'Switch to previous tab',
  });

  // Jump to tabs 1-9: Ctrl+1 through Ctrl+9
  for (let i = 1; i <= 9; i++) {
    keyboardHandler.register({
      id: `tabs.jumpTo${i}`,
      keys: [`Digit${i}`, `${i}`],
      ctrlKey: true,
      handler: () => {
        callbacks.onJumpToTab(i - 1); // 0-indexed
      },
      description: `Jump to tab ${i}`,
    });
  }

  // Close tab: Ctrl+W
  keyboardHandler.register({
    id: 'tabs.close',
    keys: ['w', 'W'],
    ctrlKey: true,
    handler: () => {
      callbacks.onCloseTab();
    },
    description: 'Close current tab',
  });

  // T063n: Move tab left: Ctrl+Shift+Left
  if (callbacks.onMoveTabLeft) {
    keyboardHandler.register({
      id: 'tabs.moveLeft',
      keys: ['ArrowLeft', 'Left'],
      ctrlKey: true,
      shiftKey: true,
      handler: () => {
        callbacks.onMoveTabLeft?.();
      },
      description: 'Move tab left',
    });
  }

  // T063n: Move tab right: Ctrl+Shift+Right
  if (callbacks.onMoveTabRight) {
    keyboardHandler.register({
      id: 'tabs.moveRight',
      keys: ['ArrowRight', 'Right'],
      ctrlKey: true,
      shiftKey: true,
      handler: () => {
        callbacks.onMoveTabRight?.();
      },
      description: 'Move tab right',
    });
  }
}

/**
 * Unregister tab shortcuts
 */
export function unregisterTabShortcuts(): void {
  keyboardHandler.unregister('tabs.next');
  keyboardHandler.unregister('tabs.previous');
  keyboardHandler.unregister('tabs.close');
  keyboardHandler.unregister('tabs.moveLeft'); // T063n
  keyboardHandler.unregister('tabs.moveRight'); // T063n

  for (let i = 1; i <= 9; i++) {
    keyboardHandler.unregister(`tabs.jumpTo${i}`);
  }
}

/**
 * T066: Register navigation history keyboard shortcuts
 * - Alt+Left: Navigate back in history
 * - Alt+Right: Navigate forward in history
 */
export function registerHistoryShortcuts(callbacks: {
  onNavigateBack: () => void;
  onNavigateForward: () => void;
}): void {
  // Navigate back: Alt+Left
  keyboardHandler.register({
    id: 'history.back',
    keys: ['ArrowLeft'],
    altKey: true,
    handler: () => {
      callbacks.onNavigateBack();
    },
    description: 'Navigate back in history',
  });

  // Navigate forward: Alt+Right
  keyboardHandler.register({
    id: 'history.forward',
    keys: ['ArrowRight'],
    altKey: true,
    handler: () => {
      callbacks.onNavigateForward();
    },
    description: 'Navigate forward in history',
  });
}

/**
 * Unregister history shortcuts
 */
export function unregisterHistoryShortcuts(): void {
  keyboardHandler.unregister('history.back');
  keyboardHandler.unregister('history.forward');
}

/**
 * T071: Register split view keyboard shortcuts
 * - Ctrl+\: Split vertically (side-by-side)
 * - Ctrl+K Ctrl+\: Split horizontally (top-bottom) - chord shortcut
 */
export function registerSplitShortcuts(callbacks: {
  onSplitVertical: () => void;
  onSplitHorizontal: () => void;
}): void {
  // Split vertically: Ctrl+\
  keyboardHandler.register({
    id: 'split.vertical',
    keys: ['Backslash', '\\'],
    ctrlKey: true,
    handler: () => {
      callbacks.onSplitVertical();
    },
    description: 'Split view vertically (side-by-side)',
  });

  // Split horizontally: Ctrl+K Ctrl+\ (chord shortcut)
  keyboardHandler.register({
    id: 'split.horizontal',
    keys: ['Backslash', '\\'],
    ctrlKey: true,
    chordKey: 'KeyK',
    chordCtrlKey: true,
    handler: () => {
      callbacks.onSplitHorizontal();
    },
    description: 'Split view horizontally (top-bottom)',
  });
}

/**
 * Unregister split shortcuts
 */
export function unregisterSplitShortcuts(): void {
  keyboardHandler.unregister('split.vertical');
  keyboardHandler.unregister('split.horizontal');
}

/**
 * Register file menu keyboard shortcuts
 * - Ctrl+O: Open File
 * - Ctrl+Shift+O: Open Folder
 * - Ctrl+Shift+W: Close All
 */
export function registerFileShortcuts(callbacks: {
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onCloseAll: () => void;
}): void {
  // Open File: Ctrl+O
  keyboardHandler.register({
    id: 'file.open',
    keys: ['o', 'O'],
    ctrlKey: true,
    shiftKey: false,
    handler: () => {
      callbacks.onOpenFile();
    },
    description: 'Open file',
  });

  // Open Folder: Ctrl+Shift+O
  keyboardHandler.register({
    id: 'file.openFolder',
    keys: ['o', 'O'],
    ctrlKey: true,
    shiftKey: true,
    handler: () => {
      callbacks.onOpenFolder();
    },
    description: 'Open folder',
  });

  // Close All: Ctrl+Shift+W
  keyboardHandler.register({
    id: 'file.closeAll',
    keys: ['w', 'W'],
    ctrlKey: true,
    shiftKey: true,
    handler: () => {
      callbacks.onCloseAll();
    },
    description: 'Close all tabs and folders',
  });
}

/**
 * Unregister file shortcuts
 */
export function unregisterFileShortcuts(): void {
  keyboardHandler.unregister('file.open');
  keyboardHandler.unregister('file.openFolder');
  keyboardHandler.unregister('file.closeAll');
}

export default keyboardHandler;
