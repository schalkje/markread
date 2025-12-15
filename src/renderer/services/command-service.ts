/**
 * Command Service
 * Tasks: T078-T082
 *
 * Central registry for all application commands with:
 * - Command registration and execution
 * - Fuzzy search for command palette
 * - Context-aware command availability
 * - Recent commands tracking
 */

import type { Command, CommandCategory, CommandContext, CommandSearchResult } from '@shared/types/commands';
import { CommandCategory as CC } from '@shared/types/commands';

class CommandService {
  private commands: Map<string, Command> = new Map();
  private recentCommands: string[] = [];
  private maxRecentCommands = 10;

  /**
   * Register a command
   */
  register(command: Command): void {
    this.commands.set(command.id, command);
  }

  /**
   * Unregister a command
   */
  unregister(commandId: string): void {
    this.commands.delete(commandId);
  }

  /**
   * Execute a command by ID
   */
  async execute(commandId: string, context?: CommandContext): Promise<void> {
    const command = this.commands.get(commandId);

    if (!command) {
      console.error(`Command not found: ${commandId}`);
      return;
    }

    // Check if command is available in current context
    if (!this.isCommandAvailable(command, context)) {
      console.warn(`Command not available: ${commandId}`);
      return;
    }

    // Track as recent command
    this.addToRecentCommands(commandId);

    // Execute command
    try {
      await command.handler(context);
    } catch (error) {
      console.error(`Error executing command ${commandId}:`, error);
      throw error;
    }
  }

  /**
   * Check if command is available in current context
   */
  isCommandAvailable(command: Command, context?: CommandContext): boolean {
    if (command.enabled === false) {
      return false;
    }

    if (!command.whenClause) {
      return true;
    }

    // Evaluate whenClause
    return this.evaluateWhenClause(command.whenClause, context);
  }

  /**
   * Evaluate whenClause expression
   */
  private evaluateWhenClause(whenClause: string, context?: CommandContext): boolean {
    // Simple context evaluation
    switch (whenClause) {
      case 'hasActiveTab':
        return !!context?.activeTabId;
      case 'hasActivePaneId':
        return !!context?.activePaneId;
      case 'hasActiveFolder':
        return !!context?.activeFolderId;
      case 'hasSelection':
        return !!context?.selectedFilePath;
      default:
        return true;
    }
  }

  /**
   * Get all registered commands
   */
  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get command by ID
   */
  getCommand(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }

  /**
   * Fuzzy search commands (T084)
   */
  search(query: string, context?: CommandContext): CommandSearchResult[] {
    if (!query.trim()) {
      return this.getAllCommands()
        .filter(cmd => this.isCommandAvailable(cmd, context))
        .map(cmd => ({
          command: cmd,
          score: this.recentCommands.includes(cmd.id) ? 1000 : 0,
          matches: [],
        }))
        .sort((a, b) => b.score - a.score);
    }

    const queryLower = query.toLowerCase();
    const results: CommandSearchResult[] = [];

    for (const command of this.commands.values()) {
      // Skip unavailable commands
      if (!this.isCommandAvailable(command, context)) {
        continue;
      }

      // Calculate fuzzy match score
      const score = this.calculateFuzzyScore(queryLower, command);

      if (score > 0) {
        results.push({
          command,
          score,
          matches: this.getMatchIndices(queryLower, command.label.toLowerCase()),
        });
      }
    }

    // Sort by score (higher is better), prioritize recent commands
    return results.sort((a, b) => {
      const aRecent = this.recentCommands.includes(a.command.id) ? 100 : 0;
      const bRecent = this.recentCommands.includes(b.command.id) ? 100 : 0;
      return (b.score + bRecent) - (a.score + aRecent);
    });
  }

  /**
   * Calculate fuzzy match score
   */
  private calculateFuzzyScore(query: string, command: Command): number {
    const labelLower = command.label.toLowerCase();
    const descLower = command.description?.toLowerCase() || '';

    // Exact match
    if (labelLower === query) return 1000;

    // Starts with query
    if (labelLower.startsWith(query)) return 500;

    // Contains query
    if (labelLower.includes(query)) return 250;

    // Check description
    if (descLower.includes(query)) return 100;

    // Check aliases
    if (command.aliases?.some(alias => alias.toLowerCase().includes(query))) {
      return 200;
    }

    // Fuzzy character matching
    let score = 0;
    let queryIndex = 0;

    for (let i = 0; i < labelLower.length && queryIndex < query.length; i++) {
      if (labelLower[i] === query[queryIndex]) {
        score += 10;
        queryIndex++;
      }
    }

    // All characters matched in order
    if (queryIndex === query.length) {
      return score;
    }

    return 0;
  }

  /**
   * Get match indices for highlighting
   */
  private getMatchIndices(query: string, text: string): number[] {
    const indices: number[] = [];
    let queryIndex = 0;

    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        indices.push(i);
        queryIndex++;
      }
    }

    return indices;
  }

  /**
   * Add command to recent commands list
   */
  private addToRecentCommands(commandId: string): void {
    // Remove if already in list
    const index = this.recentCommands.indexOf(commandId);
    if (index > -1) {
      this.recentCommands.splice(index, 1);
    }

    // Add to front
    this.recentCommands.unshift(commandId);

    // Trim to max size
    if (this.recentCommands.length > this.maxRecentCommands) {
      this.recentCommands = this.recentCommands.slice(0, this.maxRecentCommands);
    }
  }

  /**
   * Get recent commands
   */
  getRecentCommands(): Command[] {
    return this.recentCommands
      .map(id => this.commands.get(id))
      .filter((cmd): cmd is Command => cmd !== undefined);
  }
}

// Singleton instance
export const commandService = new CommandService();

// ==============================================================================
// T079: File Commands
// ==============================================================================

export function registerFileCommands(callbacks: {
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onCloseTab: () => void;
  onCloseAllTabs: () => void;
  onSaveAsPDF: () => void;
  onCopyFilePath: () => void;
  onRevealInExplorer: () => void;
  onReload: () => void;
}): void {
  commandService.register({
    id: 'file.openFile',
    label: 'Open File',
    category: CC.File,
    defaultShortcut: 'Ctrl+O',
    whenClause: null,
    handler: callbacks.onOpenFile,
    description: 'Open a markdown file',
    icon: 'file',
  });

  commandService.register({
    id: 'file.openFolder',
    label: 'Open Folder',
    category: CC.File,
    defaultShortcut: 'Ctrl+K Ctrl+O',
    whenClause: null,
    handler: callbacks.onOpenFolder,
    description: 'Open a folder containing markdown files',
    icon: 'folder',
  });

  commandService.register({
    id: 'file.closeTab',
    label: 'Close Tab',
    category: CC.File,
    defaultShortcut: 'Ctrl+W',
    whenClause: 'hasActiveTab',
    handler: callbacks.onCloseTab,
    description: 'Close the current tab',
    icon: 'x',
  });

  commandService.register({
    id: 'file.closeAllTabs',
    label: 'Close All Tabs',
    category: CC.File,
    defaultShortcut: 'Ctrl+K Ctrl+W',
    whenClause: 'hasActiveTab',
    handler: callbacks.onCloseAllTabs,
    description: 'Close all open tabs',
  });

  commandService.register({
    id: 'file.saveAsPDF',
    label: 'Export as PDF',
    category: CC.File,
    defaultShortcut: 'Ctrl+Shift+E',
    whenClause: 'hasActiveTab',
    handler: callbacks.onSaveAsPDF,
    description: 'Export current document as PDF',
    icon: 'download',
  });

  commandService.register({
    id: 'file.copyPath',
    label: 'Copy File Path',
    category: CC.File,
    defaultShortcut: 'Ctrl+Shift+C',
    whenClause: 'hasActiveTab',
    handler: callbacks.onCopyFilePath,
    description: 'Copy the file path to clipboard',
  });

  commandService.register({
    id: 'file.revealInExplorer',
    label: 'Reveal in File Explorer',
    category: CC.File,
    defaultShortcut: 'Ctrl+Shift+R',
    whenClause: 'hasActiveTab',
    handler: callbacks.onRevealInExplorer,
    description: 'Show file in Windows Explorer',
    icon: 'external-link',
  });

  commandService.register({
    id: 'file.reload',
    label: 'Reload File',
    category: CC.File,
    defaultShortcut: 'Ctrl+R',
    whenClause: 'hasActiveTab',
    handler: callbacks.onReload,
    description: 'Reload the current file from disk',
    icon: 'refresh',
  });
}

// ==============================================================================
// T080: Navigation Commands
// ==============================================================================

export function registerNavigationCommands(callbacks: {
  onNextTab: () => void;
  onPreviousTab: () => void;
  onJumpToTab: (index: number) => void;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onGoToLine: () => void;
  onGoToHeading: () => void;
  onSplitVertical: () => void;
  onSplitHorizontal: () => void;
  onClosePane: () => void;
  onFocusNextPane: () => void;
  onFocusPreviousPane: () => void;
}): void {
  // Tab navigation
  commandService.register({
    id: 'tabs.nextTab',
    label: 'Next Tab',
    category: CC.Tabs,
    defaultShortcut: 'Ctrl+Tab',
    whenClause: 'hasActiveTab',
    handler: callbacks.onNextTab,
    description: 'Switch to next tab',
  });

  commandService.register({
    id: 'tabs.previousTab',
    label: 'Previous Tab',
    category: CC.Tabs,
    defaultShortcut: 'Ctrl+Shift+Tab',
    whenClause: 'hasActiveTab',
    handler: callbacks.onPreviousTab,
    description: 'Switch to previous tab',
  });

  // Jump to specific tabs
  for (let i = 1; i <= 9; i++) {
    commandService.register({
      id: `tabs.jumpToTab${i}`,
      label: `Jump to Tab ${i}`,
      category: CC.Tabs,
      defaultShortcut: `Ctrl+${i}`,
      whenClause: 'hasActiveTab',
      handler: () => callbacks.onJumpToTab(i - 1),
      description: `Jump to tab ${i}`,
    });
  }

  // History navigation
  commandService.register({
    id: 'navigation.back',
    label: 'Go Back',
    category: CC.Navigation,
    defaultShortcut: 'Alt+ArrowLeft',
    whenClause: 'hasActiveTab',
    handler: callbacks.onNavigateBack,
    description: 'Navigate back in history',
    icon: 'arrow-left',
  });

  commandService.register({
    id: 'navigation.forward',
    label: 'Go Forward',
    category: CC.Navigation,
    defaultShortcut: 'Alt+ArrowRight',
    whenClause: 'hasActiveTab',
    handler: callbacks.onNavigateForward,
    description: 'Navigate forward in history',
    icon: 'arrow-right',
  });

  // Document navigation
  commandService.register({
    id: 'navigation.goToLine',
    label: 'Go to Line',
    category: CC.Navigation,
    defaultShortcut: 'Ctrl+G',
    whenClause: 'hasActiveTab',
    handler: callbacks.onGoToLine,
    description: 'Jump to a specific line number',
  });

  commandService.register({
    id: 'navigation.goToHeading',
    label: 'Go to Heading',
    category: CC.Navigation,
    defaultShortcut: 'Ctrl+Shift+O',
    whenClause: 'hasActiveTab',
    handler: callbacks.onGoToHeading,
    description: 'Jump to a heading in the document',
    aliases: ['outline', 'toc', 'table of contents'],
  });

  // Pane management
  commandService.register({
    id: 'panes.splitVertical',
    label: 'Split View Vertically',
    category: CC.View,
    defaultShortcut: 'Ctrl+\\',
    whenClause: null,
    handler: callbacks.onSplitVertical,
    description: 'Split the editor vertically (side-by-side)',
    icon: 'columns',
  });

  commandService.register({
    id: 'panes.splitHorizontal',
    label: 'Split View Horizontally',
    category: CC.View,
    defaultShortcut: 'Ctrl+K Ctrl+\\',
    whenClause: null,
    handler: callbacks.onSplitHorizontal,
    description: 'Split the editor horizontally (top-bottom)',
  });

  commandService.register({
    id: 'panes.closePane',
    label: 'Close Pane',
    category: CC.View,
    defaultShortcut: 'Ctrl+K Ctrl+W',
    whenClause: null,
    handler: callbacks.onClosePane,
    description: 'Close the current pane',
  });

  commandService.register({
    id: 'panes.focusNext',
    label: 'Focus Next Pane',
    category: CC.View,
    defaultShortcut: 'Ctrl+K Ctrl+ArrowRight',
    whenClause: null,
    handler: callbacks.onFocusNextPane,
    description: 'Move focus to next pane',
  });

  commandService.register({
    id: 'panes.focusPrevious',
    label: 'Focus Previous Pane',
    category: CC.View,
    defaultShortcut: 'Ctrl+K Ctrl+ArrowLeft',
    whenClause: null,
    handler: callbacks.onFocusPreviousPane,
    description: 'Move focus to previous pane',
  });
}

// ==============================================================================
// T081: View Commands
// ==============================================================================

export function registerViewCommands(callbacks: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onToggleSidebar: () => void;
  onToggleFileTree: () => void;
  onToggleTableOfContents: () => void;
  onChangeTheme: () => void;
  onToggleFullScreen: () => void;
}): void {
  // Zoom
  commandService.register({
    id: 'view.zoomIn',
    label: 'Zoom In',
    category: CC.View,
    defaultShortcut: 'Ctrl+Plus',
    whenClause: null,
    handler: callbacks.onZoomIn,
    description: 'Increase zoom level',
    icon: 'zoom-in',
  });

  commandService.register({
    id: 'view.zoomOut',
    label: 'Zoom Out',
    category: CC.View,
    defaultShortcut: 'Ctrl+Minus',
    whenClause: null,
    handler: callbacks.onZoomOut,
    description: 'Decrease zoom level',
    icon: 'zoom-out',
  });

  commandService.register({
    id: 'view.zoomReset',
    label: 'Reset Zoom',
    category: CC.View,
    defaultShortcut: 'Ctrl+0',
    whenClause: null,
    handler: callbacks.onZoomReset,
    description: 'Reset zoom to 100%',
  });

  // UI toggles
  commandService.register({
    id: 'view.toggleSidebar',
    label: 'Toggle Sidebar',
    category: CC.View,
    defaultShortcut: 'Ctrl+B',
    whenClause: null,
    handler: callbacks.onToggleSidebar,
    description: 'Show or hide the sidebar',
    icon: 'sidebar',
  });

  commandService.register({
    id: 'view.toggleFileTree',
    label: 'Toggle File Tree',
    category: CC.View,
    defaultShortcut: 'Ctrl+Shift+E',
    whenClause: null,
    handler: callbacks.onToggleFileTree,
    description: 'Show or hide the file tree',
  });

  commandService.register({
    id: 'view.toggleTOC',
    label: 'Toggle Table of Contents',
    category: CC.View,
    defaultShortcut: 'Ctrl+Shift+T',
    whenClause: 'hasActiveTab',
    handler: callbacks.onToggleTableOfContents,
    description: 'Show or hide table of contents',
    aliases: ['outline', 'headings'],
  });

  // Theme
  commandService.register({
    id: 'view.changeTheme',
    label: 'Change Theme',
    category: CC.View,
    defaultShortcut: 'Ctrl+K Ctrl+T',
    whenClause: null,
    handler: callbacks.onChangeTheme,
    description: 'Switch between light, dark, and high contrast themes',
    aliases: ['appearance', 'dark mode', 'light mode'],
  });

  commandService.register({
    id: 'view.toggleFullScreen',
    label: 'Toggle Full Screen',
    category: CC.View,
    defaultShortcut: 'F11',
    whenClause: null,
    handler: callbacks.onToggleFullScreen,
    description: 'Enter or exit full screen mode',
  });
}

// ==============================================================================
// T082: Search Commands
// ==============================================================================

export function registerSearchCommands(callbacks: {
  onFindInPage: () => void;
  onFindNext: () => void;
  onFindPrevious: () => void;
  onReplace: () => void;
  onFindInFiles: () => void;
  onReplaceInFiles: () => void;
}): void {
  commandService.register({
    id: 'search.findInPage',
    label: 'Find in Page',
    category: CC.Search,
    defaultShortcut: 'Ctrl+F',
    whenClause: 'hasActiveTab',
    handler: callbacks.onFindInPage,
    description: 'Search in current document',
    icon: 'search',
  });

  commandService.register({
    id: 'search.findNext',
    label: 'Find Next',
    category: CC.Search,
    defaultShortcut: 'F3',
    whenClause: 'hasActiveTab',
    handler: callbacks.onFindNext,
    description: 'Go to next search result',
  });

  commandService.register({
    id: 'search.findPrevious',
    label: 'Find Previous',
    category: CC.Search,
    defaultShortcut: 'Shift+F3',
    whenClause: 'hasActiveTab',
    handler: callbacks.onFindPrevious,
    description: 'Go to previous search result',
  });

  commandService.register({
    id: 'search.replace',
    label: 'Replace',
    category: CC.Search,
    defaultShortcut: 'Ctrl+H',
    whenClause: 'hasActiveTab',
    handler: callbacks.onReplace,
    description: 'Find and replace in current document',
  });

  commandService.register({
    id: 'search.findInFiles',
    label: 'Find in Files',
    category: CC.Search,
    defaultShortcut: 'Ctrl+Shift+F',
    whenClause: 'hasActiveFolder',
    handler: callbacks.onFindInFiles,
    description: 'Search across all files in folder',
    aliases: ['global search', 'search all'],
  });

  commandService.register({
    id: 'search.replaceInFiles',
    label: 'Replace in Files',
    category: CC.Search,
    defaultShortcut: 'Ctrl+Shift+H',
    whenClause: 'hasActiveFolder',
    handler: callbacks.onReplaceInFiles,
    description: 'Find and replace across all files',
  });
}

// Additional application commands
export function registerApplicationCommands(callbacks: {
  onOpenCommandPalette: () => void;
  onOpenSettings: () => void;
  onShowShortcuts: () => void;
  onCheckForUpdates: () => void;
  onAbout: () => void;
  onQuit: () => void;
}): void {
  commandService.register({
    id: 'app.commandPalette',
    label: 'Command Palette',
    category: CC.Application,
    defaultShortcut: 'Ctrl+Shift+P',
    whenClause: null,
    handler: callbacks.onOpenCommandPalette,
    description: 'Open command palette',
    icon: 'terminal',
  });

  commandService.register({
    id: 'app.openSettings',
    label: 'Open Settings',
    category: CC.Application,
    defaultShortcut: 'Ctrl+,',
    whenClause: null,
    handler: callbacks.onOpenSettings,
    description: 'Open settings window',
    icon: 'settings',
    aliases: ['preferences', 'options'],
  });

  commandService.register({
    id: 'app.showShortcuts',
    label: 'Keyboard Shortcuts Reference',
    category: CC.Help,
    defaultShortcut: 'F1',
    whenClause: null,
    handler: callbacks.onShowShortcuts,
    description: 'Show all keyboard shortcuts',
    aliases: ['help', 'keys'],
  });

  commandService.register({
    id: 'app.checkForUpdates',
    label: 'Check for Updates',
    category: CC.Application,
    defaultShortcut: null,
    whenClause: null,
    handler: callbacks.onCheckForUpdates,
    description: 'Check for application updates',
  });

  commandService.register({
    id: 'app.about',
    label: 'About MarkRead',
    category: CC.Help,
    defaultShortcut: null,
    whenClause: null,
    handler: callbacks.onAbout,
    description: 'Show about dialog',
  });

  commandService.register({
    id: 'app.quit',
    label: 'Quit',
    category: CC.Application,
    defaultShortcut: 'Ctrl+Q',
    whenClause: null,
    handler: callbacks.onQuit,
    description: 'Exit the application',
  });
}

export default commandService;
