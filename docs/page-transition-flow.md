# Page Transition Flow

## Overview

This document describes the complete lifecycle of a page transition in the MarkdownViewer component, from the moment a user navigates to a new file until the new content is fully displayed.

## Design Principles

The implementation follows **SOLID** and **DRY** principles:

- **Single Responsibility Principle (SRP)**: Each effect handles one specific concern
- **Single Source of Truth**: One effect manages the entire transition lifecycle
- **Don't Repeat Yourself (DRY)**: No scattered timing logic or duplicate code

## The Three-Step Process

```
┌─────────────────────┐
│  1. Show Overlay    │  ← Happens FIRST
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Make Ready      │  ← Render + Scroll Restore
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. Fade Out        │  ← Smooth removal
└─────────────────────┘
```

## Detailed Flow

### Phase 1: Navigation Detection (Show Overlay First)

**Location**: `MarkdownViewer.tsx` lines 110-152

**Trigger Conditions**:
- **Initial Load**: `previousFilePathRef === undefined && filePath` is truthy
- **Navigation**: User clicks a link to a different file

**Actions**:
1. **Capture Snapshot** (navigation only):
   ```typescript
   if (isNavigation && contentRef.current) {
     const snapshot = contentRef.current.innerHTML;
     setSnapshotHTML(snapshot);
   }
   ```
   - For navigation between files: Captures current page HTML
   - For initial load: No snapshot (empty string)

2. **Show Overlay Immediately**:
   ```typescript
   setIsTransitioning(true);      // Show overlay
   setIsFadingOut(false);          // Reset fade state
   setIsContentReady(false);       // Mark content as not ready
   setShowTransitionSpinner(false); // No spinner yet
   ```

**State After Phase 1**:
```
isTransitioning   = true
isFadingOut       = false
isContentReady    = false
snapshotHTML      = (previous page HTML or empty)
```

**Visual Result**:
- Opaque overlay appears instantly (100% opacity, no transparency)
- Navigation: Shows blurred snapshot of previous page
- Initial load: Shows spinner immediately
- Dark mode: Dark overlay (#1c1c1c), no white flash

---

### Phase 2: Make Everything Ready

This phase has two parallel/sequential operations:

#### 2A: Content Rendering

**Location**: `MarkdownViewer.tsx` lines 500-607

**Wait for Overlay** (Critical for preventing flash):
```typescript
if (isTransitioning) {
  // Wait 2 frames to ensure overlay is painted BEFORE rendering
  await new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve(null));
    });
  });
}
```

**Rendering Steps**:
1. Convert markdown to HTML (`renderMarkdown`)
2. Inject HTML into DOM (`contentRef.current.innerHTML = html`)
3. Render Mermaid diagrams (`renderMermaidDiagrams`)
4. Apply syntax highlighting (`applySyntaxHighlighting`)
5. Resolve relative image paths
6. Add task list handlers

**Minimum Display Time**:
```typescript
const elapsed = Date.now() - startTime;
const minDisplayTime = 300;  // 300ms minimum
const remainingTime = Math.max(0, minDisplayTime - elapsed);
```
Ensures overlay shows for at least 300ms for better UX (prevents flickering on fast loads).

**Content Ready Decision**:
```typescript
const needsScrollRestoration =
  (scrollTop !== undefined && scrollTop > 0) ||
  (scrollLeft !== undefined && scrollLeft > 0);

if (!needsScrollRestoration) {
  setIsContentReady(true);  // Mark ready immediately
}
```

#### 2B: Scroll Restoration (if needed)

**Location**: `MarkdownViewer.tsx` lines 418-498

**Trigger**: Only when navigating back/forward with non-zero scroll positions

**Algorithm**:
```typescript
let retryCount = 0;
const maxRetries = 20;  // Up to 1 second (20 × 50ms)
let stableCount = 0;

const attemptRestore = () => {
  // Check if content dimensions have stabilized
  if (currentScrollHeight === lastScrollHeight && hasScrollableContent) {
    stableCount++;
  }

  // Restore when stable for 2 consecutive checks OR max retries reached
  if (stableCount >= 2 || retryCount >= maxRetries) {
    viewer.scrollTop = scrollTop;
    viewer.scrollLeft = scrollLeft;
    setIsContentReady(true);  // Mark ready after restoration
  } else {
    setTimeout(attemptRestore, 50);  // Try again in 50ms
  }
};
```

**Why the Retries?**:
- Mermaid diagrams render asynchronously
- Images may load after initial render
- Content height changes as elements finish loading
- Need to wait for stable dimensions before scrolling

**State After Phase 2**:
```
isTransitioning   = true   (overlay still visible)
isContentReady    = true   (content fully ready!)
isFadingOut       = false  (not fading yet)
```

---

### Phase 3: Fade Out and Remove Overlay

**Location**: `MarkdownViewer.tsx` lines 153-172

**Trigger**: `isTransitioning && isContentReady` both true

**This is the Single Source of Truth for ending transitions**

**Actions**:

1. **Start Fade-Out** (immediate):
   ```typescript
   setIsFadingOut(true);
   ```
   This applies the CSS class `.markdown-viewer__transition-overlay--fading` which triggers:
   ```css
   .markdown-viewer__transition-overlay--fading {
     opacity: 0;
     transition: opacity 300ms ease-out;
   }
   ```

2. **Remove Overlay** (after animation):
   ```typescript
   const fadeTimeout = setTimeout(() => {
     setIsTransitioning(false);  // Hide overlay
     setSnapshotHTML('');         // Clear snapshot memory
     setIsFadingOut(false);       // Reset fade state
   }, 300);  // Match CSS transition duration
   ```

**State After Phase 3**:
```
isTransitioning   = false  (overlay removed)
isContentReady    = false  (reset for next navigation)
isFadingOut       = false  (reset)
snapshotHTML      = ''     (cleared)
```

**Visual Result**:
- Overlay smoothly fades from opacity 1 to 0 over 300ms
- New content visible underneath
- Clean, smooth transition

---

## State Machine Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    IDLE STATE                                │
│  isTransitioning = false                                     │
│  isContentReady  = false                                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Navigation Detected
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              TRANSITION STARTED                              │
│  isTransitioning = true                                      │
│  isContentReady  = false                                     │
│  isFadingOut     = false                                     │
│  snapshotHTML    = (captured or empty)                       │
│                                                               │
│  VISIBLE: Opaque overlay with snapshot/spinner               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Rendering... (hidden behind overlay)
                  │ Scroll Restoration... (if needed)
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│               CONTENT READY                                  │
│  isTransitioning = true                                      │
│  isContentReady  = true  ← Triggers lifecycle effect         │
│  isFadingOut     = false                                     │
│                                                               │
│  VISIBLE: Overlay still showing, content ready underneath    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Lifecycle effect triggers
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                FADING OUT                                    │
│  isTransitioning = true                                      │
│  isContentReady  = true                                      │
│  isFadingOut     = true  ← CSS fade animation active         │
│                                                               │
│  VISIBLE: Overlay fading to transparent (300ms)              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ After 300ms
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  COMPLETE                                    │
│  isTransitioning = false                                     │
│  isContentReady  = false (reset)                             │
│  isFadingOut     = false (reset)                             │
│  snapshotHTML    = '' (cleared)                              │
│                                                               │
│  VISIBLE: New content fully visible, no overlay              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Ready for next navigation
                  │
                  ▼
             (Back to IDLE)
```

## Key Implementation Details

### Preventing White Flash in Dark Mode

**Problem**: White background briefly visible during transitions

**Solution**: Multiple layers of defense

1. **Opaque Overlay** (`MarkdownViewer.css` lines 103-116):
   ```css
   .markdown-viewer__transition-overlay {
     background-color: rgb(255, 255, 255);  /* 100% opaque, no transparency */
   }

   [data-theme="dark"] .markdown-viewer__transition-overlay {
     background-color: rgb(28, 28, 28);  /* 100% opaque dark */
   }
   ```

2. **Dark Viewer Background** (lines 20-24):
   ```css
   [data-theme="dark"] .markdown-viewer {
     background: #0d1117;  /* Prevents white flash if overlay delays */
   }
   ```

3. **Dark Content Background** (lines 40-43):
   ```css
   [data-theme="dark"] .markdown-viewer__content {
     background: #0d1117;  /* Prevents white flash during render */
   }
   ```

4. **Wait for Overlay Before Rendering**:
   - 2-frame delay ensures overlay is painted first
   - Content renders while overlay is already visible

### Scroll Restoration Timing

**Challenge**: Content dimensions change as it loads (Mermaid, images, etc.)

**Solution**: Retry algorithm with stability detection

- Checks every 50ms for up to 1 second
- Waits for 2 consecutive checks with same height
- Ensures content is truly stable before scrolling

### Minimum Display Time

**Why 300ms?**
- Prevents jarring flicker on very fast loads
- Gives user visual feedback that something happened
- Matches the fade-out animation duration for symmetry

## Code Organization (SOLID/DRY)

### Single Responsibility Principle

Each effect has ONE job:

| Effect | Responsibility | Lines |
|--------|----------------|-------|
| Navigation Detection | Detect navigation, show overlay | 110-152 |
| Transition Lifecycle | Manage fade-out and removal | 153-172 |
| Content Rendering | Render markdown, mark ready | 500-607 |
| Scroll Restoration | Restore scroll, mark ready | 418-498 |

### Don't Repeat Yourself

**Before Refactoring** (Violations):
- `endTransition()` called from 3 different places
- Timer management scattered across effects
- Duplicate overlay removal logic

**After Refactoring** (DRY):
- ✅ Single `isContentReady` state variable
- ✅ One effect manages all transition endings
- ✅ No duplicate timer logic

### Single Source of Truth

**Transition Lifecycle Effect** (lines 153-172):
- ONLY place that removes overlay
- ONLY place that triggers fade-out
- ONLY place that clears snapshot
- Triggered by: `isContentReady` becoming `true`

## Performance Considerations

### Rendering Optimization

1. **Deferred Rendering**: Waits for overlay to paint before starting
2. **Cancellation**: `isCancelled` flag prevents updates after unmount
3. **Minimum Display Time**: Prevents unnecessary re-renders on fast loads

### Memory Management

1. **Snapshot Cleanup**: `setSnapshotHTML('')` clears large HTML string
2. **Timeout Cleanup**: All timeouts cleaned up in effect returns
3. **Event Listener Cleanup**: Navigation detection has no timers to leak

### CSS Performance

1. **GPU Acceleration**: `opacity` transition uses GPU
2. **No Layout Thrashing**: Only opacity changes, no reflow
3. **Transform Origin**: Zoom uses CSS transform (hardware accelerated)

## Debugging

### Console Logs

Key log messages to watch for:

```
[MarkdownViewer] Transition triggered: { isInitialLoad: true/false, isNavigation: true/false }
[MarkdownViewer] Captured snapshot, length: <number>
[MarkdownViewer] Waiting for overlay to appear before rendering...
[MarkdownViewer] Overlay visible, starting content render
[MarkdownViewer] No scroll restoration needed
[MarkdownViewer] Content ready, starting fade-out sequence
[MarkdownViewer] Fade-out complete, removing overlay
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| White flash | Overlay not shown first | Check 2-frame wait before render |
| Overlay stuck | `isContentReady` never set | Check render/scroll completion |
| Flickering | Min display time too short | Verify 300ms minimum |
| Wrong scroll position | Content not stable | Check retry logic |

## Future Enhancements

Potential improvements while maintaining clean architecture:

1. **Configurable fade duration**: Pass as prop instead of hardcoded 300ms
2. **Transition events**: Callbacks for `onTransitionStart`, `onTransitionEnd`
3. **Custom animations**: Support different transition types (slide, zoom, etc.)
4. **Progress indication**: Show progress bar for very slow loads (>3s)

---

**Last Updated**: 2025-12-19
**Component**: `src/renderer/components/markdown/MarkdownViewer.tsx`
**CSS**: `src/renderer/components/markdown/MarkdownViewer.css`
