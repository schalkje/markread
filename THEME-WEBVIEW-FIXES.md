# WebView Theme and Mermaid Dark Theme Fixes

**Date**: November 1, 2025  
**Status**: ✅ Fixed

## Issues Identified

### 1. WebView Theme Not Changing
**Problem**: When toggling between light and dark themes, the WebView content (markdown) was not updating its colors, remaining in the initial theme.

**Root Cause**: The `data-theme` attribute on the `<body>` element was being set to the full theme name (e.g., "Light", "Dark") using `themeName.ToLowerInvariant()`, which resulted in values like "light" or "dark". However, the CSS wasn't properly reacting to these changes because the theme variables weren't being applied.

### 2. Mermaid Diagrams Not Using Dark Theme
**Problem**: Mermaid diagrams were always rendering in light theme even when dark theme was active.

**Root Cause**: The `getMermaidTheme()` function in `render.js` was checking for exact matches `'dark'` or `'theme-dark'`, but the actual `data-theme` attribute value could be the full theme name. Additionally, there was a mismatch between what was being set and what was being checked.

## Solutions Implemented

### Fix 1: Normalize data-theme Attribute

**File**: `src/Rendering/WebViewHost.cs` (lines ~185-195)

Changed the CSS injection script to set `data-theme` to a normalized value (`'light'` or `'dark'`) instead of the raw theme name:

```csharp
// Before:
document.body.setAttribute('data-theme', '{themeName.ToLowerInvariant()}');
document.body.classList.add('theme-{themeName.ToLowerInvariant()}');

// After:
const resolvedTheme = '{(themeName.Contains("dark", StringComparison.OrdinalIgnoreCase) ? "dark" : "light")}';
document.body.setAttribute('data-theme', resolvedTheme);
document.body.classList.add('theme-' + resolvedTheme);
```

**Impact**: Now `data-theme` is always either `"light"` or `"dark"`, making it predictable for CSS selectors and JavaScript theme detection.

### Fix 2: Improve Mermaid Theme Detection

**File**: `src/Rendering/assets/scripts/render.js` (lines ~126-139)

Enhanced the `getMermaidTheme()` function with:
1. Added debug logging to track theme detection
2. Made the dark theme check more robust by using `.includes('dark')`
3. Added logging for which Mermaid theme is selected

```javascript
function getMermaidTheme() {
    // Check data-theme attribute (should be 'light' or 'dark')
    const theme = document.body.getAttribute('data-theme');
    console.log('getMermaidTheme: data-theme attribute is:', theme);
    
    // Match against 'dark' or theme names containing 'dark'
    if (theme && (theme === 'dark' || theme.toLowerCase().includes('dark'))) {
        console.log('Using Mermaid dark theme');
        return 'dark';
    }
    
    console.log('Using Mermaid default (light) theme');
    return 'default';
}
```

**Impact**: Mermaid diagrams now correctly detect dark theme and re-render with appropriate colors when theme changes.

## How It Works Now

### Theme Change Flow

```
User Clicks Theme Toggle
    ↓
ThemeManager switches XAML dictionary
    ↓
ThemeChanged event fires
    ↓
MainWindow.OnThemeChanged() → WebViewHost.InjectThemeFromColorSchemeAsync()
    ↓
WebViewHost determines isDark = themeName.Contains("dark")
    ↓
CSS variables injected into :root
    ↓
body data-theme set to "light" or "dark" ← FIXED
    ↓
body classes updated: theme-light or theme-dark
    ↓
CustomEvent 'themeChanged' dispatched
    ↓
render.js catches event → reRenderMermaidGraphs()
    ↓
getMermaidTheme() reads data-theme attribute ← FIXED
    ↓
Mermaid.initialize({ theme: 'dark' or 'default' })
    ↓
Mermaid diagrams re-rendered with correct theme
```

### Theme Variable Application

The WebView content reacts to theme changes through:

1. **CSS Variables** (`--theme-background`, `--theme-text-primary`, etc.) injected with `!important`
2. **data-theme attribute** on `<body>` normalized to `"light"` or `"dark"`
3. **color-scheme** CSS property set to match theme
4. **body classes** (`theme-light` or `theme-dark`) for additional CSS selectors

All of these update simultaneously when `InjectThemeAsync()` executes.

## Testing

### Build
```powershell
dotnet build
# Build succeeded in 2.4s
```

### Manual Test Steps
1. Run application: `.\src\App\bin\Debug\net8.0-windows\MarkRead.App.exe .\documentation`
2. Open a markdown file with Mermaid diagrams (e.g., `documentation/user-guide/themes.md`)
3. Check initial theme (should match system or last saved preference)
4. Click theme toggle button
5. Verify:
   - ✅ Markdown text color changes
   - ✅ Background color changes
   - ✅ Code blocks update colors
   - ✅ Mermaid diagrams re-render with new theme colors
   - ✅ No white flash or navigation

### Debug Console Output
When theme changes, you should see:
```
Injecting theme: Dark
Removing existing theme styles: 1
CSS variables being injected: ...
Theme stylesheet added to head
Set body data-theme to: dark
--theme-background: #1a1a1a
--theme-text-primary: #ffffff
Body background: rgb(26, 26, 26) Body color: rgb(255, 255, 255)
Theme changed, re-rendering Mermaid diagrams
getMermaidTheme: data-theme attribute is: dark
Using Mermaid dark theme
```

## Related Files

- `src/Rendering/WebViewHost.cs` - CSS injection and data-theme normalization
- `src/Rendering/assets/scripts/render.js` - Mermaid theme detection and re-rendering
- `src/Rendering/assets/styles/base.css` - Theme variable application
- `src/Rendering/assets/styles/theme-variables.css` - Theme variable definitions
- `src/App/MainWindow.xaml.cs` - Theme change handler

## Additional Notes

### Mermaid Built-in Themes

Mermaid supports several built-in themes:
- `'default'` - Light theme (used for Light mode)
- `'dark'` - Dark theme (used for Dark mode)
- `'forest'`, `'neutral'`, `'base'` - Alternative themes (not currently used)

We use only `'default'` and `'dark'` to match our application's light/dark theme system.

### Theme Re-rendering Performance

When theme changes:
1. Existing Mermaid SVGs are cleared
2. Original source code (stored in `data-mermaid-source` attribute) is restored
3. Mermaid re-initializes with new theme
4. All diagrams re-render with new colors

This happens asynchronously and doesn't block the UI.

## Verification Checklist

- [x] Theme CSS variables are injected with `!important`
- [x] `data-theme` attribute is normalized to "light" or "dark"
- [x] `body` classes update correctly
- [x] `color-scheme` CSS property is set
- [x] Mermaid theme detection handles normalized values
- [x] Mermaid diagrams re-render on theme change
- [x] Debug logging helps diagnose theme issues
- [x] No navigation or content loss on theme change
- [x] Build succeeds without errors
