# Configuration Reference

> 📍 **Navigation**: [Home](../../README.md) → [Documentation](../README.md) → [Reference](.) → Configuration

Complete reference for all MarkRead configuration options.

## Configuration File

Location: `%APPDATA%\MarkRead\settings.json`

## Settings Schema

### Appearance

```json
{
  "appearance": {
    "theme": "system",              // "system" | "light" | "dark"
    "contentFont": "Segoe UI",      // Font family name
    "contentFontSize": 14,          // 8-24
    "codeFont": "Consolas",         // Monospace font
    "codeFontSize": 12,             // 8-20
    "lineHeight": 1.6,              // 1.0-2.5
    "maxContentWidth": 800,         // pixels or "full"
    "syntaxThemeLight": "github",   // Highlight.js theme
    "syntaxThemeDark": "github-dark",
    "sidebarWidth": 250,            // 150-500
    "contentPadding": 40            // 0-100
  }
}
```

### Behavior

```json
{
  "behavior": {
    "autoReload": true,
    "reloadDebounce": 300,          // milliseconds
    "showFileTree": true,
    "restoreTabs": true,
    "confirmCloseMultipleTabs": false,
    "defaultLinkBehavior": "replace", // "replace" | "newTab"
    "scrollBehavior": "smooth",     // "smooth" | "instant"
    "externalLinksBehavior": "browser" // "browser" | "ask" | "copy"
  }
}
```

### Search

```json
{
  "search": {
    "caseSensitiveByDefault": false,
    "searchHistorySize": 50,
    "globalSearchMaxResults": 500,
    "excludePatterns": [
      "node_modules/",
      ".git/",
      "**/draft/"
    ],
    "includeHiddenFiles": false
  }
}
```

### Performance

```json
{
  "performance": {
    "enableIndexing": true,
    "largeFileThreshold": 1048576,  // bytes (1 MB)
    "maxRenderedElements": 10000,
    "aggressiveMemorySaving": false,
    "inactiveTabUnloadTime": 30,    // minutes
    "enableAnimations": true,
    "animationDuration": 200,       // milliseconds
    "fastStartupMode": false
  }
}
```

### Advanced

```json
{
  "advanced": {
    "enableCustomCSS": false,
    "customCSSPath": "%APPDATA%\\MarkRead\\custom.css",
    "enableLogging": false,
    "logLevel": "info",             // "error" | "warning" | "info" | "debug"
    "logFilePath": "%APPDATA%\\MarkRead\\logs\\markread.log",
    "maxLogSize": 10485760,         // bytes (10 MB)
    "checkForUpdates": "onStartup", // "onStartup" | "daily" | "weekly" | "never"
    "allowPreReleaseUpdates": false
  }
}
```

## Environment Variables

Override settings via environment variables:

```powershell
$env:MARKREAD_THEME = "dark"
$env:MARKREAD_AUTO_RELOAD = "false"
$env:MARKREAD_CONFIG_PATH = "C:\custom\path\settings.json"
$env:MARKREAD_LOG_LEVEL = "debug"
```

## Per-Folder Configuration

Create `.markread.json` in folder root:

```json
{
  "theme": "dark",
  "contentFontSize": 16,
  "showFileTree": false
}
```

## See Also

- [Settings Guide](../user-guide/settings.md)
- [Command Line](command-line.md)
- [Keyboard Shortcuts](keyboard-shortcuts.md)
