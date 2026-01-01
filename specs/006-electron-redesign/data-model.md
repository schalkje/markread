# Data Model: Electron-Based Application Redesign

**Feature**: 006-electron-redesign
**Date**: December 14, 2025
**Status**: Draft

---

## Overview

This document defines the data model for MarkRead's Electron redesign, including all entities, their properties, relationships, validation rules, and state transitions. The model supports multi-folder workspaces, multi-tab navigation, multi-pane layout, comprehensive settings, and keyboard-driven commands.

---

## Entity Relationship Diagram

```
┌─────────────┐       1:N      ┌──────────┐
│   Folder    │────────────────▶│   Tab    │
└─────────────┘                 └──────────┘
      │                              │
      │                              │
      │ 1:N                          │ N:M
      ▼                              ▼
┌─────────────┐                 ┌──────────┐
│ FileWatcher │                 │   Pane   │
└─────────────┘                 └──────────┘

┌─────────────┐       1:N      ┌──────────────────┐
│  Settings   │────────────────▶│ FolderExclusion  │
└─────────────┘                 │     Pattern      │
      │                         └──────────────────┘
      │ 1:1
      ▼
┌─────────────┐
│   UIState   │
└─────────────┘

┌─────────────┐       1:N      ┌──────────────────┐
│  Commands   │────────────────▶│ KeyboardShortcut │
└─────────────┘                 └──────────────────┘
```

---

## Core Entities

### 1. Folder

Represents an opened documentation root with file tree state and tab collection.

**Properties**:
| Property | Type | Required | Description | Validation |
|----------|------|----------|-------------|------------|
| `id` | string (UUID) | Yes | Unique folder identifier | UUID v4 format |
| `path` | string | Yes | Absolute file system path | Must exist, must be directory |
| `displayName` | string | Yes | Human-readable folder name | Derived from path basename |
| `fileTreeState` | FileTreeState | Yes | Expansion state of directories | See FileTreeState type |
| `activeFolderId` | string \| null | No | Currently active folder ID | Must reference existing Folder.id |
| `tabCollection` | Tab[] | Yes | Array of open tabs in this folder | Max 50 tabs (hard limit) |
| `activeTabId` | string \| null | No | ID of currently active tab | Must reference tab in tabCollection |
| `recentFiles` | RecentItem[] | Yes | Recent files list for this folder | Max 20 items, ordered by timestamp |
| `splitLayout` | PanelLayout | Yes | Split pane configuration | Persisted per folder (FR-018) |
| `createdAt` | number (timestamp) | Yes | Folder opened timestamp | Unix timestamp (ms) |
| `lastAccessedAt` | number (timestamp) | Yes | Last folder access timestamp | Unix timestamp (ms) |

**FileTreeState Type**:
```typescript
interface FileTreeState {
  expandedDirectories: Set<string>;  // Set of expanded directory paths
  scrollPosition: number;            // Vertical scroll position in pixels
  selectedPath: string | null;       // Currently selected file/folder path
}
```

**State Transitions**:
- **Created**: User opens folder via File > Open Folder or drag-and-drop
- **Activated**: User switches to folder via folder switcher
- **Closed**: User closes folder, triggers cleanup of tabs and file watchers

**Validation Rules**:
- Path must be absolute and exist on file system
- Tab collection size: warning at 20 tabs, hard block at 50 tabs (FR-013a)
- Recent files limited to 20 most recent items
- activeTabId must reference valid tab in tabCollection or be null

---

### 2. Tab

Represents an open document with scroll position, zoom level, and view state.

**Properties**:
| Property | Type | Required | Description | Validation |
|----------|------|----------|-------------|------------|
| `id` | string (UUID) | Yes | Unique tab identifier | UUID v4 format |
| `filePath` | string | Yes | Absolute path to markdown file | Must exist, must be .md or .markdown |
| `title` | string | Yes | Display name in tab bar | Derived from filename |
| `icon` | string | No | Tab icon identifier | Default: markdown icon |
| `scrollPosition` | number | Yes | Vertical scroll position in pixels | ≥ 0 |
| `zoomLevel` | number | Yes | Zoom percentage | 10-2000 (FR-065, clarification) |
| `searchState` | SearchState \| null | No | Active search state | See SearchState type |
| `modificationTimestamp` | number | Yes | File's last modified time | Unix timestamp (ms) |
| `isDirty` | boolean | Yes | File changed externally, needs reload | View-only app, always false in practice |
| `renderCache` | string \| null | No | Cached rendered HTML | Keyed by filePath + modificationTimestamp |
| `navigationHistory` | HistoryEntry[] | Yes | Forward/backward navigation stack | Max 50 entries |
| `createdAt` | number | Yes | Tab created timestamp | Unix timestamp (ms) |

**SearchState Type**:
```typescript
interface SearchState {
  query: string;                   // Search query string
  caseSensitive: boolean;          // Case-sensitive search toggle
  useRegex: boolean;               // Regex mode toggle
  currentMatchIndex: number;       // Index of active match (0-based)
  totalMatches: number;            // Total number of matches
  matches: SearchMatch[];          // Array of match positions
}

interface SearchMatch {
  startOffset: number;             // Character offset in document
  endOffset: number;               // End character offset
  lineNumber: number;              // Line number (1-based)
}
```

**HistoryEntry Type**:
```typescript
interface HistoryEntry {
  filePath: string;                // File path at this history point
  scrollPosition: number;          // Scroll position when navigated away
  timestamp: number;               // When navigation occurred
}
```

**State Transitions**:
- **Created**: User opens file from tree, recent files, or drag-and-drop
- **Activated**: User switches to tab via Ctrl+[1-9], Ctrl+Tab, or click
- **Reloaded**: File modified externally, auto-reload preserves scroll/zoom (FR-021)
- **Closed**: User closes tab via Ctrl+W or close button

**Validation Rules**:
- filePath must exist and be readable
- zoomLevel: 10 ≤ zoom ≤ 2000 (User Story 2, clarification)
- scrollPosition ≥ 0
- navigationHistory max 50 entries (oldest discarded)

---

### 3. Pane

Represents an editor viewing area in split layout with independent state.

**Properties**:
| Property | Type | Required | Description | Validation |
|----------|------|----------|-------------|------------|
| `id` | string (UUID) | Yes | Unique pane identifier | UUID v4 format |
| `tabs` | string[] | Yes | Array of Tab IDs in this pane | Tab IDs must reference existing tabs |
| `activeTabId` | string \| null | No | ID of active tab in this pane | Must be in tabs array or null |
| `orientation` | 'vertical' \| 'horizontal' | Yes | Split direction | Vertical (side-by-side) or horizontal (top-bottom) |
| `sizeRatio` | number | Yes | Size as ratio of parent container | 0.0 - 1.0 (0.5 = 50%) |
| `splitChildren` | Pane[] \| null | No | Child panes if split | Null for leaf panes |

**PanelLayout Type** (used by Folder.splitLayout):
```typescript
interface PanelLayout {
  rootPane: Pane;                  // Root pane (may contain splits)
  layoutType: 'single' | 'vsplit' | 'hsplit' | 'grid';
}
```

**State Transitions**:
- **Created**: User splits pane with Ctrl+\\ (vertical) or Ctrl+K Ctrl+\\ (horizontal)
- **Resized**: User drags split divider, updates sizeRatio
- **Merged**: User closes pane via Ctrl+W, merges tabs into adjacent pane

**Validation Rules**:
- sizeRatio: 0.0 < ratio < 1.0 (must be positive, less than 100%)
- Minimum pane size: 200px (enforced at render time)
- activeTabId must reference tab in tabs array
- Leaf panes (no splits) have splitChildren = null

---

### 4. Command

Represents a user action with keyboard shortcut and execution context.

**Properties**:
| Property | Type | Required | Description | Validation |
|----------|------|----------|-------------|------------|
| `id` | string | Yes | Command identifier (e.g., "file.open") | Kebab-case, unique |
| `label` | string | Yes | Human-readable command name | Max 100 characters |
| `category` | CommandCategory | Yes | Command category for grouping | See CommandCategory enum |
| `defaultShortcut` | string \| null | No | Default keyboard shortcut | Electron accelerator format |
| `whenClause` | string \| null | No | Context condition for availability | Expression (e.g., "tabOpen") |
| `handler` | Function | Yes | Command execution function | (context) => void \| Promise<void> |
| `description` | string | No | Detailed command description | For help/tooltips |

**CommandCategory Enum**:
```typescript
enum CommandCategory {
  File = 'file',           // File operations (open, close)
  Navigation = 'nav',      // Navigate (go to, history)
  Tabs = 'tabs',           // Tab management (switch, close)
  Search = 'search',       // Search operations (find, replace)
  View = 'view',           // View controls (zoom, theme, sidebar)
  Application = 'app'      // App-level (settings, help, quit)
}
```

**Example Commands**:
```typescript
{
  id: 'file.openFolder',
  label: 'Open Folder',
  category: CommandCategory.File,
  defaultShortcut: 'CmdOrCtrl+O',
  whenClause: null,  // Always available
  handler: async () => { /* Open folder dialog */ },
  description: 'Open a folder to browse markdown files'
}

{
  id: 'tabs.close',
  label: 'Close Tab',
  category: CommandCategory.Tabs,
  defaultShortcut: 'CmdOrCtrl+W',
  whenClause: 'tabOpen',  // Only when tab is open
  handler: async (context) => { /* Close active tab */ },
  description: 'Close the currently active tab'
}
```

**State Transitions**:
- **Registered**: Command registered at app initialization
- **Executed**: User invokes via keyboard shortcut or command palette
- **Disabled**: whenClause evaluates to false, grayed out in palette

**Validation Rules**:
- id must be unique across all commands
- defaultShortcut must be valid Electron accelerator (e.g., "CmdOrCtrl+Shift+P")
- whenClause expressions: "tabOpen", "multipleTabsOpen", "searchActive", etc.

---

### 5. Theme

Represents a color scheme for UI and syntax highlighting.

**Properties**:
| Property | Type | Required | Description | Validation |
|----------|------|----------|-------------|------------|
| `id` | string | Yes | Theme identifier | Kebab-case, unique |
| `name` | string | Yes | Human-readable theme name | Max 50 characters |
| `type` | ThemeType | Yes | Theme type | See ThemeType enum |
| `colorMappings` | ColorMappings | Yes | UI color definitions | See ColorMappings type |
| `syntaxHighlightTheme` | string | Yes | Highlight.js theme name | Must match available theme |
| `mermaidTheme` | 'default' \| 'dark' \| 'forest' \| 'neutral' | Yes | Mermaid diagram theme | Aligned with app theme type |

**ThemeType Enum**:
```typescript
enum ThemeType {
  Light = 'light',
  Dark = 'dark',
  HighContrast = 'high-contrast'  // WCAG AAA 7:1 contrast (FR-031)
}
```

**ColorMappings Type**:
```typescript
interface ColorMappings {
  // UI chrome
  background: string;              // Main background (hex)
  foreground: string;              // Main text color (hex)
  accent: string;                  // Accent color for buttons, links (hex)

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
```

**Built-in Themes**:
- `system-light`: Follows Windows light theme
- `system-dark`: Follows Windows dark theme
- `high-contrast-light`: WCAG AAA light theme (7:1 contrast)
- `high-contrast-dark`: WCAG AAA dark theme (7:1 contrast)

**State Transitions**:
- **Loaded**: Theme loaded from assets/themes/*.json
- **Applied**: User selects theme, triggers UI update (FR-032: <200ms)
- **Auto-switched**: System theme changes, app follows (if theme mode = "System")

**Validation Rules**:
- All colors must be valid hex format (#RRGGBB or #RRGGBBAA)
- High-contrast themes: foreground/background contrast ≥ 7:1 (WCAG AAA)
- syntaxHighlightTheme must exist in Highlight.js theme directory
- Theme switching must complete within 200ms (FR-032 requirement)

---

### 6. FileWatcher

Represents a filesystem monitor for a folder with debounce configuration.

**Properties**:
| Property | Type | Required | Description | Validation |
|----------|------|----------|-------------|------------|
| `id` | string (UUID) | Yes | Watcher identifier | UUID v4 format |
| `watchedPath` | string | Yes | Absolute path being monitored | Must be directory |
| `filePatterns` | string[] | Yes | Glob patterns to watch | Default: ['**/*.md', '**/*.markdown'] |
| `debounceInterval` | number | Yes | Debounce time in milliseconds | 100-2000ms, default 300ms (research.md) |
| `ignorePatterns` | string[] | Yes | Patterns to ignore | node_modules, .git, etc. (FR-072) |
| `isActive` | boolean | Yes | Watcher is active | False when folder closed |
| `changeHandlers` | ChangeHandler[] | Yes | Registered event handlers | See ChangeHandler type |

**ChangeHandler Type**:
```typescript
interface ChangeHandler {
  eventType: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  handler: (filePath: string) => void | Promise<void>;
}
```

**State Transitions**:
- **Created**: Folder opened, watcher initialized with chokidar
- **Active**: Monitoring file system events, debouncing rapid changes
- **Paused**: Temporarily disabled (e.g., during bulk operations)
- **Destroyed**: Folder closed, watcher disposed

**Validation Rules**:
- watchedPath must exist and be a directory
- debounceInterval: 100 ≤ interval ≤ 2000ms
- filePatterns must be valid glob syntax
- ignorePatterns should include node_modules, .git, bin, obj (FR-072)
- Change events debounced: 300ms for file changes, 500ms for writes (FR-020, research.md)

**Chokidar Configuration** (from research.md):
```typescript
{
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 500,  // Wait 500ms for writes to finish
    pollInterval: 100
  },
  ignored: ignorePatterns
}
```

---

### 7. RecentItem

Represents a recent file or folder with access timestamp.

**Properties**:
| Property | Type | Required | Description | Validation |
|----------|------|----------|-------------|------------|
| `id` | string (UUID) | Yes | Unique identifier | UUID v4 format |
| `path` | string | Yes | Absolute file or folder path | Must have existed (may not currently exist) |
| `type` | 'file' \| 'folder' | Yes | Item type | File or folder |
| `displayName` | string | Yes | Human-readable name | Derived from path basename |
| `lastAccessedAt` | number | Yes | Last access timestamp | Unix timestamp (ms) |
| `folderId` | string \| null | No | Associated folder ID (for files) | References Folder.id or null |

**State Transitions**:
- **Added**: User opens file/folder, added to recent list
- **Updated**: User reopens item, lastAccessedAt updated, moved to top
- **Removed**: Item deleted from file system or user clears recent list

**Validation Rules**:
- Recent files list max 20 items per folder (FR-025 application-wide, FR-008 per-folder)
- Items ordered by lastAccessedAt descending (most recent first)
- Path may not exist (file deleted) - show grayed out in UI with option to remove
- Persisted in UIState.recentItems array

---

### 8. KeyboardShortcut

Represents a key binding for a command with customization support.

**Properties**:
| Property | Type | Required | Description | Validation |
|----------|------|----------|-------------|------------|
| `id` | string (UUID) | Yes | Unique shortcut identifier | UUID v4 format |
| `commandId` | string | Yes | Command this shortcut invokes | Must reference Command.id |
| `keyCombination` | string | Yes | Key combination | Electron accelerator format |
| `whenClause` | string \| null | No | Context condition | Expression (e.g., "editorFocus") |
| `isCustom` | boolean | Yes | User-customized shortcut | True if user changed default |
| `conflictsWith` | string[] | No | Conflicting shortcut IDs | For conflict detection |

**Electron Accelerator Format Examples**:
- `CmdOrCtrl+S` (Ctrl on Windows/Linux, Cmd on macOS)
- `CmdOrCtrl+Shift+P`
- `Alt+Left`
- `F1`
- `CmdOrCtrl+1` through `CmdOrCtrl+9` (tab jumping)

**State Transitions**:
- **Registered**: Default shortcuts loaded at app initialization
- **Customized**: User changes shortcut via Settings > Keyboard
- **Conflicted**: User assigns combination already in use, conflict detected
- **Reset**: User resets to default via Settings > Keyboard

**Validation Rules**:
- keyCombination must be valid Electron accelerator
- Conflict detection: Same keyCombination + whenClause not allowed (FR-088, Edge Case)
- Reserved shortcuts (system-level) cannot be overridden: Alt+F4, Windows key, etc.
- Settings UI highlights conflicts in real-time with red styling (Edge Case)

**Default Shortcuts** (partial list, 80+ total per FR-013):
| Command | Shortcut | Category |
|---------|----------|----------|
| file.openFolder | Ctrl+O | File |
| file.openFile | Ctrl+Shift+O | File |
| tabs.close | Ctrl+W | Tabs |
| tabs.switch | Ctrl+Tab | Tabs |
| tabs.jumpTo1-9 | Ctrl+1-9 | Tabs |
| search.find | Ctrl+F | Search |
| search.findInFiles | Ctrl+Shift+F | Search |
| view.zoomIn | Ctrl+Plus | View |
| view.zoomOut | Ctrl+Minus | View |
| view.zoomReset | Ctrl+0 | View |
| view.toggleSidebar | Ctrl+B | View |
| view.splitVertical | Ctrl+\\ | View |
| app.commandPalette | Ctrl+Shift+P | Application |
| app.settings | Ctrl+, | Application |
| app.keyboardShortcuts | F1 | Application |

---

### 9. Settings

Represents application configuration organized by category.

**Properties**:
| Property | Type | Required | Description | Validation |
|----------|------|----------|-------------|------------|
| `version` | string | Yes | Settings schema version | Semver (e.g., "1.0.0") |
| `appearance` | AppearanceSettings | Yes | Appearance category | See AppearanceSettings |
| `behavior` | BehaviorSettings | Yes | Behavior category | See BehaviorSettings |
| `search` | SearchSettings | Yes | Search category | See SearchSettings |
| `performance` | PerformanceSettings | Yes | Performance category | See PerformanceSettings |
| `keyboard` | KeyboardSettings | Yes | Keyboard category | See KeyboardSettings |
| `advanced` | AdvancedSettings | Yes | Advanced category | See AdvancedSettings |

**AppearanceSettings Type** (FR-063-067):
```typescript
interface AppearanceSettings {
  theme: 'system' | 'dark' | 'light' | 'high-contrast';  // FR-063
  followSystemTheme: boolean;                             // Auto-switch with OS
  contentFontFamily: string;                              // e.g., "Segoe UI", "Arial"
  contentFontSize: number;                                // 8-24pt (FR-064)
  codeFontFamily: string;                                 // Consolas, Cascadia, Fira Code, JetBrains Mono (FR-064)
  codeFontSize: number;                                   // 8-20pt (FR-064)
  lineHeight: number;                                     // 1.0-2.5 (FR-065)
  maxContentWidth: 'full' | 600 | 800 | 1000 | number;    // FR-065
  contentPadding: number;                                 // 0-100px (FR-065)
  syntaxHighlightThemeLight: string;                      // FR-066 (5-10 presets)
  syntaxHighlightThemeDark: string;                       // FR-066 (5-10 presets)
  sidebarWidth: number;                                   // 150-500px (FR-067)
}
```

**BehaviorSettings Type** (FR-068-070):
```typescript
interface BehaviorSettings {
  autoReload: boolean;                                    // FR-068
  autoReloadDebounce: number;                             // 100-2000ms (FR-068)
  restoreTabsOnLaunch: boolean;                           // FR-069
  confirmCloseMultipleTabs: boolean;                      // FR-069
  defaultTabBehavior: 'replace' | 'new';                  // FR-069
  showFileTree: boolean;                                  // FR-070
  scrollBehavior: 'smooth' | 'instant';                   // FR-070
  externalLinksBehavior: 'browser' | 'ask' | 'copy';      // FR-070
}
```

**SearchSettings Type** (FR-071-073):
```typescript
interface SearchSettings {
  caseSensitiveDefault: boolean;                          // FR-071 (default off)
  searchHistorySize: number;                              // 10-200 entries (FR-071)
  globalSearchMaxResults: number;                         // 100-5000 (FR-071)
  excludePatterns: FolderExclusionPattern[];              // FR-072
  includeHiddenFiles: boolean;                            // FR-073
}
```

**PerformanceSettings Type** (FR-074-075):
```typescript
interface PerformanceSettings {
  enableIndexing: boolean;                                // FR-074 (faster cross-file search)
  largeFileThreshold: number;                             // 100KB-10MB (FR-075)
  warnOnLargeFiles: boolean;                              // Show warning before rendering
}
```

**KeyboardSettings Type**:
```typescript
interface KeyboardSettings {
  shortcuts: KeyboardShortcut[];                          // Customizable shortcuts
}
```

**AdvancedSettings Type** (FR-076-079):
```typescript
interface AdvancedSettings {
  customCssEnabled: boolean;                              // FR-076
  customCssPath: string | null;                           // FR-076
  loggingEnabled: boolean;                                // FR-077
  logLevel: 'Error' | 'Warning' | 'Info' | 'Debug';       // FR-077
  logFilePath: string;                                    // FR-077
  logMaxSize: number;                                     // 1-100MB (FR-077)
  updateCheckFrequency: 'OnStartup' | 'Daily' | 'Weekly' | 'Never';  // FR-078
  allowPreReleaseUpdates: boolean;                        // FR-078
  animationsEnabled: boolean;                             // FR-079
  animationDuration: number;                              // 0-500ms (FR-079)
  reducedMotion: boolean;                                 // FR-079 (accessibility)
}
```

**State Transitions**:
- **Loaded**: Settings loaded from settings.json on app start
- **Updated**: User changes setting via Settings UI (Ctrl+,)
- **Validated**: Setting validated on change, invalid values rejected with error
- **Persisted**: Settings saved atomically with backup (.settings.json.bak) (FR-057)
- **Reset**: User resets all settings via Factory Reset (FR-059)

**Validation Rules** (FR-061):
- Font sizes: contentFontSize 8-24pt, codeFontSize 8-20pt
- lineHeight: 1.0-2.5
- contentPadding: 0-100px
- sidebarWidth: 150-500px
- autoReloadDebounce: 100-2000ms
- searchHistorySize: 10-200
- globalSearchMaxResults: 100-5000
- largeFileThreshold: 100KB-10MB (bytes)
- logMaxSize: 1-100MB (bytes)
- animationDuration: 0-500ms

**Persistence** (FR-053, FR-057):
- Main settings file: `%APPDATA%/MarkRead/settings.json`
- Backup file: `%APPDATA%/MarkRead/.settings.json.bak`
- Atomic writes: Write to temp file, then rename
- Corruption detection: Try parse, restore from backup if fails, reset to defaults if backup also fails

**Per-Folder Overrides** (FR-056):
- `.markread.json` in folder root overrides global settings
- Only subset of settings allowed (theme, autoReload, scrollBehavior)
- Validated on load, invalid entries ignored with warning, fall back to global

---

### 10. UIState

Represents persistent window and UI state.

**Properties**:
| Property | Type | Required | Description | Validation |
|----------|------|----------|-------------|------------|
| `version` | string | Yes | UIState schema version | Semver (e.g., "1.0.0") |
| `windowBounds` | WindowBounds | Yes | Window dimensions and position | See WindowBounds type |
| `sidebarWidth` | number | Yes | Sidebar width in pixels | 150-500px (FR-067) |
| `activeFolder` | string \| null | No | ID of currently active folder | References Folder.id |
| `folders` | Folder[] | Yes | Array of open folders | See Folder entity |
| `recentItems` | RecentItem[] | Yes | Global recent files/folders | Max 20 items (FR-025) |
| `splitLayouts` | Record<string, PanelLayout> | Yes | Split layouts per folder | Keyed by Folder.id |

**WindowBounds Type** (FR-062):
```typescript
interface WindowBounds {
  x: number;          // Window X position (screen coordinates)
  y: number;          // Window Y position (screen coordinates)
  width: number;      // Window width in pixels (min 800px)
  height: number;     // Window height in pixels (min 600px)
  isMaximized: boolean;  // Maximized state
}
```

**State Transitions**:
- **Loaded**: UIState loaded from ui-state.json on app start
- **Updated**: Window moved/resized, sidebar dragged, folder opened/closed
- **Persisted**: Auto-saved on change (debounced 500ms to avoid excessive writes)

**Validation Rules**:
- windowBounds: width ≥ 800, height ≥ 600 (minimum usable size)
- windowBounds: x, y within screen bounds (handle multi-monitor scenarios)
- sidebarWidth: 150 ≤ width ≤ 500px
- recentItems: max 20 items, ordered by lastAccessedAt descending
- Persistence file: `%APPDATA%/MarkRead/ui-state.json`

---

### 11. AnimationSettings

Represents animation configuration (subset of Settings.advanced).

**Properties**:
| Property | Type | Required | Description | Validation |
|----------|------|----------|-------------|------------|
| `enabled` | boolean | Yes | Animations enabled globally | Default: true |
| `duration` | number | Yes | Animation duration in milliseconds | 0-500ms (FR-079) |
| `reducedMotion` | boolean | Yes | Respect OS reduced motion setting | Accessibility (FR-079) |

**State Transitions**:
- **Applied**: User toggles animations, UI transitions update
- **Auto-detected**: OS reduced motion setting changes, app follows if reducedMotion=true

**Validation Rules**:
- duration: 0 ≤ duration ≤ 500ms
- reducedMotion: If true, override enabled and set duration=0
- Animations affected: tab switching, sidebar collapse, theme transitions, pane splits

---

### 12. FolderExclusionPattern

Represents a search exclusion rule for cross-file search.

**Properties**:
| Property | Type | Required | Description | Validation |
|----------|------|----------|-------------|------------|
| `id` | string (UUID) | Yes | Unique pattern identifier | UUID v4 format |
| `pattern` | string | Yes | Glob or regex pattern | Valid glob syntax |
| `isEnabled` | boolean | Yes | Pattern is active | Default: true |
| `description` | string | No | Human-readable description | Max 200 characters |

**Default Patterns** (FR-072):
```typescript
[
  { pattern: 'node_modules/**', description: 'Node.js dependencies' },
  { pattern: '.git/**', description: 'Git repository files' },
  { pattern: 'bin/**', description: 'Binary output directory' },
  { pattern: 'obj/**', description: 'Object files directory' },
  { pattern: '**/*.min.js', description: 'Minified JavaScript' },
  { pattern: '**/.DS_Store', description: 'macOS metadata files' }
]
```

**State Transitions**:
- **Added**: User adds exclusion pattern via Settings > Search
- **Toggled**: User enables/disables pattern
- **Removed**: User deletes pattern

**Validation Rules**:
- pattern must be valid glob syntax (parsed with minimatch)
- Duplicate patterns not allowed (case-insensitive check)
- Settings UI provides add/remove/edit interface (FR-072)

---

### 13. LogConfiguration

Represents logging settings (subset of Settings.advanced).

**Properties**:
| Property | Type | Required | Description | Validation |
|----------|------|----------|-------------|------------|
| `enabled` | boolean | Yes | Logging enabled | Default: true for production |
| `level` | LogLevel | Yes | Minimum log level | See LogLevel enum |
| `filePath` | string | Yes | Log file path | Default: %APPDATA%/MarkRead/logs/app.log |
| `maxFileSize` | number | Yes | Max log file size in bytes | 1MB-100MB (FR-077) |
| `rotationPolicy` | 'size' \| 'daily' | Yes | Log rotation strategy | Default: 'size' |

**LogLevel Enum** (FR-077):
```typescript
enum LogLevel {
  Error = 'Error',      // Only errors (crashes, failures)
  Warning = 'Warning',  // Warnings + errors
  Info = 'Info',        // Info + warnings + errors (default)
  Debug = 'Debug'       // All logs (verbose, for debugging)
}
```

**State Transitions**:
- **Configured**: User changes log settings via Settings > Advanced
- **Rotated**: Log file exceeds maxFileSize or daily rotation time
- **Cleared**: User clears logs via Settings > Advanced

**Validation Rules**:
- filePath: Must be writable directory
- maxFileSize: 1MB ≤ size ≤ 100MB (1,048,576 to 104,857,600 bytes)
- Log rotation: Create new file when size exceeded or daily at midnight
- Old logs: Keep 7 days of rotated logs, delete older

---

## Data Flow Diagrams

### File Opening Flow

```
User Action (Open File)
  │
  ▼
Check if file already open in Tab
  │
  ├─ Yes ──▶ Activate existing Tab
  │
  └─ No ───▶ Create new Tab
              │
              ▼
         Add to Folder.tabCollection
              │
              ▼
         Add to RecentItems
              │
              ▼
         Load file content
              │
              ▼
         Render markdown (markdown-it + Highlight.js + Mermaid)
              │
              ▼
         Cache rendered HTML in Tab.renderCache
              │
              ▼
         Display in active Pane
```

### File Change Detection Flow

```
FileWatcher detects change
  │
  ▼
Debounce 300ms (awaitWriteFinish: 500ms)
  │
  ▼
Find Tab(s) with matching filePath
  │
  ▼
For each Tab:
  │
  ├─ Update Tab.modificationTimestamp
  │
  ├─ Invalidate Tab.renderCache
  │
  ├─ Preserve Tab.scrollPosition and Tab.zoomLevel
  │
  ├─ Reload file content
  │
  └─ Re-render markdown
       │
       ▼
  Display with preserved scroll/zoom (FR-021)
```

### Settings Update Flow

```
User changes setting in Settings UI
  │
  ▼
Validate new value (range, format, type)
  │
  ├─ Invalid ──▶ Show error, reject change
  │
  └─ Valid ───▶ Update Settings object
                  │
                  ▼
             Live preview (if Appearance setting)
                  │
                  ▼
             Write to temp file (%APPDATA%/MarkRead/.settings.tmp.json)
                  │
                  ▼
             Atomic rename to settings.json
                  │
                  ▼
             Backup previous settings to .settings.json.bak
                  │
                  ▼
             Trigger UI updates (theme, fonts, layout)
```

---

## Validation Summary

### Size Limits

| Entity | Limit | Requirement |
|--------|-------|-------------|
| Folder.tabCollection | 50 tabs (hard limit) | FR-013a |
| Folder.recentFiles | 20 items | FR-008 |
| UIState.recentItems | 20 items | FR-025 |
| Tab.navigationHistory | 50 entries | Performance |
| Tab.zoomLevel | 10-2000% | Clarification |
| Settings.contentFontSize | 8-24pt | FR-064 |
| Settings.codeFontSize | 8-20pt | FR-064 |
| Settings.lineHeight | 1.0-2.5 | FR-065 |
| Settings.sidebarWidth | 150-500px | FR-067 |

### Performance Targets

| Operation | Target | Requirement |
|-----------|--------|-------------|
| Tab switching | < 100ms | SC-006 |
| Theme application | < 200ms | FR-032 |
| Settings UI load | < 200ms | FR-048 |
| Live preview update | < 100ms | FR-055 |
| Markdown rendering | < 500ms | SC-001 |
| Zoom operation | < 50ms | SC-004 |

---

## TypeScript Type Definitions

```typescript
// Complete type definitions for all entities above
// (Available in src/shared/types/*.d.ts after Phase 1 implementation)

// Example import usage:
import type { Folder, Tab, Pane, Command, Theme, Settings } from '@/shared/types';
```

---

## Next Steps

1. **Generate API Contracts**: Define IPC contracts for main-renderer communication
2. **Implement Validation**: Create Zod schemas for all entities
3. **Build State Management**: Set up Zustand stores for React 18
4. **Persistence Layer**: Implement settings and UIState persistence with atomic writes

---

**End of Data Model Document**
