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
public class TreeViewViewModel : INotifyPropertyChanged, IDisposable
{
    private readonly TreeViewService _treeViewService;
    private readonly FileWatcherService _fileWatcherService;
    private CancellationTokenSource? _currentLoadCancellation;
    private Services.TreeNode? _previouslySelectedNode;
    private IDisposable? _fileWatcherSubscription;

    public TreeViewViewModel(TreeViewService treeViewService, FileWatcherService fileWatcherService)
    {
        _treeViewService = treeViewService;
        _fileWatcherService = fileWatcherService;
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

        // Dispose previous file watcher subscription
        _fileWatcherSubscription?.Dispose();
        _fileWatcherSubscription = null;

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
