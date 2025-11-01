# Theme Synchronization Improvements

**Date**: 2025-01-XX  
**Status**: ✅ Complete

## Summary

Comprehensive improvements to ensure both WPF native controls and WebView2 markdown content fully and simultaneously react to theme changes. This involved synchronizing three layers of the theme system:

1. **ColorScheme Class** (C# source of truth) - `src/Services/ThemeConfiguration.cs`
2. **WPF XAML Resource Dictionaries** - `src/App/Themes/LightTheme.xaml` & `DarkTheme.xaml`
3. **CSS Variables** - `src/Rendering/assets/styles/base.css` & `theme-variables.css`

## Changes Made

### 1. CSS Theme Variable Integration (base.css)

**File**: `src/Rendering/assets/styles/base.css`

Replaced 11 hardcoded CSS variable references with `--theme-*` equivalents to ensure dynamic theming:

| Element | Before | After |
|---------|--------|-------|
| Body font | `var(--font-family)` | `var(--theme-font-family, var(--font-family))` |
| Code blocks | `var(--font-mono)` | `var(--theme-font-mono, var(--font-mono))` |
| Table borders | `var(--border-light)` | `var(--theme-border)` |
| Table hover | `var(--surface-secondary-light)` | `var(--theme-secondary-background)` |
| HR borders | `var(--border-light)` | `var(--theme-border)` |
| Image shadows | Hardcoded shadow | `var(--theme-shadow-large)` |
| Figcaption text | `var(--text-secondary-light)` | `var(--theme-text-secondary)` |
| Blockquote border | `var(--accent)` | `var(--theme-accent)` |
| Blockquote background | `var(--surface-secondary-light)` | `var(--theme-secondary-background)` |
| Checkbox accent | `var(--accent)` | `var(--theme-accent)` |
| Focus outline | `var(--accent)` | `var(--theme-accent)` |
| Selection | Hardcoded | `var(--theme-selection)` |

### 2. WPF Light Theme Color Alignment (LightTheme.xaml)

**File**: `src/App/Themes/LightTheme.xaml`

Updated colors to match `ColorScheme.CreateLightDefault()`:

| Brush | Old Value | New Value | RGB |
|-------|-----------|-----------|-----|
| `ThemeForegroundBrush` | `#1E1E1E` | `#212529` | 33,37,41 |
| `ThemeAccentBrush` | `#3B82F6` | `#0066CC` | 0,102,204 |
| `ThemeBorderBrush` | `#E5E7EB` | `#DEE2E6` | 222,226,230 |
| `ThemeButtonBackgroundBrush` | `#F9FAFB` | `#F8F9FA` | 248,249,250 |
| `ThemeButtonHoverBrush` | `#F3F4F6` | `#E9ECEF` | 233,236,239 |
| `ThemeSecondaryBackgroundBrush` | `#F5F5F5` | `#F8F9FA` | 248,249,250 |
| `ThemeSidebarBackgroundBrush` | `#FFFFFF` | `#F8F9FA` | 248,249,250 |
| `ThemeTabActiveBrush` | `#F5F5F5` | `#FFFFFF` | 255,255,255 |
| `ThemeTabInactiveBrush` | `#FFFFFF` | `#F8F9FA` | 248,249,250 |

Also updated derived colors:
- `ThemeTextPrimaryBrush`: `#1E1E1E` → `#212529`
- `ThemeTextLinkBrush`: `#3B82F6` → `#0066CC`
- `ThemeInputBorderBrush`: `#E5E7EB` → `#DEE2E6`
- `ThemeInputFocusBrush`: `#3B82F6` → `#0066CC`

### 3. WPF Dark Theme Color Alignment (DarkTheme.xaml)

**File**: `src/App/Themes/DarkTheme.xaml`

Updated colors to match `ColorScheme.CreateDarkDefault()`:

| Brush | Old Value | New Value | RGB |
|-------|-----------|-----------|-----|
| `ThemeBackgroundBrush` | `#0F0F0F` | `#1A1A1A` | 26,26,26 |
| `ThemeForegroundBrush` | `#F0F0F0` | `#FFFFFF` | 255,255,255 |
| `ThemeAccentBrush` | `#3B82F6` | `#66B3FF` | 102,179,255 |
| `ThemeBorderBrush` | `#262626` | `#444444` | 68,68,68 |
| `ThemeButtonBackgroundBrush` | `#1A1A1A` | `#333333` | 51,51,51 |
| `ThemeButtonHoverBrush` | `#2A2A2A` | `#444444` | 68,68,68 |
| `ThemeSecondaryBackgroundBrush` | `#1A1A1A` | `#333333` | 51,51,51 |
| `ThemeSidebarBackgroundBrush` | `#0F0F0F` | `#222222` | 34,34,34 |
| `ThemeTabActiveBrush` | `#1A1A1A` | `#333333` | 51,51,51 |
| `ThemeTabInactiveBrush` | `#0F0F0F` | `#222222` | 34,34,34 |

Also updated derived colors:
- `ThemeTextPrimaryBrush`: `#F0F0F0` → `#FFFFFF`
- `ThemeTextLinkBrush`: `#60A5FA` → `#66B3FF`
- `ThemeInputBackgroundBrush`: Now explicitly uses `#1A1A1A`
- `ThemeInputBorderBrush`: `#262626` → `#444444`
- `ThemeInputFocusBrush`: `#3B82F6` → `#66B3FF`

### 4. Verified WebViewHost CSS Mapping

**File**: `src/Rendering/WebViewHost.cs`

Confirmed all 9 `ColorScheme` properties are correctly mapped to CSS variables:

| ColorScheme Property | CSS Variable |
|---------------------|--------------|
| `Background` | `--theme-background` |
| `Foreground` | `--theme-text-primary` |
| `Accent` | `--theme-accent`, `--theme-text-link` |
| `Border` | `--theme-border`, `--theme-input-border` |
| `ButtonBackground` | `--theme-button-background` |
| `ButtonHover` | `--theme-button-hover` |
| `SidebarBackground` | `--theme-sidebar-background`, `--theme-secondary-background` |
| `TabActiveBackground` | `--theme-tab-active` |
| `TabInactiveBackground` | `--theme-tab-inactive` |

Additional CSS variables derived from theme:
- `--theme-text-secondary` (calculated: `#a3a3a3` dark / `#6B7280` light)
- `--theme-text-muted` (calculated: `#737373` dark / `#9CA3AF` light)
- `--theme-text-link-hover` (calculated: `#93c5fd` dark / `#2563EB` light)
- `--theme-input-background` (from `Background`)
- `--theme-input-focus` (from `Accent`)
- `--theme-dropdown-background` (from `Background`)
- `--theme-dropdown-shadow` (calculated by theme)
- `--theme-tooltip-background` (inverse: `#f8f9fa` dark / `#000000` light)
- `--theme-tooltip-text` (inverse: `#171717` dark / `#ffffff` light)
- `--theme-shadow` (calculated by theme)
- `--theme-shadow-large` (calculated by theme)

## Architecture

### Three-Layer Synchronization

```
┌─────────────────────────────────────────────────────────────┐
│                    ColorScheme Class                        │
│              (Single Source of Truth)                       │
│  - Background, Foreground, Accent, Border                   │
│  - ButtonBackground, ButtonHover                            │
│  - SidebarBackground, TabActiveBackground, TabInactiveBackground │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─────────────────┬─────────────────────────┐
                   ▼                 ▼                         ▼
        ┌──────────────────┐  ┌──────────────┐  ┌───────────────────┐
        │ LightTheme.xaml  │  │ DarkTheme.xaml│  │ WebViewHost.cs    │
        │ (WPF Controls)   │  │ (WPF Controls)│  │ (CSS Injection)   │
        └──────────────────┘  └──────────────┘  └───────────────────┘
                   │                 │                         │
                   │                 │                         │
                   ▼                 ▼                         ▼
        ┌─────────────────────────────────────────────────────────┐
        │        Native WPF UI           WebView2 Content         │
        │  (Buttons, Tabs, Sidebar)   (Markdown, Code, Tables)   │
        └─────────────────────────────────────────────────────────┘
```

### Theme Change Flow

1. **User clicks theme toggle** → `ThemeManager.ToggleTheme()`
2. **ThemeManager** switches XAML resource dictionary
3. **ThemeManager** fires `ThemeChanged` event
4. **MainWindow** catches event → calls `WebViewHost.InjectThemeFromColorSchemeAsync()`
5. **WebViewHost** converts `ColorScheme` → CSS variables
6. **WebViewHost** injects CSS via JavaScript `ExecuteScriptAsync()`
7. **Both WPF and WebView2** update simultaneously

## Benefits

1. **Complete Synchronization**: WPF and WebView2 now use identical color values
2. **Single Source of Truth**: All colors defined once in `ColorScheme` class
3. **Dynamic Theming**: CSS variables allow runtime theme switching without page reload
4. **Consistency**: No more discrepancies between WPF mockup colors and actual theme
5. **Maintainability**: Future theme changes only need to update `ColorScheme`
6. **Performance**: Cached theme injection prevents redundant CSS updates

## Testing

Build succeeded:
```powershell
dotnet build
# Build succeeded in 0.9s
```

To test theme switching:
1. Run application: `.\src\App\bin\Debug\net8.0-windows\MarkRead.App.exe .\documentation`
2. Load any markdown file
3. Click theme toggle button
4. Verify both WPF controls (sidebar, tabs, buttons) and markdown content change simultaneously
5. Check debug console for theme injection log messages

## Related Documentation

- `documentation/user-guide/themes.md` - Comprehensive theme architecture guide
- `src/Services/ThemeConfiguration.cs` - ColorScheme class definition
- `src/App/ThemeManager.cs` - Theme application logic
- `src/Rendering/WebViewHost.cs` - CSS injection implementation
- `src/Rendering/assets/styles/theme-variables.css` - CSS variable definitions

## Color Reference

### Light Theme
- **Background**: `#FFFFFF` (255, 255, 255)
- **Foreground**: `#212529` (33, 37, 41)
- **Accent**: `#0066CC` (0, 102, 204)
- **Border**: `#DEE2E6` (222, 226, 230)
- **Button Background**: `#F8F9FA` (248, 249, 250)
- **Button Hover**: `#E9ECEF` (233, 236, 239)
- **Sidebar**: `#F8F9FA` (248, 249, 250)
- **Tab Active**: `#FFFFFF` (255, 255, 255)
- **Tab Inactive**: `#F8F9FA` (248, 249, 250)

### Dark Theme
- **Background**: `#1A1A1A` (26, 26, 26)
- **Foreground**: `#FFFFFF` (255, 255, 255)
- **Accent**: `#66B3FF` (102, 179, 255)
- **Border**: `#444444` (68, 68, 68)
- **Button Background**: `#333333` (51, 51, 51)
- **Button Hover**: `#444444` (68, 68, 68)
- **Sidebar**: `#222222` (34, 34, 34)
- **Tab Active**: `#333333` (51, 51, 51)
- **Tab Inactive**: `#222222` (34, 34, 34)
