using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MarkRead.Models;
using MarkRead.Services;
using System.Collections.ObjectModel;

namespace MarkRead.ViewModels;

/// <summary>
/// ViewModel for file tree navigation
/// </summary>
public partial class FileTreeViewModel : ObservableObject
{
    private readonly IFileSystemService _fileSystemService;
    private readonly ILoggingService _loggingService;
    private readonly INavigationService _navigationService;
    private System.Timers.Timer? _searchClearTimer;

    [ObservableProperty]
    private string? _rootPath;

    [ObservableProperty]
    private ObservableCollection<FileTreeNode> _nodes = new();

    [ObservableProperty]
    private FileTreeNode? _selectedNode;

    [ObservableProperty]
    private string _searchQuery = string.Empty;

    [ObservableProperty]
    private bool _isLoading;

    /// <summary>
    /// Event raised when a file is opened
    /// </summary>
    public event EventHandler<string>? FileOpened;

    public FileTreeViewModel(
        IFileSystemService fileSystemService,
        ILoggingService loggingService,
        INavigationService navigationService)
    {
        _fileSystemService = fileSystemService;
        _loggingService = loggingService;
        _navigationService = navigationService;
    }

    /// <summary>
    /// Loads a folder into the file tree
    /// </summary>
    [RelayCommand]
    private async Task LoadFolderAsync(string folderPath)
    {
        if (string.IsNullOrEmpty(folderPath) || !Directory.Exists(folderPath))
        {
            _loggingService.LogError($"Invalid folder path: {folderPath}", null);
            System.Diagnostics.Debug.WriteLine($"ERROR: Invalid folder path: {folderPath}");
            return;
        }

        try
        {
            IsLoading = true;
            RootPath = folderPath;
            
            System.Diagnostics.Debug.WriteLine($"Loading folder: {folderPath}");

            var rootNode = await _fileSystemService.LoadDirectoryAsync(folderPath);
            
            System.Diagnostics.Debug.WriteLine($"Root node loaded: {rootNode.Name}, Children: {rootNode.Children.Count}");
            
            Nodes.Clear();
            
            // Flatten the tree structure for display
            FlattenNodes(rootNode, Nodes);

            _loggingService.LogInfo($"Loaded folder tree: {folderPath} with {Nodes.Count} nodes");
            System.Diagnostics.Debug.WriteLine($"Flattened nodes count: {Nodes.Count}");
            
            foreach (var node in Nodes.Take(5))
            {
                System.Diagnostics.Debug.WriteLine($"  Node: {node.Name} (Level {node.Level}, Type: {node.Type})");
            }
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"Failed to load folder: {folderPath}", ex);
            System.Diagnostics.Debug.WriteLine($"ERROR loading folder: {ex.Message}");
        }
        finally
        {
            IsLoading = false;
        }
    }

    /// <summary>
    /// Flattens the tree structure into a single list for display
    /// </summary>
    private void FlattenNodes(FileTreeNode node, ObservableCollection<FileTreeNode> flatList)
    {
        flatList.Add(node);
        
        if (node.IsExpanded && node.Children.Count > 0)
        {
            foreach (var child in node.Children)
            {
                FlattenNodes(child, flatList);
            }
        }
    }

    /// <summary>
    /// Toggles expansion state of a node
    /// </summary>
    [RelayCommand]
    private void ToggleNodeExpansion(FileTreeNode node)
    {
        if (node.Type == FileTreeNodeType.File)
            return;

        node.IsExpanded = !node.IsExpanded;
        _loggingService.LogInfo($"Toggled node: {node.Name} (expanded: {node.IsExpanded})");
        
        // Rebuild the flattened list to show/hide children
        if (RootPath != null)
        {
            RefreshFlattenedView();
        }
    }

    /// <summary>
    /// Refreshes the flattened view of the tree
    /// </summary>
    private void RefreshFlattenedView()
    {
        if (Nodes.Count == 0) return;
        
        // Find root node (should be first)
        var rootNode = Nodes[0];
        while (rootNode.Parent != null)
        {
            rootNode = rootNode.Parent;
        }
        
        Nodes.Clear();
        FlattenNodes(rootNode, Nodes);
    }

    /// <summary>
    /// Opens a file node
    /// </summary>
    [RelayCommand]
    private void OpenFile(FileTreeNode node)
    {
        if (node.Type != FileTreeNodeType.File)
            return;

        SelectedNode = node;
        node.IsSelected = true;
        
        FileOpened?.Invoke(this, node.Path);
        _loggingService.LogInfo($"Opened file: {node.Path}");
    }

    /// <summary>
    /// Refreshes the file tree
    /// </summary>
    [RelayCommand]
    private async Task RefreshAsync()
    {
        if (RootPath != null)
        {
            await LoadFolderAsync(RootPath);
        }
    }

    /// <summary>
    /// Handles search query changes with auto-clear timer (2 seconds)
    /// </summary>
    partial void OnSearchQueryChanged(string value)
    {
        // Reset timer
        _searchClearTimer?.Stop();
        _searchClearTimer?.Dispose();

        if (!string.IsNullOrWhiteSpace(value))
        {
            // Filter nodes
            FilterNodes(value);

            // Setup 2-second auto-clear timer
            _searchClearTimer = new System.Timers.Timer(2000);
            _searchClearTimer.Elapsed += (s, e) =>
            {
                SearchQuery = string.Empty;
                _searchClearTimer?.Dispose();
                _searchClearTimer = null;
            };
            _searchClearTimer.AutoReset = false;
            _searchClearTimer.Start();
        }
        else
        {
            // Clear filter
            ResetNodeVisibility();
        }
    }

    /// <summary>
    /// Filters nodes based on search query
    /// </summary>
    private void FilterNodes(string query)
    {
        if (Nodes.Count == 0)
            return;

        var lowerQuery = query.ToLowerInvariant();
        
        foreach (var node in Nodes)
        {
            FilterNodeRecursive(node, lowerQuery);
        }
    }

    /// <summary>
    /// Recursively filters nodes
    /// </summary>
    private bool FilterNodeRecursive(FileTreeNode node, string query)
    {
        bool matches = node.Name.ToLowerInvariant().Contains(query);
        bool hasMatchingChild = false;

        // Check children
        foreach (var child in node.Children)
        {
            if (FilterNodeRecursive(child, query))
            {
                hasMatchingChild = true;
            }
        }

        // Node is visible if it matches or has matching children
        var shouldBeVisible = matches || hasMatchingChild;
        
        // Auto-expand if has matching children
        if (hasMatchingChild)
        {
            node.IsExpanded = true;
        }

        return shouldBeVisible;
    }

    /// <summary>
    /// Resets node visibility after search clear
    /// </summary>
    private void ResetNodeVisibility()
    {
        foreach (var node in Nodes)
        {
            ResetNodeRecursive(node);
        }
    }

    /// <summary>
    /// Recursively resets node visibility
    /// </summary>
    private void ResetNodeRecursive(FileTreeNode node)
    {
        // Reset to default expansion (root expanded, others collapsed)
        if (node.Level == 0)
        {
            node.IsExpanded = true;
        }
        else
        {
            node.IsExpanded = false;
        }

        foreach (var child in node.Children)
        {
            ResetNodeRecursive(child);
        }
    }
}
