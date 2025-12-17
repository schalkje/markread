using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace MarkRead.App.Services;

/// <summary>
/// Represents a node in the folder/file tree structure.
/// </summary>
public class TreeNode : INotifyPropertyChanged
{
    /// <summary>
    /// Display name of the file or folder (without full path).
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Absolute file system path.
    /// </summary>
    public string FullPath { get; set; } = string.Empty;

    /// <summary>
    /// Type of node (Folder or File).
    /// </summary>
    public NodeType Type { get; set; }

    /// <summary>
    /// Reference to parent node (null for root).
    /// </summary>
    public TreeNode? Parent { get; set; }

    /// <summary>
    /// Child nodes (files and subfolders).
    /// </summary>
    public ObservableCollection<TreeNode> Children { get; set; } = new();

    private bool _isExpanded;
    /// <summary>
    /// Whether the folder node is currently expanded in the UI.
    /// </summary>
    public bool IsExpanded
    {
        get => _isExpanded;
        set
        {
            if (_isExpanded != value)
            {
                _isExpanded = value;
                OnPropertyChanged();
            }
        }
    }

    private bool _isSelected;
    /// <summary>
    /// Whether this node is currently selected.
    /// </summary>
    public bool IsSelected
    {
        get => _isSelected;
        set
        {
            if (_isSelected != value)
            {
                _isSelected = value;
                OnPropertyChanged();
            }
        }
    }

    private bool _isVisible = true;
    /// <summary>
    /// Whether this node passes current filter criteria (for type-ahead search).
    /// </summary>
    public bool IsVisible
    {
        get => _isVisible;
        set
        {
            if (_isVisible != value)
            {
                _isVisible = value;
                OnPropertyChanged();
            }
        }
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}

/// <summary>
/// Type of tree node.
/// </summary>
public enum NodeType
{
    Folder,
    File
}
