# Theme Testing Checklist

## Quick Test

Run this command to build and launch the app:
```powershell
Get-Process -Name "MarkRead.App" -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Sleep -Seconds 1; dotnet build; if ($LASTEXITCODE -eq 0) { .\src\App\bin\Debug\net8.0-windows\MarkRead.App.exe .\documentation }
```

## Test Scenarios

### 1. Theme Switching - Basic
- [ ] Open any markdown file
- [ ] Click theme toggle button (Light ↔ Dark)
- [ ] **Verify**: Text color changes immediately
- [ ] **Verify**: Background color changes immediately
- [ ] **Verify**: No white flash or navigation
- [ ] **Verify**: Current markdown content stays visible

### 2. Mermaid Diagrams - Dark Theme
- [ ] Open `documentation/user-guide/themes.md` (has Mermaid diagrams)
- [ ] Switch to Dark theme
- [ ] **Verify**: Mermaid diagrams use dark colors
- [ ] **Verify**: Diagram text is light colored (visible on dark background)
- [ ] **Verify**: Diagram backgrounds are dark

### 3. Mermaid Diagrams - Light Theme
- [ ] Keep same file open
- [ ] Switch to Light theme
- [ ] **Verify**: Mermaid diagrams re-render with light colors
- [ ] **Verify**: Diagram text is dark colored
- [ ] **Verify**: Diagram backgrounds are light

### 4. Code Blocks
- [ ] Open any file with code blocks
- [ ] Toggle theme
- [ ] **Verify**: Code syntax highlighting updates
- [ ] **Verify**: Code block background matches theme
- [ ] **Verify**: Code text remains readable

### 5. Tables
- [ ] Open a file with tables
- [ ] Toggle theme
- [ ] **Verify**: Table borders match theme
- [ ] **Verify**: Table header background updates
- [ ] **Verify**: Table row hover effect works

### 6. Navigation Persistence
- [ ] Scroll halfway down a long document
- [ ] Toggle theme
- [ ] **Verify**: Scroll position maintained
- [ ] **Verify**: No jump to top or navigation

### 7. Multiple Tabs
- [ ] Open 3 different markdown files in tabs
- [ ] Toggle theme
- [ ] **Verify**: All visible content updates
- [ ] Switch between tabs
- [ ] **Verify**: Each tab displays in correct theme

## Debug Console Checks

Open browser DevTools in WebView2 (if possible) or check VS Output window for these messages:

### On Theme Change
```
Injecting theme: Dark
Removing existing theme styles: 1
CSS variables being injected: ...
Theme stylesheet added to head
Set body data-theme to: dark
--theme-background: #1a1a1a
--theme-text-primary: #ffffff
Body background: rgb(26, 26, 26) Body color: rgb(255, 255, 255)
```

### On Mermaid Re-render
```
Theme changed, re-rendering Mermaid diagrams
getMermaidTheme: data-theme attribute is: dark
Using Mermaid dark theme
```

## Known Good Values

### Light Theme
- Background: `#FFFFFF` / `rgb(255, 255, 255)`
- Text: `#212529` / `rgb(33, 37, 41)`
- Accent: `#0066CC` / `rgb(0, 102, 204)`
- data-theme: `"light"`
- Mermaid theme: `"default"`

### Dark Theme
- Background: `#1A1A1A` / `rgb(26, 26, 26)`
- Text: `#FFFFFF` / `rgb(255, 255, 255)`
- Accent: `#66B3FF` / `rgb(102, 179, 255)`
- data-theme: `"dark"`
- Mermaid theme: `"dark"`

## Troubleshooting

### Theme not changing
1. Check: Is CSS being injected? (Look for console.log messages)
2. Check: Is `data-theme` attribute set? (Should be "light" or "dark")
3. Check: Are `--theme-*` variables defined? (Inspect :root in DevTools)
4. Check: Is WebView2 initialized? (No errors about CoreWebView2 being null)

### Mermaid still light in dark mode
1. Check: `data-theme` attribute value (should be "dark", not "Dark")
2. Check: Console logs show "Using Mermaid dark theme"
3. Check: Mermaid re-render is triggered after theme change
4. Check: `themeChanged` CustomEvent is dispatched

### White flash on theme change
1. This should NOT happen anymore
2. If it does: Check that `LoadDocumentInTabAsync()` is NOT called in `OnThemeChanged()`
3. Theme should only update CSS, never reload the page

## Files Modified (for reference)

1. `src/Rendering/WebViewHost.cs` - CSS injection, data-theme normalization
2. `src/Rendering/assets/scripts/render.js` - Mermaid theme detection
3. `src/Rendering/assets/styles/base.css` - Theme variable usage (previous fix)
4. `src/App/Themes/LightTheme.xaml` - Color alignment (previous fix)
5. `src/App/Themes/DarkTheme.xaml` - Color alignment (previous fix)
