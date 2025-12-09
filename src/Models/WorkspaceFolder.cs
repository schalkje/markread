namespace MarkRead.Models;

/// <summary>
/// Represents a workspace folder (root folder) in the application.
/// Multiple workspace folders can be open simultaneously, each with its own file tree.
/// </summary>
public class WorkspaceFolder
{
    /// <summary>
    /// Unique identifier for the workspace folder
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Display name of the workspace folder
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Full path to the root folder
    /// </summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// Indicates if this workspace folder is currently active
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Color identifier for visual distinction (optional)
    /// </summary>
    public string? Color { get; set; }

    /// <summary>
    /// Timestamp when this workspace was opened
    /// </summary>
    public DateTime OpenedAt { get; set; } = DateTime.Now;

    /// <summary>
    /// Last accessed timestamp
    /// </summary>
    public DateTime LastAccessed { get; set; } = DateTime.Now;
}
