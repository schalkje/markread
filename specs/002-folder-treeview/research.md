# Research: Folder Structure Treeview

**Feature**: 002-folder-treeview  
**Date**: October 28, 2025  
**Purpose**: Resolve technical unknowns and establish implementation patterns

## Research Tasks

### 1. WPF TreeView Control Selection

**Decision**: Use built-in System.Windows.Controls.TreeView with HierarchicalDataTemplate

**Rationale**: 
- Native WPF TreeView provides keyboard navigation out-of-the-box (arrow keys, Enter, Escape)
- Supports data binding with MVVM pattern via HierarchicalDataTemplate
- Includes built-in virtualization for performance with large trees
- Well-documented and stable component in .NET ecosystem
- Avoids third-party dependencies and licensing concerns

**Alternatives Considered**:
- **Third-party controls** (e.g., Telerik, Syncfusion): Rejected due to licensing costs and unnecessary complexity for our needs
- **Custom TreeView implementation**: Rejected due to development overhead and need to reimplement keyboard navigation, virtualization, and accessibility features
- **ListView with indentation**: Rejected due to poor UX for hierarchical data and complexity of expanding/collapsing

### 2. Asynchronous Tree Building Pattern

**Decision**: Use Task-based async/await with CancellationToken for background tree population

**Rationale**:
- Async/await pattern is idiomatic in modern C# and integrates well with WPF
- CancellationToken allows canceling ongoing scans when user navigates away
- Enables reporting progress to UI without blocking
- Aligns with .NET 8 best practices for I/O-bound operations

**Implementation Pattern**:
```csharp
public async Task<TreeNode> BuildTreeAsync(string rootPath, IProgress<int> progress, CancellationToken ct)
{
    // Scan directories recursively
    // Report progress for UI feedback
    // Respect cancellation for responsiveness
    // Filter folders without markdown files
}
```

**Alternatives Considered**:
- **BackgroundWorker**: Rejected as outdated pattern in modern .NET
- **Synchronous with UI freeze**: Rejected due to poor UX and violates SC-001 (1s display requirement)
- **Reactive Extensions (Rx)**: Rejected as unnecessarily complex for this use case

### 3. File System Monitoring Strategy

**Decision**: Enhance existing FileSystemWatcher with markdown-specific filtering and debouncing

**Rationale**:
- FileSystemWatcher already exists in the codebase (FileWatcherService.cs)
- Built-in .NET component with low CPU overhead when properly configured
- Supports filtering by file extension (*.md, *.markdown)
- Can watch subdirectories recursively with NotifyFilters configuration

**Performance Optimization**:
- Use NotifyFilter to watch only Created, Deleted, Renamed events (ignore Changed for metadata)
- Implement 500ms debounce to batch rapid changes (e.g., git operations)
- Filter events to markdown extensions only
- Use InternalBufferSize = 64KB to handle burst operations without missing events

**Alternatives Considered**:
- **Polling**: Rejected due to higher CPU usage and delayed updates
- **Manual refresh only**: Rejected as spec requires real-time updates (FR-014)
- **Third-party file watching libraries**: Rejected as FileSystemWatcher meets requirements with proper configuration

### 4. Type-Ahead Search Implementation

**Decision**: Implement incremental search with 300ms typing debounce using DispatcherTimer

**Rationale**:
- DispatcherTimer integrates with WPF UI thread for safe UI updates
- 300ms debounce balances responsiveness with performance (fewer searches during rapid typing)
- Simple implementation using string.Contains for matching (case-insensitive)
- Can be enhanced later with fuzzy matching if needed

**Implementation Pattern**:
```csharp
private DispatcherTimer _typeAheadTimer;
private string _searchBuffer = "";

void OnPreviewTextInput(object sender, TextCompositionEventArgs e)
{
    _searchBuffer += e.Text;
    _typeAheadTimer.Stop();
    _typeAheadTimer.Start(); // Will fire after 300ms of no typing
}

void OnTypeAheadTimerTick(object sender, EventArgs e)
{
    _typeAheadTimer.Stop();
    FilterTreeView(_searchBuffer); // Highlight/filter matching nodes
    _searchBuffer = "";
}
```

**Alternatives Considered**:
- **Immediate search on keypress**: Rejected due to performance impact on large trees
- **Modal search dialog**: Rejected as too disruptive to navigation flow
- **Full-text search**: Rejected as out of scope (searching node names only)

### 5. Settings Persistence Strategy

**Decision**: Extend existing SettingsService with JSON serialization for treeview preferences

**Rationale**:
- SettingsService.cs already exists and handles user preferences
- JSON is human-readable and easy to debug
- .NET 8 System.Text.Json provides high-performance serialization
- Can store both global preferences and per-folder dictionary in single settings file

**Data Structure**:
```csharp
public class TreeViewSettings
{
    public bool DefaultVisible { get; set; } = true;
    public Dictionary<string, FolderTreeSettings> PerFolderSettings { get; set; } = new();
}

public class FolderTreeSettings
{
    public bool IsVisible { get; set; }
    public string? LastViewedFile { get; set; }
}
```

**Alternatives Considered**:
- **Windows Registry**: Rejected as less portable and harder to debug
- **SQLite database**: Rejected as overkill for simple key-value storage
- **XML configuration**: Rejected in favor of more modern JSON format

### 6. Tree Node Sorting Algorithm

**Decision**: Use LINQ OrderBy with custom StringComparer for case-insensitive natural sorting

**Rationale**:
- LINQ provides readable, maintainable code
- StringComparer.OrdinalIgnoreCase handles case-insensitivity
- Can easily implement "folders before files" with ThenBy
- Performance is acceptable for typical tree sizes (< 1000 nodes per level)

**Implementation Pattern**:
```csharp
var sortedNodes = nodes
    .OrderBy(n => n.Type != NodeType.Folder) // Folders first (false < true)
    .ThenBy(n => n.Name, StringComparer.OrdinalIgnoreCase);
```

**Alternatives Considered**:
- **Natural sort with numbers** (e.g., "file2.md" before "file10.md"): Deferred as not in spec requirements
- **Custom IComparer**: Rejected as LINQ is simpler and sufficient
- **Lazy sorting on-demand**: Rejected as premature optimization

### 7. Initial File Selection Logic

**Decision**: Cascade through HistoryService → README.md existence check → alphabetical first file

**Rationale**:
- HistoryService already exists and tracks viewed files
- README.md is conventional entry point for documentation folders
- Falls back to deterministic alphabetical order for consistency
- Aligns with FR-018 and FR-019 requirements

**Implementation Pattern**:
```csharp
public async Task<string?> DetermineInitialFileAsync(string folderPath)
{
    // 1. Check HistoryService for last viewed file
    var lastViewed = _historyService.GetLastViewedFile(folderPath);
    if (lastViewed != null && File.Exists(lastViewed))
        return lastViewed;
    
    // 2. Check for README.md in root
    var readmePath = Path.Combine(folderPath, "README.md");
    if (File.Exists(readmePath))
        return readmePath;
    
    // 3. Get first markdown file alphabetically
    var markdownFiles = await GetMarkdownFilesAsync(folderPath);
    return markdownFiles.OrderBy(f => f, StringComparer.OrdinalIgnoreCase).FirstOrDefault();
}
```

**Alternatives Considered**:
- **Most recently modified file**: Rejected as not aligned with spec
- **Random file**: Rejected due to non-deterministic behavior
- **Always README.md**: Rejected as spec requires last-viewed to take precedence

### 8. Empty Folder Filtering Strategy

**Decision**: Recursive bottom-up traversal to filter folders without markdown files

**Rationale**:
- Bottom-up ensures child folders are evaluated before parents
- Prevents showing folders that only contain empty subfolders
- Single-pass algorithm with O(n) complexity where n = total folders
- Can be done during initial tree building without separate filtering pass

**Implementation Pattern**:
```csharp
private bool HasMarkdownFiles(DirectoryInfo dir)
{
    // Check direct markdown files
    if (dir.GetFiles("*.md").Any() || dir.GetFiles("*.markdown").Any())
        return true;
    
    // Recursively check subdirectories
    foreach (var subdir in dir.GetDirectories())
    {
        if (HasMarkdownFiles(subdir))
            return true;
    }
    
    return false;
}
```

**Alternatives Considered**:
- **Lazy evaluation on expand**: Rejected as may show folders that become empty when expanded
- **Caching with invalidation**: Deferred as optimization if performance issues arise
- **Separate filtering pass**: Rejected as less efficient than single bottom-up traversal

## Best Practices Applied

### WPF TreeView with MVVM
- Use HierarchicalDataTemplate for clean XAML data binding
- Implement INotifyPropertyChanged in ViewModel for reactive UI updates
- Bind SelectedItem to ViewModel property for testability
- Use Commands for user interactions (expand, select, refresh)

### Async File I/O
- Always use async file system APIs (Directory.EnumerateFilesAsync, File.ExistsAsync)
- Provide CancellationToken for long-running operations
- Report progress for operations > 1 second
- Handle OperationCanceledException gracefully

### Performance Optimization
- Enable TreeView virtualization (VirtualizingPanel.IsVirtualizing="True")
- Use lazy loading for large trees (load children on expand if needed)
- Debounce file system events and type-ahead search
- Cache file system queries where appropriate with invalidation on changes

### Keyboard Accessibility
- Ensure TreeView participates in tab order
- Verify screen reader compatibility with AutomationProperties
- Support standard keyboard shortcuts (Ctrl+R, F5)
- Handle arrow keys, Enter, Escape via TreeView's built-in support

### Error Handling
- Catch UnauthorizedAccessException for permission issues
- Log file system errors without crashing
- Show user-friendly error messages in tree (e.g., "Access Denied")
- Gracefully handle symbolic link loops with depth limits

## Performance Targets Validation

| Requirement | Target | Strategy | Confidence |
|-------------|--------|----------|------------|
| SC-001 | Initial display < 1s | Async tree building doesn't block rendering | High |
| SC-002 | Tree load < 5s for 1000 files | Async I/O + virtualization | High |
| SC-003 | Navigation < 500ms | Direct file system access + caching | High |
| SC-004 | Toggle < 100ms | Simple visibility property binding | High |
| SC-008 | File watching < 2% CPU | FileSystemWatcher with filtering + debounce | High |
| SC-009 | Updates < 2s after changes | FileSystemWatcher notification latency | Medium |
| SC-010 | Type-ahead < 100ms | 300ms debounce + simple string matching | High |
| SC-011 | Full keyboard accessibility | Built-in TreeView keyboard support | High |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| FileSystemWatcher buffer overflow on rapid changes | Updates lost | Increase InternalBufferSize to 64KB; implement recovery on Error event |
| Deep folder recursion causes stack overflow | Crash | Implement depth limit (e.g., 50 levels) with warning message |
| Symbolic link loops cause infinite recursion | Hang/crash | Track visited paths; limit depth; timeout on scans |
| Large folders (10k+ files) cause UI freeze | Poor UX | Virtualization + lazy loading + progress reporting |
| Type-ahead search on huge trees is slow | Laggy UX | Index node names in dictionary for O(1) lookup; use background search |

## Open Questions for Implementation

None - all technical unknowns resolved through research.
