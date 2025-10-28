# Commands Contract: Folder Structure Treeview

**Feature**: 002-folder-treeview  
**Date**: October 28, 2025  
**Purpose**: Define command interfaces for treeview user interactions

## Overview

This document specifies the command interfaces for treeview interactions following the MVVM pattern. All commands are implemented using `ICommand` interface and bound to UI elements via XAML.

## TreeView Commands

### ToggleTreeViewVisibilityCommand

Toggles the visibility of the treeview panel.

**Trigger**: User clicks treeview toggle button in toolbar or sidebar

**Parameters**: None

**Preconditions**:

- Application has loaded successfully
- A folder is currently open

**Execution**:

1. Get current visibility state from ViewModel.IsTreeViewVisible
2. Invert the boolean value
3. Update ViewModel.IsTreeViewVisible property
4. Trigger PropertyChanged event
5. UI binding updates panel visibility
6. Save preference via TreeViewService.SaveVisibilityPreference(currentFolderPath, newState)

**Postconditions**:

- Treeview panel visibility matches new state
- Content area width adjusts to fill available space
- Preference persisted to settings file
- PerFolderSettings updated for current folder

**Error Handling**:

- Settings save failure: Log error, continue (UI state still updated)

**Performance**: < 100ms execution time (SC-004)

---

### RefreshTreeViewCommand

Manually refreshes the treeview to reflect current file system state.

**Trigger**: User clicks refresh button or presses Ctrl+R / F5

**Parameters**: None

**Preconditions**:

- Application has loaded successfully
- A folder is currently open
- Treeview is visible

**Execution**:

1. Show progress indicator in treeview area
2. Cancel any ongoing tree building operation (CancellationTokenSource.Cancel)
3. Clear current tree structure (ViewModel.TreeRoot.Children.Clear)
4. Call TreeViewService.BuildTreeAsync(currentFolderPath, progress, newCancellationToken)
5. Await completion
6. Update ViewModel.TreeRoot with new tree structure
7. Hide progress indicator

**Postconditions**:

- Treeview displays current file system state
- Folders without markdown files are excluded
- Tree starts in fully collapsed state
- Previously selected node is deselected (fresh state)

**Error Handling**:

- File system access denied: Display error message in tree area, log exception
- Operation cancelled: Silently abort, no error shown
- Unexpected exception: Log error, show user-friendly message

**Performance**: < 5s for 1000 files (SC-002)

---

### SelectTreeNodeCommand

Selects a tree node and navigates to the associated file (if it's a file node).

**Trigger**: User clicks a tree node or presses Enter on selected node

**Parameters**:

- `node` (TreeNode): The node to select

**Preconditions**:

- Node is not null
- Node exists in current tree structure
- Node is visible (not filtered out by type-ahead search)

**Execution**:

1. Deselect previously selected node (if any)
2. Set node.IsSelected = true
3. If node.Type == NodeType.File:
   a. Get file path from node.FullPath
   b. Trigger file navigation event (raise NavigateToFileRequested event)
   c. Main window handles event and displays markdown content
   d. Update HistoryService with new last viewed file
   e. Save last viewed file to settings (async, fire-and-forget)
4. If node.Type == NodeType.Folder:
   a. Toggle node.IsExpanded state
   b. UI binding expands/collapses folder automatically

**Postconditions**:

- node.IsSelected == true
- All other nodes have IsSelected == false
- If file node: markdown content displays in main window
- If file node: HistoryService updated with new last viewed file
- If folder node: expansion state toggled

**Error Handling**:

- File no longer exists: Show error message, remove from tree
- File read permission denied: Show error message in content area
- Markdown rendering fails: Display error in content area (handled by rendering service)

**Performance**: < 500ms from click to content display (SC-003)

---

### ExpandTreeNodeCommand

Expands a folder node to show its children.

**Trigger**: User clicks expand button, presses right arrow, or presses Enter on collapsed folder

**Parameters**:

- `node` (TreeNode): The folder node to expand

**Preconditions**:

- node.Type == NodeType.Folder
- node.IsExpanded == false
- Node has children (may be empty collection)

**Execution**:

1. Set node.IsExpanded = true
2. Trigger PropertyChanged event
3. UI binding renders children via HierarchicalDataTemplate

**Postconditions**:

- node.IsExpanded == true
- Children are visible in UI (if any exist)
- Expand icon changes to collapse icon

**Error Handling**: None (operation is purely UI state change)

**Performance**: < 50ms (immediate UI feedback)

---

### CollapseTreeNodeCommand

Collapses an expanded folder node to hide its children.

**Trigger**: User clicks collapse button, presses left arrow or Escape on expanded folder

**Parameters**:

- `node` (TreeNode): The folder node to collapse

**Preconditions**:

- node.Type == NodeType.Folder
- node.IsExpanded == true

**Execution**:

1. Set node.IsExpanded = false
2. Trigger PropertyChanged event
3. UI binding hides children

**Postconditions**:

- node.IsExpanded == false
- Children are hidden in UI
- Collapse icon changes to expand icon

**Error Handling**: None (operation is purely UI state change)

**Performance**: < 50ms (immediate UI feedback)

---

### NavigateTreeUpCommand

Moves selection to the previous visible node in the tree (arrow up behavior).

**Trigger**: User presses up arrow key while treeview has focus

**Parameters**: None (uses currently selected node)

**Preconditions**:

- Treeview has keyboard focus
- At least one node exists in tree

**Execution**:

1. Get current selected node (or root if none selected)
2. Find previous visible node in depth-first traversal order
3. If found: SelectTreeNodeCommand.Execute(previousNode)
4. If not found (at top): Do nothing (stay at current node)
5. Ensure selected node is scrolled into view

**Postconditions**:

- Selection moved to previous visible node (or unchanged if at top)
- Selected node is visible in viewport

**Error Handling**: None (safe operation)

**Performance**: < 50ms (immediate keyboard response)

---

### NavigateTreeDownCommand

Moves selection to the next visible node in the tree (arrow down behavior).

**Trigger**: User presses down arrow key while treeview has focus

**Parameters**: None (uses currently selected node)

**Preconditions**:

- Treeview has keyboard focus
- At least one node exists in tree

**Execution**:

1. Get current selected node (or root if none selected)
2. Find next visible node in depth-first traversal order
3. If found: SelectTreeNodeCommand.Execute(nextNode)
4. If not found (at bottom): Do nothing (stay at current node)
5. Ensure selected node is scrolled into view

**Postconditions**:

- Selection moved to next visible node (or unchanged if at bottom)
- Selected node is visible in viewport

**Error Handling**: None (safe operation)

**Performance**: < 50ms (immediate keyboard response)

---

### TypeAheadSearchCommand

Filters or highlights tree nodes matching typed characters.

**Trigger**: User types characters while treeview has focus (debounced 300ms)

**Parameters**:

- `searchText` (string): The accumulated typed characters

**Preconditions**:

- Treeview has keyboard focus
- searchText is not empty

**Execution**:

1. For each TreeNode in tree (depth-first traversal):
   a. Check if node.Name contains searchText (case-insensitive)
   b. If match: Set node.IsVisible = true, highlight node in UI
   c. If no match: Set node.IsVisible = false or dim node
2. Expand parent folders of matched nodes (for visibility)
3. If exactly one match: Select that node
4. If multiple matches: Highlight all, keep current selection

**Postconditions**:

- Matching nodes are highlighted/visible
- Non-matching nodes are dimmed or hidden
- Parent folders of matches are expanded
- If single match: that node is selected

**Error Handling**: None (search failure simply shows no results)

**Performance**: < 100ms execution (SC-010)

**Reset**: Triggered automatically after 2s of no typing (search buffer cleared)

---

### ClearTypeAheadSearchCommand

Clears the type-ahead search filter and restores full tree visibility.

**Trigger**: User presses Escape while type-ahead search is active, or 2s timeout

**Parameters**: None

**Preconditions**:

- Type-ahead search is currently active (searchText not empty)

**Execution**:

1. Clear search buffer (searchText = "")
2. For each TreeNode: Set node.IsVisible = true
3. Remove highlight styling from all nodes
4. Collapse folders that were auto-expanded for search results

**Postconditions**:

- All nodes visible (except filtered by empty folder rule)
- No highlights active
- Tree returns to pre-search expansion state

**Error Handling**: None (safe operation)

**Performance**: < 50ms (immediate feedback)

## Command Bindings

### XAML Binding Examples

```xml
<!-- Toggle button in toolbar -->
<Button Command="{Binding ToggleTreeViewVisibilityCommand}" 
        ToolTip="Toggle Sidebar">
    <Image Source="{Binding TreeViewIcon}" />
</Button>

<!-- Refresh button in treeview header -->
<Button Command="{Binding RefreshTreeViewCommand}"
        ToolTip="Refresh (Ctrl+R)">
    <Image Source="/Assets/refresh.png" />
</Button>

<!-- TreeView control -->
<TreeView ItemsSource="{Binding TreeRoot.Children}"
          SelectedItemChanged="OnTreeViewSelectedItemChanged">
    <TreeView.ItemContainerStyle>
        <Style TargetType="TreeViewItem">
            <Setter Property="IsExpanded" Value="{Binding IsExpanded, Mode=TwoWay}"/>
            <Setter Property="IsSelected" Value="{Binding IsSelected, Mode=TwoWay}"/>
        </Style>
    </TreeView.ItemContainerStyle>
</TreeView>
```

### Keyboard Shortcut Bindings

| Shortcut | Command | Scope |
|----------|---------|-------|
| Ctrl+R | RefreshTreeViewCommand | Global |
| F5 | RefreshTreeViewCommand | Global |
| Enter | SelectTreeNodeCommand (current node) | TreeView focused |
| Up Arrow | NavigateTreeUpCommand | TreeView focused |
| Down Arrow | NavigateTreeDownCommand | TreeView focused |
| Right Arrow | ExpandTreeNodeCommand (current node) | TreeView focused, folder selected |
| Left Arrow | CollapseTreeNodeCommand (current node) | TreeView focused, expanded folder selected |
| Escape | ClearTypeAheadSearchCommand OR CollapseTreeNodeCommand | TreeView focused |
| Any printable character | TypeAheadSearchCommand | TreeView focused |

## Event Flow Diagrams

### File Selection Flow

```text
User clicks file node in tree
    ↓
SelectTreeNodeCommand.Execute(node)
    ↓
NavigateToFileRequested event raised
    ↓
Main window event handler triggered
    ↓
MarkdownService loads and renders file
    ↓
WebView displays content
    ↓
HistoryService.UpdateLastViewed(folderPath, filePath)
    ↓
Settings persisted (async)
```

### Refresh Flow

```text
User presses Ctrl+R
    ↓
RefreshTreeViewCommand.Execute()
    ↓
Cancel existing BuildTreeAsync (if running)
    ↓
Show progress indicator
    ↓
TreeViewService.BuildTreeAsync(folderPath)
    ↓
Scan file system (async)
    ↓
Filter empty folders
    ↓
Sort: folders first, alphabetical
    ↓
Return TreeNode root
    ↓
ViewModel.TreeRoot = root
    ↓
PropertyChanged raised
    ↓
UI updates (HierarchicalDataTemplate rebinds)
    ↓
Hide progress indicator
```

### Type-Ahead Search Flow

```text
User types 'r'
    ↓
OnPreviewTextInput event handler
    ↓
Append to searchBuffer: "r"
    ↓
Restart debounce timer (300ms)
    ↓
[User types 'e' within 300ms]
    ↓
Append to searchBuffer: "re"
    ↓
Restart debounce timer (300ms)
    ↓
[300ms elapses with no typing]
    ↓
Timer tick event
    ↓
TypeAheadSearchCommand.Execute("re")
    ↓
Filter tree nodes (IsVisible property)
    ↓
Expand parent folders of matches
    ↓
Highlight matches in UI
    ↓
[2 seconds elapse]
    ↓
ClearTypeAheadSearchCommand.Execute()
    ↓
Restore full tree visibility
```

## Testing Contracts

### Unit Test Coverage

Each command must have unit tests covering:

- **Can Execute**: Verify CanExecute returns correct boolean for various states
- **Execute Success**: Verify expected state changes occur
- **Execute Failure**: Verify error handling (where applicable)
- **Precondition Violations**: Verify graceful handling of invalid inputs

### Integration Test Coverage

Command sequences must be tested end-to-end:

- **Navigate and Select**: Arrow keys → Enter → content displays
- **Type-Ahead Search**: Type → filter → select → content displays
- **Refresh During Load**: Start refresh → cancel → start new refresh
- **Toggle Visibility**: Hide → navigate away → return → verify persisted state
