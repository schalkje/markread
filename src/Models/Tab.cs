namespace MarkRead.Models;

/// <summary>
/// Represents a document tab in the tab bar
/// </summary>
public class Tab
{
    /// <summary>
    /// Unique identifier for the tab
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Display title of the tab
    /// </summary>
    public string Title { get; set; } = "New Tab";

    /// <summary>
    /// Path to the document displayed in this tab
    /// </summary>
    public string DocumentPath { get; set; } = string.Empty;

    /// <summary>
    /// Indicates if this tab is currently active
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Indicates if this tab is pinned
    /// </summary>
    public bool IsPinned { get; set; }

    /// <summary>
    /// Scroll position for this tab (0.0 to 1.0)
    /// </summary>
    public double ScrollPosition { get; set; }

    /// <summary>
    /// Timestamp of last access
    /// </summary>
    public DateTime LastAccessed { get; set; } = DateTime.Now;

    /// <summary>
    /// Navigation history for this tab
    /// </summary>
    public List<string> History { get; set; } = new();

    /// <summary>
    /// Current position in history
    /// </summary>
    public int HistoryIndex { get; set; } = -1;
}
