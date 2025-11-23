# Data Model: Zoom and Pan Controls

**Feature**: 004-zoom-pan  
**Date**: 2025-11-21  
**Phase**: 1 - Design

## Overview

This document defines the data structures and entities required for implementing zoom and pan controls in MarkRead. The model supports per-tab zoom/pan state with application-level default settings.

## Entities

### 1. ZoomPanState

Represents the zoom and pan state for a single tab.

**Location**: `TabItem` properties (WPF) in `src/UI/Tabs/TabItem.cs`

**Properties**:

| Property | Type | Default | Constraints | Description |
|----------|------|---------|-------------|-------------|
| `ZoomPercent` | `double` | 100.0 | [10.0, 1000.0] | Current zoom level as percentage |
| `PanOffsetX` | `double` | 0.0 | Calculated bounds | Horizontal pan offset in pixels |
| `PanOffsetY` | `double` | 0.0 | Calculated bounds | Vertical pan offset in pixels |

**Validation Rules**:
- `ZoomPercent` must be clamped to [10.0, 1000.0] range
- `ZoomPercent` increments/decrements in 10% steps
- `PanOffsetX` and `PanOffsetY` must respect document boundaries (calculated based on scaled content size and viewport size)
- When `ZoomPercent == 100.0`, pan offsets should reset to (0.0, 0.0)

**State Transitions**:
```
Initial State: (100.0, 0.0, 0.0)
  ↓ Zoom In (+10%)
(110.0, 0.0, 0.0)
  ↓ Pan Right (+50px)
(110.0, 50.0, 0.0)
  ↓ Reset Zoom (Ctrl+0)
(100.0, 0.0, 0.0)  [pan reset automatically]
```

**Lifetime**: Session-only (not persisted to disk)

**Related Entities**: 
- `TabItem` (owner)
- `AppSettings.DefaultZoomPercent` (initialization source)

---

### 2. AppSettings (Extended)

Extended application settings to include default zoom preference.

**Location**: `Services/SettingsService.cs`

**New Properties**:

| Property | Type | Default | Constraints | Description |
|----------|------|---------|-------------|-------------|
| `DefaultZoomPercent` | `double` | 100.0 | [10.0, 1000.0] | Default zoom level for new tabs |

**Validation Rules**:
- Value must be clamped to [10.0, 1000.0] range on load
- Invalid or missing value falls back to 100.0
- Value is serialized to application settings file (JSON/XML)

**Lifetime**: Persisted across application sessions

**Related Entities**:
- `TabItem.ZoomPercent` (initialized from this value)

---

### 3. ZoomCommand

Represents a zoom operation command passed from WPF to JavaScript.

**Location**: WPF event handlers → WebView2 message

**Properties**:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `action` | `string` | Yes | Command type: "zoom", "pan", "restore", "reset" |
| `delta` | `int?` | Conditional | Zoom change in percentage points (e.g., +10, -10) |
| `cursorX` | `double?` | Conditional | Cursor X position for zoom center (viewport coordinates) |
| `cursorY` | `double?` | Conditional | Cursor Y position for zoom center (viewport coordinates) |
| `zoom` | `double?` | Conditional | Absolute zoom level for restore command |
| `panX` | `double?` | Conditional | Pan X offset for restore/pan commands |
| `panY` | `double?` | Conditional | Pan Y offset for restore/pan commands |

**Command Types**:

1. **Zoom Command** (CTRL+scroll, CTRL+/-, CTRL+-)
   ```json
   {
     "action": "zoom",
     "delta": 10,
     "cursorX": 150.0,
     "cursorY": 200.0
   }
   ```

2. **Reset Command** (CTRL+0)
   ```json
   {
     "action": "reset"
   }
   ```

3. **Restore Command** (tab activation)
   ```json
   {
     "action": "restore",
     "zoom": 150.0,
     "panX": 50.0,
     "panY": 30.0
   }
   ```

4. **Pan Command** (middle mouse drag)
   ```json
   {
     "action": "pan",
     "panX": 50.0,
     "panY": 30.0
   }
   ```

**Validation Rules**:
- `action` must be one of: "zoom", "pan", "restore", "reset"
- `delta` required only for "zoom" action
- `cursorX`, `cursorY` required for "zoom" action
- `zoom`, `panX`, `panY` required for "restore" action
- `panX`, `panY` required for "pan" action

**Serialization**: JSON via `System.Text.Json.JsonSerializer.Serialize`

---

### 4. ZoomPanResponse

Represents the current zoom/pan state sent from JavaScript back to WPF.

**Location**: JavaScript → WPF via `window.chrome.webview.postMessage`

**Properties**:

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | Message type: "zoomPanState" |
| `zoom` | `double` | Current zoom percentage |
| `panX` | `double` | Current pan X offset |
| `panY` | `double` | Current pan Y offset |

**Example**:
```json
{
  "type": "zoomPanState",
  "zoom": 150.0,
  "panX": 50.0,
  "panY": 30.0
}
```

**Usage**: Update `TabItem` properties after zoom/pan operations complete in JavaScript

---

## Data Flow Diagrams

### Zoom Operation Flow

```
User Action (CTRL+Scroll)
    ↓
WPF PreviewMouseWheel Event Handler
    ↓
Calculate delta (+10% or -10%)
Get mouse position (viewport coordinates)
    ↓
Create ZoomCommand JSON
    ↓
WebView2.PostWebMessageAsJson()
    ↓
JavaScript message handler
    ↓
Calculate new zoom level (clamp to [10, 1000])
Calculate transform-origin from cursor position
Apply CSS transform: scale()
    ↓
Send ZoomPanResponse back to WPF
    ↓
Update TabItem.ZoomPercent
```

### Pan Operation Flow

```
User Action (Middle Mouse Drag)
    ↓
WPF MouseMove Event Handler
    ↓
Calculate delta from previous position
    ↓
Create ZoomCommand JSON with new pan offset
    ↓
WebView2.PostWebMessageAsJson()
    ↓
JavaScript message handler
    ↓
Calculate pan boundaries (based on scaled content size)
Clamp pan offset to boundaries
Apply CSS transform: matrix(scale, 0, 0, scale, panX, panY)
    ↓
Send ZoomPanResponse back to WPF
    ↓
Update TabItem.PanOffsetX, PanOffsetY
```

### Tab Switch Flow

```
User Action (Switch Tab)
    ↓
TabItem.OnActivated() or Tab Selection Changed
    ↓
Read ZoomPercent, PanOffsetX, PanOffsetY from TabItem
    ↓
Create ZoomCommand JSON with action="restore"
    ↓
WebView2.PostWebMessageAsJson()
    ↓
JavaScript message handler
    ↓
Apply CSS transform with saved zoom/pan state
    ↓
(No response needed - restoring saved state)
```

### New Tab Flow

```
User Action (Open New Tab)
    ↓
Create new TabItem instance
    ↓
Read AppSettings.DefaultZoomPercent
    ↓
Initialize TabItem.ZoomPercent = DefaultZoomPercent
Initialize TabItem.PanOffsetX = 0.0
Initialize TabItem.PanOffsetY = 0.0
    ↓
(Zoom/pan applied when tab activated via Tab Switch Flow)
```

---

## Coordinate Systems

### Viewport Coordinates
- Origin: Top-left corner of visible WebView2 control
- Units: Pixels
- Range: [0, ViewportWidth] x [0, ViewportHeight]
- Used for: Mouse cursor position, pan offsets

### Document Coordinates
- Origin: Top-left corner of markdown content
- Units: Pixels (at 100% zoom)
- Range: [0, ContentWidth] x [0, ContentHeight]
- Used for: Content positioning, transform-origin

### Scaled Coordinates
- Document coordinates multiplied by zoom scale factor
- Used for: Boundary calculations
- Example: At 150% zoom, a 1000px wide document becomes 1500px in scaled coordinates

---

## Boundary Calculations

### Pan Boundaries

When panning, the offset must be constrained to keep content visible:

```
scaledWidth = contentWidth * (zoomPercent / 100)
scaledHeight = contentHeight * (zoomPercent / 100)

maxPanX = max(0, scaledWidth - viewportWidth)
maxPanY = max(0, scaledHeight - viewportHeight)

panX = clamp(panX, 0, maxPanX)
panY = clamp(panY, 0, maxPanY)
```

**Special Cases**:
- If `scaledWidth <= viewportWidth`: panning disabled on X axis (maxPanX = 0)
- If `scaledHeight <= viewportHeight`: panning disabled on Y axis (maxPanY = 0)
- At 100% zoom: typically no panning needed (content fits in viewport)

---

## Relationships

```
AppSettings
    └── DefaultZoomPercent (1:1)
            ↓ initializes
TabItem (1:N)
    ├── ZoomPercent
    ├── PanOffsetX
    └── PanOffsetY
            ↓ sends commands
ZoomCommand (ephemeral)
            ↓ triggers
JavaScript Zoom/Pan Controller
            ↓ sends responses
ZoomPanResponse (ephemeral)
            ↓ updates
TabItem (closes loop)
```

---

## Implementation Notes

### C# Side (WPF)

1. **TabItem.cs** (`src/UI/Tabs/TabItem.cs`):
   ```csharp
   public class TabItem : INotifyPropertyChanged
   {
       private double _zoomPercent = 100.0;
       private double _panOffsetX = 0.0;
       private double _panOffsetY = 0.0;

       public double ZoomPercent
       {
           get => _zoomPercent;
           set
           {
               _zoomPercent = Math.Clamp(value, 10.0, 1000.0);
               OnPropertyChanged();
           }
       }

       public double PanOffsetX
       {
           get => _panOffsetX;
           set
           {
               _panOffsetX = value;
               OnPropertyChanged();
           }
       }

       public double PanOffsetY
       {
           get => _panOffsetY;
           set
           {
               _panOffsetY = value;
               OnPropertyChanged();
           }
       }

       public void ResetZoomPan()
       {
           ZoomPercent = 100.0;
           PanOffsetX = 0.0;
           PanOffsetY = 0.0;
       }
   }
   ```

2. **SettingsService.cs** (`src/Services/SettingsService.cs`):
   ```csharp
   public class AppSettings
   {
       public double DefaultZoomPercent { get; set; } = 100.0;

       public void Validate()
       {
           DefaultZoomPercent = Math.Clamp(DefaultZoomPercent, 10.0, 1000.0);
       }
   }
   ```

### JavaScript Side

```javascript
class ZoomPanController {
    constructor() {
        this.zoomPercent = 100.0;
        this.panX = 0.0;
        this.panY = 0.0;
        this.contentElement = document.getElementById('content');
        
        window.chrome.webview.addEventListener('message', this.handleMessage.bind(this));
    }

    handleMessage(event) {
        const command = event.data;
        switch (command.action) {
            case 'zoom':
                this.zoom(command.delta, command.cursorX, command.cursorY);
                break;
            case 'reset':
                this.reset();
                break;
            case 'restore':
                this.restore(command.zoom, command.panX, command.panY);
                break;
            case 'pan':
                this.pan(command.panX, command.panY);
                break;
        }
    }

    applyTransform() {
        const scale = this.zoomPercent / 100.0;
        this.contentElement.style.transform = 
            `matrix(${scale}, 0, 0, ${scale}, ${this.panX}, ${this.panY})`;
        
        this.sendStateUpdate();
    }

    sendStateUpdate() {
        window.chrome.webview.postMessage({
            type: 'zoomPanState',
            zoom: this.zoomPercent,
            panX: this.panX,
            panY: this.panY
        });
    }
}
```

---

## Testing Considerations

### Unit Tests

1. **ZoomPercent Validation**:
   - Set value below 10.0 → clamped to 10.0
   - Set value above 1000.0 → clamped to 1000.0
   - Set valid value → stored correctly

2. **Boundary Calculations**:
   - Calculate maxPanX/Y with various zoom levels
   - Verify pan disabled when content fits viewport
   - Verify pan boundaries at maximum zoom

3. **State Transitions**:
   - Reset zoom → pan offsets reset to 0
   - New tab → initialized with default zoom

### Integration Tests

2. **Command Flow**:
   - Send zoom command → verify JavaScript receives correct values
   - JavaScript sends response → verify TabItem updated

3. **Tab Switching**:
   - Set zoom in Tab A → switch to Tab B → switch back → verify Tab A zoom preserved

---

## Future Considerations

- **Persistence**: Could extend to save/restore zoom/pan per file path (future enhancement)
- **Animation**: Could add smooth zoom transitions using CSS transitions
- **Touchpad Gestures**: Existing pinch zoom integration (already specified in FR-012)
- **Accessibility**: Ensure zoom state announced to screen readers

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-21 | Initial data model definition |
