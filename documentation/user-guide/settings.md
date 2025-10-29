# Settings and Preferences

> 📍 **Navigation**: [Home](../../README.md) → [Documentation](../README.md) → [User Guide](.) → Settings and Preferences

Complete guide to configuring MarkRead to your preferences.

## Accessing Settings

```
Ctrl+, - Open settings
Or Menu (☰) → Settings
```

Settings are organized into categories:
- Appearance
- Behavior
- Performance
- Keyboard
- Advanced

## Appearance Settings

### Theme
**Options**: System | Light | Dark
**Default**: System
**Description**: Color scheme for the entire application

### Content Font
**Default**: Segoe UI
**Range**: Any installed font
**Description**: Font for document body text

### Content Font Size
**Default**: 14pt
**Range**: 8-24pt
**Description**: Size of body text in documents

### Code Font
**Default**: Consolas
**Options**: Consolas | Cascadia Code | Fira Code | JetBrains Mono
**Description**: Font for code blocks

### Code Font Size
**Default**: 12pt
**Range**: 8-20pt
**Description**: Size of code text

### Line Height
**Default**: 1.6
**Range**: 1.0-2.5
**Description**: Space between lines

### Max Content Width
**Default**: 800px
**Options**: Full Width | 600px | 800px | 1000px | Custom
**Description**: Maximum width of document content

### Syntax Theme (Light)
**Default**: GitHub Light
**Options**: GitHub Light | VS Code Light | Solarized Light | Atom One Light
**Description**: Code highlighting theme for light mode

### Syntax Theme (Dark)
**Default**: GitHub Dark
**Options**: GitHub Dark | Dracula | Monokai | Nord | One Dark
**Description**: Code highlighting theme for dark mode

### Sidebar Width
**Default**: 250px
**Range**: 150-500px
**Description**: Width of file tree sidebar

### Content Padding
**Default**: 40px
**Range**: 0-100px
**Description**: Margins around document content

## Behavior Settings

### Auto-reload on File Change
**Default**: Enabled
**Description**: Automatically refresh when files change on disk

### Reload Debounce
**Default**: 300ms
**Range**: 100-2000ms
**Description**: Wait time before reloading after file change

### Show File Tree by Default
**Default**: Enabled
**Description**: Open sidebar automatically on startup

### Restore Tabs on Startup
**Default**: Enabled
**Description**: Reopen tabs from previous session

### Confirm Before Closing Multiple Tabs
**Default**: Disabled
**Description**: Show confirmation when closing 3+ tabs

### Default Tab Behavior
**Options**: Replace Current | New Tab
**Default**: Replace Current
**Description**: How links open by default

### Scroll Behavior
**Options**: Smooth | Instant
**Default**: Smooth
**Description**: Smooth scrolling vs instant jumps

### External Links Behavior
**Options**: Default Browser | Ask | Copy URL
**Default**: Default Browser
**Description**: How external links are handled

## Search Settings

### Case Sensitive by Default
**Default**: Disabled
**Description**: Search is case-sensitive by default

### Search History Size
**Default**: 50
**Range**: 10-200
**Description**: Number of recent searches to remember

### Global Search Max Results
**Default**: 500
**Range**: 100-5000
**Description**: Maximum results for cross-file search

### Exclude Patterns
**Default**: `node_modules/, .git/, **/draft/`
**Description**: Patterns to exclude from global search

### Include Hidden Files
**Default**: Disabled
**Description**: Search in files starting with `.`

## Performance Settings

### Enable Indexing
**Default**: Enabled
**Description**: Build search index in background

### Large File Threshold
**Default**: 1 MB
**Range**: 100 KB - 10 MB
**Description**: Size at which files are considered "large"

### Max Rendered Elements
**Default**: 10000
**Range**: 1000-50000
**Description**: Limit for DOM elements in large documents

### Aggressive Memory Saving
**Default**: Disabled
**Description**: Unload inactive tabs aggressively

### Inactive Tab Unload Time
**Default**: 30 minutes
**Range**: 5 minutes - Never
**Description**: Time before inactive tabs unload

### Enable Animations
**Default**: Enabled
**Description**: Smooth transitions and animations

### Animation Duration
**Default**: 200ms
**Range**: 0-500ms
**Description**: Speed of UI animations

### Fast Startup Mode
**Default**: Disabled
**Description**: Skip some initialization for faster startup

## Keyboard Settings

All shortcuts are customizable. See [Keyboard Shortcuts](keyboard-shortcuts.md) for defaults.

### Navigation Shortcuts
### Tab Management Shortcuts
### Search Shortcuts
### View Shortcuts
### File Shortcuts

## Advanced Settings

### Enable Custom CSS
**Default**: Disabled
**Description**: Load custom CSS file for styling

### Custom CSS Path
**Default**: `%APPDATA%\MarkRead\custom.css`
**Description**: Path to custom stylesheet

### Enable Logging
**Default**: Disabled
**Description**: Write debug logs to file

### Log Level
**Options**: Error | Warning | Info | Debug
**Default**: Info
**Description**: Verbosity of logging

### Log File Path
**Default**: `%APPDATA%\MarkRead\logs\markread.log`
**Description**: Where to write log file

### Max Log Size
**Default**: 10 MB
**Range**: 1-100 MB
**Description**: Maximum log file size before rotation

### Enable Telemetry
**Default**: Disabled
**Description**: Send anonymous usage data (none currently sent)

### Check for Updates
**Default**: On Startup
**Options**: On Startup | Daily | Weekly | Never
**Description**: When to check for new versions

### Allow Pre-release Updates
**Default**: Disabled
**Description**: Include beta versions in update checks

## Settings Storage

Settings are stored in:
```
%APPDATA%\MarkRead\settings.json
```

### Viewing Settings File

```powershell
# Open settings folder
Settings → Advanced → Open Settings Folder

# Or directly
explorer %APPDATA%\MarkRead
```

### Settings File Format

```json
{
  "appearance": {
    "theme": "system",
    "contentFont": "Segoe UI",
    "contentFontSize": 14,
    "codeFont": "Consolas",
    "codeFontSize": 12,
    "lineHeight": 1.6
  },
  "behavior": {
    "autoReload": true,
    "reloadDebounce": 300,
    "showFileTree": true,
    "restoreTabs": true
  }
}
```

## Import/Export Settings

### Export Settings

```
Settings → Advanced → Export Settings
```

Saves to: `markread-settings-2025-10-29.json`

### Import Settings

```
Settings → Advanced → Import Settings
```

**Options**:
- Merge with existing settings
- Replace all settings
- Import specific categories only

### Sharing Team Settings

1. Configure MarkRead perfectly
2. Export settings to JSON
3. Share file with team
4. Team imports settings
5. Everyone has same setup

## Resetting Settings

### Reset to Defaults

```
Settings → Advanced → Reset All Settings
```

**Warns before resetting**:
- All settings return to defaults
- Custom shortcuts cleared
- Theme preferences lost
- Cannot be undone

### Reset Specific Category

```
Settings → Appearance → Reset to Defaults
```

Resets only that category.

### Clean Install

To completely remove all settings:

```powershell
# Close MarkRead first
Remove-Item "$env:APPDATA\MarkRead" -Recurse -Force

# Restart MarkRead
# Fresh default settings loaded
```

## Settings Sync (Future)

Planned feature to sync settings across machines:
- Cloud backup
- Multi-device sync
- Team shared settings
- Settings profiles

## Per-Folder Settings

Override global settings for specific folders:

Create `.markread.json` in folder root:

```json
{
  "theme": "dark",
  "contentFontSize": 16,
  "showFileTree": false
}
```

**Use Cases**:
- Project-specific fonts
- Different themes for work/personal
- Custom settings for presentations

## Environment Variables

Override settings via environment variables:

```powershell
# Force dark theme
$env:MARKREAD_THEME = "dark"
markread docs/

# Disable auto-reload
$env:MARKREAD_AUTO_RELOAD = "false"
markread docs/
```

**Available Variables**:
- `MARKREAD_THEME`
- `MARKREAD_AUTO_RELOAD`
- `MARKREAD_CONFIG_PATH`
- `MARKREAD_LOG_LEVEL`

## Troubleshooting Settings

### Settings Not Saving

**Solutions**:
- Check file permissions on `%APPDATA%\MarkRead`
- Ensure MarkRead has write access
- Not running from read-only location

### Settings Reset on Startup

**Causes**:
- Corrupted settings.json
- Write permissions issue
- Portable version without settings

**Solutions**:
- Check settings.json for syntax errors
- Export backup regularly
- Use fixed install location

### Custom CSS Not Loading

**Checklist**:
- ☑️ Enable Custom CSS in settings
- ☑️ CSS file exists at specified path
- ☑️ CSS file has `.css` extension
- ☑️ Restart MarkRead after changes
- ☑️ Check browser console for errors

## Next Steps

- **[Keyboard Shortcuts](keyboard-shortcuts.md)** - Customize all shortcuts
- **[Themes](themes.md)** - Visual customization
- **[Advanced Features](advanced-features.md)** - Power user features
- **[Reference: Configuration](../reference/configuration.md)** - Complete settings schema

---

**All shortcuts reference** → [Keyboard Shortcuts](keyboard-shortcuts.md)
