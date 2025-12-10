using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// Service for searching within document content
/// </summary>
public interface ISearchService
{
    /// <summary>
    /// Search for query in document content
    /// </summary>
    /// <param name="content">Document content to search</param>
    /// <param name="query">Search query</param>
    /// <param name="caseSensitive">Case-sensitive matching</param>
    /// <param name="useRegex">Use regex pattern matching</param>
    /// <param name="wholeWord">Match whole words only</param>
    /// <returns>Search state with all matches</returns>
    SearchState Search(string content, string query, bool caseSensitive = false, bool useRegex = false, bool wholeWord = false);

    /// <summary>
    /// Get the next match index (wraps around)
    /// </summary>
    /// <param name="currentIndex">Current match index</param>
    /// <param name="totalMatches">Total number of matches</param>
    /// <returns>Next match index</returns>
    int GetNextMatchIndex(int currentIndex, int totalMatches);

    /// <summary>
    /// Get the previous match index (wraps around)
    /// </summary>
    /// <param name="currentIndex">Current match index</param>
    /// <param name="totalMatches">Total number of matches</param>
    /// <returns>Previous match index</returns>
    int GetPreviousMatchIndex(int currentIndex, int totalMatches);

    /// <summary>
    /// Clear search state
    /// </summary>
    /// <returns>Empty search state</returns>
    SearchState ClearSearch();
}
