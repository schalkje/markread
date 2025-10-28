# Data Model: Mockup UI Implementation

**Feature**: 003-mockup-ui  
**Date**: October 28, 2025

## Core Entities

### ThemeConfiguration

Manages application theme settings and color schemes.

**Attributes**:
- `CurrentTheme`: enum (Light, Dark) - Active theme selection
- `SystemThemeFollow`: boolean - Whether to follow OS theme preference
- `LightColorScheme`: ColorScheme - Light theme color definitions
- `DarkColorScheme`: ColorScheme - Dark theme color definitions
- `LastModified`: DateTime - Settings modification timestamp

**Validation Rules**:
- CurrentTheme must be valid enum value
- ColorScheme objects must contain all required color properties
- SystemThemeFollow overrides CurrentTheme when enabled

**State Transitions**:
- Light ↔ Dark: Direct switching via user action or system detection
- Manual → SystemFollow: User enables system theme detection
- SystemFollow → Manual: User manually selects specific theme

### UIState

Maintains user interface layout and interaction state.

**Attributes**:
- `SidebarCollapsed`: boolean - Sidebar visibility state
- `SidebarWidth`: double - Sidebar width in pixels (when visible)
- `WindowBounds`: Rectangle - Window position and size
- `ActiveTabId`: string - Currently selected tab identifier
- `OpenTabIds`: List<string> - All open tab identifiers in order
- `LastFileNavigationPath`: string - Most recent file location

**Validation Rules**:
- SidebarWidth must be between 200-500 pixels
- WindowBounds must fit within available screen space
- ActiveTabId must exist in OpenTabIds if tabs are open
- File paths must be valid and accessible

**Relationships**:
- References active file through existing file management system
- Coordinates with tab management for state consistency

### ColorScheme

Defines color palette for light or dark theme.

**Attributes**:
- `Background`: Color - Primary background color
- `Foreground`: Color - Primary text color
- `Accent`: Color - Highlight and selection color
- `Border`: Color - Border and separator color
- `ButtonBackground`: Color - Button background color
- `ButtonHover`: Color - Button hover state color
- `SidebarBackground`: Color - Sidebar area background
- `TabActiveBackground`: Color - Active tab background
- `TabInactiveBackground`: Color - Inactive tab background

**Validation Rules**:
- All colors must be valid ARGB values
- Color contrast ratios must meet accessibility standards (4.5:1 minimum)
- No color can be completely transparent (Alpha > 0)

**Business Logic**:
- Auto-generated hover states based on base colors
- Accessibility validation for color contrast compliance

### AnimationSettings

Controls animation behavior and performance.

**Attributes**:
- `AnimationsEnabled`: boolean - Global animation toggle
- `ReducedMotion`: boolean - Accessibility reduced motion preference
- `ThemeSwitchDuration`: int - Theme transition time in milliseconds
- `TabAnimationDuration`: int - Tab transition time in milliseconds
- `SidebarAnimationDuration`: int - Sidebar collapse/expand time

**Validation Rules**:
- Animation durations must be 0-1000 milliseconds
- ReducedMotion overrides individual duration settings
- AnimationsEnabled can disable all animations globally

## Entity Relationships

```
ThemeConfiguration (1) ←→ (2) ColorScheme
     ↓
UIState ←→ AnimationSettings
     ↓
[Existing File System] ←→ Tab Management
```

## Persistence Strategy

**ThemeConfiguration**: Stored in `%APPDATA%/MarkRead/theme-settings.json`
**UIState**: Stored in `%APPDATA%/MarkRead/ui-state.json`  
**ColorScheme**: Embedded within ThemeConfiguration JSON
**AnimationSettings**: Stored in `%APPDATA%/MarkRead/animation-settings.json`

**Backup Strategy**: Automatic backup of settings files on successful save, with restoration on corruption detection.

## Data Migration

- **From**: No existing theme settings
- **To**: Default light theme with system follow enabled
- **Process**: Create default configuration files on first application startup
- **Rollback**: Delete configuration files to return to defaults