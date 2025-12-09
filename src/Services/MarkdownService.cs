using Markdig;

namespace MarkRead.Services;

/// <summary>
/// Markdown rendering service using Markdig
/// </summary>
public class MarkdownService : IMarkdownService
{
    private readonly MarkdownPipeline _pipeline;
    private readonly Dictionary<string, string> _cache = new();

    public MarkdownService()
    {
        // Configure Markdig pipeline with advanced features
        _pipeline = new MarkdownPipelineBuilder()
            .UseAdvancedExtensions() // Tables, task lists, footnotes, etc.
            .UseEmojiAndSmiley() // :smile: support
            .UseSoftlineBreakAsHardlineBreak() // Better line break handling
            .Build();
    }

    public string RenderToHtml(string markdown)
    {
        if (string.IsNullOrWhiteSpace(markdown))
        {
            return string.Empty;
        }

        try
        {
            return Markdown.ToHtml(markdown, _pipeline);
        }
        catch (Exception ex)
        {
            // Graceful degradation on malformed markdown
            return $"<div class='error'>Error rendering markdown: {System.Security.SecurityElement.Escape(ex.Message)}</div>";
        }
    }

    public string RenderToHtmlCached(string markdown, string contentHash)
    {
        if (_cache.TryGetValue(contentHash, out var cachedHtml))
        {
            return cachedHtml;
        }

        var html = RenderToHtml(markdown);
        _cache[contentHash] = html;

        // Simple cache size management (keep last 50 documents)
        if (_cache.Count > 50)
        {
            var oldestKey = _cache.Keys.First();
            _cache.Remove(oldestKey);
        }

        return html;
    }
}
