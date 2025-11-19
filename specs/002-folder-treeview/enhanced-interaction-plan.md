# Enhanced TreeView Interaction Plan

**Feature**: Advanced mouse and keyboard interaction for folder tree navigation  
**Status**: Planning  
**Created**: 2025-11-19  
**Priority**: P2 (Enhancement)

---

## Overview

This document outlines the implementation plan for enhanced user interactions with the folder treeview, including mouse clicks, context menus, and improved navigation patterns that align with standard file explorer behavior.

---

## Current State Analysis

### What Works
- ✅ Double-click on folders expands/collapses (WPF default behavior)
- ✅ Click on file selects and opens it
- ✅ Keyboard navigation (arrow keys, Enter, type-ahead search)
- ✅ TreeView structure with folders and markdown files

### What Doesn't Work
- ❌ Single-click on folder doesn't toggle expand/collapse
- ❌ Event handlers in DataTemplate not firing (XAML event binding issue)
- ❌ No context menu support for folders or files
- ❌ No ctrl-click for opening in new tab
- ❌ No "make root" functionality

### Root Cause
WPF TreeView captures mouse events internally before they reach custom handlers in DataTemplates. The EventSetter approach and programmatic attachment haven't worked due to the TreeView's complex visual tree structure and event handling.

---

## Requirements

### Folder Interactions

#### R1: Single Click on Folder
**Behavior**: Toggle expand/collapse state  
**Rationale**: Faster navigation than requiring double-click  
**Standard**: VS Code, Windows Explorer (in certain modes)

#### R2: Double Click on Folder
**Behavior**: Toggle expand/collapse state  
**Rationale**: Maintain compatibility with existing behavior  
**Standard**: Windows Explorer default

#### R3: Right Click on Folder → Context Menu
**Menu Items**:
- **Collapse/Expand** (dynamic text based on current state)
- **Make Root** - Rebuild tree with this folder as root
- **Separator**
- **Refresh** - Reload this folder's contents

### File Interactions

#### R4: Single Click on File
**Behavior**: Open file in current tab (replace current content)  
**Rationale**: Standard navigation pattern  
**Standard**: All file explorers

#### R5: Ctrl + Click on File
**Behavior**: Open file in new tab  
**Rationale**: Power user feature for comparing files  
**Standard**: Web browsers, VS Code

#### R6: Right Click on File → Context Menu
**Menu Items**:
- **Open** - Open in current tab
- **Open in New Tab** - Open in new tab
- **Separator**
- **Copy Path** - Copy full file path to clipboard
- **Show in Explorer** - Open Windows Explorer to file location

---

## Implementation Strategy

### Approach: Style-Based Event Handling with Behavior

**Why This Approach**:
1. Use ItemContainerStyle with EventTriggers instead of direct event handlers
2. Leverage WPF Behaviors (Microsoft.Xaml.Behaviors) for cleaner separation
3. Handle events at the TreeViewItem level, not DataTemplate level
4. Use ContextMenu attached property for right-click menus

**Benefits**:
- Works with WPF's TreeView event routing
- Cleaner XAML with behavior pattern
- Easier to test and maintain
- Standard WPF practice for complex controls

---

## Implementation Tasks

### Phase 1: Infrastructure Setup

#### T100: Install Microsoft.Xaml.Behaviors Package
**Description**: Add NuGet package for behavior support  
**File**: `src/MarkRead.App.csproj`  
**Action**: 
```xml
<PackageReference Include="Microsoft.Xaml.Behaviors.Wpf" Version="1.1.77" />
```
**Validation**: Package restores successfully, builds without errors

---

#### T101: Create TreeViewItemBehavior Class
**Description**: Create reusable behavior for TreeViewItem interactions  
**File**: `src/UI/Sidebar/TreeView/TreeViewItemBehavior.cs`  
**Action**: 
```csharp
using Microsoft.Xaml.Behaviors;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

namespace MarkRead.App.UI.Sidebar.TreeView;

public class TreeViewItemBehavior : Behavior<TreeViewItem>
{
    protected override void OnAttached()
    {
        base.OnAttached();
        AssociatedObject.PreviewMouseLeftButtonDown += OnMouseLeftButtonDown;
    }

    protected override void OnDetaching()
    {
        AssociatedObject.PreviewMouseLeftButtonDown -= OnMouseLeftButtonDown;
        base.OnDetaching();
    }

    private void OnMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (sender is TreeViewItem item && item.DataContext is Services.TreeNode node)
        {
            if (node.Type == Services.NodeType.Folder)
            {
                // Check if clicked on toggle button (arrow)
                if (!IsClickOnToggleButton(e))
                {
                    node.IsExpanded = !node.IsExpanded;
                    e.Handled = true;
                }
            }
        }
    }

    private bool IsClickOnToggleButton(MouseButtonEventArgs e)
    {
        // Walk visual tree to detect if toggle button was clicked
        // Implementation details...
    }
}
```
**Validation**: Class compiles, behavior pattern established

---

#### T102: Create Context Menu Service
**Description**: Service to generate and handle context menu actions  
**File**: `src/Services/TreeViewContextMenuService.cs`  
**Action**:
```csharp
namespace MarkRead.App.Services;

public class TreeViewContextMenuService
{
    public ContextMenu CreateFolderContextMenu(TreeNode node)
    {
        // Create menu with Collapse/Expand, Make Root, Refresh
    }

    public ContextMenu CreateFileContextMenu(TreeNode node)
    {
        // Create menu with Open, Open in New Tab, Copy Path, Show in Explorer
    }

    public void HandleMakeRoot(string folderPath)
    {
        // Implementation for setting new root folder
    }

    public void HandleCopyPath(string filePath)
    {
        // Copy to clipboard
    }

    public void HandleShowInExplorer(string filePath)
    {
        // Open Windows Explorer
    }
}
```
**Validation**: Service registered in DI, methods stubbed

---

### Phase 2: Single-Click Folder Toggle

#### T103: Update TreeViewView.xaml with Behavior
**Description**: Apply behavior to TreeViewItem containers  
**File**: `src/UI/Sidebar/TreeView/TreeViewView.xaml`  
**Action**:
```xml
xmlns:b="http://schemas.microsoft.com/xaml/behaviors"
xmlns:local="clr-namespace:MarkRead.App.UI.Sidebar.TreeView"

<TreeView.ItemContainerStyle>
    <Style TargetType="TreeViewItem">
        <Setter Property="IsExpanded" Value="{Binding IsExpanded, Mode=TwoWay}"/>
        <Setter Property="IsSelected" Value="{Binding IsSelected, Mode=TwoWay}"/>
        <Setter Property="b:Interaction.Behaviors">
            <Setter.Value>
                <b:BehaviorCollection>
                    <local:TreeViewItemBehavior/>
                </b:BehaviorCollection>
            </Setter.Value>
        </Setter>
    </Style>
</TreeView.ItemContainerStyle>
```
**Validation**: Single-click on folder toggles expand/collapse

---

#### T104: Implement Toggle Button Detection
**Description**: Prevent single-click toggle when clicking arrow  
**File**: `src/UI/Sidebar/TreeView/TreeViewItemBehavior.cs`  
**Action**: Complete `IsClickOnToggleButton` method using visual tree walking
**Validation**: Clicking arrow still works normally, clicking text/icon toggles

---

#### T105: Remove Old Event Handler Code
**Description**: Clean up non-working event handler attempts  
**File**: `src/UI/Sidebar/TreeView/TreeViewView.xaml.cs`  
**Action**: 
- Remove `TreeViewItem_PreviewMouseLeftButtonDown` method
- Remove `AttachTreeViewItemHandlers` method
- Remove handler attachment in constructor
- Keep only keyboard navigation handlers
**Validation**: Code compiles, no unused methods remain

---

### Phase 3: Context Menus for Folders

#### T106: Add Folder Context Menu to ItemContainerStyle
**Description**: Attach context menu to folder nodes  
**File**: `src/UI/Sidebar/TreeView/TreeViewView.xaml`  
**Action**:
```xml
<TreeView.ItemContainerStyle>
    <Style TargetType="TreeViewItem">
        <!-- Existing setters -->
        <Style.Triggers>
            <DataTrigger Binding="{Binding Type}" Value="{x:Static services:NodeType.Folder}">
                <Setter Property="ContextMenu">
                    <Setter.Value>
                        <ContextMenu>
                            <MenuItem Header="{Binding IsExpanded, Converter={StaticResource ExpandedToTextConverter}}"
                                      Command="{Binding ToggleExpandCommand}"/>
                            <MenuItem Header="Make Root"
                                      Command="{Binding MakeRootCommand}"/>
                            <Separator/>
                            <MenuItem Header="Refresh"
                                      Command="{Binding RefreshFolderCommand}"/>
                        </ContextMenu>
                    </Setter.Value>
                </Setter>
            </DataTrigger>
        </Style.Triggers>
    </Style>
</TreeView.ItemContainerStyle>
```
**Validation**: Right-click folder shows context menu

---

#### T107: Create ExpandedToTextConverter
**Description**: Converter to show "Collapse" or "Expand" based on state  
**File**: `src/UI/Converters/ExpandedToTextConverter.cs`  
**Action**:
```csharp
public class ExpandedToTextConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        return value is bool isExpanded && isExpanded ? "Collapse" : "Expand";
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
```
**Validation**: Menu item text changes based on folder state

---

#### T108: Implement ToggleExpandCommand in TreeNode
**Description**: Add command to TreeNode model  
**File**: `src/Services/TreeNode.cs`  
**Action**:
```csharp
private ICommand? _toggleExpandCommand;
public ICommand ToggleExpandCommand => _toggleExpandCommand ??= new RelayCommand(
    execute: () => IsExpanded = !IsExpanded,
    canExecute: () => Type == NodeType.Folder && Children.Count > 0
);
```
**Validation**: Context menu toggles folder expansion

---

#### T109: Implement MakeRootCommand
**Description**: Add command to set folder as new tree root  
**File**: `src/UI/Sidebar/TreeView/TreeViewViewModel.cs`  
**Action**:
```csharp
private async void ExecuteMakeRoot(TreeNode node)
{
    if (node.Type == NodeType.Folder)
    {
        CurrentRootPath = node.FullPath;
        await LoadTreeAsync(node.FullPath);
    }
}
```
**Validation**: Selecting "Make Root" rebuilds tree with that folder

---

#### T110: Implement RefreshFolderCommand
**Description**: Add command to reload folder contents  
**File**: `src/Services/TreeViewService.cs`  
**Action**:
```csharp
public async Task RefreshFolderAsync(TreeNode folderNode)
{
    // Clear children
    // Rebuild from file system
    // Maintain expansion state
}
```
**Validation**: Refresh reloads folder without losing tree state

---

### Phase 4: Context Menus for Files

#### T111: Add File Context Menu to ItemContainerStyle
**Description**: Attach context menu to file nodes  
**File**: `src/UI/Sidebar/TreeView/TreeViewView.xaml`  
**Action**:
```xml
<DataTrigger Binding="{Binding Type}" Value="{x:Static services:NodeType.File}">
    <Setter Property="ContextMenu">
        <Setter.Value>
            <ContextMenu>
                <MenuItem Header="Open"
                          Command="{Binding OpenCommand}"/>
                <MenuItem Header="Open in New Tab"
                          Command="{Binding OpenInNewTabCommand}"/>
                <Separator/>
                <MenuItem Header="Copy Path"
                          Command="{Binding CopyPathCommand}"/>
                <MenuItem Header="Show in Explorer"
                          Command="{Binding ShowInExplorerCommand}"/>
            </ContextMenu>
        </Setter.Value>
    </Setter>
</DataTrigger>
```
**Validation**: Right-click file shows context menu

---

#### T112: Implement File Commands in TreeNode
**Description**: Add commands for file operations  
**File**: `src/Services/TreeNode.cs`  
**Action**:
```csharp
public ICommand OpenCommand { get; }
public ICommand OpenInNewTabCommand { get; }
public ICommand CopyPathCommand { get; }
public ICommand ShowInExplorerCommand { get; }

// Constructor initialization with command implementations
```
**Validation**: All menu items trigger correct actions

---

#### T113: Implement Copy Path Functionality
**Description**: Copy full file path to clipboard  
**File**: `src/Services/TreeViewContextMenuService.cs`  
**Action**:
```csharp
public void CopyPathToClipboard(string path)
{
    System.Windows.Clipboard.SetText(path);
}
```
**Validation**: Copying path puts text in clipboard

---

#### T114: Implement Show in Explorer Functionality
**Description**: Open Windows Explorer to file location  
**File**: `src/Services/TreeViewContextMenuService.cs`  
**Action**:
```csharp
public void ShowInWindowsExplorer(string filePath)
{
    System.Diagnostics.Process.Start("explorer.exe", $"/select,\"{filePath}\"");
}
```
**Validation**: Opens Explorer with file selected

---

### Phase 5: Ctrl+Click for New Tab

#### T115: Add Ctrl+Click Detection in Behavior
**Description**: Detect modifier keys during file click  
**File**: `src/UI/Sidebar/TreeView/TreeViewItemBehavior.cs`  
**Action**:
```csharp
private void OnMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
{
    if (sender is TreeViewItem item && item.DataContext is Services.TreeNode node)
    {
        if (node.Type == Services.NodeType.File)
        {
            bool ctrlPressed = Keyboard.Modifiers.HasFlag(ModifierKeys.Control);
            if (ctrlPressed)
            {
                // Open in new tab
                ExecuteOpenInNewTab(node);
                e.Handled = true;
            }
            else
            {
                // Normal single-click opens in current tab (existing behavior)
            }
        }
        else if (node.Type == Services.NodeType.Folder)
        {
            // Existing folder toggle logic
        }
    }
}
```
**Validation**: Ctrl+click on file opens in new tab

---

#### T116: Wire Up New Tab Opening
**Description**: Connect to tab management system  
**File**: `src/UI/Sidebar/TreeView/TreeViewViewModel.cs`  
**Action**:
```csharp
public void OpenFileInNewTab(TreeNode fileNode)
{
    // Raise event or call service to open in new tab
    NavigateToFileInNewTabRequested?.Invoke(this, new FileNavigationEventArgs 
    { 
        FilePath = fileNode.FullPath 
    });
}
```
**Validation**: Ctrl+click creates new tab with file content

---

### Phase 6: Testing & Validation

#### T117: Manual Testing Checklist
**Description**: Comprehensive interaction testing  
**Test Cases**:
- [ ] Single-click folder → expands/collapses
- [ ] Double-click folder → expands/collapses
- [ ] Click on folder arrow → works independently
- [ ] Right-click folder → shows correct menu
- [ ] Context menu "Expand/Collapse" → correct text and action
- [ ] Context menu "Make Root" → rebuilds tree correctly
- [ ] Context menu "Refresh" → reloads folder
- [ ] Single-click file → opens in current tab
- [ ] Ctrl+click file → opens in new tab
- [ ] Right-click file → shows correct menu
- [ ] Context menu "Open" → opens in current tab
- [ ] Context menu "Open in New Tab" → opens in new tab
- [ ] Context menu "Copy Path" → copies to clipboard
- [ ] Context menu "Show in Explorer" → opens Windows Explorer
- [ ] All interactions work with keyboard focus
- [ ] No performance degradation with 1000+ files

**Validation**: All test cases pass

---

#### T118: Remove Debug Logging
**Description**: Clean up debug output added during troubleshooting  
**Files**: `src/UI/Sidebar/TreeView/TreeViewView.xaml.cs`  
**Action**: Remove all `System.Diagnostics.Debug.WriteLine` statements
**Validation**: No console spam during normal operation

---

#### T119: Update Documentation
**Description**: Document new interaction patterns  
**File**: `documentation/user-guide/file-navigation.md`  
**Action**: Add section explaining:
- Single-click folder behavior
- Context menu options
- Ctrl+click for new tabs
- Keyboard alternatives for all actions
**Validation**: Documentation is clear and accurate

---

## Success Criteria

### SC-1: Single-Click Responsiveness
**Target**: Folder expand/collapse responds within 50ms of single-click  
**Measurement**: Manual testing with visual feedback

### SC-2: Context Menu Completeness
**Target**: All menu items functional and produce expected results  
**Measurement**: All items in T117 checklist pass

### SC-3: Modifier Key Detection
**Target**: Ctrl+click reliably opens files in new tabs  
**Measurement**: 10 consecutive ctrl+clicks all open new tabs

### SC-4: No Regression
**Target**: Existing functionality (keyboard nav, double-click, search) still works  
**Measurement**: Regression test of all existing features

### SC-5: Performance
**Target**: No noticeable lag with 1000+ files when using context menus  
**Measurement**: Performance profiling shows <5ms menu creation time

---

## Risk Analysis

### Risk 1: Behavior Package Compatibility
**Risk**: Microsoft.Xaml.Behaviors may have .NET 8 compatibility issues  
**Mitigation**: Test package early (T100), have fallback plan  
**Fallback**: Use Attached Properties pattern instead of Behaviors

### Risk 2: Visual Tree Walking Complexity
**Risk**: Detecting toggle button clicks may be fragile  
**Mitigation**: Thorough testing across different themes/DPI settings  
**Fallback**: Accept that clicking arrow toggles differently than clicking text

### Risk 3: Context Menu Command Binding
**Risk**: Commands in TreeNode may complicate testing/architecture  
**Mitigation**: Consider keeping commands in ViewModel with binding tricks  
**Alternative**: Use attached behaviors for command routing

### Risk 4: Tab Management Integration
**Risk**: Current tab system may not support programmatic new tab creation  
**Mitigation**: Verify tab API early, implement stub if needed  
**Fallback**: Ctrl+click does nothing if tab system not ready

---

## Alternative Approaches Considered

### Alternative 1: Custom TreeView Control
**Description**: Subclass TreeView and override mouse handling  
**Rejected**: Too much custom code, harder to maintain, breaks themes

### Alternative 2: Transparent Overlay
**Description**: Overlay transparent elements on tree items to capture clicks  
**Rejected**: Fragile, doesn't work with virtualization, accessibility issues

### Alternative 3: Double-Click Only
**Description**: Keep WPF default behavior, no single-click toggle  
**Rejected**: User explicitly requested single-click functionality

---

## Implementation Timeline

**Total Estimated Time**: 8-12 hours

- **Phase 1** (Infrastructure): 2-3 hours
- **Phase 2** (Single-Click): 1-2 hours
- **Phase 3** (Folder Context Menu): 2-3 hours
- **Phase 4** (File Context Menu): 1-2 hours
- **Phase 5** (Ctrl+Click): 1 hour
- **Phase 6** (Testing): 1-2 hours

**Recommended Approach**: Implement incrementally, validate each phase before proceeding

---

## Next Steps

1. **User Approval**: Review this plan and approve requirements
2. **Start Phase 1**: Install package and create infrastructure (T100-T102)
3. **Validate Approach**: Test T103 to confirm behavior pattern works
4. **Proceed Incrementally**: Complete one phase at a time with validation
5. **Iterate**: Adjust plan based on discoveries during implementation

---

## Questions for User

Before starting implementation:

1. **Priority**: Which feature is most important? (Single-click toggle, context menus, or Ctrl+click?)
2. **"Make Root" Scope**: Should "Make Root" persist across app restarts or just current session?
3. **File Context Menu**: Any other menu items desired? (e.g., "Delete", "Rename", "Properties")
4. **New Tab Behavior**: Should new tabs open next to current tab or at the end?
5. **Timing**: Implement all at once or incrementally with user feedback?

---

## Notes

- This plan supersedes previous attempts at direct event handler attachment
- Microsoft.Xaml.Behaviors is the standard WPF approach for this scenario
- All event handling will be at TreeViewItem level, not DataTemplate level
- Context menus use DataTriggers for folder vs. file differentiation
- Commands in TreeNode keep logic encapsulated but may need ViewModel coordination
- Debug logging added during troubleshooting should be removed in T118
