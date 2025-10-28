using System;
using System.ComponentModel;
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
public class TreeViewViewModel : INotifyPropertyChanged
{
    private readonly TreeViewService _treeViewService;
    private CancellationTokenSource? _currentLoadCancellation;
    private Services.TreeNode? _previouslySelectedNode;

    public TreeViewViewModel(TreeViewService treeViewService)
    {
        _treeViewService = treeViewService;
        SelectTreeNodeCommand = new RelayCommand<Services.TreeNode>(ExecuteSelectTreeNode, CanSelectTreeNode);
    }

    /// <summary>
    /// Event raised when a file node is selected and should be navigated to.
    /// </summary>
    public event EventHandler<FileNavigationEventArgs>? NavigateToFileRequested;

    /// <summary>
    /// Command for selecting a tree node.
    /// </summary>
    public ICommand SelectTreeNodeCommand { get; }

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

    /// <summary>
    /// Loads the tree structure asynchronously for a given folder path.
    /// </summary>
    /// <param name="folderPath">Folder path to scan.</param>
    public async Task LoadTreeAsync(string folderPath)
    {
        // Cancel any existing load operation
        _currentLoadCancellation?.Cancel();
        _currentLoadCancellation = new CancellationTokenSource();

        CurrentFolderPath = folderPath;
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

    public event PropertyChangedEventHandler? PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
