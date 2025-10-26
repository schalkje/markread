# Tab Control Refactoring Status

**Branch:** `fix/tab-control-refactor`  
**Date:** October 26, 2025  
**Status:** ⚠️ INCOMPLETE - Build currently failing

## Problem Identified

The application has tab management issues:
1. **Single WebView2 shared across all tabs** - causes full re-rendering on tab switch
2. **Tab switching flickers** - entire DOM is reconstructed when switching tabs
3. **Forward/back navigation is global** - not per-tab as expected

## Solution Design

Refactor to use **WPF TabControl pattern** where each tab has its own WebView2 instance:

### Architecture Change
```
OLD (Broken):
- Custom TabsView (UI element showing tabs)
- Single WebView2 control (shared across all tabs)
- Tab switch → LoadDocumentAsync() → NavigateToString() → full re-render

NEW (Fixed):
- WPF TabControl
- Each TabItem contains TabContentControl
- TabContentControl wraps WebView2 + WebViewHost
- Tab switch → WPF visibility toggle (no re-render!)
```

## What's Been Completed ✅

### 1. Created TabContentControl
**Files:** `src/UI/Tabs/TabContentControl.xaml` + `.xaml.cs`

User control that encapsulates:
- One `WebView2` control
- One `WebViewHost` instance  
- Proper initialization and disposal

### 2. Updated TabItem Model
**File:** `src/UI/Tabs/TabItem.cs`

Added property:
```csharp
public TabContentControl? Content { get; set; }
```

### 3. Updated MainWindow XAML
**File:** `src/App/MainWindow.xaml`

Changes:
- ❌ Removed: `<tabs:TabsView>` custom control
- ❌ Removed: Single `<wv2:WebView2 x:Name="MarkdownView">`
- ✅ Added: `<TabControl>` with proper templates
- ✅ Template binds to `TabItem.Content` property
- ✅ Close button on each tab header

## What Needs to Be Done ⚠️

### MainWindow.xaml.cs - Complete Rewrite Required

**Current State:** Partially updated, build failing with ~50+ errors

**Removed fields that need replacement:**
```csharp
// ❌ REMOVED - was shared across tabs
private readonly WebViewHost _webViewHost;
private bool _isInitialized;
private Guid _currentTabId;
private NavigationHistory? _currentHistory;
private DocumentInfo? _currentDocument;
```

**Need to add:**
```csharp
// ✅ ADD - tab collection
private ObservableCollection<TabItem> _tabs = new();
```

**Methods that need complete rewrites:**

1. **Constructor** - Remove WebViewHost initialization, bind TabControl.ItemsSource
2. **Window_Loaded** - Remove EnsureWebViewAsync call
3. **Can Execute handlers** - Get history from current tab, not global
4. **ExecuteGoBack/Forward** - Operate on current tab's history only
5. **LoadRootAsync** - Create initial tab with TabContentControl
6. **LoadDocumentAsync** - Renamed to `LoadDocumentInTabAsync(TabItem tab, ...)`
7. **AddTabAsync** - New method to create tab + content + wire events
8. **OnBridgeMessageReceived** - Accept `TabItem` parameter, route to correct tab
9. **OnLinkClicked** - Accept `TabItem` parameter for context
10. **HandleLinkNavigationAsync** - Work with specific tab
11. **TabControl_SelectionChanged** - New handler for tab switches
12. **CloseTab_Click** - New handler for tab close button
13. **GetCurrentTab()** - New helper method

**Event Wiring Strategy:**
```csharp
// Each tab's WebViewHost gets its own event handlers
private async Task AddTabAsync(TabItem tab)
{
    var content = new TabContentControl();
    await content.InitializeAsync();
    
    // Wire events WITH tab context
    if (content.Host is not null)
    {
        content.Host.BridgeMessageReceived += (s, e) => OnBridgeMessageReceived(tab, s, e);
        content.Host.LinkClicked += (s, e) => OnLinkClicked(tab, s, e);
        content.Host.AnchorClicked += (s, e) => OnAnchorClicked(tab, s, e);
    }
    
    tab.Content = content;
    _tabs.Add(tab);
}
```

## Testing Plan (Post-Fix)

### 1. Per-Tab History ✅
- [ ] Open document A in tab 1
- [ ] Navigate to document B in tab 1
- [ ] Create new tab (tab 2), open document C
- [ ] Navigate to document D in tab 2
- [ ] Switch back to tab 1
- [ ] Press Back → should go to document A (not document C!)
- [ ] Switch to tab 2
- [ ] Press Back → should go to document C (not document B!)

### 2. No Flickering ✅
- [ ] Open document in tab 1, scroll halfway down
- [ ] Create tab 2, open different document
- [ ] Switch back to tab 1
- [ ] **VERIFY:** No DOM rebuild, scroll position preserved
- [ ] **VERIFY:** No white flash/flicker on tab switch

### 3. Tab Management ✅
- [ ] Create 3 tabs
- [ ] Close middle tab
- [ ] Verify adjacent tab becomes active
- [ ] Close all tabs
- [ ] Verify start overlay shows

## Implementation Approach

### Option 1: Complete File Replacement (RECOMMENDED)
Use the backup file at `src/App/MainWindow.xaml.cs.backup` as reference and create entirely new implementation following the TabControl pattern.

**Pros:**
- Clean slate, no merge conflicts
- Can verify logic step-by-step
- Easier to review

**Cons:**
- Large diff
- Risk of missing edge cases

### Option 2: Incremental Method-by-Method
Rewrite each method individually, commit after each change.

**Pros:**
- Reviewable commits
- Easier to track what changed

**Cons:**
- More commits
- Build broken until completion

### Option 3: Use MainWindow_Part1.txt Template
A partial implementation was saved to temp file `MainWindow_Part1.txt`.

**Pros:**
- Already has correct structure for first ~70 lines

**Cons:**
- Only partial, needs ~500 more lines

## Recommended Next Steps

1. **Create complete new MainWindow.xaml.cs** from scratch using TabControl pattern
2. **Build and fix compilation errors** iteratively  
3. **Run application** and test basic functionality
4. **Execute testing plan** above to verify:
   - Per-tab history works
   - No flickering on tab switch
   - Tab management works
5. **Run existing test suite** - ensure nothing broke
6. **Merge to 001-markdown-viewer** once verified

## Files Changed in This Branch

```
M  src/App/MainWindow.xaml              (✅ Complete)
M  src/App/MainWindow.xaml.cs           (⚠️ Incomplete - needs full rewrite)
A  src/App/MainWindow.xaml.cs.backup    (Reference copy of old code)
M  src/Rendering/Renderer.cs            (✅ Complete - root path handling)
A  src/UI/Tabs/TabContentControl.xaml   (✅ Complete)
A  src/UI/Tabs/TabContentControl.xaml.cs(✅ Complete)
M  src/UI/Tabs/TabItem.cs               (✅ Complete - added Content property)
```

## Key Design Principles

1. **Each tab is independent** - own WebView2, own history, own state
2. **Tab switching is visibility toggle** - WPF handles show/hide
3. **No shared state between tabs** - except FolderRoot
4. **Events are tab-scoped** - each WebViewHost event includes tab context
5. **History is per-tab** - HistoryService manages map of Guid → NavigationHistory

## Reference Implementation Skeleton

See the complete skeleton in comments below or in the backup file for detailed method signatures and flow.
