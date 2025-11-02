# Command Line Reference

> 📍 **Navigation**: [Home](../../README.md) → [Documentation](../README.md) → [Reference](.) → Command Line

Complete reference for MarkRead command-line interface.

## Basic Usage

```powershell
markread [options] [path]
```

## Arguments

### Path

Open folder or file:

```powershell
# Open folder
markread C:\MyDocs

# Open specific file
markread C:\MyDocs\README.md

# Open current directory
markread .

# Multiple files (opens in tabs)
markread file1.md file2.md file3.md
```

## Options

### Display Options

```powershell
--theme <theme>           # Set theme: system|light|dark
--no-sidebar              # Start with sidebar hidden
--maximized               # Start maximized
--fullscreen              # Start in fullscreen mode
--zoom <level>            # Set zoom level (0.5-3.0)
```

### Behavior Options

```powershell
--no-auto-reload          # Disable auto-reload
--new-window              # Open in new window
--no-restore-session      # Don't restore previous tabs
```

### Advanced Options

```powershell
--verbose                 # Verbose output
--log <file>              # Log to file
--log-level <level>       # error|warning|info|debug
--disable-gpu             # Disable GPU acceleration
--no-animations           # Disable UI animations
```

### Information Options

```powershell
--version, -v             # Show version
--help, -h                # Show help
```

## Examples

```powershell
# Open docs in dark mode
markread --theme dark C:\MyProject\docs

# Open without sidebar, maximized
markread --no-sidebar --maximized .

# Open with verbose logging
markread --verbose --log debug.log C:\Docs

# Open specific file in new window
markread --new-window README.md

# Multiple files with dark theme
markread --theme dark file1.md file2.md
```

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Invalid arguments
- `3` - File not found
- `4` - Permission denied

## See Also

- [Configuration](configuration.md)
- [Advanced Features](../user-guide/advanced-features.md)
