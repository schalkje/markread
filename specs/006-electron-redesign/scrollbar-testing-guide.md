# Custom Scrollbar Testing Guide

**Status**: ⚠️ **Cannot Test - App Crashes on Startup**
**Issue**: Protocol registration error in main process prevents app from launching

---

## Current Status

### Implementation Complete ✅
- CustomScrollbar component created and integrated
- ScrollbarManager service implemented
- Overview ruler with heading markers
- Zoom integration
- ResizeObserver for automatic dimension updates

### Testing Blocked ❌
The Electron app crashes immediately on startup with this error:

```
TypeError: Cannot read properties of undefined (reading 'registerSchemesAsPrivileged')
    at Object.<anonymous> (C:\repo\markread\out\main\index.js:977:19)
```

**Root Cause**: `protocol` module from Electron is undefined when `registerSchemesAsPrivileged` is called at module level in `src/main/index.ts:29`.

---

## How to Fix and Test

### Option 1: Quick Fix (Recommended for Testing)

Comment out the protocol registration temporarily to test scrollbars:

**File**: `src/main/index.ts`

```typescript
// TEMPORARY: Comment out for testing
/*
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'mdfile',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
      bypassCSP: true,
    },
  },
]);
*/
```

Then rebuild and run:
```bash
npm run build
npx electron out/main/index.js
```

**Note**: Images won't load without the custom protocol, but scrollbars will be testable.

### Option 2: Proper Fix

Wrap protocol registration in a safety check:

```typescript
// File: src/main/index.ts
console.log('[Main] About to register protocol schemes...');
try {
  if (protocol && typeof protocol.registerSchemesAsPrivileged === 'function') {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: 'mdfile',
        privileges: {
          standard: true,
          secure: true,
          supportFetchAPI: true,
          stream: true,
          corsEnabled: true,
          bypassCSP: true,
        },
      },
    ]);
    console.log('[Main] Custom protocol "mdfile" registered with privileges');
  } else {
    console.warn('[Main] protocol.registerSchemesAsPrivileged not available');
  }
} catch (error) {
  console.error('[Main] Protocol registration failed:', error);
}
```

---

## What to Look For When Testing

Once the app runs, you should see:

### 1. Console Logs

Look for these in the DevTools console (Ctrl+Shift+I or Cmd+Option+I):

```
[MarkdownViewer] Updating scroll state: {
  scrollTop: 0,
  scrollLeft: 0,
  scrollHeight: 2000,  // Should be > 0 for content
  scrollWidth: 800,
  clientHeight: 600,
  clientWidth: 800
}

[MarkdownViewer] ResizeObserver triggered
[MarkdownViewer] Extracted markers: 5

[CustomScrollbar vertical] {
  hasScroll: true,
  maxScroll: 1400,
  scrollSize: 2000,
  viewportSize: 600,
  thumbSizePercent: 30,
  thumbPositionPercent: 0
}
```

### 2. Visual Scrollbars

You should see:
- **Vertical scrollbar** on the right edge (14px wide)
- **Horizontal scrollbar** on the bottom (if content is zoomed or wide)
- **Blue dots** on vertical scrollbar showing heading positions
- **Scrollbars always visible** (auto-hide is disabled for debugging)

### 3. Interactions to Test

Try these:
- **Drag thumb**: Click and drag the scrollbar thumb up/down
- **Click track**: Click anywhere on the scrollbar track (should jump to position)
- **Mouse wheel**: Scroll with mouse wheel (content should scroll, scrollbar should update)
- **Zoom**: Press Ctrl+= to zoom in
  - Scrollbar thumb should shrink (showing less content is visible)
  - Scrollbar should remain same visual size (not scale with content)
- **Hover markers**: Hover over blue dots to see heading tooltips

---

## Debug Checklist

If scrollbars don't appear after fixing the crash:

### Check 1: Scroll State
Open DevTools console and look for `[MarkdownViewer] Updating scroll state`.
- If all values are 0, the buffer isn't rendering
- If `scrollHeight === clientHeight`, there's no overflow (scrollbar won't show)

### Check 2: CustomScrollbar Rendering
Look for `[CustomScrollbar vertical]` logs.
- If you see "Not rendering - no scroll needed", there's no overflow
- If you don't see any logs, the component isn't rendering

### Check 3: CSS
Check in DevTools Elements tab:
- `.custom-scrollbar` should exist in the DOM
- Should have `position: absolute`, `right: 0`, `width: 14px`
- Should NOT have `display: none`

### Check 4: Content Overflow
Open a markdown file with lots of content (>1 screen height).
If using the welcome screen, there's no overflow, so no scrollbars will show.

---

## Re-enable Auto-Hide

After confirming scrollbars work, re-enable auto-hide:

**File**: `src/renderer/components/markdown/MarkdownViewer.tsx`

```typescript
<CustomScrollbar
  orientation="vertical"
  // ... other props
  autoHide={true}  // Change from false to true
/>
```

Then scrollbars will fade out when not hovering, like VSCode.

---

## Remove Debug Logging

After testing, remove console.log statements from:
- `CustomScrollbar.tsx` (lines 187-195, 199)
- `MarkdownViewer.tsx` (lines 851, 853, 862, 870)

---

## Expected Behavior Summary

| Scenario | Expected Result |
|----------|----------------|
| **No content** | No scrollbars (nothing to scroll) |
| **Content fits viewport** | No scrollbars (nothing to scroll) |
| **Content overflows vertically** | Vertical scrollbar appears |
| **Content overflows horizontally** (zoomed) | Horizontal scrollbar appears |
| **Hover scrollbar** | Stays visible |
| **Mouse away** (auto-hide=true) | Fades out after 0.15s |
| **Drag thumb** | Content scrolls smoothly |
| **Click track** | Jumps to position |
| **Zoom in** | Thumb shrinks, horizontal scrollbar may appear |
| **Heading markers** | Blue dots on vertical scrollbar |
| **Hover marker** | Tooltip shows heading text |

---

## Contact

If scrollbars still don't appear after fixing the protocol issue, check:
1. Console logs for scroll state values
2. DevTools Elements tab for `.custom-scrollbar` elements
3. Whether content actually overflows (try a long markdown file)

The implementation is complete - the protocol crash is preventing testing.

---

**End of Testing Guide**
