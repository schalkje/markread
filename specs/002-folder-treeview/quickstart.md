# Quickstart: Folder Structure Treeview

**Feature**: 002-folder-treeview  
**Date**: October 28, 2025  
**Audience**: Developers implementing this feature

## Overview

This feature adds a collapsible treeview navigation panel to the MarkRead viewer, displaying the folder structure of markdown files with real-time file system monitoring, keyboard navigation, and persistent user preferences.

## Prerequisites

- .NET 8 SDK installed
- Existing MarkRead 001-markdown-viewer codebase
- Familiarity with WPF, MVVM pattern, and async/await
- Visual Studio 2022 or VS Code with C# extensions

## Implementation Checklist

### Phase 1: Core Tree Building (P1 - Critical)

- [ ] Create `TreeNode` model class with properties (Name, FullPath, Type, Children, etc.)
- [ ] Create `TreeViewService` with `BuildTreeAsync(string rootPath)` method
- [ ] Implement recursive directory scanning with markdown file filtering
- [ ] Implement empty folder exclusion logic (bottom-up traversal)
- [ ] Implement sorting: folders first, then alphabetical (case-insensitive)
- [ ] Add unit tests for tree building and sorting
- [ ] Create `TreeViewViewModel` with `TreeRoot` property
- [ ] Create `TreeViewView.xaml` with HierarchicalDataTemplate binding
- [ ] Add async loading with progress indicator
- [ ] Verify SC-002: Tree loads in < 5s for 1000 files

### Phase 2: Initial File Selection (P1 - Critical)

- [ ] Implement `DetermineInitialFileAsync` method in TreeViewService
- [ ] Check HistoryService for last viewed file (FR-018)
- [ ] Fallback to README.md if exists (FR-019)
- [ ] Fallback to first alphabetical markdown file
- [ ] Integrate with existing markdown rendering
- [ ] Verify SC-001: Initial markdown displays in < 1s
- [ ] Add unit tests for file selection logic

### Phase 3: Tree Navigation (P2 - Core)

- [ ] Implement `SelectTreeNodeCommand` in ViewModel
- [ ] Wire up TreeView SelectedItemChanged event
- [ ] Trigger file navigation when file node selected
- [ ] Update HistoryService on file selection
- [ ] Implement expand/collapse for folder nodes
- [ ] Verify SC-003: Navigation < 500ms from click to content

### Phase 4: Visibility Toggle (P3 - Enhancement)

- [ ] Add `IsTreeViewVisible` property to ViewModel
- [ ] Create `ToggleTreeViewVisibilityCommand`
- [ ] Add toggle button to UI (toolbar or sidebar header)
- [ ] Implement settings persistence via SettingsService
- [ ] Create `TreeViewSettings` and `FolderTreeSettings` classes
- [ ] Save per-folder visibility state (FR-007)
- [ ] Implement global default preference (FR-008)
- [ ] Add UI for global preference in settings dialog
- [ ] Verify SC-004: Toggle responds in < 100ms
- [ ] Verify SC-005: State persists across restarts

### Phase 5: File System Watching (P2 - Core)

- [ ] Enhance FileWatcherService for markdown-specific monitoring
- [ ] Configure NotifyFilters (Created, Deleted, Renamed only)
- [ ] Implement 500ms debouncing for rapid changes
- [ ] Filter events to markdown extensions only (\*.md, \*.markdown)
- [ ] Handle Created event: Add node to tree in sorted position
- [ ] Handle Deleted event: Remove node, prune empty parent folders
- [ ] Handle Renamed event: Update node name, re-sort siblings
- [ ] Add `RefreshTreeViewCommand` for manual refresh
- [ ] Verify SC-008: File watching < 2% CPU idle
- [ ] Verify SC-009: Updates appear < 2s after changes

### Phase 6: Keyboard Navigation (P3 - Enhancement)

- [ ] Implement `NavigateTreeUpCommand` (up arrow)
- [ ] Implement `NavigateTreeDownCommand` (down arrow)
- [ ] Implement expand on right arrow / Enter for folders
- [ ] Implement collapse on left arrow / Escape for folders
- [ ] Add keyboard shortcuts: Ctrl+R and F5 for refresh
- [ ] Test tab order and focus management
- [ ] Verify SC-011: 100% keyboard accessible

### Phase 7: Type-Ahead Search (P3 - Enhancement)

- [ ] Implement `TypeAheadSearchCommand` with 300ms debounce
- [ ] Add `IsVisible` property to TreeNode for filtering
- [ ] Implement case-insensitive string matching
- [ ] Highlight matching nodes in UI
- [ ] Auto-expand parent folders of matches
- [ ] Implement `ClearTypeAheadSearchCommand` (Escape or 2s timeout)
- [ ] Verify SC-010: Search filters in < 100ms

### Phase 8: Testing & Polish

- [ ] Add integration tests for full user workflows
- [ ] Test with large folders (1000+ files, 10+ levels deep)
- [ ] Test edge cases: empty folders, permission errors, symbolic links
- [ ] Performance profiling for all success criteria
- [ ] Accessibility testing (screen reader, keyboard only)
- [ ] Error handling for file system exceptions
- [ ] UI polish: icons, spacing, theming integration

## Development Workflow

### 1. Set Up Branch

```bash
git checkout 002-folder-treeview
git pull origin 002-folder-treeview
```

### 2. Create TreeNode Model

**File**: `src/Services/TreeViewService.cs` (or separate `Models/TreeNode.cs`)

```csharp
public class TreeNode : INotifyPropertyChanged
{
    public string Name { get; set; }
    public string FullPath { get; set; }
    public NodeType Type { get; set; }
    public TreeNode? Parent { get; set; }
    public ObservableCollection<TreeNode> Children { get; set; }
    
    private bool _isExpanded;
    public bool IsExpanded
    {
        get => _isExpanded;
        set { _isExpanded = value; OnPropertyChanged(); }
    }
    
    private bool _isSelected;
    public bool IsSelected
    {
        get => _isSelected;
        set { _isSelected = value; OnPropertyChanged(); }
    }
    
    // INotifyPropertyChanged implementation
    public event PropertyChangedEventHandler? PropertyChanged;
    protected void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}

public enum NodeType { Folder, File }
```

### 3. Create TreeViewService

**File**: `src/Services/TreeViewService.cs`

```csharp
public class TreeViewService
{
    public async Task<TreeNode> BuildTreeAsync(
        string rootPath, 
        IProgress<int>? progress = null,
        CancellationToken ct = default)
    {
        // Recursive directory scan
        // Filter folders without markdown
        // Sort: folders first, alphabetical
        // Return root TreeNode
    }
    
    public async Task<string?> DetermineInitialFileAsync(string folderPath)
    {
        // Check history, README.md, first alphabetical
    }
    
    private bool HasMarkdownFiles(DirectoryInfo dir)
    {
        // Recursive check for markdown files
    }
}
```

### 4. Create ViewModel

**File**: `src/UI/Sidebar/TreeView/TreeViewViewModel.cs`

```csharp
public class TreeViewViewModel : INotifyPropertyChanged
{
    private readonly TreeViewService _treeService;
    
    private TreeNode? _treeRoot;
    public TreeNode? TreeRoot
    {
        get => _treeRoot;
        set { _treeRoot = value; OnPropertyChanged(); }
    }
    
    private bool _isTreeViewVisible = true;
    public bool IsTreeViewVisible
    {
        get => _isTreeViewVisible;
        set { _isTreeViewVisible = value; OnPropertyChanged(); }
    }
    
    public ICommand ToggleTreeViewVisibilityCommand { get; }
    public ICommand RefreshTreeViewCommand { get; }
    public ICommand SelectTreeNodeCommand { get; }
    
    public async Task LoadTreeAsync(string folderPath)
    {
        TreeRoot = await _treeService.BuildTreeAsync(folderPath);
    }
}
```

### 5. Create View

**File**: `src/UI/Sidebar/TreeView/TreeViewView.xaml`

```xml
<UserControl x:Class="MarkRead.UI.Sidebar.TreeView.TreeViewView"
             xmlns:local="clr-namespace:MarkRead.UI.Sidebar.TreeView">
    <Grid>
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/> <!-- Header with refresh button -->
            <RowDefinition Height="*"/>    <!-- TreeView -->
        </Grid.RowDefinitions>
        
        <StackPanel Grid.Row="0" Orientation="Horizontal">
            <TextBlock Text="Files" FontWeight="Bold" Margin="5"/>
            <Button Command="{Binding RefreshTreeViewCommand}" ToolTip="Refresh (Ctrl+R)">
                <Image Source="/Assets/refresh.png" Width="16" Height="16"/>
            </Button>
        </StackPanel>
        
        <TreeView Grid.Row="1" 
                  ItemsSource="{Binding TreeRoot.Children}"
                  VirtualizingPanel.IsVirtualizing="True">
            <TreeView.ItemContainerStyle>
                <Style TargetType="TreeViewItem">
                    <Setter Property="IsExpanded" Value="{Binding IsExpanded, Mode=TwoWay}"/>
                    <Setter Property="IsSelected" Value="{Binding IsSelected, Mode=TwoWay}"/>
                </Style>
            </TreeView.ItemContainerStyle>
            <TreeView.ItemTemplate>
                <HierarchicalDataTemplate ItemsSource="{Binding Children}">
                    <StackPanel Orientation="Horizontal">
                        <Image Source="{Binding Type, Converter={StaticResource NodeTypeToIconConverter}}" 
                               Width="16" Height="16" Margin="0,0,5,0"/>
                        <TextBlock Text="{Binding Name}"/>
                    </StackPanel>
                </HierarchicalDataTemplate>
            </TreeView.ItemTemplate>
        </TreeView>
    </Grid>
</UserControl>
```

### 6. Wire Up Events

**File**: `src/UI/Sidebar/TreeView/TreeViewView.xaml.cs`

```csharp
public partial class TreeViewView : UserControl
{
    public TreeViewView()
    {
        InitializeComponent();
    }
    
    private void OnTreeViewSelectedItemChanged(object sender, RoutedPropertyChangedEventArgs<object> e)
    {
        if (e.NewValue is TreeNode node && DataContext is TreeViewViewModel vm)
        {
            vm.SelectTreeNodeCommand.Execute(node);
        }
    }
}
```

### 7. Run and Test

```bash
# Build
dotnet build

# Run
dotnet run --project src/App/MarkRead.App.csproj

# Run tests
dotnet test tests/unit/TreeViewServiceTests.cs
dotnet test tests/integration/TreeViewIntegrationTests.cs
```

## Testing Strategy

### Unit Tests

**File**: `tests/unit/TreeViewServiceTests.cs`

```csharp
[Fact]
public async Task BuildTreeAsync_ExcludesFoldersWithoutMarkdown()
{
    // Arrange
    var service = new TreeViewService();
    var testFolder = CreateTestFolderStructure();
    
    // Act
    var root = await service.BuildTreeAsync(testFolder);
    
    // Assert
    Assert.DoesNotContain(root.Children, n => n.Name == "EmptyFolder");
}

[Fact]
public void SortNodes_FoldersBeforeFiles_Alphabetical()
{
    // Arrange
    var nodes = new List<TreeNode>
    {
        new TreeNode { Name = "zebra.md", Type = NodeType.File },
        new TreeNode { Name = "Apple", Type = NodeType.Folder },
        new TreeNode { Name = "banana.md", Type = NodeType.File },
    };
    
    // Act
    var sorted = TreeViewService.SortNodes(nodes);
    
    // Assert
    Assert.Equal("Apple", sorted[0].Name); // Folder first
    Assert.Equal("banana.md", sorted[1].Name); // Files alphabetical
}
```

### Integration Tests

**File**: `tests/integration/TreeViewIntegrationTests.cs`

```csharp
[Fact]
public async Task UserOpensFolder_TreeViewPopulates_SelectsLastViewedFile()
{
    // Arrange
    var testFolder = CreateTestFolderWithMarkdown();
    var lastViewed = Path.Combine(testFolder, "docs/guide.md");
    _historyService.SetLastViewedFile(testFolder, lastViewed);
    
    // Act
    await _viewModel.LoadTreeAsync(testFolder);
    var initialFile = await _treeService.DetermineInitialFileAsync(testFolder);
    
    // Assert
    Assert.Equal(lastViewed, initialFile);
    Assert.NotNull(_viewModel.TreeRoot);
    Assert.True(_viewModel.TreeRoot.Children.Count > 0);
}
```

## Common Issues and Solutions

### Issue: TreeView not updating when file system changes

**Solution**: Ensure FileSystemWatcher events are being raised on UI thread:

```csharp
Application.Current.Dispatcher.Invoke(() =>
{
    // Update TreeNode collection here
});
```

### Issue: Type-ahead search is laggy

**Solution**: Ensure debouncing is working correctly:

```csharp
private DispatcherTimer _typeAheadTimer = new DispatcherTimer 
{ 
    Interval = TimeSpan.FromMilliseconds(300) 
};
```

### Issue: Large folders cause UI freeze

**Solution**: Ensure async tree building and virtualization:

```xml
<TreeView VirtualizingPanel.IsVirtualizing="True"
          VirtualizingPanel.VirtualizationMode="Recycling">
```

### Issue: Symbolic links cause infinite recursion

**Solution**: Track visited directories and limit depth:

```csharp
private HashSet<string> _visitedPaths = new HashSet<string>();
private const int MaxDepth = 50;
```

## Performance Validation

### Metrics to Measure

Run these performance tests after implementation:

```csharp
[Fact]
public async Task Performance_InitialDisplay_LessThan1Second()
{
    var sw = Stopwatch.StartNew();
    await _markdownService.RenderAsync(testFile);
    sw.Stop();
    
    Assert.True(sw.ElapsedMilliseconds < 1000, $"Took {sw.ElapsedMilliseconds}ms");
}

[Fact]
public async Task Performance_TreeBuild_1000Files_LessThan5Seconds()
{
    var testFolder = CreateFolderWith1000MarkdownFiles();
    var sw = Stopwatch.StartNew();
    var tree = await _treeService.BuildTreeAsync(testFolder);
    sw.Stop();
    
    Assert.True(sw.ElapsedMilliseconds < 5000, $"Took {sw.ElapsedMilliseconds}ms");
}
```

## Next Steps

After completing this feature:

1. Update agent context: Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`
2. Generate tasks: Run `/speckit.tasks` to create detailed task breakdown
3. Begin implementation following the checklist above
4. Submit PR when all tests pass and performance criteria met

## References

- **Spec**: [spec.md](../spec.md)
- **Plan**: [plan.md](../plan.md)
- **Data Model**: [data-model.md](../data-model.md)
- **Commands Contract**: [contracts/commands.md](../contracts/commands.md)
- **Research**: [research.md](../research.md)
