# Research: Zoom and Pan Controls

**Feature**: 004-zoom-pan  
**Date**: 2025-11-21  
**Phase**: 0 - Research

## Overview

This document captures research findings for implementing zoom and pan controls in the MarkRead markdown viewer. The feature extends the WebView2-based rendering system with zoom/pan capabilities.

## Research Tasks

### 1. Test Framework Selection

**Decision**: Use MSTest for new zoom/pan tests

**Rationale**: 
- Project currently uses both MSTest and xUnit (unit tests have both, integration tests use MSTest only)
- MSTest is more consistently used across the test suite
- MSTest integrates well with Visual Studio test explorer
- No specific advantages of xUnit for zoom/pan testing scenarios

**Alternatives Considered**:
- **xUnit**: Already partially used in unit tests, but MSTest is more prevalent
- **NUnit**: Not currently used in project, would add unnecessary dependency

**Implementation Notes**:
- Use `[TestClass]` and `[TestMethod]` attributes
- Use `Assert` class for assertions
- Follow existing test patterns in `tests/unit/` and `tests/integration/`

---

### 2. WebView2 Zoom Implementation Approaches

**Decision**: Use CSS transform-based zoom with JavaScript coordinate management

**Rationale**:
- Browser zoom (WebView2 ZoomFactor property) has limitations:
  - Reflows content, changes layout
  - Doesn't provide granular control over zoom center point
  - May interfere with responsive CSS
- CSS transform approach:
  - `transform: scale()` maintains layout, only scales visually
  - Allows precise control over transform-origin for zoom center
  - Can be animated smoothly
  - Preserves coordinate system for pan operations
- Coordinate transform math required but well-documented

**Alternatives Considered**:
- **WebView2.CoreWebView2.ZoomFactor**: Simpler API but less control over behavior
- **CSS zoom property**: Non-standard, inconsistent browser support
- **SVG viewport**: Overkill for HTML/markdown content

**Implementation Notes**:
- Apply `transform: scale(X)` to main content container
- Set `transform-origin` based on cursor position (mouse zoom) or center (keyboard zoom)
- Track zoom level separately from CSS (zoom percentage state)
- Update transform-origin before each scale change

**Reference Code Pattern**:
```javascript
function applyZoom(zoomPercent, originX, originY) {
    const scale = zoomPercent / 100;
    const container = document.getElementById('content');
    container.style.transformOrigin = `${originX}px ${originY}px`;
    container.style.transform = `scale(${scale})`;
}
```

---

### 3. Pan Implementation with CSS Transform

**Decision**: Track pan offset and combine with zoom transform using matrix

**Rationale**:
- Panning requires translating the viewport coordinates
- CSS `transform` combines scale and translate
- Matrix representation allows efficient updates: `matrix(scaleX, 0, 0, scaleY, translateX, translateY)`
- Mouse drag events provide delta for pan offset
- Boundary checking prevents panning beyond content edges

**Alternatives Considered**:
- **Separate transform properties**: `transform: scale() translate()` - order matters, can be tricky
- **Scroll container approach**: Doesn't work well with zoom, limited control
- **Canvas-based rendering**: Complete overkill for HTML content

**Implementation Notes**:
- Combine scale and translate: `transform: matrix(scale, 0, 0, scale, panX, panY)`
- Track pan offset in pixel coordinates
- Calculate content boundaries based on scaled dimensions
- Clamp pan offset to prevent over-panning
- Reset pan to (0, 0) when zoom returns to 100%

**Reference Code Pattern**:
```javascript
function applyZoomAndPan(zoomPercent, panX, panY) {
    const scale = zoomPercent / 100;
    const container = document.getElementById('content');
    // matrix(scaleX, skewY, skewX, scaleY, translateX, translateY)
    container.style.transform = `matrix(${scale}, 0, 0, ${scale}, ${panX}, ${panY})`;
}
```

---

### 4. WPF to WebView2 Event Bridge

**Decision**: Use WebView2.CoreWebView2.PostWebMessageAsJson for C# to JavaScript communication

**Rationale**:
- WPF captures mouse/keyboard events before WebView2
- Need to intercept CTRL+scroll, CTRL+/-, CTRL+0 at WPF level
- PostWebMessageAsJson sends commands to JavaScript layer
- JavaScript handles DOM manipulation and coordinate transforms
- JavaScript can send state back via window.chrome.webview.postMessage

**Alternatives Considered**:
- **JavaScript-only implementation**: Can't reliably capture CTRL+scroll in WebView2
- **ExecuteScriptAsync for each operation**: Less efficient than message passing
- **Custom JavaScript interop with synchronous calls**: Not supported in WebView2

**Implementation Notes**:
- WPF PreviewMouseWheel + ModifierKeys check for CTRL+scroll
- WPF KeyDown handlers for CTRL+/-, CTRL+0
- JSON message format: `{ "action": "zoom", "delta": 10, "cursorX": 100, "cursorY": 50 }`
- JavaScript message handler dispatches to zoom/pan functions
- Return updated zoom/pan state to C# for TabViewModel

**Reference Code Pattern** (C#):
```csharp
private async void OnMouseWheel(object sender, MouseWheelEventArgs e)
{
    if (Keyboard.Modifiers == ModifierKeys.Control)
    {
        var position = e.GetPosition(webView);
        var message = new { 
            action = "zoom", 
            delta = e.Delta > 0 ? 10 : -10,
            cursorX = position.X,
            cursorY = position.Y
        };
        await webView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(message));
        e.Handled = true;
    }
}
```

---

### 5. Per-Tab State Management

**Decision**: Store zoom/pan state in TabViewModel properties

**Rationale**:
- Each tab already has a ViewModel instance
- Natural place for tab-specific UI state
- Easy to bind to WPF properties
- Can be passed to JavaScript when tab becomes active
- Session-only (no persistence required per spec)

**Alternatives Considered**:
- **Separate ZoomPanStateManager**: Adds complexity, ViewModel already owns tab state
- **Store in JavaScript only**: Lost when navigating or reloading content
- **Global state**: Doesn't support per-tab requirements

**Implementation Notes**:
- Add properties to TabViewModel:
  - `double ZoomPercent { get; set; }` (default from settings)
  - `Point PanOffset { get; set; }` (default (0, 0))
- Restore state when tab activated
- Send restore command to JavaScript: `{ "action": "restore", "zoom": 150, "panX": 100, "panY": 50 }`

---

### 6. Settings Storage for Default Zoom

**Decision**: Add DefaultZoom property to existing SettingsService

**Rationale**:
- SettingsService already handles application settings persistence
- Simple double/decimal property for percentage value
- Already uses JSON/XML serialization
- No need for separate settings file

**Alternatives Considered**:
- **Separate zoom settings file**: Unnecessary complexity
- **Registry storage**: Less portable, harder to debug
- **No persistence**: Spec requires configurable default

**Implementation Notes**:
- Add property: `public double DefaultZoomPercent { get; set; } = 100.0;`
- Validate range on load: clamp to [10, 1000]
- Use in TabViewModel initialization
- Expose in Settings UI

---

### 7. Menu Integration

**Decision**: Add zoom commands to existing Edit menu in MainWindow.xaml

**Rationale**:
- Edit menu already exists and contains related commands
- Standard location for zoom controls (common in editors)
- Can use WPF Command pattern for keyboard shortcuts
- Menu items show keyboard shortcuts automatically

**Alternatives Considered**:
- **View menu**: Common alternative, but Edit menu already present
- **Toolbar buttons**: Could add later, menu is more discoverable
- **Context menu**: Less discoverable for zoom controls

**Implementation Notes**:
- Add menu items: "Zoom In" (CTRL++), "Zoom Out" (CTRL+-), "Reset Zoom" (CTRL+0)
- Use `<MenuItem Command="{Binding ZoomInCommand}" InputGestureText="Ctrl++" />`
- Implement ICommand in MainWindow or use RelayCommand
- Commands delegate to active tab's ViewModel

---

### 8. Coordinate Transform Mathematics

**Decision**: Use standard 2D affine transform math for zoom center calculations

**Rationale**:
- Need to calculate new transform-origin when zooming
- Keep cursor position fixed: requires translating from viewport to scaled coordinates
- Well-established mathematical formulas
- Can be unit tested with known inputs/outputs

**Formula for Zoom Center**:
When zooming from scale S1 to S2 around point (cx, cy):
1. Current scaled position: `(sx, sy) = (x * S1, y * S1)`
2. New scaled position: `(sx', sy') = (x * S2, y * S2)`
3. Transform origin: Set to cursor position in unscaled coordinates
4. Alternative: Adjust pan offset to keep point fixed

**Implementation Notes**:
- Document formulas inline in code
- Create unit tests with concrete examples
- Handle edge cases: zoom at viewport edges, maximum zoom

---

## Best Practices Summary

### WebView2 with WPF
1. Use PreviewMouseWheel for reliable CTRL+scroll capture
2. Set `e.Handled = true` to prevent event bubbling
3. Use async/await for PostWebMessageAsJson calls
4. Initialize WebView2 before sending messages (check CoreWebView2 != null)

### CSS Transforms for Zoom/Pan
1. Use `transform: matrix()` for combined operations
2. Set `transform-origin` explicitly
3. Use `will-change: transform` for performance hint
4. Apply transforms to container, not individual elements

### Performance Considerations
1. Debounce rapid zoom events (mouse wheel can fire rapidly)
2. Use requestAnimationFrame for smooth pan updates during drag
3. Profile with large documents (10MB+ markdown files)
4. Monitor memory with multiple tabs at high zoom

### Testing Strategy
1. Unit test coordinate transform calculations
2. Unit test zoom/pan state management (boundary checks)
3. Integration test keyboard shortcuts and menu commands
4. Manual test with various document sizes and zoom levels

---

## Open Questions

None - all NEEDS CLARIFICATION items resolved.

---

## References

- [CSS Transform MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/transform)
- [WebView2 PostWebMessageAsJson](https://learn.microsoft.com/en-us/dotnet/api/microsoft.web.webview2.core.corewebview2.postwebmessageasjson)
- [WPF PreviewMouseWheel Event](https://learn.microsoft.com/en-us/dotnet/api/system.windows.uielement.previewmousewheel)
- [2D Transform Matrix Mathematics](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix)
