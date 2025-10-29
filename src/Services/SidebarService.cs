using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.IO;
using System.Linq;

namespace MarkRead.App.Services;

/// <summary>
/// Represents a node in the file tree (file or folder)
/// </summary>
public class FileTreeNode : INotifyPropertyChanged
{
    private bool _isExpanded;
    private bool _isSelected;
    private string _displayName = string.Empty;
    private string _fullPath = string.Empty;
    private bool _isFolder;
    private ObservableCollection<FileTreeNode> _children = new();

    public event PropertyChangedEventHandler? PropertyChanged;

    public string DisplayName
    {
        get => _displayName;
        set
        {
            if (_displayName != value)
            {
                _displayName = value;
                OnPropertyChanged(nameof(DisplayName));
            }
        }
    }

    public string FullPath
    {
        get => _fullPath;
        set
        {
            if (_fullPath != value)
            {
                _fullPath = value;
                OnPropertyChanged(nameof(FullPath));
            }
        }
    }

    public bool IsFolder
    {
        get => _isFolder;
        set
        {
            if (_isFolder != value)
            {
                _isFolder = value;
                OnPropertyChanged(nameof(IsFolder));
            }
        }
    }

    public bool IsExpanded
    {
        get => _isExpanded;
        set
        {
            if (_isExpanded != value)
            {
                _isExpanded = value;
                OnPropertyChanged(nameof(IsExpanded));
            }
        }
    }

    public bool IsSelected
    {
        get => _isSelected;
        set
        {
            if (_isSelected != value)
            {
                _isSelected = value;
                OnPropertyChanged(nameof(IsSelected));
            }
        }
    }

    public ObservableCollection<FileTreeNode> Children
    {
        get => _children;
        set
        {
            if (_children != value)
            {
                _children = value;
                OnPropertyChanged(nameof(Children));
            }
        }
    }

    public FileTreeNode? Parent { get; set; }

    protected virtual void OnPropertyChanged(string propertyName)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}

/// <summary>
/// Service interface for managing sidebar file tree state and navigation
/// </summary>
public interface ISidebarService
{
    /// <summary>
    /// Root folder path currently displayed in sidebar
    /// </summary>
    string? RootFolder { get; }

    /// <summary>
    /// Root nodes of the file tree
    /// </summary>
    ObservableCollection<FileTreeNode> TreeNodes { get; }

    /// <summary>
    /// Currently selected file or folder node
    /// </summary>
    FileTreeNode? SelectedNode { get; }

    /// <summary>
    /// Whether the sidebar is currently collapsed
    /// </summary>
    bool IsCollapsed { get; }

    /// <summary>
    /// Current width of the sidebar in pixels
    /// </summary>
    double Width { get; }

    /// <summary>
    /// Raised when a file is selected
    /// </summary>
    event EventHandler<string>? FileSelected;

    /// <summary>
    /// Raised when a folder is expanded or collapsed
    /// </summary>
    event EventHandler<FileTreeNode>? FolderToggled;

    /// <summary>
    /// Raised when the selected node changes
    /// </summary>
    event EventHandler<FileTreeNode?>? SelectionChanged;

    /// <summary>
    /// Raised when the sidebar collapse state changes
    /// </summary>
    event EventHandler<bool>? CollapseStateChanged;

    /// <summary>
    /// Raised when the sidebar width changes
    /// </summary>
    event EventHandler<double>? WidthChanged;

    /// <summary>
    /// Set the root folder for the file tree
    /// </summary>
    void SetRootFolder(string? folderPath);

    /// <summary>
    /// Refresh the file tree from disk
    /// </summary>
    void Refresh();

    /// <summary>
    /// Select a specific node in the tree
    /// </summary>
    void SelectNode(FileTreeNode node);

    /// <summary>
    /// Expand or collapse a folder node
    /// </summary>
    void ToggleFolder(FileTreeNode node);

    /// <summary>
    /// Expand a folder node and all its ancestors
    /// </summary>
    void ExpandPath(string filePath);

    /// <summary>
    /// Collapse the sidebar
    /// </summary>
    void Collapse();

    /// <summary>
    /// Expand the sidebar
    /// </summary>
    void Expand();

    /// <summary>
    /// Toggle the sidebar collapse state
    /// </summary>
    void ToggleCollapse();

    /// <summary>
    /// Set the sidebar width
    /// </summary>
    void SetWidth(double width);

    /// <summary>
    /// Find a node by its full path
    /// </summary>
    FileTreeNode? FindNode(string fullPath);
}

/// <summary>
/// Implementation of sidebar service for managing file tree state
/// </summary>
public class SidebarService : ISidebarService
{
    private string? _rootFolder;
    private FileTreeNode? _selectedNode;
    private bool _isCollapsed;
    private double _width = 300; // Default width
    private const double MinWidth = 200;
    private const double MaxWidth = 500;

    public string? RootFolder => _rootFolder;
    public ObservableCollection<FileTreeNode> TreeNodes { get; } = new();
    public FileTreeNode? SelectedNode => _selectedNode;
    public bool IsCollapsed => _isCollapsed;
    public double Width => _width;

    public event EventHandler<string>? FileSelected;
    public event EventHandler<FileTreeNode>? FolderToggled;
    public event EventHandler<FileTreeNode?>? SelectionChanged;
    public event EventHandler<bool>? CollapseStateChanged;
    public event EventHandler<double>? WidthChanged;

    public void SetRootFolder(string? folderPath)
    {
        _rootFolder = folderPath;
        Refresh();
    }

    public void Refresh()
    {
        TreeNodes.Clear();

        if (string.IsNullOrEmpty(_rootFolder) || !Directory.Exists(_rootFolder))
        {
            return;
        }

        try
        {
            var rootNode = BuildTreeNode(_rootFolder, isRoot: true);
            if (rootNode != null)
            {
                TreeNodes.Add(rootNode);
                rootNode.IsExpanded = true;
            }
        }
        catch (UnauthorizedAccessException)
        {
            // Handle access denied - could raise an error event
        }
        catch (Exception)
        {
            // Handle other errors - could raise an error event
        }
    }

    public void SelectNode(FileTreeNode node)
    {
        if (_selectedNode != null)
        {
            _selectedNode.IsSelected = false;
        }

        _selectedNode = node;
        if (_selectedNode != null)
        {
            _selectedNode.IsSelected = true;
            SelectionChanged?.Invoke(this, _selectedNode);

            // If it's a file, raise FileSelected event
            if (!_selectedNode.IsFolder)
            {
                FileSelected?.Invoke(this, _selectedNode.FullPath);
            }
        }
    }

    public void ToggleFolder(FileTreeNode node)
    {
        if (!node.IsFolder)
        {
            return;
        }

        node.IsExpanded = !node.IsExpanded;
        FolderToggled?.Invoke(this, node);
    }

    public void ExpandPath(string filePath)
    {
        var node = FindNode(filePath);
        if (node == null)
        {
            return;
        }

        // Expand all ancestors
        var current = node.Parent;
        while (current != null)
        {
            current.IsExpanded = true;
            current = current.Parent;
        }
    }

    public void Collapse()
    {
        if (!_isCollapsed)
        {
            _isCollapsed = true;
            CollapseStateChanged?.Invoke(this, true);
        }
    }

    public void Expand()
    {
        if (_isCollapsed)
        {
            _isCollapsed = false;
            CollapseStateChanged?.Invoke(this, false);
        }
    }

    public void ToggleCollapse()
    {
        _isCollapsed = !_isCollapsed;
        CollapseStateChanged?.Invoke(this, _isCollapsed);
    }

    public void SetWidth(double width)
    {
        // Clamp width to valid range
        var newWidth = Math.Max(MinWidth, Math.Min(MaxWidth, width));
        if (Math.Abs(_width - newWidth) > 0.1)
        {
            _width = newWidth;
            WidthChanged?.Invoke(this, _width);
        }
    }

    public FileTreeNode? FindNode(string fullPath)
    {
        foreach (var rootNode in TreeNodes)
        {
            var found = FindNodeRecursive(rootNode, fullPath);
            if (found != null)
            {
                return found;
            }
        }
        return null;
    }

    private FileTreeNode? FindNodeRecursive(FileTreeNode node, string fullPath)
    {
        if (string.Equals(node.FullPath, fullPath, StringComparison.OrdinalIgnoreCase))
        {
            return node;
        }

        foreach (var child in node.Children)
        {
            var found = FindNodeRecursive(child, fullPath);
            if (found != null)
            {
                return found;
            }
        }

        return null;
    }

    private FileTreeNode? BuildTreeNode(string path, bool isRoot = false)
    {
        var node = new FileTreeNode
        {
            DisplayName = isRoot ? Path.GetFileName(path) ?? path : Path.GetFileName(path) ?? string.Empty,
            FullPath = path,
            IsFolder = Directory.Exists(path)
        };

        if (node.IsFolder)
        {
            try
            {
                // Add subdirectories
                var directories = Directory.GetDirectories(path)
                    .Where(d => !IsHiddenOrSystem(d))
                    .OrderBy(d => Path.GetFileName(d));

                foreach (var dir in directories)
                {
                    var childNode = BuildTreeNode(dir);
                    if (childNode != null)
                    {
                        childNode.Parent = node;
                        node.Children.Add(childNode);
                    }
                }

                // Add markdown files
                var markdownFiles = Directory.GetFiles(path, "*.md")
                    .Where(f => !IsHiddenOrSystem(f))
                    .OrderBy(f => Path.GetFileName(f));

                foreach (var file in markdownFiles)
                {
                    var fileNode = new FileTreeNode
                    {
                        DisplayName = Path.GetFileName(file),
                        FullPath = file,
                        IsFolder = false,
                        Parent = node
                    };
                    node.Children.Add(fileNode);
                }
            }
            catch
            {
                // Ignore errors for individual folders
            }
        }

        return node;
    }

    private bool IsHiddenOrSystem(string path)
    {
        try
        {
            var attributes = File.GetAttributes(path);
            return (attributes & FileAttributes.Hidden) != 0 ||
                   (attributes & FileAttributes.System) != 0;
        }
        catch
        {
            return false;
        }
    }
}
