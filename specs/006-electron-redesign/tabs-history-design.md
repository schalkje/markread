# Tabs and History Architecture Design

## Overview

MarkRead uses a **tab-based navigation system** with **per-tab navigation history**. Each tab maintains its own history stack, zoom level, and scroll position. This document explains the architecture, data flow, and behavior in various scenarios.

---

## Data Structures

### Tab Object

```typescript
interface Tab {
  id: string;                          // Unique tab identifier
  filePath: string;                     // Current file path
  title: string;                        // Display title
  scrollPosition: number;               // Vertical scroll (current)
  scrollLeft?: number;                  // Horizontal scroll (current)
  zoomLevel: number;                    // Zoom percentage (10-2000)

  // Navigation History
  navigationHistory: HistoryEntry[];    // Stack of visited pages
  currentHistoryIndex: number;          // Current position in stack

  // Other state
  folderId?: string;                    // Associated folder (if any)
  isDirectFile: boolean;                // True if opened directly
  createdAt: number;                    // Timestamp
}
```

### History Entry Object

```typescript
interface HistoryEntry {
  filePath: string;         // File path for this entry
  scrollPosition: number;   // Vertical scroll for this page
  scrollLeft?: number;      // Horizontal scroll for this page
  zoomLevel?: number;       // Zoom level for this page
  timestamp: number;        // When this entry was created
}
```

---

## State Management: When is What Stored/Updated?

```mermaid
graph TD
    A[User Action] --> B{Action Type?}

    B -->|Scroll| C[onScrollChange]
    C --> D[Update Tab State]
    C --> E[Update Current History Entry]

    B -->|Zoom| F[onZoomChange]
    F --> G[Update Tab State]
    F --> H[Update Current History Entry]

    B -->|Navigate Forward<br/>Click Link| I[Add New History Entry]
    I --> J[Save Current Page State]
    J --> K[Add New Page to History]
    K --> L[Increment History Index]
    L --> M[Reset Zoom to 100%]
    M --> N[Reset Scroll to 0,0]

    B -->|Navigate Back<br/>Alt+Left| O[Navigate to Previous Entry]
    O --> P[Decrement History Index]
    P --> Q[Load File from Entry]
    Q --> R[Restore Zoom from Entry]
    R --> S[Restore Scroll from Entry]

    B -->|Navigate Forward<br/>Alt+Right| T[Navigate to Next Entry]
    T --> U[Increment History Index]
    U --> Q

    style D fill:#e1f5e1
    style E fill:#e1f5e1
    style G fill:#e1f5e1
    style H fill:#e1f5e1
    style J fill:#ffe1e1
    style K fill:#ffe1e1
```

### Storage Locations

| Data | Tab State | Current History Entry | Notes |
|------|-----------|----------------------|-------|
| **Current scroll** | ✓ Always | ✓ Immediately on scroll | Both updated in real-time |
| **Current zoom** | ✓ Always | ✓ Immediately on zoom | Both updated in real-time |
| **File path** | ✓ Always | ✓ Always | Matches current history entry |
| **History stack** | ✓ Array | N/A | Stack of all visited pages |
| **History index** | ✓ Number | N/A | Pointer to current position |

---

## Navigation Flow

### Forward Navigation (Clicking Links)

```mermaid
sequenceDiagram
    participant U as User
    participant ML as MarkdownViewer
    participant AL as AppLayout
    participant TS as TabsStore
    participant H as History Stack

    U->>ML: Click link to page B
    ML->>AL: onFileLink(pageB.md)

    Note over AL: Get current scroll/zoom from DOM
    AL->>H: Save Page A state to history[currentIndex]

    Note over AL: Add new entry
    AL->>H: Add Page B to history[currentIndex+1]
    AL->>TS: Set currentIndex = currentIndex + 1
    AL->>TS: Set zoomLevel = 100
    AL->>TS: Set scrollPosition = 0

    AL->>AL: Load Page B content
    AL->>ML: Render Page B
    ML->>ML: Apply zoom 100%
    ML->>ML: Scroll to (0, 0)

    Note over U: Sees Page B at top, zoom 100%
```

### Backward Navigation (Alt+Left)

```mermaid
sequenceDiagram
    participant U as User
    participant KB as Keyboard
    participant AL as AppLayout
    participant TS as TabsStore
    participant H as History Stack
    participant ML as MarkdownViewer

    U->>KB: Press Alt+Left
    KB->>AL: handleNavigateBack()

    Note over AL: History already up-to-date<br/>from scroll/zoom callbacks

    AL->>TS: navigateBack(tabId)
    TS->>TS: currentIndex = currentIndex - 1
    TS->>AL: Return history[currentIndex]

    AL->>AL: Load file from history entry
    AL->>TS: Update tab with entry's file/scroll/zoom

    AL->>ML: Render with entry's content
    ML->>ML: Wait for content to stabilize
    ML->>ML: Restore scroll from entry
    ML->>ML: Restore zoom from entry

    Note over U: Sees previous page<br/>with saved scroll/zoom
```

---

## Tab Switching Flow

### Slow Tab Switch (Content Loads Fully)

```mermaid
sequenceDiagram
    participant U as User
    participant TB as TabBar
    participant AL as AppLayout
    participant TS as TabsStore
    participant FS as FileSystem
    participant ML as MarkdownViewer

    Note over U: Currently on Tab A

    U->>TB: Click Tab B
    TB->>TS: setActiveTab(tabB.id)
    TB->>AL: setCurrentFile(tabB.filePath)

    Note over AL: loadingFileRef = fileB
    AL->>FS: Read fileB
    FS->>AL: Return content

    Note over AL: Check: loadingFileRef === fileB? YES
    AL->>ML: Set content + scroll + zoom

    ML->>ML: Render content
    ML->>ML: Wait for content stable
    ML->>ML: Restore scroll from tab state
    ML->>ML: Apply zoom from tab state

    Note over U: Sees Tab B with correct<br/>scroll/zoom
```

### Rapid Tab Switch (Race Condition Prevented)

```mermaid
sequenceDiagram
    participant U as User
    participant TB as TabBar
    participant AL as AppLayout
    participant FS as FileSystem
    participant ML as MarkdownViewer

    U->>TB: Click Tab A
    Note over AL: loadingFileRef = fileA
    AL->>FS: Load fileA

    Note over U: Quickly click Tab B<br/>before A loads
    U->>TB: Click Tab B
    Note over AL: loadingFileRef = fileB
    AL->>FS: Load fileB

    FS->>AL: fileA loaded
    Note over AL: Check: loadingFileRef === fileA?<br/>NO (it's fileB now)
    AL->>AL: IGNORE fileA result

    FS->>AL: fileB loaded
    Note over AL: Check: loadingFileRef === fileB?<br/>YES
    AL->>ML: Display fileB

    Note over U: Only sees Tab B<br/>(Tab A ignored)
```

---

## Rapid History Navigation

### Sequential Navigation (Alt+Left spam)

```mermaid
sequenceDiagram
    participant U as User
    participant AL as AppLayout
    participant FS as FileSystem
    participant ML as MarkdownViewer

    Note over U: Start at Page C

    U->>AL: Alt+Left (go to B)
    Note over AL: loadingFileRef = pageB
    AL->>FS: Load pageB

    U->>AL: Alt+Left (go to A)
    Note over AL: loadingFileRef = pageA
    AL->>FS: Load pageA

    FS->>AL: pageB loaded
    Note over AL: Check: loadingFileRef === pageB?<br/>NO (it's pageA now)
    AL->>AL: IGNORE pageB

    FS->>AL: pageA loaded
    Note over AL: Check: loadingFileRef === pageA?<br/>YES
    AL->>ML: Display pageA with scroll/zoom
    ML->>ML: Restore scroll (with cancellation)

    Note over U: Only sees Page A
```

### Scroll Restoration Cancellation

```mermaid
sequenceDiagram
    participant AL as AppLayout
    participant ML as MarkdownViewer
    participant SR as Scroll Restoration

    AL->>ML: Load Page A (scrollTop=500)
    ML->>SR: Start restoration for scrollTop=500
    SR->>SR: Attempt 1: Content not stable, retry...

    Note over AL: User navigates to Page B
    AL->>ML: Load Page B (scrollTop=100)
    Note over ML: useEffect dependencies changed<br/>triggers cleanup
    ML->>SR: Set cancelled = true

    SR->>SR: Attempt 2: Check cancelled? YES
    SR->>SR: ABORT restoration

    ML->>SR: Start NEW restoration for scrollTop=100
    SR->>SR: Restore to scrollTop=100

    Note over ML: Only Page B's scroll restored
```

---

## Edge Cases

### Case 1: Switching Between Folders

```mermaid
graph TD
    A[Tab 1: Folder A, fileX.md] --> B{User switches to Tab 2}
    B --> C[Tab 2: Folder B, fileY.md]
    C --> D[Store reads Tab 2 state]
    D --> E{Tab 2 folder === Active folder?}
    E -->|NO| F[Update active folder to Folder B]
    E -->|YES| G[Keep current folder]
    F --> H[Update FileTree to show Folder B]
    G --> H
    H --> I[Load fileY.md content]
    I --> J[Restore Tab 2 scroll/zoom]

    style F fill:#ffe1e1
```

**Behavior:**
- Each tab stores its `folderId`
- FileTree updates to show the tab's associated folder
- Scroll/zoom are per-tab, not per-folder
- History is per-tab, not per-folder

### Case 2: Direct File (No Folder)

```mermaid
graph TD
    A[User opens file directly] --> B[Tab created with isDirectFile=true]
    B --> C[folderId = null]
    C --> D[Sidebar shows 'Direct File Mode']
    D --> E{User switches to folder tab?}
    E -->|YES| F[Sidebar switches to FileTree]
    E -->|NO| G[Sidebar stays in Direct File Mode]

    style B fill:#e1f5e1
    style C fill:#e1f5e1
```

**Behavior:**
- Direct file tabs have `isDirectFile: true`, `folderId: null`
- No FileTree shown in sidebar (shows list of direct files instead)
- Full tab functionality (history, scroll, zoom) still works
- Can convert to folder tab via "Open Folder for This File" button

### Case 3: Same File in Multiple Tabs

```mermaid
graph TD
    A[Tab 1: file.md at scroll=500, zoom=150] --> B[Tab 2: file.md at scroll=0, zoom=100]
    B --> C{User switches between tabs}
    C --> D[Each tab maintains independent state]
    D --> E[Tab 1 shows scroll=500, zoom=150]
    D --> F[Tab 2 shows scroll=0, zoom=100]

    style E fill:#e1f5e1
    style F fill:#e1f5e1
```

**Behavior:**
- Same file can be open in multiple tabs
- Each tab has **independent** scroll/zoom/history
- No state sharing between tabs
- File content is loaded separately for each tab

---

## Critical Implementation Details

### 1. Double State Updates (Scroll/Zoom)

**Why both tab state AND history entry?**

```typescript
onScrollChange={(scrollTop, scrollLeft) => {
  // Update Tab State (for immediate display)
  updateTabScrollPosition(tabId, scrollTop);

  // Update Current History Entry (for future restoration)
  history[currentIndex] = {
    ...history[currentIndex],
    scrollPosition: scrollTop,
    scrollLeft: scrollLeft
  };
}
```

**Reason:**
- **Tab state** = current display state (what you see now)
- **History entry** = saved state (what to restore when navigating back)
- Both updated immediately to avoid timing windows

### 2. Race Condition Prevention

**Three checks before updating UI:**

```typescript
// 1. Track which file we're loading
loadingFileRef.current = fileToLoad;

// 2. Load the file
const result = await loadFile(fileToLoad);

// 3. Only update if STILL the current file
if (loadingFileRef.current === fileToLoad && currentFile === fileToLoad) {
  setCurrentContent(result); // ✓ Safe
}
```

**Applied to:**
- Tab switching (useEffect)
- History navigation (handleNavigateToHistory)
- Directory listings (handleNavigateToHistory)

### 3. Scroll Restoration Cancellation

**Cleanup function prevents stale restorations:**

```typescript
useEffect(() => {
  let cancelled = false;

  const attemptRestore = () => {
    if (cancelled) return; // Abort if dependencies changed
    // ... restoration logic
  };

  return () => {
    cancelled = true; // Cancel on unmount or deps change
  };
}, [scrollTop, scrollLeft, filePath, zoomLevel]);
```

**Result:** Old scroll restorations abort when navigating to new page

---

## State Consistency Rules

| Scenario | Tab State | Current History Entry | Other History Entries |
|----------|-----------|----------------------|----------------------|
| **Scrolling** | ✓ Updated | ✓ Updated | ✗ Unchanged |
| **Zooming** | ✓ Updated | ✓ Updated | ✗ Unchanged |
| **Navigate Forward** | ✓ New state | ✓ New entry added | ✓ Previous updated first |
| **Navigate Back** | ✓ Restored from entry | ✗ Read-only | ✗ Unchanged |
| **Switch Tab** | ✓ Switch to new tab | ✗ N/A (different tab) | ✗ N/A |

### Invariants (Always True)

1. **Tab state matches current history entry**
   - `tab.scrollPosition === history[currentIndex].scrollPosition`
   - `tab.zoomLevel === history[currentIndex].zoomLevel`
   - `tab.filePath === history[currentIndex].filePath`

2. **History index is valid**
   - `0 <= currentIndex < history.length`

3. **Race condition protection**
   - `loadingFileRef` always points to most recent request
   - Older results are ignored

4. **Per-tab independence**
   - Tabs don't share state
   - Switching tabs doesn't affect other tabs' history

---

## Performance Considerations

### Memory Management

**History Limit:** 50 entries per tab

```typescript
if (history.length > 50) {
  history.shift();           // Remove oldest
  currentIndex = max(0, currentIndex - 1); // Adjust index
}
```

**Why:** Prevent unbounded memory growth with long navigation sessions

### Scroll Restoration Timing

**Retry with stability check:**

```typescript
// Wait for content height to stabilize (2 consecutive same values)
if (currentHeight === lastHeight && stableCount >= 2) {
  restoreScroll(); // Content is stable, safe to restore
}
```

**Why:**
- Syntax highlighting takes time
- Mermaid diagrams render asynchronously
- Images load progressively
- Restoring too early = wrong position

### Update Throttling

**Scroll events are debounced by browser:**
- `onScroll` fires ~60fps max
- Each event updates both tab state and history
- No additional throttling needed (state updates are cheap)

---

## Debugging Tips

### Console Logs

Key log messages to watch:

```
[MarkdownViewer] Restored scrollTop to: 500 (after 3 attempts, scrollHeight: 2000)
[MarkdownViewer] Scroll restoration cancelled
[handleNavigateToHistory] Content loaded for: file.md
[handleNavigateToHistory] Ignoring stale load for: oldfile.md (current: newfile.md)
```

### Common Issues

| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| Wrong file displays briefly | Race condition not prevented | Check `loadingFileRef` usage |
| Scroll position wrong | Restored before content stable | Check stability retry logic |
| Scroll not saved | History not updated on scroll | Check `onScrollChange` callback |
| Tabs show same scroll | Active tab not updated | Check `setActiveTab` called before `setCurrentFile` |

---

## Future Improvements

1. **Persist history to disk** - Restore navigation on app restart
2. **Infinite scroll restoration** - Handle documents that grow dynamically
3. **Thumbnail previews** - Show preview when hovering over back/forward buttons
4. **History search** - Find pages in history by content/title
5. **Cross-tab navigation** - Jump to same file in different tab

---

## Related Documents

- [Zoom and Pan Design](./zoom-pan-design.md) - Content zoom and panning
- [Tab Management](./tasks.md) - Task list for tab features
- [File Watching](./tasks.md) - Auto-reload on file changes
