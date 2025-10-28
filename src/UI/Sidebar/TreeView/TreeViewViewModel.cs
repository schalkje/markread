using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Input;

using MarkRead.App.Services;

namespace MarkRead.App.UI.Sidebar.TreeView;

/// <summary>
/// Event args for file navigation requests.
/// </summary>
public class FileNavigationEventArgs : EventArgs
{
    public string FilePath { get; }

    public FileNavigationEventArgs(string filePath)
    {
        FilePath = filePath;
    }
}

/// <summary>
/// ViewModel for the TreeView control.
/// </summary>
public class TreeViewViewModel : INotifyPropertyChanged, IDisposable
{
    private readonly TreeViewService _treeViewService;
    private readonly FileWatcherService _fileWatcherService;
    private CancellationTokenSource? _currentLoadCancellation;
    private Services.TreeNode? _previouslySelectedNode;
    private IDisposable? _fileWatcherSubscription;
    
    // T069-T074: Type-ahead search
    private string _typeAheadBuffer = string.Empty;
    private System.Windows.Threading.DispatcherTimer? _typeAheadTimer;
    private System.Windows.Threading.DispatcherTimer? _typeAheadClearTimer;
    private List<Services.TreeNode> _autoExpandedNodes = new();

    public TreeViewViewModel(TreeViewService treeViewService, FileWatcherService fileWatcherService)
    {
        _treeViewService = treeViewService;
        _fileWatcherService = fileWatcherService;
        SelectTreeNodeCommand = new RelayCommand<Services.TreeNode>(ExecuteSelectTreeNode, CanSelectTreeNode);
        ToggleTreeViewVisibilityCommand = new RelayCommand(ExecuteToggleTreeViewVisibility);
        
        // T060, T061: Navigation commands
        NavigateTreeUpCommand = new RelayCommand(ExecuteNavigateTreeUp, CanNavigateTree);
        NavigateTreeDownCommand = new RelayCommand(ExecuteNavigateTreeDown, CanNavigateTree);
        
        // T063, T064: Expand/Collapse commands
        ExpandTreeNodeCommand = new RelayCommand(ExecuteExpandTreeNode, CanExpandTreeNode);
        CollapseTreeNodeCommand = new RelayCommand(ExecuteCollapseTreeNode, CanCollapseTreeNode);
        
        // T066: Refresh command
        RefreshTreeViewCommand = new RelayCommand(ExecuteRefreshTreeView, CanRefreshTreeView);
        
        // T069, T072: Type-ahead search commands
        TypeAheadSearchCommand = new RelayCommand<string>(ExecuteTypeAheadSearch);
        ClearTypeAheadSearchCommand = new RelayCommand(ExecuteClearTypeAheadSearch);
        
        // T069: Initialize type-ahead timer (300ms debounce)
        _typeAheadTimer = new System.Windows.Threading.DispatcherTimer
        {
            Interval = TimeSpan.FromMilliseconds(300)
        };
        _typeAheadTimer.Tick += (s, e) =>
        {
            _typeAheadTimer.Stop();
            ExecuteTypeAheadSearch(_typeAheadBuffer);
        };
        
        // T074: Auto-clear timer (2 seconds)
        _typeAheadClearTimer = new System.Windows.Threading.DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(2)
        };
        _typeAheadClearTimer.Tick += (s, e) =>
        {
            _typeAheadClearTimer.Stop();
            ExecuteClearTypeAheadSearch();
        };
    }

    /// <summary>
    /// Event raised when a file node is selected and should be navigated to.
    /// </summary>
    public event EventHandler<FileNavigationEventArgs>? NavigateToFileRequested;

    /// <summary>
    /// Command for selecting a tree node.
    /// </summary>
    public ICommand SelectTreeNodeCommand { get; }

    /// <summary>
    /// T042: Command for toggling treeview visibility.
    /// </summary>
    public ICommand ToggleTreeViewVisibilityCommand { get; }

    /// <summary>
    /// T060: Command for navigating up in the tree.
    /// </summary>
    public ICommand NavigateTreeUpCommand { get; }

    /// <summary>
    /// T061: Command for navigating down in the tree.
    /// </summary>
    public ICommand NavigateTreeDownCommand { get; }

    /// <summary>
    /// T063: Command for expanding a tree node.
    /// </summary>
    public ICommand ExpandTreeNodeCommand { get; }

    /// <summary>
    /// T064: Command for collapsing a tree node.
    /// </summary>
    public ICommand CollapseTreeNodeCommand { get; }

    /// <summary>
    /// T066: Command for refreshing the tree view.
    /// </summary>
    public ICommand RefreshTreeViewCommand { get; }

    /// <summary>
    /// T069: Command for type-ahead search.
    /// </summary>
    public ICommand TypeAheadSearchCommand { get; }

    /// <summary>
    /// T072: Command for clearing type-ahead search.
    /// </summary>
    public ICommand ClearTypeAheadSearchCommand { get; }

    private Services.TreeNode? _treeRoot;
    /// <summary>
    /// Root node of the tree structure.
    /// </summary>
    public Services.TreeNode? TreeRoot
    {
        get => _treeRoot;
        set
        {
            if (_treeRoot != value)
            {
                _treeRoot = value;
                OnPropertyChanged();
            }
        }
    }

    private bool _isLoading;
    /// <summary>
    /// Indicates whether the tree is currently being loaded.
    /// </summary>
    public bool IsLoading
    {
        get => _isLoading;
        set
        {
            if (_isLoading != value)
            {
                _isLoading = value;
                OnPropertyChanged();
            }
        }
    }

    private int _fileCount;
    /// <summary>
    /// Number of markdown files found during loading.
    /// </summary>
    public int FileCount
    {
        get => _fileCount;
        set
        {
            if (_fileCount != value)
            {
                _fileCount = value;
                OnPropertyChanged();
            }
        }
    }

    private string? _currentFolderPath;
    /// <summary>
    /// Current folder path being displayed.
    /// </summary>
    public string? CurrentFolderPath
    {
        get => _currentFolderPath;
        set
        {
            if (_currentFolderPath != value)
            {
                _currentFolderPath = value;
                OnPropertyChanged();
            }
        }
    }

    private bool _isTreeViewVisible = true;
    /// <summary>
    /// T041: Indicates whether the treeview is visible.
    /// </summary>
    public bool IsTreeViewVisible
    {
        get => _isTreeViewVisible;
        set
        {
            if (_isTreeViewVisible != value)
            {
                _isTreeViewVisible = value;
                OnPropertyChanged();
            }
        }
    }

    /// <summary>
    /// Loads the tree structure asynchronously for a given folder path.
    /// </summary>
    /// <param name="folderPath">Folder path to scan.</param>
    public async Task LoadTreeAsync(string folderPath)
    {
        // Cancel any existing load operation
        _currentLoadCancellation?.Cancel();
        _currentLoadCancellation = new CancellationTokenSource();

        // Dispose previous file watcher subscription
        _fileWatcherSubscription?.Dispose();
        _fileWatcherSubscription = null;

        CurrentFolderPath = folderPath;
        
        // T047: Restore visibility preference for this folder
        IsTreeViewVisible = _treeViewService.LoadVisibilityPreference(folderPath);
        
        IsLoading = true;
        FileCount = 0;

        try
        {
            var progress = new Progress<int>(count =>
            {
                FileCount += count;
            });

            var root = await _treeViewService.BuildTreeAsync(
                folderPath,
                progress,
                _currentLoadCancellation.Token);

            TreeRoot = root;

            // T035: Wire up file watcher for real-time updates
            StartFileWatching(folderPath);
        }
        catch (OperationCanceledException)
        {
            // Load was cancelled, ignore
        }
        catch (Exception ex)
        {
            // Log error or show to user
            System.Diagnostics.Debug.WriteLine($"Error loading tree: {ex.Message}");
            TreeRoot = null;
        }
        finally
        {
            IsLoading = false;
        }
    }

    /// <summary>
    /// T035: Starts watching for file system changes in the current folder.
    /// </summary>
    private void StartFileWatching(string folderPath)
    {
        try
        {
            _fileWatcherSubscription = _fileWatcherService.WatchMarkdownFiles(
                folderPath,
                OnFileSystemChanged);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Error starting file watcher: {ex.Message}");
        }
    }

    /// <summary>
    /// T035: Handles file system change events and updates the tree.
    /// </summary>
    private void OnFileSystemChanged(System.IO.FileSystemEventArgs eventArgs)
    {
        if (TreeRoot == null)
        {
            return;
        }

        // Update tree on UI thread
        System.Windows.Application.Current?.Dispatcher.BeginInvoke(() =>
        {
            try
            {
                _treeViewService.HandleFileSystemChange(TreeRoot, eventArgs);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error handling file system change: {ex.Message}");
            }
        });
    }

    private bool CanSelectTreeNode(Services.TreeNode? node)
    {
        return node != null;
    }

    private void ExecuteSelectTreeNode(Services.TreeNode? node)
    {
        if (node == null) return;

        // Deselect previously selected node
        if (_previouslySelectedNode != null && _previouslySelectedNode != node)
        {
            _previouslySelectedNode.IsSelected = false;
        }

        // Select the new node
        node.IsSelected = true;
        _previouslySelectedNode = node;

        // If it's a file node, raise navigation event
        if (node.Type == Services.NodeType.File)
        {
            NavigateToFileRequested?.Invoke(this, new FileNavigationEventArgs(node.FullPath));
        }
        // If it's a folder node, toggle expansion
        else if (node.Type == Services.NodeType.Folder)
        {
            node.IsExpanded = !node.IsExpanded;
        }
    }

    /// <summary>
    /// T043: Toggles treeview visibility and saves preference.
    /// </summary>
    private void ExecuteToggleTreeViewVisibility()
    {
        IsTreeViewVisible = !IsTreeViewVisible;

        if (!string.IsNullOrEmpty(CurrentFolderPath))
        {
            _treeViewService.SaveVisibilityPreference(CurrentFolderPath, IsTreeViewVisible);
        }
    }

    #region T060-T076: Keyboard Navigation

    /// <summary>
    /// T062: Gets all visible nodes in depth-first order.
    /// </summary>
    private List<Services.TreeNode> GetVisibleNodesInOrder()
    {
        var nodes = new List<Services.TreeNode>();
        if (TreeRoot != null)
        {
            CollectVisibleNodes(TreeRoot, nodes);
        }
        return nodes;
    }

    private void CollectVisibleNodes(Services.TreeNode node, List<Services.TreeNode> result)
    {
        if (!node.IsVisible) return;

        // Don't add root node itself
        if (node.Parent != null)
        {
            result.Add(node);
        }

        // Add children if expanded
        if (node.IsExpanded)
        {
            foreach (var child in node.Children.OrderBy(c => c.Type).ThenBy(c => c.Name))
            {
                CollectVisibleNodes(child, result);
            }
        }
    }

    private bool CanNavigateTree() => TreeRoot != null && TreeRoot.Children.Count > 0;

    /// <summary>
    /// T060: Navigate to previous visible node in tree.
    /// </summary>
    private void ExecuteNavigateTreeUp()
    {
        var visibleNodes = GetVisibleNodesInOrder();
        if (visibleNodes.Count == 0) return;

        var currentNode = _previouslySelectedNode;
        if (currentNode == null)
        {
            // Select first node
            SelectTreeNodeCommand.Execute(visibleNodes[0]);
            return;
        }

        var currentIndex = visibleNodes.IndexOf(currentNode);
        if (currentIndex > 0)
        {
            SelectTreeNodeCommand.Execute(visibleNodes[currentIndex - 1]);
        }
    }

    /// <summary>
    /// T061: Navigate to next visible node in tree.
    /// </summary>
    private void ExecuteNavigateTreeDown()
    {
        var visibleNodes = GetVisibleNodesInOrder();
        if (visibleNodes.Count == 0) return;

        var currentNode = _previouslySelectedNode;
        if (currentNode == null)
        {
            // Select first node
            SelectTreeNodeCommand.Execute(visibleNodes[0]);
            return;
        }

        var currentIndex = visibleNodes.IndexOf(currentNode);
        if (currentIndex >= 0 && currentIndex < visibleNodes.Count - 1)
        {
            SelectTreeNodeCommand.Execute(visibleNodes[currentIndex + 1]);
        }
    }

    private bool CanExpandTreeNode() => _previouslySelectedNode?.Type == Services.NodeType.Folder && !_previouslySelectedNode.IsExpanded;

    /// <summary>
    /// T063: Expand the currently selected folder node.
    /// </summary>
    private void ExecuteExpandTreeNode()
    {
        if (_previouslySelectedNode?.Type == Services.NodeType.Folder)
        {
            _previouslySelectedNode.IsExpanded = true;
        }
    }

    private bool CanCollapseTreeNode() => _previouslySelectedNode?.Type == Services.NodeType.Folder && _previouslySelectedNode.IsExpanded;

    /// <summary>
    /// T064: Collapse the currently selected folder node.
    /// </summary>
    private void ExecuteCollapseTreeNode()
    {
        if (_previouslySelectedNode?.Type == Services.NodeType.Folder)
        {
            _previouslySelectedNode.IsExpanded = false;
        }
    }

    private bool CanRefreshTreeView() => !string.IsNullOrEmpty(CurrentFolderPath) && !IsLoading;

    /// <summary>
    /// T066, T067: Refresh the tree view by rebuilding from file system.
    /// </summary>
    private async void ExecuteRefreshTreeView()
    {
        if (string.IsNullOrEmpty(CurrentFolderPath)) return;

        // Cancel existing load
        _currentLoadCancellation?.Cancel();
        
        // Clear tree
        TreeRoot = null;
        _previouslySelectedNode = null;

        // Rebuild
        await LoadTreeAsync(CurrentFolderPath);
    }

    /// <summary>
    /// T070: Adds a character to the type-ahead buffer and starts/restarts timers.
    /// </summary>
    public void AppendTypeAheadCharacter(char c)
    {
        _typeAheadBuffer += c;
        
        // Restart debounce timer
        _typeAheadTimer?.Stop();
        _typeAheadTimer?.Start();
        
        // Restart auto-clear timer
        _typeAheadClearTimer?.Stop();
        _typeAheadClearTimer?.Start();
    }

    /// <summary>
    /// T071: Execute type-ahead search - filter nodes and expand parents.
    /// </summary>
    private void ExecuteTypeAheadSearch(string? searchText)
    {
        if (string.IsNullOrWhiteSpace(searchText) || TreeRoot == null)
        {
            ExecuteClearTypeAheadSearch();
            return;
        }

        _autoExpandedNodes.Clear();
        var hasMatches = FilterNodes(TreeRoot, searchText, false);
        
        // If no matches, show all nodes
        if (!hasMatches)
        {
            ExecuteClearTypeAheadSearch();
        }
    }

    /// <summary>
    /// T071: Recursively filter nodes by search text (case-insensitive contains).
    /// Returns true if this node or any descendant matches.
    /// </summary>
    private bool FilterNodes(Services.TreeNode node, string searchText, bool parentMatches)
    {
        var nodeMatches = node.Name.Contains(searchText, StringComparison.OrdinalIgnoreCase);
        var anyChildMatches = false;

        // Check children
        foreach (var child in node.Children)
        {
            var childOrDescendantMatches = FilterNodes(child, searchText, nodeMatches || parentMatches);
            anyChildMatches = anyChildMatches || childOrDescendantMatches;
        }

        // Show this node if it matches or has matching descendants
        var shouldShow = nodeMatches || anyChildMatches || parentMatches;
        node.IsVisible = shouldShow;

        // Expand folders that contain matches (but weren't already expanded)
        if (node.Type == Services.NodeType.Folder && anyChildMatches && !node.IsExpanded)
        {
            node.IsExpanded = true;
            _autoExpandedNodes.Add(node);
        }

        return nodeMatches || anyChildMatches;
    }

    /// <summary>
    /// T073: Clear type-ahead search - show all nodes and collapse auto-expanded folders.
    /// </summary>
    private void ExecuteClearTypeAheadSearch()
    {
        _typeAheadBuffer = string.Empty;
        _typeAheadTimer?.Stop();
        _typeAheadClearTimer?.Stop();

        if (TreeRoot == null) return;

        // Show all nodes
        ResetNodeVisibility(TreeRoot);

        // Collapse auto-expanded folders
        foreach (var node in _autoExpandedNodes)
        {
            node.IsExpanded = false;
        }
        _autoExpandedNodes.Clear();
    }

    private void ResetNodeVisibility(Services.TreeNode node)
    {
        node.IsVisible = true;
        foreach (var child in node.Children)
        {
            ResetNodeVisibility(child);
        }
    }

    #endregion

    public event PropertyChangedEventHandler? PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }

    public void Dispose()
    {
        _currentLoadCancellation?.Cancel();
        _currentLoadCancellation?.Dispose();
        _fileWatcherSubscription?.Dispose();
    }
}
