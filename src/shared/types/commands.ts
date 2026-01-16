/**
 * Command System Type Definitions
 * Task: T077
 * Based on specs/006-electron-redesign/data-model.md
 */

/**
 * Command categories for organization
 */
export enum CommandCategory {
  File = 'file',
  Navigation = 'nav',
  Tabs = 'tabs',
  Search = 'search',
  View = 'view',
  Application = 'app',
  Edit = 'edit',
  Help = 'help',
}

/**
 * Command execution context
 */
export interface CommandContext {
  activeTabId?: string;
  activePaneId?: string;
  activeFolderId?: string;
  selectedFilePath?: string;
  [key: string]: any;
}

/**
 * Command definition
 */
export interface Command {
  /** Unique command identifier (kebab-case) */
  id: string;

  /** Human-readable command name for display */
  label: string;

  /** Command category for organization */
  category: CommandCategory;

  /** Default keyboard shortcut (Electron accelerator format) */
  defaultShortcut: string | null;

  /** Context condition for availability (e.g., "hasActiveTab", "hasSelection") */
  whenClause: string | null;

  /** Command execution handler */
  handler: (context?: CommandContext) => void | Promise<void>;

  /** Detailed description for help text */
  description?: string;

  /** Icon identifier for UI display */
  icon?: string;

  /** Whether this command is enabled */
  enabled?: boolean;

  /** Aliases for fuzzy search */
  aliases?: string[];
}

/**
 * Command execution result
 */
export interface CommandResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Command palette search result
 */
export interface CommandSearchResult {
  command: Command;
  score: number;
  matches: number[];
}
