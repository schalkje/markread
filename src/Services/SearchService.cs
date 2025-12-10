using System.Text.RegularExpressions;
using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// Service for searching within document content with regex and whole-word support
/// </summary>
public class SearchService : ISearchService
{
    private readonly ILoggingService _logger;

    public SearchService(ILoggingService logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Search for query in document content
    /// </summary>
    public SearchState Search(string content, string query, bool caseSensitive = false, bool useRegex = false, bool wholeWord = false)
    {
        var state = new SearchState
        {
            Query = query,
            CaseSensitive = caseSensitive,
            UseRegex = useRegex,
            WholeWord = wholeWord
        };

        if (string.IsNullOrWhiteSpace(content) || string.IsNullOrWhiteSpace(query))
        {
            return state;
        }

        try
        {
            if (useRegex)
            {
                SearchWithRegex(content, query, caseSensitive, state);
            }
            else if (wholeWord)
            {
                SearchWholeWords(content, query, caseSensitive, state);
            }
            else
            {
                SearchPlainText(content, query, caseSensitive, state);
            }

            if (state.Results.Count > 0)
            {
                state.CurrentIndex = 0;
                _logger.LogInfo($"Search found {state.MatchCount} matches for '{query}'");
            }
            else
            {
                _logger.LogInfo($"Search found no matches for '{query}'");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Search failed: {ex.Message}");
        }

        return state;
    }

    /// <summary>
    /// Get the next match index (wraps around)
    /// </summary>
    public int GetNextMatchIndex(int currentIndex, int totalMatches)
    {
        if (totalMatches == 0) return -1;
        return (currentIndex + 1) % totalMatches;
    }

    /// <summary>
    /// Get the previous match index (wraps around)
    /// </summary>
    public int GetPreviousMatchIndex(int currentIndex, int totalMatches)
    {
        if (totalMatches == 0) return -1;
        return currentIndex == 0 ? totalMatches - 1 : currentIndex - 1;
    }

    /// <summary>
    /// Clear search state
    /// </summary>
    public SearchState ClearSearch()
    {
        return new SearchState();
    }

    private void SearchPlainText(string content, string query, bool caseSensitive, SearchState state)
    {
        var comparison = caseSensitive ? StringComparison.Ordinal : StringComparison.OrdinalIgnoreCase;
        var index = 0;

        while (index < content.Length)
        {
            index = content.IndexOf(query, index, comparison);
            if (index == -1) break;

            AddMatch(content, index, query.Length, state);
            index += query.Length;
        }
    }

    private void SearchWholeWords(string content, string query, bool caseSensitive, SearchState state)
    {
        // Escape regex special characters in query
        var escapedQuery = Regex.Escape(query);
        var pattern = $@"\b{escapedQuery}\b";
        var options = caseSensitive ? RegexOptions.None : RegexOptions.IgnoreCase;

        var matches = Regex.Matches(content, pattern, options);
        foreach (Match match in matches)
        {
            AddMatch(content, match.Index, match.Length, state);
        }
    }

    private void SearchWithRegex(string content, string query, bool caseSensitive, SearchState state)
    {
        try
        {
            var options = caseSensitive ? RegexOptions.None : RegexOptions.IgnoreCase;
            var matches = Regex.Matches(content, query, options);

            foreach (Match match in matches)
            {
                AddMatch(content, match.Index, match.Length, state);
            }
        }
        catch (ArgumentException ex)
        {
            _logger.LogError($"Invalid regex pattern: {ex.Message}");
        }
    }

    private void AddMatch(string content, int offset, int length, SearchState state)
    {
        // Calculate line and column numbers
        var (lineNumber, columnNumber) = GetLineAndColumn(content, offset);

        // Extract context (50 chars before and after)
        var contextStart = Math.Max(0, offset - 50);
        var contextEnd = Math.Min(content.Length, offset + length + 50);
        var contextLength = contextEnd - contextStart;
        var context = content.Substring(contextStart, contextLength).Replace("\n", " ").Replace("\r", "");

        state.Results.Add(new SearchMatch
        {
            Offset = offset,
            Length = length,
            LineNumber = lineNumber,
            ColumnNumber = columnNumber,
            Context = context
        });
    }

    private (int LineNumber, int ColumnNumber) GetLineAndColumn(string content, int offset)
    {
        var lineNumber = 1;
        var columnNumber = 1;

        for (int i = 0; i < offset && i < content.Length; i++)
        {
            if (content[i] == '\n')
            {
                lineNumber++;
                columnNumber = 1;
            }
            else
            {
                columnNumber++;
            }
        }

        return (lineNumber, columnNumber);
    }
}
