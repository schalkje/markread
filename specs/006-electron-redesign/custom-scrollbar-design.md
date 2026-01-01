# Custom Scrollbar Design for MarkRead

**Date**: 2025-12-28
**Status**: Design Proposal
**Inspired by**: VSCode Monaco Editor scrollbar architecture

---

## Executive Summary

This design proposes a custom scrollbar system for MarkRead that is **detached from the content view** and **overlay-based**, similar to VSCode's implementation. The system will support:

- ✅ Horizontal and vertical scrolling with zoom support
- ✅ Overlay scrollbars that don't take up layout space
- ✅ Custom styling and theming
- ✅ Smooth 60 FPS performance
- ✅ Virtual scrolling for large documents
- ✅ Overview ruler (future enhancement for search results, headings, etc.)

---

## Research Findings

### VSCode/Monaco Scrollbar Architecture

Based on research into Monaco Editor's implementation, here are the key insights:

#### Why Custom Scrollbars?

Monaco/VSCode uses custom scrollbars for three critical reasons:

1. **Large File Support**: Native browser scrollbars have size limits (~1.5M px in Edge/IE, ~70-80k lines). Custom scrollbars can handle documents of any size through virtual scrolling.

2. **Scroll Event Control**: Native scrollbars scroll first, then fire events. This causes visual glitches during virtual scrolling. Custom scrollbars allow interception before scroll happens.

3. **Feature Extensibility**: Custom scrollbars support advanced features like:
   - Overview ruler (minimap showing find matches, errors, etc.)
   - Custom track rendering
   - Programmatic scroll animations
   - Detached positioning

#### Configuration Options

Monaco provides 14 scrollbar options:
- **Visibility**: `horizontal`, `vertical` (auto/visible/hidden)
- **Sizing**: `verticalScrollbarSize` (14px), `horizontalScrollbarSize` (12px)
- **Shadows**: `useShadows` for depth effect when scrolled
- **Arrows**: Optional arrow buttons on tracks
- **Interaction**: Mouse wheel handling, page vs position scrolling

---

## Current MarkRead Implementation

### Existing Architecture

1. **Native Scrollbars**: Uses `-webkit-scrollbar` CSS pseudo-elements
   ```css
   .markdown-viewer__buffer {
     overflow-y: auto;
     overflow-x: auto;
   }
   ```

2. **Scroll Optimizer**: `scroll-optimizer.ts` service for 60 FPS performance
   - RAF-based throttling
   - Callback registration
   - Smooth scroll utilities

3. **Zoom System**: CSS `transform: scale()` on buffer content
   - Range: 10%-2000%
   - Zoom-to-cursor algorithm
   - Scroll position preservation

4. **Pan System**: Click-drag and Space+drag panning when zoomed

### Limitations of Current Approach

- ❌ Native scrollbars tied to content div (not detached)
- ❌ Scrollbar size changes with zoom level (visual inconsistency)
- ❌ Limited styling control across platforms
- ❌ No overview ruler or minimap capability
- ❌ Scrollbar thumb size doesn't reflect visible vs total content ratio when zoomed

---

## Proposed Architecture

### Design Principles

1. **Separation of Concerns**: Scrollbars are independent components, not CSS properties of content
2. **Overlay Pattern**: Scrollbars float above content, don't affect layout
3. **Virtual Scrolling**: Scrollbar position represents content coordinates, not DOM scroll position
4. **Performance First**: Use RAF, avoid layout thrashing, throttle expensive operations
5. **Accessibility**: Support keyboard navigation, screen readers, high contrast modes

### Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│ MarkdownViewer                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Content Container (overflow: hidden)                │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ Buffer A/B (transform: scale(...))              │ │ │
│ │ │ ┌─────────────────────────────────────────────┐ │ │ │
│ │ │ │ Rendered Markdown Content                   │ │ │ │
│ │ │ │                                             │ │ │ │
│ │ │ └─────────────────────────────────────────────┘ │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────┐ ← Overlay      │
│ │ CustomScrollbar (vertical)           │   (position:   │
│ │ ┌──────────────────────────────────┐ │   absolute)    │
│ │ │ Track                            │ │                │
│ │ │   ┌────────────────────────────┐ │ │                │
│ │ │   │ Thumb (draggable)          │ │ │                │
│ │ │   └────────────────────────────┘ │ │                │
│ │ └──────────────────────────────────┘ │                │
│ └──────────────────────────────────────┘                │
│                                                          │
│ ┌──────────────────────────────────────────────────┐    │
│ │ CustomScrollbar (horizontal)                     │    │
│ │ ┌──────────────────────────────────────────────┐ │    │
│ │ │ Track                                        │ │    │
│ │ │   ┌────────────┐                             │ │    │
│ │ │   │ Thumb      │                             │ │    │
│ │ │   └────────────┘                             │ │    │
│ │ └──────────────────────────────────────────────┘ │    │
│ └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. CustomScrollbar Component

**File**: `src/renderer/components/scrollbar/CustomScrollbar.tsx`

#### Props

```typescript
interface CustomScrollbarProps {
  /** Scrollbar orientation */
  orientation: 'vertical' | 'horizontal';

  /** Current scroll position in content coordinates (px) */
  scrollPosition: number;

  /** Total scrollable content size (px) */
  contentSize: number;

  /** Viewport size (visible area in px) */
  viewportSize: number;

  /** Current zoom level (0.1 - 20.0) */
  zoomLevel: number;

  /** Callback when user drags scrollbar */
  onScrollChange: (position: number) => void;

  /** Optional: Show shadows when scrolled */
  showShadows?: boolean;

  /** Optional: Scrollbar size in px */
  size?: number; // Default: 14px vertical, 12px horizontal

  /** Optional: Auto-hide when not hovering */
  autoHide?: boolean; // Default: true

  /** Optional: Minimum thumb size in px */
  minThumbSize?: number; // Default: 20px

  /** Optional: Theme */
  theme?: 'light' | 'dark';
}
```

#### State

```typescript
interface ScrollbarState {
  /** Is user currently dragging thumb? */
  isDragging: boolean;

  /** Is mouse hovering over scrollbar? */
  isHovering: boolean;

  /** Drag start position */
  dragStart: { x: number; y: number } | null;

  /** Scroll position at drag start */
  scrollStart: number;

  /** Calculated thumb position (%) */
  thumbPosition: number;

  /** Calculated thumb size (%) */
  thumbSize: number;
}
```

#### Key Methods

```typescript
class CustomScrollbar {
  /** Calculate thumb size based on viewport/content ratio */
  private calculateThumbSize(): number;

  /** Calculate thumb position based on scroll position */
  private calculateThumbPosition(): number;

  /** Handle mouse down on thumb (start drag) */
  private handleThumbMouseDown(e: MouseEvent): void;

  /** Handle mouse move during drag */
  private handleMouseMove(e: MouseEvent): void;

  /** Handle mouse up (end drag) */
  private handleMouseUp(): void;

  /** Handle click on track (jump to position) */
  private handleTrackClick(e: MouseEvent): void;

  /** Handle wheel events on scrollbar */
  private handleWheel(e: WheelEvent): void;
}
```

---

### 2. ScrollbarManager Service

**File**: `src/renderer/services/scrollbar-manager.ts`

This service coordinates scrollbar state with content scrolling.

```typescript
interface ScrollState {
  /** Scroll position in content coordinates (before zoom) */
  contentScrollX: number;
  contentScrollY: number;

  /** Content dimensions (before zoom) */
  contentWidth: number;
  contentHeight: number;

  /** Viewport dimensions */
  viewportWidth: number;
  viewportHeight: number;

  /** Current zoom level */
  zoomLevel: number;
}

class ScrollbarManager {
  private state: ScrollState;
  private listeners: Set<(state: ScrollState) => void>;

  /** Update scroll position (called by scrollbar drag) */
  setScrollPosition(x: number, y: number): void;

  /** Update content size (called when content changes) */
  setContentSize(width: number, height: number): void;

  /** Update viewport size (called on resize) */
  setViewportSize(width: number, height: number): void;

  /** Update zoom level (called when zooming) */
  setZoomLevel(level: number): void;

  /** Subscribe to scroll state changes */
  subscribe(callback: (state: ScrollState) => void): () => void;

  /** Get current scroll state */
  getState(): ScrollState;

  /** Scroll to position with animation */
  scrollTo(x: number, y: number, animated?: boolean): void;

  /** Calculate max scroll positions */
  getMaxScroll(): { x: number; y: number };
}
```

---

### 3. Integration with MarkdownViewer

**Modified**: `src/renderer/components/markdown/MarkdownViewer.tsx`

#### Changes Required

1. **Remove native scrollbars**:
   ```css
   .markdown-viewer__buffer {
     overflow: hidden; /* No native scrollbars */
   }
   ```

2. **Add custom scrollbar components**:
   ```tsx
   <div className="markdown-viewer">
     <div ref={viewerRef} className="markdown-viewer__content-container">
       <div ref={bufferRef} className="markdown-viewer__buffer">
         {/* Content */}
       </div>
     </div>

     <CustomScrollbar
       orientation="vertical"
       scrollPosition={scrollState.contentScrollY}
       contentSize={scrollState.contentHeight}
       viewportSize={scrollState.viewportHeight}
       zoomLevel={zoomLevel}
       onScrollChange={(y) => handleScrollChange(scrollState.contentScrollX, y)}
     />

     <CustomScrollbar
       orientation="horizontal"
       scrollPosition={scrollState.contentScrollX}
       contentSize={scrollState.contentWidth}
       viewportSize={scrollState.viewportWidth}
       zoomLevel={zoomLevel}
       onScrollChange={(x) => handleScrollChange(x, scrollState.contentScrollY)}
     />
   </div>
   ```

3. **Use programmatic scrolling**:
   ```typescript
   const handleScrollChange = (x: number, y: number) => {
     if (!bufferRef.current) return;

     // Apply scroll via transform instead of scrollLeft/scrollTop
     // This keeps scrollbars independent of DOM scroll
     const scaleFactor = zoomLevel / 100;
     bufferRef.current.style.transform =
       `scale(${scaleFactor}) translate(${-x}px, ${-y}px)`;
   };
   ```

4. **Update scroll state on content changes**:
   ```typescript
   useEffect(() => {
     // Measure content dimensions (before zoom)
     const contentWidth = bufferRef.current.scrollWidth / (zoomLevel / 100);
     const contentHeight = bufferRef.current.scrollHeight / (zoomLevel / 100);

     scrollbarManager.setContentSize(contentWidth, contentHeight);
   }, [content, zoomLevel]);
   ```

---

## Styling

### CustomScrollbar.css

```css
.custom-scrollbar {
  position: absolute;
  z-index: 100;
  transition: opacity 0.15s ease-out;
  opacity: 0; /* Hidden by default */
}

.custom-scrollbar--visible,
.custom-scrollbar:hover,
.custom-scrollbar--dragging {
  opacity: 1;
}

/* Vertical scrollbar */
.custom-scrollbar--vertical {
  top: 0;
  right: 0;
  bottom: 0;
  width: 14px;
}

/* Horizontal scrollbar */
.custom-scrollbar--horizontal {
  left: 0;
  right: 14px; /* Leave space for vertical scrollbar */
  bottom: 0;
  height: 12px;
}

/* Track */
.custom-scrollbar__track {
  position: absolute;
  background: transparent;
  border-radius: 7px;
  cursor: pointer;
}

.custom-scrollbar--vertical .custom-scrollbar__track {
  width: 100%;
  height: 100%;
}

.custom-scrollbar--horizontal .custom-scrollbar__track {
  width: 100%;
  height: 100%;
}

/* Thumb */
.custom-scrollbar__thumb {
  position: absolute;
  background: rgba(100, 100, 100, 0.4);
  border-radius: 7px;
  cursor: grab;
  transition: background-color 0.15s ease-out;
  min-height: 20px; /* Vertical */
  min-width: 20px;  /* Horizontal */
}

.custom-scrollbar__thumb:hover {
  background: rgba(100, 100, 100, 0.6);
}

.custom-scrollbar__thumb:active,
.custom-scrollbar__thumb--dragging {
  background: rgba(100, 100, 100, 0.8);
  cursor: grabbing;
}

/* Dark theme */
[data-theme="dark"] .custom-scrollbar__thumb {
  background: rgba(200, 200, 200, 0.3);
}

[data-theme="dark"] .custom-scrollbar__thumb:hover {
  background: rgba(200, 200, 200, 0.5);
}

[data-theme="dark"] .custom-scrollbar__thumb:active,
[data-theme="dark"] .custom-scrollbar__thumb--dragging {
  background: rgba(200, 200, 200, 0.7);
}

/* Shadows (VSCode-style) */
.custom-scrollbar--has-shadow-top::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.2), transparent);
  pointer-events: none;
}

.custom-scrollbar--has-shadow-bottom::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.2), transparent);
  pointer-events: none;
}

/* Corner square (where scrollbars meet) */
.custom-scrollbar-corner {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 14px;
  height: 12px;
  background: transparent;
  z-index: 100;
}
```

---

## Zoom Integration

### Challenge: Scrollbar Consistency During Zoom

When content is zoomed, we need scrollbars to:
1. Remain the same visual size (don't scale with content)
2. Update thumb size to reflect new visible:total ratio
3. Preserve scroll position relative to content

### Solution: Content Coordinates

**Key Concept**: Scrollbar operates in **content coordinates** (before zoom), not DOM coordinates.

```typescript
// Example: Content is 2000px tall, viewport is 800px, zoom is 200%

// Wrong approach (DOM coordinates):
const domHeight = contentHeight * zoomLevel; // 4000px
const thumbSize = viewportHeight / domHeight; // 800/4000 = 20%
// Problem: Thumb shrinks when zooming in (counter-intuitive)

// Right approach (content coordinates):
const thumbSize = viewportHeight / contentHeight; // 800/2000 = 40%
// Thumb size reflects how much content is visible, independent of zoom
```

### Implementation

```typescript
const calculateThumbSize = () => {
  const { contentSize, viewportSize, zoomLevel } = props;

  // Visible content size in content coordinates
  const visibleContent = viewportSize / (zoomLevel / 100);

  // Thumb size as percentage of track
  const ratio = Math.min(1, visibleContent / contentSize);

  // Enforce minimum thumb size (e.g., 20px)
  const minRatio = minThumbSize / trackSize;

  return Math.max(minRatio, ratio * 100);
};
```

---

## Performance Optimizations

### 1. RAF-Based Rendering

```typescript
private scheduleUpdate() {
  if (this.rafId) return;

  this.rafId = requestAnimationFrame(() => {
    this.updateScrollbarPosition();
    this.rafId = null;
  });
}
```

### 2. Event Throttling

```typescript
// Use existing scroll-optimizer service
import { throttleRAF } from '@/services/scroll-optimizer';

const handleWheel = throttleRAF((e: WheelEvent) => {
  const delta = e.deltaY;
  const newScroll = scrollPosition + delta;
  onScrollChange(Math.max(0, Math.min(maxScroll, newScroll)));
});
```

### 3. Virtual Scrolling Support

For very large documents (>100k lines):

```typescript
interface VirtualScrollConfig {
  /** Total lines in document */
  totalLines: number;

  /** Visible lines in viewport */
  visibleLines: number;

  /** Current scroll position (line number) */
  scrollLine: number;
}

// Scrollbar shows position in virtual space, not DOM space
const thumbPosition = (scrollLine / totalLines) * 100;
```

---

## Accessibility

### Keyboard Support

- **Arrow Keys**: Nudge scroll (10px)
- **Page Up/Down**: Jump by viewport size
- **Home/End**: Jump to start/end
- **Space**: Page down (browser default)

### ARIA Attributes

```tsx
<div
  role="scrollbar"
  aria-orientation={orientation}
  aria-valuenow={scrollPosition}
  aria-valuemin={0}
  aria-valuemax={maxScroll}
  aria-controls="markdown-viewer-content"
  tabIndex={0}
>
  {/* Scrollbar content */}
</div>
```

### High Contrast Mode

```css
@media (prefers-contrast: high) {
  .custom-scrollbar__thumb {
    background: CanvasText;
    border: 1px solid CanvasText;
  }
}
```

---

## Future Enhancements

### 1. Overview Ruler (VSCode-style)

Show markers for:
- **Find matches**: Yellow dots
- **Headings**: Blue dots
- **Current position**: White line

```tsx
<div className="custom-scrollbar__overview">
  {markers.map(marker => (
    <div
      key={marker.id}
      className={`overview-marker overview-marker--${marker.type}`}
      style={{ top: `${(marker.position / contentSize) * 100}%` }}
    />
  ))}
</div>
```

### 2. Minimap

Show thumbnail of entire document (like VSCode):

```tsx
<div className="custom-scrollbar__minimap">
  <canvas ref={minimapCanvas} />
</div>
```

### 3. Smooth Scroll Animations

```typescript
const smoothScrollTo = (target: number, duration = 300) => {
  const start = scrollPosition;
  const distance = target - start;
  const startTime = performance.now();

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(progress);

    onScrollChange(start + distance * eased);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
};
```

---

## Implementation Plan

### Phase 1: Core Scrollbar Component (2-3 days)

1. ✅ Create `CustomScrollbar.tsx` component
2. ✅ Implement thumb dragging
3. ✅ Implement track clicking
4. ✅ Add styling and themes
5. ✅ Add auto-hide behavior

### Phase 2: Integration with MarkdownViewer (2-3 days)

1. ✅ Create `ScrollbarManager` service
2. ✅ Remove native scrollbars from MarkdownViewer
3. ✅ Integrate CustomScrollbar components
4. ✅ Implement programmatic scrolling
5. ✅ Test zoom integration

### Phase 3: Performance & Polish (1-2 days)

1. ✅ Add RAF-based rendering
2. ✅ Integrate with scroll-optimizer service
3. ✅ Add smooth animations
4. ✅ Test with large documents
5. ✅ Add accessibility features

### Phase 4: Future Enhancements (Optional)

1. ⏭️ Overview ruler
2. ⏭️ Minimap
3. ⏭️ Virtual scrolling for very large docs

---

## Success Criteria

### Functional Requirements

- ✅ FR-CS-001: Custom scrollbars appear detached from content div
- ✅ FR-CS-002: Scrollbars support horizontal and vertical scrolling
- ✅ FR-CS-003: Scrollbars remain consistent size during zoom (don't scale)
- ✅ FR-CS-004: Thumb size reflects visible:total content ratio
- ✅ FR-CS-005: Dragging thumb scrolls content smoothly
- ✅ FR-CS-006: Clicking track jumps to position
- ✅ FR-CS-007: Mouse wheel over scrollbar scrolls content
- ✅ FR-CS-008: Scrollbars auto-hide when not in use (optional)

### Non-Functional Requirements

- ✅ NFR-CS-001: Scrolling maintains 60 FPS
- ✅ NFR-CS-002: Works with zoom levels 10%-2000%
- ✅ NFR-CS-003: Supports light and dark themes
- ✅ NFR-CS-004: Accessible via keyboard
- ✅ NFR-CS-005: Works on Windows, macOS, Linux

---

## References

1. [Monaco Editor Scrollbar Options](https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor.IEditorScrollbarOptions.html)
2. [VSCode Scrollbar Implementation Discussion](https://github.com/microsoft/monaco-editor/issues/1334)
3. [Electron Custom Scrollbar Patterns](https://electron-widgets.sametcc.me/docs/creating-a-custom-scrollbar)
4. [MDN: Creating Custom Scrollbars](https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar)

---

**End of Design Document**
