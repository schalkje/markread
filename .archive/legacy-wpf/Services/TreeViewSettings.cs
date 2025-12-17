namespace MarkRead.App.Services;

/// <summary>
/// Represents global and per-folder treeview preferences.
/// </summary>
public class TreeViewSettings
{
    /// <summary>
    /// Global preference for treeview visibility in new folders.
    /// Default: true (visible).
    /// </summary>
    public bool DefaultVisible { get; set; } = true;

    /// <summary>
    /// Per-folder overrides keyed by folder path.
    /// </summary>
    public Dictionary<string, FolderTreeSettings> PerFolderSettings { get; set; } = new();
}

/// <summary>
/// Represents treeview settings for a specific folder.
/// </summary>
public class FolderTreeSettings
{
    /// <summary>
    /// Whether treeview is visible for this folder.
    /// </summary>
    public bool IsVisible { get; set; }

    /// <summary>
    /// Full path to the last markdown file viewed in this folder (nullable).
    /// </summary>
    public string? LastViewedFile { get; set; }
}
