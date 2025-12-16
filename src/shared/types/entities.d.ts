/**
 * TypeScript Type Definitions: Data Model Entities
 * Based on specs/006-electron-redesign/data-model.md
 */

// ============================================================================
// Core Entities
// ============================================================================

export interface FileTreeState {
  expandedDirectories: Set<string>;  // Set of expanded directory paths
  scrollPosition: number;            // Vertical scroll position in pixels
  selectedPath: string | null;       // Currently selected file/folder path
}

export interface Folder {
  id: string;                        // UUID v4
  path: string;                      // Absolute file system path
  displayName: string;               // Human-readable folder name
  fileTreeState: FileTreeState;      // Expansion state of directories
  activeFolderId: string | null;     // Currently active folder ID
  tabCollection: Tab[];              // Array of open tabs (max 50)
  activeTabId: string | null;        // ID of currently active tab
  recentFiles: RecentItem[];         // Recent files list (max 20)
  splitLayout: PanelLayout;          // Split pane configuration
  createdAt: number;                 // Unix timestamp (ms)
  lastAccessedAt: number;            // Unix timestamp (ms)
}

export interface SearchState {
  query: string;                     // Search query string
  caseSensitive: boolean;            // Case-sensitive search toggle
  useRegex: boolean;                 // Regex mode toggle
  currentMatchIndex: number;         // Index of active match (0-based)
  totalMatches: number;              // Total number of matches
  matches: SearchMatch[];            // Array of match positions
}

export interface SearchMatch {
  startOffset: number;               // Character offset in document
  endOffset: number;                 // End character offset
  lineNumber: number;                // Line number (1-based)
}

export interface HistoryEntry {
  filePath: string;                  // File path at this history point
  scrollPosition: number;            // Scroll position when navigated away
  timestamp: number;                 // When navigation occurred
}

export interface Tab {
  id: string;                        // UUID v4
  filePath: string;                  // Absolute path to markdown file
  title: string;                     // Display name in tab bar
  icon?: string;                     // Tab icon identifier
  scrollPosition: number;            // Vertical scroll position in pixels (≥0)
  zoomLevel: number;                 // Zoom percentage (10-2000)
  searchState: SearchState | null;   // Active search state
  modificationTimestamp: number;     // File's last modified time
  isDirty: boolean;                  // File changed externally
  renderCache: string | null;        // Cached rendered HTML
  navigationHistory: HistoryEntry[]; // Navigation stack (max 50)
  createdAt: number;                 // Unix timestamp (ms)
  folderId: string | null;           // ID of folder this tab belongs to (T063d - FR-013e)
  isDirectFile: boolean;             // True if file opened directly, not from folder (T063g - FR-013g)
}

export interface Pane {
  id: string;                        // UUID v4
  tabs: string[];                    // Array of Tab IDs in this pane
  activeTabId: string | null;        // ID of active tab in this pane
  orientation: 'vertical' | 'horizontal'; // Split direction
  sizeRatio: number;                 // Size as ratio of parent (0.0-1.0)
  splitChildren: Pane[] | null;      // Child panes if split
}

export interface PanelLayout {
  rootPane: Pane;                    // Root pane (may contain splits)
  layoutType: 'single' | 'vsplit' | 'hsplit' | 'grid';
}

export enum CommandCategory {
  File = 'file',
  Navigation = 'nav',
  Tabs = 'tabs',
  Search = 'search',
  View = 'view',
  Application = 'app'
}

export interface Command {
  id: string;                        // Command identifier (kebab-case)
  label: string;                     // Human-readable command name
  category: CommandCategory;         // Command category
  defaultShortcut: string | null;    // Default keyboard shortcut
  whenClause: string | null;         // Context condition for availability
  handler: (context?: any) => void | Promise<void>; // Command execution
  description?: string;              // Detailed description
}

export enum ThemeType {
  Light = 'light',
  Dark = 'dark',
  HighContrast = 'high-contrast'
}

export interface ColorMappings {
  // UI chrome
  background: string;
  foreground: string;
  accent: string;

  // Sidebar
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarBorder: string;

  // Tabs
  tabBackground: string;
  tabActiveBackground: string;
  tabForeground: string;
  tabBorder: string;

  // Content area
  contentBackground: string;
  contentForeground: string;

  // Markdown elements
  markdownHeading: string;
  markdownLink: string;
  markdownCodeBackground: string;
  markdownBlockquoteBackground: string;
}

export interface Theme {
  id: string;                        // Theme identifier (kebab-case)
  name: string;                      // Human-readable theme name
  type: ThemeType;                   // Theme type
  colorMappings: ColorMappings;      // UI color definitions
  syntaxHighlightTheme: string;      // Highlight.js theme name
  mermaidTheme: 'default' | 'dark' | 'forest' | 'neutral';
}

export interface ChangeHandler {
  eventType: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  handler: (filePath: string) => void | Promise<void>;
}

export interface FileWatcher {
  id: string;                        // UUID v4
  watchedPath: string;               // Absolute path being monitored
  filePatterns: string[];            // Glob patterns to watch
  debounceInterval: number;          // Debounce time in ms (100-2000)
  ignorePatterns: string[];          // Patterns to ignore
  isActive: boolean;                 // Watcher is active
  changeHandlers: ChangeHandler[];   // Registered event handlers
}

export interface RecentItem {
  id: string;                        // UUID v4
  path: string;                      // Absolute file or folder path
  type: 'file' | 'folder';           // Item type
  displayName: string;               // Human-readable name
  lastAccessedAt: number;            // Unix timestamp (ms)
  folderId: string | null;           // Associated folder ID
}

export interface KeyboardShortcut {
  id: string;                        // UUID v4
  commandId: string;                 // Command this shortcut invokes
  keyCombination: string;            // Electron accelerator format
  whenClause: string | null;         // Context condition
  isCustom: boolean;                 // User-customized shortcut
  conflictsWith?: string[];          // Conflicting shortcut IDs
}

export interface AppearanceSettings {
  theme: 'system' | 'dark' | 'light' | 'high-contrast';
  followSystemTheme: boolean;
  contentFontFamily: string;
  contentFontSize: number;           // 8-24pt
  codeFontFamily: string;
  codeFontSize: number;              // 8-20pt
  lineHeight: number;                // 1.0-2.5
  maxContentWidth: 'full' | 600 | 800 | 1000 | number;
  contentPadding: number;            // 0-100px
  syntaxHighlightThemeLight: string;
  syntaxHighlightThemeDark: string;
  sidebarWidth: number;              // 150-500px
}

export interface BehaviorSettings {
  autoReload: boolean;
  autoReloadDebounce: number;        // 100-2000ms
  restoreTabsOnLaunch: boolean;
  confirmCloseMultipleTabs: boolean;
  defaultTabBehavior: 'replace' | 'new';
  showFileTree: boolean;
  scrollBehavior: 'smooth' | 'instant';
  externalLinksBehavior: 'browser' | 'ask' | 'copy';
}

export interface FolderExclusionPattern {
  id: string;                        // UUID v4
  pattern: string;                   // Glob or regex pattern
  isEnabled: boolean;                // Pattern is active
  description?: string;              // Human-readable description
}

export interface SearchSettings {
  caseSensitiveDefault: boolean;
  searchHistorySize: number;         // 10-200 entries
  globalSearchMaxResults: number;    // 100-5000
  excludePatterns: FolderExclusionPattern[];
  includeHiddenFiles: boolean;
}

export interface PerformanceSettings {
  enableIndexing: boolean;
  largeFileThreshold: number;        // 100KB-10MB
  warnOnLargeFiles: boolean;
}

export interface KeyboardSettings {
  shortcuts: KeyboardShortcut[];
}

export enum LogLevel {
  Error = 'Error',
  Warning = 'Warning',
  Info = 'Info',
  Debug = 'Debug'
}

export interface LogConfiguration {
  enabled: boolean;
  level: LogLevel;
  filePath: string;
  maxFileSize: number;               // 1MB-100MB
  rotationPolicy: 'size' | 'daily';
}

export interface AdvancedSettings {
  customCssEnabled: boolean;
  customCssPath: string | null;
  loggingEnabled: boolean;
  logLevel: LogLevel;
  logFilePath: string;
  logMaxSize: number;                // 1-100MB
  updateCheckFrequency: 'OnStartup' | 'Daily' | 'Weekly' | 'Never';
  allowPreReleaseUpdates: boolean;
  animationsEnabled: boolean;
  animationDuration: number;         // 0-500ms
  reducedMotion: boolean;
}

export interface Settings {
  version: string;                   // Semver
  appearance: AppearanceSettings;
  behavior: BehaviorSettings;
  search: SearchSettings;
  performance: PerformanceSettings;
  keyboard: KeyboardSettings;
  advanced: AdvancedSettings;
}

export interface WindowBounds {
  x: number;                         // Window X position
  y: number;                         // Window Y position
  width: number;                     // Window width (min 800px)
  height: number;                    // Window height (min 600px)
  isMaximized: boolean;              // Maximized state
}

export interface UIState {
  version: string;                   // Semver
  windowBounds: WindowBounds;
  sidebarWidth: number;              // 150-500px
  activeFolder: string | null;       // ID of currently active folder
  folders: Folder[];                 // Array of open folders
  recentItems: RecentItem[];         // Global recent files/folders (max 20)
  splitLayouts: Record<string, PanelLayout>; // Split layouts per folder
}

export interface AnimationSettings {
  enabled: boolean;
  duration: number;                  // 0-500ms
  reducedMotion: boolean;
}
