namespace MarkRead.Services;

/// <summary>
/// Service for rendering markdown to HTML
/// </summary>
public interface IMarkdownService
{
    /// <summary>
    /// Renders markdown content to HTML
    /// </summary>
    /// <param name="markdown">Raw markdown content</param>
    /// <returns>Rendered HTML</returns>
    string RenderToHtml(string markdown);

    /// <summary>
    /// Renders markdown content to HTML with caching
    /// </summary>
    /// <param name="markdown">Raw markdown content</param>
    /// <param name="contentHash">Hash for cache validation</param>
    /// <returns>Rendered HTML</returns>
    string RenderToHtmlCached(string markdown, string contentHash);
}
