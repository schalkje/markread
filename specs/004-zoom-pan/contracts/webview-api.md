# API Contracts: Zoom and Pan Controls

**Feature**: 004-zoom-pan  
**Date**: 2025-11-21  
**Phase**: 1 - Design

## Overview

This document defines the API contracts for communication between WPF and WebView2 JavaScript for zoom and pan operations. The contract uses JSON messages passed via WebView2's PostWebMessageAsJson/postMessage APIs.

## Communication Architecture

```
┌─────────────────────┐
│   WPF (C#)         │
│  ┌───────────────┐  │
│  │ TabViewModel  │  │
│  └───────┬───────┘  │
│          │          │
│  ┌───────▼───────┐  │
│  │  WebView2     │  │
│  │  Control      │  │
│  └───────┬───────┘  │
└──────────┼──────────┘
           │
    PostWebMessageAsJson (C# → JS)
           │
┌──────────▼──────────┐
│   JavaScript       │
│  ┌───────────────┐  │
│  │ ZoomPan       │  │
│  │ Controller    │  │
│  └───────┬───────┘  │
│          │          │
│    postMessage (JS → C#)
│          │          │
└──────────┼──────────┘
           │
    Update TabViewModel
```

## Contract Schemas

### 1. WPF → JavaScript Commands

All commands sent from WPF to JavaScript follow this structure:

**Base Message Format**:
```json
{
  "action": "string",
  ...additional properties
}
```

---

#### 1.1 Zoom Command

**Triggered by**: CTRL+scroll, CTRL++, CTRL+-, Edit menu zoom commands

**Schema**:
```json
{
  "action": "zoom",
  "delta": number,
  "cursorX": number,
  "cursorY": number
}
```

**Properties**:
| Property | Type | Required | Constraints | Description |
|----------|------|----------|-------------|-------------|
| `action` | `string` | Yes | Must be "zoom" | Command identifier |
| `delta` | `number` | Yes | Multiple of 10, range [-990, 990] | Zoom change in percentage points |
| `cursorX` | `number` | Yes | >= 0 | X coordinate of cursor/viewport center (pixels) |
| `cursorY` | `number` | Yes | >= 0 | Y coordinate of cursor/viewport center (pixels) |

**Examples**:

Zoom in with CTRL+scroll at cursor position (150, 200):
```json
{
  "action": "zoom",
  "delta": 10,
  "cursorX": 150,
  "cursorY": 200
}
```

Zoom out with CTRL+- at viewport center (400, 300):
```json
{
  "action": "zoom",
  "delta": -10,
  "cursorX": 400,
  "cursorY": 300
}
```

**Expected JavaScript Behavior**:
1. Calculate new zoom level: `newZoom = currentZoom + delta`
2. Clamp to [10, 1000]: `newZoom = Math.max(10, Math.min(1000, newZoom))`
3. Calculate transform-origin from (cursorX, cursorY)
4. Apply CSS transform: `scale(newZoom / 100)`
5. Send ZoomPanResponse back to WPF

**Edge Cases**:
- If `currentZoom + delta < 10`: Clamp to 10, no visual change if already at minimum
- If `currentZoom + delta > 1000`: Clamp to 1000, no visual change if already at maximum

---

#### 1.2 Reset Command

**Triggered by**: CTRL+0, Edit menu "Reset Zoom"

**Schema**:
```json
{
  "action": "reset"
}
```

**Properties**:
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `action` | `string` | Yes | Must be "reset" |

**Example**:
```json
{
  "action": "reset"
}
```

**Expected JavaScript Behavior**:
1. Set zoom to 100%
2. Set pan offsets to (0, 0)
3. Apply CSS transform: `scale(1)` with no translation
4. Send ZoomPanResponse back to WPF

---

#### 1.3 Restore Command

**Triggered by**: Tab activation (switching to a tab with saved zoom/pan state)

**Schema**:
```json
{
  "action": "restore",
  "zoom": number,
  "panX": number,
  "panY": number
}
```

**Properties**:
| Property | Type | Required | Constraints | Description |
|----------|------|----------|-------------|-------------|
| `action` | `string` | Yes | Must be "restore" | Command identifier |
| `zoom` | `number` | Yes | [10, 1000] | Target zoom level (percentage) |
| `panX` | `number` | Yes | Any number | Horizontal pan offset (pixels) |
| `panY` | `number` | Yes | Any number | Vertical pan offset (pixels) |

**Example**:
```json
{
  "action": "restore",
  "zoom": 150,
  "panX": 50,
  "panY": 30
}
```

**Expected JavaScript Behavior**:
1. Set zoom to provided value
2. Set pan offsets to provided values
3. Recalculate pan boundaries based on zoom
4. Clamp pan offsets to boundaries
5. Apply CSS transform: `matrix(scale, 0, 0, scale, panX, panY)`
6. No response needed (restoring saved state)

---

#### 1.4 Pan Command

**Triggered by**: Middle mouse button drag

**Schema**:
```json
{
  "action": "pan",
  "deltaX": number,
  "deltaY": number
}
```

**Properties**:
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `action` | `string` | Yes | Must be "pan" |
| `deltaX` | `number` | Yes | Horizontal pan delta (pixels) |
| `deltaY` | `number` | Yes | Vertical pan delta (pixels) |

**Example**:
```json
{
  "action": "pan",
  "deltaX": 20,
  "deltaY": -15
}
```

**Expected JavaScript Behavior**:
1. Update pan offsets: `panX += deltaX`, `panY += deltaY`
2. Calculate pan boundaries based on current zoom and content size
3. Clamp pan offsets to boundaries
4. Apply CSS transform: `matrix(scale, 0, 0, scale, panX, panY)`
5. Send ZoomPanResponse back to WPF

**Note**: If zoom is 100% and content fits viewport, pan command should be no-op.

---

### 2. JavaScript → WPF Responses

#### 2.1 ZoomPanResponse

**Triggered by**: After zoom, reset, or pan operations complete

**Schema**:
```json
{
  "type": "zoomPanState",
  "zoom": number,
  "panX": number,
  "panY": number
}
```

**Properties**:
| Property | Type | Required | Constraints | Description |
|----------|------|----------|-------------|-------------|
| `type` | `string` | Yes | Must be "zoomPanState" | Message type identifier |
| `zoom` | `number` | Yes | [10, 1000] | Current zoom level (percentage) |
| `panX` | `number` | Yes | Within calculated bounds | Current horizontal pan offset (pixels) |
| `panY` | `number` | Yes | Within calculated bounds | Current vertical pan offset (pixels) |

**Example**:
```json
{
  "type": "zoomPanState",
  "zoom": 150,
  "panX": 50,
  "panY": 30
}
```

**Expected C# Behavior**:
1. Parse JSON message
2. Validate message type is "zoomPanState"
3. Update TabViewModel properties:
   ```csharp
   viewModel.ZoomPercent = message.zoom;
   viewModel.PanOffsetX = message.panX;
   viewModel.PanOffsetY = message.panY;
   ```
4. Properties trigger INotifyPropertyChanged (if needed for UI binding)

---

## Sequence Diagrams

### Zoom In Sequence

```
User              WPF                      WebView2 JS           TabViewModel
  │                │                            │                    │
  │─CTRL+Scroll───>│                            │                    │
  │                │                            │                    │
  │                │─PostWebMessageAsJson──────>│                    │
  │                │  { action: "zoom",         │                    │
  │                │    delta: 10,              │                    │
  │                │    cursorX: 150,           │                    │
  │                │    cursorY: 200 }          │                    │
  │                │                            │                    │
  │                │                         [Calculate]             │
  │                │                         [Apply CSS]             │
  │                │                            │                    │
  │                │<──postMessage──────────────│                    │
  │                │  { type: "zoomPanState",   │                    │
  │                │    zoom: 110,              │                    │
  │                │    panX: 0,                │                    │
  │                │    panY: 0 }               │                    │
  │                │                            │                    │
  │                │─Update Properties─────────────────────────────>│
  │                │                            │                    │
  │<─UI Updated────│                            │                    │
```

### Pan Sequence

```
User              WPF                      WebView2 JS           TabViewModel
  │                │                            │                    │
  │─Middle Drag───>│                            │                    │
  │                │                            │                    │
  │                │─PostWebMessageAsJson──────>│                    │
  │                │  { action: "pan",          │                    │
  │                │    deltaX: 20,             │                    │
  │                │    deltaY: -15 }           │                    │
  │                │                            │                    │
  │                │                         [Calculate]             │
  │                │                         [Apply CSS]             │
  │                │                            │                    │
  │                │<──postMessage──────────────│                    │
  │                │  { type: "zoomPanState",   │                    │
  │                │    zoom: 150,              │                    │
  │                │    panX: 70,               │                    │
  │                │    panY: 15 }              │                    │
  │                │                            │                    │
  │                │─Update Properties─────────────────────────────>│
  │                │                            │                    │
  │<─UI Updated────│                            │                    │
```

### Tab Switch Sequence

```
User              WPF                      WebView2 JS           TabViewModel
  │                │                            │                    │
  │─Switch Tab────>│                            │                    │
  │                │                            │                    │
  │                │<──Read State───────────────────────────────────│
  │                │   (zoom: 150, panX: 50, panY: 30)              │
  │                │                            │                    │
  │                │─PostWebMessageAsJson──────>│                    │
  │                │  { action: "restore",      │                    │
  │                │    zoom: 150,              │                    │
  │                │    panX: 50,               │                    │
  │                │    panY: 30 }              │                    │
  │                │                            │                    │
  │                │                         [Apply CSS]             │
  │                │                            │                    │
  │<─UI Updated────│                            │                    │
  │   (no response needed)                      │                    │
```

---

## Error Handling

### WPF Side

**Invalid Command Serialization**:
- Catch `JsonException` during serialization
- Log error and skip command
- Display user-friendly error message (optional)

**WebView2 Not Ready**:
- Check `webView.CoreWebView2 != null` before sending messages
- Queue commands if WebView2 is initializing
- Process queue after `CoreWebView2InitializationCompleted` event

**Code Example**:
```csharp
private async Task SendZoomCommandAsync(int delta, double cursorX, double cursorY)
{
    if (webView?.CoreWebView2 == null)
    {
        // Queue or log error
        return;
    }

    try
    {
        var command = new { action = "zoom", delta, cursorX, cursorY };
        var json = JsonSerializer.Serialize(command);
        await webView.CoreWebView2.PostWebMessageAsJson(json);
    }
    catch (JsonException ex)
    {
        // Log error
        Console.WriteLine($"Failed to serialize zoom command: {ex.Message}");
    }
}
```

### JavaScript Side

**Invalid Message Format**:
- Check `event.data` is valid object
- Validate required properties exist
- Ignore messages with unknown `action` values
- Log errors to console (for debugging)

**Code Example**:
```javascript
handleMessage(event) {
    if (!event.data || typeof event.data !== 'object') {
        console.error('Invalid message format:', event.data);
        return;
    }

    const command = event.data;
    if (!command.action) {
        console.error('Missing action property:', command);
        return;
    }

    switch (command.action) {
        case 'zoom':
            if (typeof command.delta !== 'number' || 
                typeof command.cursorX !== 'number' || 
                typeof command.cursorY !== 'number') {
                console.error('Invalid zoom command properties:', command);
                return;
            }
            this.zoom(command.delta, command.cursorX, command.cursorY);
            break;
        // ... other cases
        default:
            console.warn('Unknown action:', command.action);
    }
}
```

**Boundary Calculation Errors**:
- Ensure content element exists before calculating dimensions
- Handle divide-by-zero scenarios (empty content)
- Fallback to no-op if calculations fail

---

## Testing Contracts

### Unit Tests (C#)

**Command Serialization**:
```csharp
[TestMethod]
public void ZoomCommand_SerializesToValidJson()
{
    var command = new { action = "zoom", delta = 10, cursorX = 150.0, cursorY = 200.0 };
    var json = JsonSerializer.Serialize(command);
    
    Assert.IsTrue(json.Contains("\"action\":\"zoom\""));
    Assert.IsTrue(json.Contains("\"delta\":10"));
}
```

**Response Deserialization**:
```csharp
[TestMethod]
public void ZoomPanResponse_DeserializesCorrectly()
{
    var json = "{\"type\":\"zoomPanState\",\"zoom\":150.0,\"panX\":50.0,\"panY\":30.0}";
    var response = JsonSerializer.Deserialize<ZoomPanResponse>(json);
    
    Assert.AreEqual("zoomPanState", response.Type);
    Assert.AreEqual(150.0, response.Zoom);
    Assert.AreEqual(50.0, response.PanX);
    Assert.AreEqual(30.0, response.PanY);
}
```

### Integration Tests (JavaScript via Automation)

**Command Processing**:
```javascript
// Test via ExecuteScriptAsync
const testCommand = { action: "zoom", delta: 10, cursorX: 100, cursorY: 100 };
window.zoomPanController.handleMessage({ data: testCommand });

// Verify transform applied
const transform = document.getElementById('content').style.transform;
assert(transform.includes('scale(1.1)'));
```

**Response Generation**:
```javascript
// Mock postMessage and verify response
let capturedMessage = null;
window.chrome.webview.postMessage = (msg) => { capturedMessage = msg; };

window.zoomPanController.zoom(10, 100, 100);

assert(capturedMessage.type === 'zoomPanState');
assert(capturedMessage.zoom === 110);
```

---

## Versioning

**Current Version**: 1.0

**Change Management**:
- Breaking changes require major version increment
- New optional properties: minor version increment
- Add version field to messages if multiple versions coexist

**Future Considerations**:
- Add `version: "1.0"` field to all messages
- JavaScript checks version and handles accordingly
- Enables gradual migration during updates

---

## Performance Considerations

### Message Frequency

**Problem**: Mouse wheel can fire rapidly (10+ events/second)

**Solution**: 
- Debounce zoom commands in WPF (100ms timeout)
- Send only final command after rapid scroll stops
- Improves performance and reduces jank

**Problem**: Pan during drag fires on every MouseMove event

**Solution**:
- Use requestAnimationFrame in JavaScript to batch updates
- Send response after animation frame, not on every message
- Reduces message overhead

### Message Size

- All messages are small (<200 bytes JSON)
- No optimization needed at current scale
- Could batch multiple commands if needed (future enhancement)

---

## Security Considerations

### Input Validation

**Required**:
- Clamp zoom values to [10, 1000] range
- Validate pan offsets against calculated boundaries
- Ignore messages with unexpected properties
- Sanitize any string values (currently none)

**Not Required** (trusted boundary):
- WebView2 runs in same process as WPF application
- No untrusted external content in messages
- All messages originated from application code

---

## Documentation References

- [WebView2 PostWebMessageAsJson](https://learn.microsoft.com/en-us/dotnet/api/microsoft.web.webview2.core.corewebview2.postwebmessageasjson)
- [WebView2 WebMessageReceived Event](https://learn.microsoft.com/en-us/dotnet/api/microsoft.web.webview2.core.corewebview2.webmessagereceived)
- [System.Text.Json](https://learn.microsoft.com/en-us/dotnet/api/system.text.json)
