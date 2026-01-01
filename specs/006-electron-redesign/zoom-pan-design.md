# Zoom and Pan System Design

**Author**: Design Analysis
**Date**: 2025-12-17
**Status**: Proposal
**Related Tasks**: T044-T051 (User Story 2)

---

## Executive Summary

This document defines a **two-level zoom system** for MarkRead:

1. **Global Window Zoom** - Zooms the entire application UI (menu, tabs, sidebar, content)
2. **Content Area Zoom** - Per-tab zoom that only affects the markdown display area

This design ensures a logical, intuitive user experience across keyboard, mouse, and touch interfaces while maintaining performance and accessibility.

---

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [User Interface Design](#user-interface-design)
4. [Technical Implementation](#technical-implementation)
5. [Tasks Breakdown](#tasks-breakdown)
6. [Edge Cases & Considerations](#edge-cases--considerations)

---

## Overview

### Two Zoom Levels

#### Level 1: Global Window Zoom
- **Scope**: Entire application window (menu, tabs, sidebar, file tree, markdown content, statusbar)
- **Persistence**: Per-window (saved in UIState)
- **Range**: 50% - 300%
- **Method**: Electron's `webContents.setZoomFactor()` or browser-level CSS zoom
- **Use Case**: Accessibility, high-DPI displays, user preference for overall UI size

#### Level 2: Content Area Zoom
- **Scope**: Only the markdown rendering area within the active tab
- **Persistence**: Per-tab (saved in Tab entity)
- **Range**: 10% - 2000% (already implemented)
- **Method**: CSS `transform: scale()` on content container
- **Use Case**: Reading detailed diagrams, zooming into images, viewing small text in code blocks
- **Behavior**:
  - Does NOT resize the viewport width
  - Creates horizontal/vertical overflow when zoomed beyond container bounds
  - Enables panning and scrolling when overflowed
  - Zoom target follows mouse cursor position

---

## Requirements

### Functional Requirements

#### FR-ZP-001: Global Window Zoom
**Priority**: P2
**Description**: Users can zoom the entire application window (all UI elements).

**Acceptance Criteria**:
- [ ] Zoom range: 50% - 300%
- [ ] Zoom increments: 10% steps
- [ ] Keyboard shortcuts: `Ctrl+Alt+Plus`, `Ctrl+Alt+Minus`, `Ctrl+Alt+0` (reset to 100%)
- [ ] Mouse wheel: `Ctrl+Alt+Scroll` when cursor is anywhere in the window
- [ ] Zoom level persists per window in UIState
- [ ] All UI elements scale proportionally
- [ ] Text remains readable at all zoom levels
- [ ] No performance degradation (maintains 60 FPS)

---

#### FR-ZP-002: Content Area Zoom (Enhanced)
**Priority**: P2
**Description**: Users can zoom only the markdown content area, independent of the global UI.

**Acceptance Criteria**:
- [ ] Zoom range: 10% - 2000% (already implemented)
- [ ] Zoom increments: 10% steps (already implemented)
- [ ] Keyboard shortcuts: `Ctrl+Shift+Plus`, `Ctrl+Shift+Minus`, `Ctrl+Shift+0` (reset to 100%)
- [ ] Mouse wheel: `Ctrl+Scroll` when cursor is over the markdown content area
- [ ] Zoom level is per-tab and persists in Tab entity (already implemented)
- [ ] Zoom target follows mouse cursor position (zoom to point under cursor)
- [ ] Scroll position preserved when zooming via keyboard
- [ ] No viewport width change (content overflows horizontally when zoomed)
- [ ] Smooth zoom animation (< 200ms)

---

#### FR-ZP-003: Mouse Wheel Zoom
**Priority**: P2
**Description**: Users can zoom using mouse wheel with modifier keys.

**Acceptance Criteria**:
- [ ] `Ctrl+Scroll` over content area: Content zoom
- [ ] `Ctrl+Alt+Scroll` anywhere: Global zoom
- [ ] Scroll direction: Up = Zoom in, Down = Zoom out
- [ ] Zoom amount: 10% per scroll notch
- [ ] Smooth zoom transition (< 200ms)
- [ ] Cursor position becomes zoom focal point for content zoom
- [ ] Works with trackpad scroll gestures

---

#### FR-ZP-004: Touch Gesture Support
**Priority**: P3 (Task T051 - currently pending)
**Description**: Users can zoom and pan using touch gestures on touch-enabled devices.

**Acceptance Criteria**:
- [ ] Pinch-to-zoom over content area: Content zoom
- [ ] Pinch gesture recognizes two-finger touch
- [ ] Zoom range respects min/max limits (10%-2000%)
- [ ] Zoom center follows the midpoint between two fingers
- [ ] Two-finger pan: Scroll content vertically/horizontally when zoomed
- [ ] Single-finger pan: Normal scroll behavior
- [ ] Touch gestures work alongside mouse/keyboard (no conflicts)
- [ ] Smooth animation during pinch (60 FPS)
- [ ] Gesture completion updates tab zoom state

---

#### FR-ZP-005: Pan Functionality (Enhanced)
**Priority**: P2
**Description**: Users can pan (drag) the content when zoomed beyond 100%.

**Acceptance Criteria**:
- [ ] Panning enabled only when content is zoomed and overflows viewport
- [ ] Mouse methods:
  - [ ] Click-and-drag (already implemented via T048)
  - [ ] Middle-mouse-button drag
  - [ ] `Space+Click-and-drag` (like Photoshop, design tools)
- [ ] Cursor changes to grab/grabbing during pan (already implemented via T049)
- [ ] Touch method: Two-finger drag (see FR-ZP-004)
- [ ] Panning constrained to content bounds (no infinite drag)
- [ ] Smooth panning with `requestAnimationFrame` (already implemented via T050)
- [ ] Momentum scrolling on trackpad (native behavior)

---

#### FR-ZP-006: Zoom UI Indicator
**Priority**: P3
**Description**: Users can see the current zoom level(s) at a glance and access quick zoom presets.

**Acceptance Criteria**:
- [ ] ZoomControls component displays current content zoom level (already implemented via T044)
- [ ] Statusbar (or toolbar) shows both:
  - [ ] Global zoom: "UI: 100%"
  - [ ] Content zoom: "Content: 150%" (only when content zoom ≠ 100%)
- [ ] Indicator updates in real-time (< 50ms after zoom change)
- [ ] **Content zoom quick presets** available in:
  - [ ] Title bar (dropdown menu next to ZoomControls)
  - [ ] View menu → "Content Zoom" submenu
- [ ] **Global zoom quick presets** available in:
  - [ ] View menu → "Global Zoom" submenu only (not in title bar)
- [ ] Preset levels: 10%, 25%, 50%, 75%, 100%, 125%, 150%, 200%, 400%, 800%, Fit Width, Fit Height (for content zoom)
- [ ] Preset levels: 50%, 75%, 100%, 125%, 150%, 200%, 300% (for global zoom)

---

### Non-Functional Requirements

#### NFR-ZP-001: Performance
- Zoom operations complete within **200ms** (SC-004 from spec.md)
- Smooth scrolling maintains **60 FPS** (SC-005 from spec.md)
- No memory leaks during repeated zoom/pan operations
- Efficient use of CSS transforms (hardware-accelerated)

#### NFR-ZP-002: Accessibility
- All zoom shortcuts work with screen readers
- High contrast mode supported at all zoom levels (7:1 contrast ratio per FR-031)
- Text remains readable at minimum zoom (50% global, 10% content)
- Focus indicators visible at all zoom levels

#### NFR-ZP-003: Compatibility
- Works on Windows 10/11 (primary target)
- Works with mouse, trackpad, touchscreen, and keyboard-only
- Respects system font scaling settings
- Works with external monitors at different DPI settings

---

## User Interface Design

### Keyboard Shortcuts

#### Global Window Zoom
| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+Alt+Plus` or `Ctrl+Alt+=` | Zoom In | Increase global UI zoom by 10% (max 300%) |
| `Ctrl+Alt+Minus` or `Ctrl+Alt+-` | Zoom Out | Decrease global UI zoom by 10% (min 50%) |
| `Ctrl+Alt+0` | Reset | Reset global UI zoom to 100% |

**Key Note**: `+` and `=` are on the same physical key. `Plus` requires Shift, but `=` doesn't - so `Ctrl+Alt+=` is easier to press than `Ctrl+Alt+Plus`. Same for `-` (no Shift needed) vs `_` (requires Shift).

**Rationale**: `Ctrl+Alt` modifier distinguishes global zoom from content zoom. This is uncommon in most apps, preventing accidental global zooms.

---

#### Content Area Zoom
| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+Shift+Plus` or `Ctrl+=` | Zoom In | Increase content zoom by 10% (max 2000%) |
| `Ctrl+Shift+Minus` or `Ctrl+-` | Zoom Out | Decrease content zoom by 10% (min 10%) |
| `Ctrl+Shift+0` | Reset | Reset content zoom to 100%, center scroll |

**Key Note**: `+` and `=` are on the same physical key. The full modifier combo is `Ctrl+Shift+Plus`, but `Ctrl+=` is simpler (no need to hold Shift). Same for `-` (easier) vs `Ctrl+Shift+Minus` (explicit).

**Current Implementation Note**: Tasks T046-T047 currently use `Ctrl+Plus/Minus/0` for zoom. **This needs updating to support both `Ctrl+Shift+Plus` and `Ctrl+=` variants to avoid conflict with global zoom.**

**Rationale**: `Ctrl+Shift` is commonly used for content-level actions in editors and viewers (e.g., VS Code uses `Ctrl+Shift+P` for command palette).

---

#### Pan Shortcuts
| Shortcut | Action | Description |
|----------|--------|-------------|
| `Space+Drag` | Pan | Pan content when zoomed (cursor: grab/grabbing) |
| `Middle-Mouse+Drag` | Pan | Pan content when zoomed (cursor: grab/grabbing) |
| `Arrow Keys` | Nudge Pan | Move content in small increments (10px) when zoomed |

**Rationale**: `Space+Drag` is industry standard (Photoshop, Figma, Miro). Arrow keys provide precise control for keyboard-only users.

---

### Mouse Interactions

#### Zoom via Mouse Wheel

```
User Action: Ctrl+Scroll over content area
Result: Content zoom in/out (10% per notch)
Focal Point: Mouse cursor position

User Action: Ctrl+Alt+Scroll anywhere
Result: Global zoom in/out (10% per notch)
Focal Point: Window center
```

**Algorithm for Zoom to Cursor** (Content Zoom):
```typescript
// Before zoom
const rect = contentElement.getBoundingClientRect();
const cursorX = mouseEvent.clientX - rect.left;
const cursorY = mouseEvent.clientY - rect.top;

// Convert cursor position to content coordinates (before zoom)
const beforeX = (cursorX + scrollLeft) / (oldZoom / 100);
const beforeY = (cursorY + scrollTop) / (oldZoom / 100);

// Apply zoom
setZoom(newZoom);

// Recalculate scroll position to keep cursor point stable
const afterX = beforeX * (newZoom / 100);
const afterY = beforeY * (newZoom / 100);
scrollLeft = afterX - cursorX;
scrollTop = afterY - cursorY;
```

---

#### Pan via Mouse

| Action | Behavior |
|--------|----------|
| Click+Drag (when zoomed) | Pan content in any direction |
| Middle-Mouse+Drag | Pan content (regardless of zoom level) |
| Space+Click+Drag | Pan content (industry standard) |

**Visual Feedback**:
- Cursor changes to `grab` when hovering over pannable area
- Cursor changes to `grabbing` during active pan
- Already implemented via T049

---

### Touch Gestures

#### Pinch-to-Zoom (Content Area)
```
Gesture: Two fingers moving apart/together over content
Result: Zoom in/out
Focal Point: Midpoint between two fingers
Constraints: 10% - 2000% range
```

**Detection**:
```typescript
touchstart: Record initial touch points (if touches.length === 2)
touchmove: Calculate distance between points
  - Distance increasing → Zoom in
  - Distance decreasing → Zoom out
touchend: Finalize zoom level, update tab state
```

---

#### Two-Finger Pan (When Zoomed)
```
Gesture: Two fingers dragging together over content
Result: Pan content in drag direction
Constraints: Cannot pan beyond content bounds
```

---

### Visual Indicators

#### Zoom Level Display

**Location**: Multiple locations for easy access

**1. Title Bar** (for content zoom):
```
┌──────────────────────────────────────────────────────────┐
│ ☰ File Edit View  ← → │ Document.md │ 🌙 🔍 ⬇ [150% ▾] ⊕ ⊖ □ ✕ │
└──────────────────────────────────────────────────────────┘
```
- **Right section** of title bar includes:
  - Dropdown button showing current content zoom: `[150% ▾]`
  - Quick zoom buttons: `⊕` (zoom in), `⊖` (zoom out)
  - Clicking dropdown opens preset menu: 10%, 25%, 50%, 75%, 100%, 125%, 150%, 200%, 400%, 800%, Fit Width, Fit Height

**2. Statusbar** (bottom-right, optional):
```
┌─────────────────────────────────────────┐
│                                         │
│  [Markdown Content]                     │
│                                         │
│                                         │
└─────────────────────────────────────────┘
  UI: 100% | Content: 150%
```

- **Left side**: Text labels for both zoom levels
  - Show "UI: 100%" always
  - Show "Content: X%" only if ≠ 100%

**3. View Menu**:
```
View
├─ Content Zoom ▶
│  ├─ Zoom In         Ctrl+=
│  ├─ Zoom Out        Ctrl+-
│  ├─ Reset Zoom      Ctrl+Shift+0
│  ├─ ────────────────
│  ├─ 10%
│  ├─ 25%
│  ├─ 50%
│  ├─ 75%
│  ├─ ✓ 100%
│  ├─ 125%
│  ├─ 150%
│  ├─ 200%
│  ├─ 400%
│  ├─ 800%
│  ├─ ────────────────
│  ├─ Fit Width
│  └─ Fit Height
│
├─ Global Zoom ▶
│  ├─ Zoom In         Ctrl+Alt+=
│  ├─ Zoom Out        Ctrl+Alt+-
│  ├─ Reset Zoom      Ctrl+Alt+0
│  ├─ ────────────────
│  ├─ 50%
│  ├─ 75%
│  ├─ ✓ 100%
│  ├─ 125%
│  ├─ 150%
│  ├─ 200%
│  └─ 300%
```

---

#### Pan Availability Indicator

**When zoom > 100%**:
- Scrollbars appear (horizontal/vertical as needed)
- Cursor changes to `grab` when hovering over content
- Mini-map (optional, P4 priority): Show thumbnail with viewport rectangle

---

## Technical Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Main Process (Electron)                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ window-manager.ts                                       │ │
│ │ - BrowserWindow.webContents.setZoomFactor(level)       │ │
│ │ - IPC handler: window:setGlobalZoom                    │ │
│ │ - IPC handler: window:getGlobalZoom                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↕ IPC
┌─────────────────────────────────────────────────────────────┐
│ Renderer Process (React)                                     │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ stores/ui.ts (new Zustand store)                        │ │
│ │ - globalZoomLevel: number (50-300)                      │ │
│ │ - setGlobalZoom(level: number)                          │ │
│ │   → calls window:setGlobalZoom IPC                      │ │
│ │   → updates UIState persistence                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ stores/tabs.ts (existing)                               │ │
│ │ - zoomLevel: number (10-2000) per tab ✓ Implemented    │ │
│ │ - updateTabZoomLevel(tabId, level) ✓ Implemented       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ components/markdown/MarkdownViewer.tsx                  │ │
│ │ - Applies CSS transform: scale(zoomLevel/100)           │ │
│ │ - Handles mouse wheel zoom (Ctrl+Scroll) → NEW         │ │
│ │ - Implements zoom-to-cursor algorithm → NEW             │ │
│ │ - Handles touch pinch-to-zoom → NEW (T051)             │ │
│ │ - Pan with Space+Drag, Middle-Mouse → ENHANCE          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ components/editor/ZoomControls.tsx ✓ Implemented        │ │
│ │ - Shows current content zoom level                      │ │
│ │ - Zoom in/out/reset buttons                             │ │
│ │ - Add: Preset zoom menu (50%, 100%, 150%, etc.) → NEW  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ services/keyboard-handler.ts                            │ │
│ │ - registerGlobalZoomShortcuts() → NEW                   │ │
│ │   - Ctrl+Alt+Plus/Minus/0                               │ │
│ │ - registerContentZoomShortcuts() → UPDATE T046         │ │
│ │   - Change from Ctrl+ to Ctrl+Shift+                    │ │
│ │ - registerPanShortcuts() → NEW                          │ │
│ │   - Space+Drag, Arrow keys when zoomed                  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### State Management

#### UIState Store (New)
**Location**: `src/renderer/stores/ui.ts`

```typescript
interface UIStore {
  // Global zoom (per window)
  globalZoomLevel: number; // 50-300
  setGlobalZoom: (level: number) => Promise<void>;

  // Statusbar visibility
  showZoomIndicator: boolean;

  // Actions
  resetGlobalZoom: () => void;
  incrementGlobalZoom: (delta: number) => void;
}
```

**Persistence**: Save `globalZoomLevel` to UIState (via `uiState:save` IPC handler)

---

#### Tab Store (Existing)
**Location**: `src/renderer/stores/tabs.ts`

```typescript
interface Tab {
  // ... existing fields
  zoomLevel: number; // 10-2000 ✓ Already implemented
}

interface TabsStore {
  updateTabZoomLevel: (tabId: string, zoomLevel: number) => void; // ✓ Already implemented
}
```

**No changes needed** - already supports per-tab zoom.

---

### IPC Contracts (New)

**File**: `src/shared/contracts/window.contract.ts`

```typescript
export const WindowZoomContract = {
  // Set global window zoom
  'window:setGlobalZoom': {
    request: z.object({
      zoomFactor: z.number().min(0.5).max(3.0), // 50%-300%
    }),
    response: z.object({
      success: z.boolean(),
      zoomFactor: z.number(),
    }),
  },

  // Get current global zoom
  'window:getGlobalZoom': {
    request: z.object({}),
    response: z.object({
      success: z.boolean(),
      zoomFactor: z.number(),
    }),
  },
};
```

---

### Implementation: Global Zoom

**Main Process** (`src/main/window-manager.ts`):
```typescript
// Store zoom level per window
const windowZoomLevels = new Map<number, number>();

export function setGlobalZoom(windowId: number, zoomFactor: number): void {
  const window = BrowserWindow.fromId(windowId);
  if (!window) return;

  // Clamp to valid range
  const clamped = Math.max(0.5, Math.min(3.0, zoomFactor));

  // Apply zoom to window
  window.webContents.setZoomFactor(clamped);

  // Store for restoration
  windowZoomLevels.set(windowId, clamped);
}

export function getGlobalZoom(windowId: number): number {
  return windowZoomLevels.get(windowId) || 1.0;
}
```

**IPC Handlers** (`src/main/ipc-handlers.ts`):
```typescript
ipcMain.handle('window:setGlobalZoom', async (event, args) => {
  const validation = WindowZoomContract['window:setGlobalZoom'].request.safeParse(args);
  if (!validation.success) {
    return { success: false, zoomFactor: 1.0 };
  }

  const windowId = BrowserWindow.fromWebContents(event.sender)?.id;
  if (!windowId) {
    return { success: false, zoomFactor: 1.0 };
  }

  setGlobalZoom(windowId, validation.data.zoomFactor);

  return { success: true, zoomFactor: validation.data.zoomFactor };
});
```

---

### Implementation: Content Zoom with Mouse Wheel

**MarkdownViewer Component** (`src/renderer/components/markdown/MarkdownViewer.tsx`):

```typescript
// Add wheel event listener
useEffect(() => {
  const container = viewerRef.current;
  if (!container) return;

  const handleWheel = (e: WheelEvent) => {
    // Ctrl+Scroll = Content zoom
    if (e.ctrlKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();

      // Calculate zoom delta (10% per notch)
      const delta = e.deltaY > 0 ? -10 : 10;
      const newZoom = Math.max(10, Math.min(2000, zoomLevel + delta));

      // Calculate cursor position in content coordinates (zoom to cursor)
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const beforeX = (cursorX + container.scrollLeft) / (zoomLevel / 100);
      const beforeY = (cursorY + container.scrollTop) / (zoomLevel / 100);

      // Update zoom
      updateTabZoomLevel(tabId, newZoom);

      // Adjust scroll to keep cursor point stable
      requestAnimationFrame(() => {
        const afterX = beforeX * (newZoom / 100);
        const afterY = beforeY * (newZoom / 100);
        container.scrollLeft = afterX - cursorX;
        container.scrollTop = afterY - cursorY;
      });
    }

    // Ctrl+Alt+Scroll = Global zoom (bubbles up to global handler)
    // No preventDefault, let it reach global handler
  };

  container.addEventListener('wheel', handleWheel, { passive: false });

  return () => {
    container.removeEventListener('wheel', handleWheel);
  };
}, [zoomLevel, tabId, updateTabZoomLevel]);
```

---

### Implementation: Touch Pinch-to-Zoom (T051)

**MarkdownViewer Component**:

```typescript
// State for touch tracking
const [touchState, setTouchState] = useState<{
  initialDistance: number | null;
  initialZoom: number;
  center: { x: number; y: number } | null;
}>({ initialDistance: null, initialZoom: 100, center: null });

useEffect(() => {
  const container = viewerRef.current;
  if (!container) return;

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();

      // Calculate initial distance between fingers
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Calculate center point
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;

      setTouchState({
        initialDistance: distance,
        initialZoom: zoomLevel,
        center: { x: centerX, y: centerY },
      });
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && touchState.initialDistance) {
      e.preventDefault();

      // Calculate current distance
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Calculate zoom factor
      const scale = distance / touchState.initialDistance;
      const newZoom = Math.max(10, Math.min(2000, touchState.initialZoom * scale));

      // Update zoom (throttled to avoid excessive updates)
      updateTabZoomLevel(tabId, Math.round(newZoom));
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) {
      setTouchState({ initialDistance: null, initialZoom: zoomLevel, center: null });
    }
  };

  container.addEventListener('touchstart', handleTouchStart, { passive: false });
  container.addEventListener('touchmove', handleTouchMove, { passive: false });
  container.addEventListener('touchend', handleTouchEnd, { passive: false });

  return () => {
    container.removeEventListener('touchstart', handleTouchStart);
    container.removeEventListener('touchmove', handleTouchMove);
    container.removeEventListener('touchend', handleTouchEnd);
  };
}, [zoomLevel, tabId, updateTabZoomLevel, touchState]);
```

---

### Implementation: Enhanced Pan

**Current State**: T048 implements click-and-drag pan. **Enhance** with:

1. **Space+Drag** (industry standard):
```typescript
useEffect(() => {
  const container = viewerRef.current;
  if (!container) return;

  let isSpacePressed = false;
  let isPanningWithSpace = false;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !e.repeat && zoomLevel > 100) {
      isSpacePressed = true;
      container.style.cursor = 'grab';
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      isSpacePressed = false;
      if (!isPanningWithSpace) {
        container.style.cursor = '';
      }
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (isSpacePressed && e.button === 0) {
      e.preventDefault();
      isPanningWithSpace = true;
      container.style.cursor = 'grabbing';
      // ... start pan (same as T048 implementation)
    }
  };

  const handleMouseUp = () => {
    if (isPanningWithSpace) {
      isPanningWithSpace = false;
      container.style.cursor = isSpacePressed ? 'grab' : '';
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  container.addEventListener('mousedown', handleMouseDown);
  container.addEventListener('mouseup', handleMouseUp);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    container.removeEventListener('mousedown', handleMouseDown);
    container.removeEventListener('mouseup', handleMouseUp);
  };
}, [zoomLevel]);
```

2. **Middle-Mouse Drag**:
```typescript
const handleMouseDown = (e: MouseEvent) => {
  // Middle mouse button (button === 1)
  if (e.button === 1 && zoomLevel > 100) {
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setScrollStart({ left: container.scrollLeft, top: container.scrollTop });
    container.style.cursor = 'grabbing';
  }
};
```

---

## Tasks Breakdown

### Phase 4.1: Global Window Zoom (New)

**Prerequisites**: Phase 2 (Foundational) complete

---

#### T051a [P] [US2] Create UIState Zustand store for global zoom
**File**: `src/renderer/stores/ui.ts`
**Description**: Create new Zustand store to manage global UI zoom level (50-300%).
**Acceptance Criteria**:
- [ ] Store tracks `globalZoomLevel: number` (default 100)
- [ ] `setGlobalZoom(level: number)` action calls IPC handler `window:setGlobalZoom`
- [ ] `incrementGlobalZoom(delta: number)` helper for keyboard shortcuts
- [ ] `resetGlobalZoom()` sets level to 100%
- [ ] Store persists zoom level to UIState via `uiState:save` IPC

---

#### T051b [P] [US2] Add window zoom IPC contract
**File**: `src/shared/contracts/window.contract.ts`
**Description**: Define Zod schemas for `window:setGlobalZoom` and `window:getGlobalZoom` IPC calls.
**Acceptance Criteria**:
- [ ] `window:setGlobalZoom` accepts `{ zoomFactor: 0.5-3.0 }`
- [ ] Returns `{ success: boolean, zoomFactor: number }`
- [ ] `window:getGlobalZoom` returns current zoom factor
- [ ] Schemas use Zod validation per research.md Section 6

---

#### T051c [US2] Implement global zoom in window-manager.ts
**File**: `src/main/window-manager.ts`
**Description**: Implement `setGlobalZoom()` and `getGlobalZoom()` functions using Electron's `webContents.setZoomFactor()`.
**Acceptance Criteria**:
- [ ] `setGlobalZoom(windowId, zoomFactor)` applies zoom to BrowserWindow
- [ ] Zoom factor clamped to 0.5-3.0 range
- [ ] Zoom level stored in Map per window ID
- [ ] Zoom restored when window is recreated (from UIState)
- [ ] No performance degradation (maintains 60 FPS per NFR-ZP-001)

---

#### T051d [P] [US2] Implement window:setGlobalZoom IPC handler
**File**: `src/main/ipc-handlers.ts`
**Description**: Register IPC handler for setting global window zoom.
**Acceptance Criteria**:
- [ ] Validates request using Zod schema from T051b
- [ ] Calls `setGlobalZoom()` from T051c
- [ ] Returns success/failure response
- [ ] Handles errors gracefully (logs, returns success: false)

---

#### T051e [P] [US2] Register global zoom keyboard shortcuts
**File**: `src/renderer/services/keyboard-handler.ts`
**Description**: Register `Ctrl+Alt+Plus`, `Ctrl+Alt+=`, `Ctrl+Alt+Minus`, `Ctrl+Alt+-`, `Ctrl+Alt+0` for global zoom.
**Acceptance Criteria**:
- [ ] `Ctrl+Alt+Plus` or `Ctrl+Alt+=`: Calls `incrementGlobalZoom(+10)`
- [ ] `Ctrl+Alt+Minus` or `Ctrl+Alt+-`: Calls `incrementGlobalZoom(-10)`
- [ ] `Ctrl+Alt+0`: Calls `resetGlobalZoom()`
- [ ] Both key variants for zoom in: `Plus` (with Shift) and `=` (without Shift)
- [ ] Both key variants for zoom out: `Minus` (without Shift) and `-` key
- [ ] Shortcuts registered in command system (for command palette)
- [ ] No conflicts with existing shortcuts (verified in conflict detection)

---

#### T051f [P] [US2] Add global zoom indicator to statusbar
**File**: `src/renderer/components/statusbar/Statusbar.tsx` (new component)
**Description**: Create statusbar component displaying "UI: 100% | Content: 150%".
**Acceptance Criteria**:
- [ ] Shows "UI: X%" for global zoom (always visible)
- [ ] Shows "Content: X%" for active tab zoom (only if ≠ 100%)
- [ ] Updates in real-time (< 50ms after zoom change per FR-ZP-006)
- [ ] Non-interactive (informational only - presets are in View menu and title bar)

---

#### T051g [P] [US2] E2E test for global zoom
**File**: `tests/e2e/navigation.spec.ts`
**Description**: Write Playwright test for global window zoom functionality.
**Acceptance Criteria**:
- [ ] Test verifies `Ctrl+Alt+Plus` increases global zoom
- [ ] Test verifies UI elements scale proportionally
- [ ] Test verifies zoom persists on window reload
- [ ] Test verifies zoom range limits (50%-300%)

---

### Phase 4.2: Enhanced Content Zoom (Update Existing)

---

#### T051h [US2] Update content zoom keyboard shortcuts to Ctrl+Shift
**File**: `src/renderer/services/keyboard-handler.ts`
**Description**: **UPDATE T046** - Change content zoom shortcuts from `Ctrl+` to `Ctrl+Shift+` to avoid conflict with global zoom.
**Acceptance Criteria**:
- [ ] Unregister old shortcuts (`Ctrl+Plus/Minus/0`)
- [ ] Register new shortcuts with both key variants:
  - [ ] `Ctrl+Shift+Plus` or `Ctrl+=`: Content zoom in
  - [ ] `Ctrl+Shift+Minus` or `Ctrl+-`: Content zoom out
  - [ ] `Ctrl+Shift+0`: Content zoom reset
- [ ] Both key variants for zoom in: `Ctrl+Shift+Plus` (explicit) and `Ctrl+=` (simpler)
- [ ] Both key variants for zoom out: `Ctrl+Shift+Minus` (explicit) and `Ctrl+-` (simpler)
- [ ] Update ZoomControls tooltip hints (T044 component) to show `Ctrl+=` and `Ctrl+-`
- [ ] Update shortcuts reference (F1 help)

---

#### T051i [US2] Implement mouse wheel zoom for content area
**File**: `src/renderer/components/markdown/MarkdownViewer.tsx`
**Description**: Add `Ctrl+Scroll` wheel zoom for content area with zoom-to-cursor algorithm.
**Acceptance Criteria**:
- [ ] `wheel` event listener on content container
- [ ] `Ctrl+Scroll` (without Alt) triggers content zoom
- [ ] Zoom increments: 10% per scroll notch
- [ ] Implements zoom-to-cursor algorithm (see Technical Implementation)
- [ ] Scroll position adjusted to keep cursor point stable
- [ ] Smooth transition (< 200ms per NFR-ZP-001)
- [ ] Works with trackpad scroll gestures

---

#### T051j [P] [US2] Implement touch pinch-to-zoom (Task T051)
**File**: `src/renderer/components/markdown/MarkdownViewer.tsx`
**Description**: **COMPLETE T051** - Add touch gesture support for pinch-to-zoom on content area.
**Acceptance Criteria**:
- [ ] Detects two-finger touch (`touches.length === 2`)
- [ ] Calculates distance between fingers on `touchstart`
- [ ] Updates zoom on `touchmove` based on distance change
- [ ] Zoom center follows midpoint between fingers
- [ ] Zoom clamped to 10%-2000% range
- [ ] Finalizes zoom on `touchend`, updates tab state
- [ ] Smooth animation (60 FPS per NFR-ZP-001)
- [ ] No conflicts with scroll gestures

---

#### T051k [P] [US2] Add content zoom dropdown to title bar
**File**: `src/renderer/components/titlebar/TitleBarRight.tsx`
**Description**: **ENHANCE title bar** - Add content zoom dropdown with preset levels and quick zoom buttons.
**Acceptance Criteria**:
- [ ] Dropdown button in title bar right section showing current content zoom: `[150% ▾]`
- [ ] Quick zoom buttons next to dropdown: `⊕` (zoom in), `⊖` (zoom out)
- [ ] Clicking dropdown opens menu with presets: 10%, 25%, 50%, 75%, 100%, 125%, 150%, 200%, 400%, 800%, Fit Width, Fit Height
- [ ] Current zoom level marked with checkmark (✓)
- [ ] "Fit Width" calculates zoom to fit content width to viewport (no horizontal scroll)
- [ ] "Fit Height" calculates zoom to fit content height to viewport
- [ ] Menu closes on selection
- [ ] Keyboard accessible (arrow keys, Enter)
- [ ] Updates active tab's zoom level via `updateTabZoomLevel()`

---

#### T051k-view [P] [US2] Add zoom options to View menu
**File**: `src/main/menu-builder.ts` and `src/renderer/services/command-service.ts`
**Description**: Add "Content Zoom" and "Global Zoom" submenus to the View menu.
**Acceptance Criteria**:
- [ ] View menu has "Content Zoom" submenu with:
  - [ ] Zoom In (`Ctrl+=`)
  - [ ] Zoom Out (`Ctrl+-`)
  - [ ] Reset Zoom (`Ctrl+Shift+0`)
  - [ ] Separator
  - [ ] Preset levels: 10%, 25%, 50%, 75%, 100% (✓), 125%, 150%, 200%, 400%, 800%
  - [ ] Separator
  - [ ] Fit Width
  - [ ] Fit Height
- [ ] View menu has "Global Zoom" submenu with:
  - [ ] Zoom In (`Ctrl+Alt+=`)
  - [ ] Zoom Out (`Ctrl+Alt+-`)
  - [ ] Reset Zoom (`Ctrl+Alt+0`)
  - [ ] Separator
  - [ ] Preset levels: 50%, 75%, 100% (✓), 125%, 150%, 200%, 300%
- [ ] Current zoom level marked with checkmark (✓)
- [ ] Menu items trigger appropriate commands via IPC (main process menu) or command service (renderer process)
- [ ] Keyboard shortcuts displayed next to menu items (show simpler variants: `Ctrl+=`, `Ctrl+-`, etc.)

---

### Phase 4.3: Enhanced Panning (Update Existing)

---

#### T051l [US2] Add Space+Drag pan functionality
**File**: `src/renderer/components/markdown/MarkdownViewer.tsx`
**Description**: **ENHANCE T048** - Add `Space+Click-Drag` pan method (industry standard).
**Acceptance Criteria**:
- [ ] Listens for `Space` key press when zoom > 100%
- [ ] Cursor changes to `grab` when Space is held
- [ ] Click-and-drag while Space is held triggers pan
- [ ] Cursor changes to `grabbing` during pan
- [ ] Releases on `Space` key up or mouse up
- [ ] Does not interfere with existing pan implementation (T048)

---

#### T051m [P] [US2] Add middle-mouse drag pan
**File**: `src/renderer/components/markdown/MarkdownViewer.tsx`
**Description**: **ENHANCE T048** - Add middle-mouse-button drag for panning.
**Acceptance Criteria**:
- [ ] Detects middle-mouse button press (`button === 1`)
- [ ] Triggers pan when zoom > 100%
- [ ] Cursor changes to `grabbing` during pan
- [ ] Works alongside existing pan methods (no conflicts)

---

#### T051n [P] [US2] Add arrow key nudge pan
**File**: `src/renderer/components/markdown/MarkdownViewer.tsx`
**Description**: Add arrow key support for precise panning when zoomed (accessibility).
**Acceptance Criteria**:
- [ ] Arrow keys pan content by 10px increments when zoom > 100%
- [ ] `Shift+Arrow` pans by 50px increments (faster)
- [ ] Does not interfere with normal scroll behavior when zoom = 100%
- [ ] Keyboard focus must be on content area (not inputs/buttons)

---

#### T051o [P] [US2] Add two-finger touch pan
**File**: `src/renderer/components/markdown/MarkdownViewer.tsx`
**Description**: Add two-finger drag for panning on touch devices when zoomed.
**Acceptance Criteria**:
- [ ] Detects two-finger touch drag (not pinch)
- [ ] Pans content in drag direction
- [ ] Only active when zoom > 100% and content overflows
- [ ] Constrained to content bounds (no infinite pan)
- [ ] Smooth panning with `requestAnimationFrame` (T050)
- [ ] Does not conflict with pinch-to-zoom (T051j)

---

### Phase 4.4: E2E Testing

---

#### T051p [P] [US2] E2E test for mouse wheel zoom
**File**: `tests/e2e/navigation.spec.ts`
**Description**: Test mouse wheel zoom for content area.
**Acceptance Criteria**:
- [ ] Test `Ctrl+Scroll` over content zooms in/out
- [ ] Test zoom-to-cursor keeps cursor point stable
- [ ] Test zoom respects 10%-2000% range
- [ ] Test scroll position preserved

---

#### T051q [P] [US2] E2E test for touch gestures
**File**: `tests/e2e/navigation.spec.ts`
**Description**: Test pinch-to-zoom and two-finger pan on touch devices.
**Acceptance Criteria**:
- [ ] Test pinch-to-zoom increases/decreases zoom
- [ ] Test zoom center follows finger midpoint
- [ ] Test two-finger pan moves content when zoomed
- [ ] Test gestures respect zoom limits

---

#### T051r [P] [US2] E2E test for enhanced pan methods
**File**: `tests/e2e/navigation.spec.ts`
**Description**: Test all pan methods (Space+Drag, Middle-Mouse, Arrow keys).
**Acceptance Criteria**:
- [ ] Test `Space+Drag` pans content
- [ ] Test middle-mouse drag pans content
- [ ] Test arrow keys nudge pan in correct directions
- [ ] Test pan is disabled when zoom = 100%

---

### Phase 4.5: Documentation Updates

---

#### T051s [P] [US2] Update keyboard shortcuts reference
**File**: `src/renderer/components/help/ShortcutsReference.tsx`
**Description**: Add new shortcuts to F1 help reference.
**Acceptance Criteria**:
- [ ] Add "Global Zoom" category with `Ctrl+Alt+Plus/Minus/0`
- [ ] Update "Content Zoom" shortcuts to `Ctrl+Shift+Plus/Minus/0`
- [ ] Add "Pan" category with `Space+Drag`, `Middle-Mouse`, `Arrow Keys`
- [ ] Shortcuts categorized and searchable

---

#### T051t [P] [US2] Update user documentation
**File**: `docs/user-guide.md`
**Description**: Document two-level zoom system in user guide.
**Acceptance Criteria**:
- [ ] Section: "Zooming and Panning"
- [ ] Explains global vs content zoom
- [ ] Lists all keyboard/mouse/touch methods
- [ ] Includes screenshots/GIFs of zoom in action

---

## Edge Cases & Considerations

### Edge Case 1: Zoom Interaction
**Scenario**: User applies both global zoom (200%) and content zoom (150%).
**Behavior**:
- Global zoom scales entire UI to 200% (including content area)
- Content zoom then scales markdown content to 150% *within* the already-scaled viewport
- **Effective content scale**: 200% × 150% = 300%
- **User visibility**: Statusbar shows both: "UI: 200% | Content: 150%"

**Rationale**: Both zooms are independent. This matches user expectation (global affects everything, content adds extra zoom to reading area).

---

### Edge Case 2: Minimum Readable Zoom
**Scenario**: User zooms global to 50% and content to 10%.
**Behavior**:
- **Effective content scale**: 50% × 10% = 5%
- **Risk**: Text may be unreadably small
- **Mitigation**:
  - Show warning toast when combined zoom < 20%: "Warning: Combined zoom is very small (5%). Text may be unreadable."
  - Ensure high contrast mode maintains 7:1 contrast ratio even at small sizes (NFR-ZP-002)

---

### Edge Case 3: Performance with Large Documents
**Scenario**: User zooms 50-page document to 2000% content zoom.
**Behavior**:
- Content container becomes very large (50 pages × 2000% = massive scrollable area)
- **Risk**: Memory usage spike, scroll performance degradation
- **Mitigation**:
  - Use CSS `transform: scale()` instead of increasing actual DOM size (already implemented via T047)
  - `requestAnimationFrame` for smooth scrolling (already implemented via T050)
  - Monitor memory usage in E2E tests (NFR-ZP-001)

---

### Edge Case 4: Touch Gesture Conflicts
**Scenario**: User wants to scroll vertically with one finger while zoomed, but two-finger gestures interfere.
**Behavior**:
- **One finger**: Normal vertical scroll (even when zoomed)
- **Two fingers (static distance)**: Pan in any direction
- **Two fingers (changing distance)**: Pinch-to-zoom
- **Detection**: Measure distance change over first 100ms of touch:
  - If distance stable (< 10% change): Treat as pan
  - If distance changing: Treat as pinch

**Rationale**: This matches iOS Safari behavior (industry standard).

---

### Edge Case 5: Keyboard Shortcut Conflicts
**Scenario**: `Ctrl+Plus` is browser default for global zoom. User expects this to work.
**Behavior**:
- **Original plan** (T046): `Ctrl+Plus` for content zoom
- **New plan**: `Ctrl+Alt+Plus` for global zoom, `Ctrl+Shift+Plus` for content zoom
- **Issue**: User might try `Ctrl+Plus` and nothing happens
- **Mitigation**:
  - Show tooltip on first app launch: "Tip: Use Ctrl+Shift+Plus for content zoom, Ctrl+Alt+Plus for global zoom"
  - Add to Quick Start guide
  - Consider: Allow users to customize shortcuts in settings (Phase 9 - User Story 7)

---

### Edge Case 6: Multi-Monitor DPI Differences
**Scenario**: User has 4K monitor (200% OS scaling) and 1080p monitor (100% OS scaling). They move window between monitors.
**Behavior**:
- Electron should handle OS DPI scaling automatically
- Global zoom is *additional* to OS scaling
- **Example**: 200% OS scaling + 150% global zoom = 300% effective UI size
- **Persistence**: Global zoom is per-window, not per-monitor
- **Mitigation**: None needed - Electron handles DPI changes natively

---

### Edge Case 7: Zoom During Active Pan
**Scenario**: User is panning zoomed content, then uses mouse wheel to zoom in further.
**Behavior**:
- Pan operation should **not** be interrupted
- Zoom change applies immediately
- Cursor position during pan becomes new zoom focal point
- **Implementation**: Check `isPanning` state before applying zoom-to-cursor algorithm

---

### Edge Case 8: Accessibility - Screen Reader Zoom
**Scenario**: User with screen reader zooms UI to 300%.
**Behavior**:
- All interactive elements must remain accessible (keyboard focusable)
- Focus indicators must scale with zoom (visible at all levels)
- ARIA labels and roles must persist
- **Testing**: Verify with NVDA/JAWS screen readers at 300% global zoom

---

### Edge Case 9: Fit Width/Height Calculations
**Scenario**: User selects "Fit Width" from preset menu, but content has wide code blocks.
**Behavior**:
- Calculate zoom to fit widest element (code block) to viewport width
- If widest element > 200% zoom required, clamp to 200% (avoid excessive zoom)
- "Fit Height" same logic for vertical dimension
- **Calculation**:
  ```typescript
  const contentWidth = contentElement.scrollWidth;
  const viewportWidth = viewerRef.current.clientWidth;
  const fitZoom = (viewportWidth / contentWidth) * 100;
  const clampedZoom = Math.max(10, Math.min(200, fitZoom));
  ```

---

## Summary

This design provides:

✅ **Two independent zoom levels** (global UI, per-tab content)
✅ **Logical keyboard shortcuts** (Ctrl+Alt for global, Ctrl+Shift for content)
✅ **Mouse wheel zoom** with zoom-to-cursor algorithm
✅ **Touch gesture support** (pinch-to-zoom, two-finger pan)
✅ **Multiple pan methods** (click-drag, Space+Drag, middle-mouse, arrow keys)
✅ **Visual indicators** (statusbar with both zoom levels)
✅ **Accessibility** (keyboard-only, screen reader support)
✅ **Performance** (< 200ms zoom, 60 FPS scroll)
✅ **Comprehensive testing** (E2E tests for all interactions)

**Total New Tasks**: 21 tasks (T051a - T051t, plus T051k-view)
**Updated Tasks**: 3 tasks (T046 → T051h, T044 → T051k, T048 → T051l/m)
**Original Task Completed**: T051 (touch gestures) → T051j

**UI Placement**:
- Content zoom: Title bar dropdown + View menu
- Global zoom: View menu only

---

**Next Steps**:
1. Review this design with team/stakeholders
2. Update [tasks.md](tasks.md) with new tasks (T051a - T051t)
3. Begin implementation with Phase 4.1 (Global Zoom infrastructure)
4. Proceed to Phase 4.2 (Enhanced Content Zoom)
5. Complete with Phase 4.5 (Documentation)

---

**End of Document**
