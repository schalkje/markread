# Keyboard Shortcuts Reference

> 📍 **Navigation**: [Home](../../README.md) → [Documentation](../) → [Reference](./) → Keyboard Shortcuts

Complete reference of MarkRead keyboard shortcuts.

## File Operations

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+O` | Open File | Open markdown file dialog |
| `Ctrl+Shift+O` | Open Folder | Open folder dialog |
| `Ctrl+W` | Close Tab | Close current tab |
| `Ctrl+Shift+W` | Close All Tabs | Close all open tabs |
| `Ctrl+Shift+T` | Reopen Tab | Reopen last closed tab |
| `F5` | Reload | Reload current document |

## Navigation

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt+Left` | Back | Navigate to previous page |
| `Alt+Right` | Forward | Navigate to next page |
| `Ctrl+Home` | Top | Scroll to top of document |
| `Ctrl+End` | Bottom | Scroll to bottom of document |
| `Ctrl+G` | Go to Line | Jump to specific heading |

## Tabs

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+T` | New Tab | Open new tab |
| `Ctrl+Tab` | Next Tab | Switch to next tab |
| `Ctrl+Shift+Tab` | Previous Tab | Switch to previous tab |
| `Ctrl+1-9` | Tab 1-9 | Switch to specific tab |
| `Ctrl+P` | Pin Tab | Pin/unpin current tab |

## Search

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+F` | Find | Open in-page search |
| `F3` | Find Next | Jump to next match |
| `Shift+F3` | Find Previous | Jump to previous match |
| `Ctrl+Shift+F` | Global Search | Open workspace search |
| `Escape` | Close Search | Close search panel |

## View

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+B` | Toggle Sidebar | Show/hide file tree |
| `F11` | Full Screen | Toggle fullscreen mode |
| `Ctrl+=` | Zoom In | Increase font size |
| `Ctrl+-` | Zoom Out | Decrease font size |
| `Ctrl+0` | Reset Zoom | Reset to default zoom |
| `Ctrl+1` | Zoom 100% | Set zoom to 100% |
| `Ctrl+2` | Fit to Width | Fit document to window width |
| `Ctrl+Shift+P` | Command Palette | Show all commands |

## Editing (Read-only Notes)

MarkRead is a **viewer** - these shortcuts open external editor:

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+E` | Edit | Open file in default editor |
| `Ctrl+Shift+E` | Edit In... | Choose editor application |

## Application

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+,` | Settings | Open settings dialog |
| `Ctrl+Shift+A` | About | Show about dialog |
| `Alt+F4` | Exit | Close application |
| `F1` | Help | Show keyboard shortcuts |

## Sidebar

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+\` | Toggle Sidebar | Show/hide sidebar |
| `Ctrl+Shift+E` | Focus Explorer | Focus file tree |
| `Up/Down` | Navigate Files | Move through file list |
| `Enter` | Open File | Open selected file |
| `Ctrl+Enter` | Open New Tab | Open file in new tab |

## Copy Operations

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+C` | Copy | Copy selected text |
| `Ctrl+A` | Select All | Select entire document |
| `Ctrl+Shift+C` | Copy Path | Copy file path |
| `Ctrl+Shift+H` | Copy as HTML | Copy rendered HTML |

## Quick Actions

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+K Ctrl+T` | Change Theme | Toggle light/dark theme |
| `Ctrl+K Ctrl+S` | Keyboard Shortcuts | Show this reference |
| `Ctrl+K Ctrl+O` | Open Recent | Show recent files |
| `Ctrl+K Ctrl+W` | Close Others | Close other tabs |

## Developer Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| `F12` | Dev Tools | Open WebView2 dev tools |
| `Ctrl+Shift+I` | Inspect | Inspect element |
| `Ctrl+Shift+J` | Console | Open console |
| `Ctrl+Shift+R` | Hard Reload | Reload ignoring cache |

## Accessibility

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt+Shift+T` | Read Title | Screen reader: read title |
| `Ctrl+Shift+[` | Decrease Contrast | Lower contrast |
| `Ctrl+Shift+]` | Increase Contrast | Higher contrast |
| `Ctrl+Shift+H` | High Contrast | Toggle high contrast |

## Customization

Shortcuts can be customized in settings:

```json
{
  "keyboardShortcuts": {
    "openFile": "Ctrl+O",
    "search": "Ctrl+F",
    "newTab": "Ctrl+T"
  }
}
```

## Platform Differences

### Windows
- `Ctrl` = Control key
- `Alt` = Alt key
- `Shift` = Shift key

### macOS (if supported)
- `Ctrl` → `Cmd`
- `Alt` → `Option`
- Same otherwise

## Shortcut Conflicts

If shortcuts conflict with other apps:

1. Open Settings (`Ctrl+,`)
2. Navigate to Keyboard Shortcuts
3. Customize conflicting shortcuts
4. Save changes

## Learning Tips

- **F1**: Show shortcut quick reference
- **Ctrl+Shift+P**: Command palette shows all available commands
- Hover over buttons to see shortcuts
- Settings shows all customizable shortcuts

## See Also

- [User Guide: Keyboard Shortcuts](../user-guide/keyboard-shortcuts.md)
- [Settings](../user-guide/settings.md)
- [Configuration Reference](configuration.md)
