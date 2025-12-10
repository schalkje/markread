using System.Text.RegularExpressions;

namespace MarkRead.Services;

/// <summary>
/// Basic HTML sanitizer for markdown-generated HTML
/// Removes potentially dangerous tags and attributes while preserving safe content
/// </summary>
public class HtmlSanitizerService : IHtmlSanitizerService
{
    private readonly ILoggingService _loggingService;
    
    // Safe tags for markdown content
    private static readonly HashSet<string> DefaultAllowedTags = new(StringComparer.OrdinalIgnoreCase)
    {
        // Text formatting
        "p", "br", "span", "div", "pre", "code",
        // Headers
        "h1", "h2", "h3", "h4", "h5", "h6",
        // Lists
        "ul", "ol", "li",
        // Tables
        "table", "thead", "tbody", "tr", "th", "td",
        // Emphasis
        "strong", "em", "b", "i", "u", "s", "del", "ins",
        // Links and images
        "a", "img",
        // Block elements
        "blockquote", "hr",
        // Inline elements
        "abbr", "cite", "q", "small", "sub", "sup", "mark",
        // Code
        "kbd", "samp", "var"
    };

    // Safe attributes
    private static readonly HashSet<string> DefaultAllowedAttributes = new(StringComparer.OrdinalIgnoreCase)
    {
        "href", "src", "alt", "title", "class", "id", 
        "width", "height", "align", "colspan", "rowspan",
        "start", "type", "checked", "disabled"
    };

    // Dangerous protocols
    private static readonly HashSet<string> DangerousProtocols = new(StringComparer.OrdinalIgnoreCase)
    {
        "javascript:", "data:", "vbscript:", "file:"
    };

    public HtmlSanitizerService(ILoggingService loggingService)
    {
        _loggingService = loggingService;
    }

    public string Sanitize(string html)
    {
        return SanitizeWithAllowlist(html, DefaultAllowedTags, DefaultAllowedAttributes);
    }

    public string SanitizeWithAllowlist(string html, HashSet<string> allowedTags, HashSet<string> allowedAttributes)
    {
        if (string.IsNullOrWhiteSpace(html))
            return string.Empty;

        try
        {
            // Remove script tags and their content
            html = Regex.Replace(html, @"<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>", 
                string.Empty, RegexOptions.IgnoreCase);

            // Remove style tags and their content
            html = Regex.Replace(html, @"<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>", 
                string.Empty, RegexOptions.IgnoreCase);

            // Remove event handler attributes (onclick, onload, etc.)
            html = Regex.Replace(html, @"\s+on\w+\s*=\s*[""'][^""']*[""']", 
                string.Empty, RegexOptions.IgnoreCase);

            // Remove dangerous protocols from href and src attributes
            foreach (var protocol in DangerousProtocols)
            {
                html = Regex.Replace(html, 
                    $@"(href|src)\s*=\s*[""']{protocol}", 
                    @"$1=""about:blank""", 
                    RegexOptions.IgnoreCase);
            }

            // Remove tags not in allowlist
            html = Regex.Replace(html, @"</?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>", match =>
            {
                var tagName = match.Groups[1].Value;
                if (!allowedTags.Contains(tagName))
                {
                    _loggingService.LogInfo($"Removed disallowed tag: {tagName}");
                    return string.Empty;
                }

                // Keep the tag but sanitize attributes
                var tag = match.Value;
                
                // Remove attributes not in allowlist
                tag = Regex.Replace(tag, @"\s+([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*[""'][^""']*[""']", attrMatch =>
                {
                    var attrName = attrMatch.Groups[1].Value;
                    if (!allowedAttributes.Contains(attrName))
                    {
                        return string.Empty;
                    }
                    return attrMatch.Value;
                });

                return tag;
            });

            _loggingService.LogInfo("HTML sanitization completed successfully");
            return html;
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"Error sanitizing HTML: {ex.Message}");
            return string.Empty; // Return empty on error for safety
        }
    }
}
