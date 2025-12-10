namespace MarkRead.Models;

/// <summary>
/// Represents a node in the file tree structure
/// </summary>
public class FileTreeNode
{
    /// <summary>
    /// Full path to the file or directory
    /// </summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// Display name (file or folder name)
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Type of node (File or Directory)
    /// </summary>
    public FileTreeNodeType Type { get; set; }

    /// <summary>
    /// Child nodes (for directories)
    /// </summary>
    public List<FileTreeNode> Children { get; set; } = new();

    /// <summary>
    /// Indicates if the node is expanded in the tree view
    /// </summary>
    public bool IsExpanded { get; set; }

    /// <summary>
    /// Indicates if this node is currently selected
    /// </summary>
    public bool IsSelected { get; set; }

    /// <summary>
    /// Parent node reference (null for root)
    /// </summary>
    public FileTreeNode? Parent { get; set; }

    /// <summary>
    /// Indentation level in the tree (0 for root)
    /// </summary>
    public int Level { get; set; }

    /// <summary>
    /// Indicates if there was a permission error accessing this node
    /// </summary>
    public bool HasPermissionError { get; set; }

    /// <summary>
    /// File extension (for files only)
    /// </summary>
    public string Extension => Type == FileTreeNodeType.File ? System.IO.Path.GetExtension(Path) : string.Empty;
}

/// <summary>
/// Type of file tree node
/// </summary>
public enum FileTreeNodeType
{
    File,
    Directory
}
