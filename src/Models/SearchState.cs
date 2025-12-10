namespace MarkRead.Models;

/// <summary>
/// State of current search operation
/// </summary>
public class SearchState
{
    /// <summary>
    /// Search query text
    /// </summary>
    public string Query { get; set; } = string.Empty;

    /// <summary>
    /// List of match positions in the document
    /// </summary>
    public List<SearchMatch> Results { get; set; } = new();

    /// <summary>
    /// Index of the currently selected match (0-based)
    /// </summary>
    public int CurrentIndex { get; set; } = -1;

    /// <summary>
    /// Total number of matches found
    /// </summary>
    public int MatchCount => Results.Count;

    /// <summary>
    /// Whether search is case-sensitive
    /// </summary>
    public bool CaseSensitive { get; set; }

    /// <summary>
    /// Whether to use regex pattern matching
    /// </summary>
    public bool UseRegex { get; set; }

    /// <summary>
    /// Whether to match whole words only
    /// </summary>
    public bool WholeWord { get; set; }
}

/// <summary>
/// Represents a single search match in the document
/// </summary>
public class SearchMatch
{
    /// <summary>
    /// Character offset from start of document
    /// </summary>
    public int Offset { get; set; }

    /// <summary>
    /// Length of the matched text
    /// </summary>
    public int Length { get; set; }

    /// <summary>
    /// Line number where match occurs (1-based)
    /// </summary>
    public int LineNumber { get; set; }

    /// <summary>
    /// Column number where match starts (1-based)
    /// </summary>
    public int ColumnNumber { get; set; }

    /// <summary>
    /// Text context around the match (for preview)
    /// </summary>
    public string Context { get; set; } = string.Empty;
}
