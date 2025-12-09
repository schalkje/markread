using System.Text;
using MarkRead.Services;

namespace MarkRead.Rendering;

/// <summary>
/// Service for generating HTML from markdown content using template system
/// </summary>
public class HtmlTemplateService
{
    private readonly IMarkdownService _markdownService;
    private readonly IThemeService _themeService;
    private readonly ILoggingService _loggingService;
    private readonly string _templatePath;
    private string? _cachedTemplate;

    public HtmlTemplateService(
        IMarkdownService markdownService, 
        IThemeService themeService,
        ILoggingService loggingService)
    {
        _markdownService = markdownService;
        _themeService = themeService;
        _loggingService = loggingService;
        _templatePath = Path.Combine(AppContext.BaseDirectory, "Rendering", "templates", "markdown.html");
    }

    /// <summary>
    /// Renders a markdown document to complete HTML page
    /// </summary>
    public async Task<string> RenderDocumentAsync(string markdownContent, string title)
    {
        try
        {
            // Get HTML template
            var template = await LoadTemplateAsync();

            // Render markdown to HTML with error handling
            string contentHtml;
            try
            {
                contentHtml = _markdownService.RenderToHtml(markdownContent);
            }
            catch (Exception ex)
            {
                _loggingService.LogError($"Markdown rendering failed for '{title}': {ex.Message}", ex);
                contentHtml = $"<div class='error'><h2>Rendering Error</h2><p>{EscapeHtml(ex.Message)}</p><pre>{EscapeHtml(markdownContent)}</pre></div>";
            }

            // Get current theme and inject theme style to prevent white flash
            var theme = _themeService.GetCurrentTheme();
            var themeClass = theme.Type.ToString().ToLowerInvariant();
            var themeStyles = GenerateThemeStyles(theme);

            // Replace tokens in template
            var result = template
                .Replace("{{TITLE}}", EscapeHtml(title))
                .Replace("{{THEME_CLASS}}", themeClass)
                .Replace("{{THEME_STYLES}}", themeStyles)
                .Replace("{{CONTENT}}", contentHtml);

            return result;
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"HTML template rendering failed: {ex.Message}", ex);
            return GetErrorPage(title, ex.Message);
        }
    }

    /// <summary>
    /// Generates inline CSS for theme to prevent white flash on load
    /// </summary>
    private string GenerateThemeStyles(Models.Theme theme)
    {
        return $@"
        <style>
            :root {{
                --background-color: {theme.BackgroundColor};
                --text-color: {theme.TextColor};
                --surface-color: {theme.SurfaceColor};
                --primary-color: {theme.PrimaryColor};
                --font-family: {theme.FontFamily};
                --font-size: {theme.FontSize}px;
                --line-height: {theme.LineHeight};
            }}
            html, body {{
                background-color: {theme.BackgroundColor};
                color: {theme.TextColor};
                font-family: {theme.FontFamily};
                font-size: {theme.FontSize}px;
                line-height: {theme.LineHeight};
                margin: 0;
                padding: 0;
            }}
        </style>";
    }

    /// <summary>
    /// Loads the HTML template from disk (cached after first load)
    /// </summary>
    private async Task<string> LoadTemplateAsync()
    {
        if (_cachedTemplate != null)
        {
            return _cachedTemplate;
        }

        if (!File.Exists(_templatePath))
        {
            // Fallback minimal template
            return GetFallbackTemplate();
        }

        _cachedTemplate = await File.ReadAllTextAsync(_templatePath);
        return _cachedTemplate;
    }

    /// <summary>
    /// Returns a minimal fallback template if file not found
    /// </summary>
    private string GetFallbackTemplate()
    {
        return @"<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"" />
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
    <title>{{TITLE}}</title>
    {{THEME_STYLES}}
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6; 
            padding: 20px; 
            max-width: 900px; 
            margin: 0 auto;
        }
        body.light { background: #ffffff; color: #1f1f1f; }
        body.dark { background: #1f1f1f; color: #e0e0e0; }
        .error { padding: 20px; background: #fee; border: 2px solid #f00; border-radius: 8px; }
    </style>
</head>
<body class=""{{THEME_CLASS}}"">
    {{CONTENT}}
</body>
</html>";
    }

    /// <summary>
    /// Returns an error page when rendering completely fails
    /// </summary>
    private string GetErrorPage(string title, string errorMessage)
    {
        return $@"<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"" />
    <title>Error - {EscapeHtml(title)}</title>
    <style>
        body {{ font-family: sans-serif; padding: 40px; background: #fee; }}
        .error {{ background: white; padding: 30px; border-radius: 8px; border: 2px solid #f00; }}
        h1 {{ color: #c00; }}
        pre {{ background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }}
    </style>
</head>
<body>
    <div class=""error"">
        <h1>⚠️ Rendering Error</h1>
        <p><strong>Document:</strong> {EscapeHtml(title)}</p>
        <p><strong>Error:</strong></p>
        <pre>{EscapeHtml(errorMessage)}</pre>
        <p>Please check the document for syntax errors or try reloading.</p>
    </div>
</body>
</html>";
    }

    /// <summary>
    /// Escapes HTML special characters
    /// </summary>
    private string EscapeHtml(string text)
    {
        return text
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&#39;");
    }
}
