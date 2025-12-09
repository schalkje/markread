namespace MarkRead.Models;

/// <summary>
/// Represents a markdown document with its content and rendering state
/// </summary>
public class Document
{
    /// <summary>
    /// Full file path to the markdown file
    /// </summary>
    public string FilePath { get; set; } = string.Empty;

    /// <summary>
    /// Raw markdown content
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Document title (derived from file name or first heading)
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Current scroll position in the rendered view (0.0 to 1.0)
    /// </summary>
    public double ScrollPosition { get; set; }

    /// <summary>
    /// Timestamp of last file modification
    /// </summary>
    public DateTime LastModified { get; set; }

    /// <summary>
    /// Indicates if the document is currently being rendered
    /// </summary>
    public bool IsRendering { get; set; }

    /// <summary>
    /// Cached HTML output (for performance optimization)
    /// </summary>
    public string? CachedHtml { get; set; }

    /// <summary>
    /// Hash of content for cache validation
    /// </summary>
    public string? ContentHash { get; set; }
}
