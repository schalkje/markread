using System;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using MarkRead.App.Services;

namespace MarkRead.App.Rendering;

public sealed class Renderer
{
    private const string ContentToken = "<!--CONTENT-->";
    private const string StateToken = "__STATE_JSON__";
    private const string BaseUrlToken = "<!--BASE_URL-->";
    private const string ThemeStyleToken = "<!--THEME_STYLE-->";

    private readonly MarkdownService _markdownService;
    private readonly HtmlSanitizerService _sanitizer;
    private readonly string _templatePath;
    private readonly SemaphoreSlim _templateLock = new(1, 1);
        private string? _templateCache;
        private string? _currentRootPath;

    public Renderer(MarkdownService markdownService, HtmlSanitizerService sanitizer)
    {
        _markdownService = markdownService ?? throw new ArgumentNullException(nameof(markdownService));
        _sanitizer = sanitizer ?? throw new ArgumentNullException(nameof(sanitizer));
        _templatePath = ResolveTemplatePath();
    }

    public void SetRootPath(string rootPath)
    {
        _currentRootPath = rootPath;
    }

    public async Task<RenderResult> RenderAsync(RenderRequest request, CancellationToken cancellationToken = default)
    {
        if (request.DocumentPath is null)
        {
            throw new ArgumentException("Document path must be provided.", nameof(request));
        }

        var markdown = request.Markdown ?? string.Empty;
        
        // Convert :::mermaid blocks to ```mermaid format
        markdown = ConvertColonFencedBlocks(markdown);
        
        // Replace root-relative links in markdown: ](/ -> ](file:///rootPath/
        if (!string.IsNullOrEmpty(_currentRootPath))
        {
            markdown = ConvertRootRelativeLinksInMarkdown(markdown, _currentRootPath);
        }
        
        string sanitized;
        bool isFallback = false;

        try
        {
            var html = _markdownService.RenderToHtml(markdown);

            Uri? baseUri = null;
            try
            {
                baseUri = new Uri(request.DocumentPath);
            }
            catch
            {
                // Ignore invalid URIs; sanitizer will operate without base.
            }

            sanitized = _sanitizer.Sanitize(html, baseUri);
        }
        catch (Exception ex)
        {
            // Fallback to raw text rendering
            sanitized = GenerateRawTextFallback(markdown, ex.Message);
            isFallback = true;
        }

        var template = await LoadTemplateAsync(cancellationToken).ConfigureAwait(false);
        var stateJson = BuildStateJson(request);

        // Set base URL for resolving relative paths in images/links
        var baseUrl = GetBaseUrlFromPath(request.DocumentPath);

        // Inject theme-specific inline style to prevent white flash
        var themeStyle = GenerateThemeInlineStyle(request.PreferredTheme);

        var output = template
            .Replace(ContentToken, sanitized, StringComparison.Ordinal)
            .Replace(StateToken, stateJson, StringComparison.Ordinal)
            .Replace(BaseUrlToken, baseUrl, StringComparison.Ordinal)
            .Replace(ThemeStyleToken, themeStyle, StringComparison.Ordinal);

        var title = DetermineTitle(markdown, request.DocumentPath);
        if (isFallback)
        {
            title += " (Raw Text - Render Error)";
        }

        // Write to temp file so WebView2 can load it with proper file:// origin
        // This allows images and other local resources to load correctly
        string? tempFilePath = null;
        try
        {
            tempFilePath = Path.Combine(Path.GetTempPath(), $"markread_{Guid.NewGuid():N}.html");
            await File.WriteAllTextAsync(tempFilePath, output, Encoding.UTF8, cancellationToken).ConfigureAwait(false);
        }
        catch
        {
            // If temp file creation fails, fall back to NavigateToString
            tempFilePath = null;
        }

        return new RenderResult(output, title, tempFilePath);
    }

    private static string GenerateRawTextFallback(string markdown, string errorMessage)
    {
        var escaped = System.Net.WebUtility.HtmlEncode(markdown);
        return $@"
            <div style='padding: 20px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin-bottom: 20px;'>
                <h3 style='color: #856404; margin-top: 0;'>⚠️ Rendering Error</h3>
                <p style='color: #856404;'>Unable to render this document as HTML. Showing raw text instead.</p>
                <details style='color: #856404;'>
                    <summary style='cursor: pointer;'>Error details</summary>
                    <pre style='background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto;'>{System.Net.WebUtility.HtmlEncode(errorMessage)}</pre>
                </details>
            </div>
            <pre style='white-space: pre-wrap; word-wrap: break-word; font-family: monospace; padding: 15px; background: #f8f9fa; border-radius: 4px;'>{escaped}</pre>";
    }

    private static string DetermineTitle(string markdown, string documentPath)
    {
        using var reader = new StringReader(markdown);
        string? line;
        while ((line = reader.ReadLine()) is not null)
        {
            var trimmed = line.Trim();
            if (trimmed.StartsWith("# ", StringComparison.Ordinal))
            {
                return trimmed[2..].Trim();
            }

            if (trimmed.StartsWith("#", StringComparison.Ordinal))
            {
                var withoutHashes = trimmed.TrimStart('#').Trim();
                if (!string.IsNullOrEmpty(withoutHashes))
                {
                    return withoutHashes;
                }
            }
        }

        return Path.GetFileNameWithoutExtension(documentPath);
    }

    private async Task<string> LoadTemplateAsync(CancellationToken cancellationToken)
    {
        if (_templateCache is not null)
        {
            return _templateCache;
        }

        await _templateLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_templateCache is null)
            {
                using var fs = File.OpenRead(_templatePath);
                using var reader = new StreamReader(fs, Encoding.UTF8, leaveOpen: false);
                _templateCache = reader.ReadToEnd();
            }
        }
        finally
        {
            _templateLock.Release();
        }

        return _templateCache;
    }

    private static string BuildStateJson(RenderRequest request)
    {
        var state = new
        {
            documentPath = request.DocumentPath,
            relativePath = request.RelativePath,
            anchor = request.Anchor,
            generatedAt = DateTimeOffset.UtcNow,
            theme = request.PreferredTheme
        };

        return JsonSerializer.Serialize(state, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        });
    }

    private static string ResolveTemplatePath()
    {
        var baseDirectory = AppContext.BaseDirectory;
        var candidate = Path.GetFullPath(Path.Combine(baseDirectory, "Rendering", "template", "index.html"));
        if (!File.Exists(candidate))
        {
            throw new FileNotFoundException("Renderer template not found.", candidate);
        }

        return candidate;
    }

    private static string GetBaseUrlFromPath(string documentPath)
    {
        try
        {
            // Get the directory containing the document
            var directory = Path.GetDirectoryName(documentPath);
            if (string.IsNullOrEmpty(directory))
            {
                return "file:///";
            }

            // Convert to absolute path and create file:// URI
            var absolutePath = Path.GetFullPath(directory);
            var uri = new Uri(absolutePath + Path.DirectorySeparatorChar);
            return uri.AbsoluteUri;
        }
        catch
        {
            return "file:///";
        }
    }

    private static string ConvertRootRelativeLinksInMarkdown(string markdown, string rootPath)
    {
        // Replace ](/ with ](file:///normalizedRoot/
        // This handles both links [text](/path) and images ![alt](/path)
        
        // Build a proper file:// URI from the root path
        var normalizedRoot = Path.GetFullPath(rootPath);
        var fileUri = new Uri(normalizedRoot).AbsoluteUri.TrimEnd('/');
        
        var pattern = @"\]\(/";
        var replacement = $"]({fileUri}/";
        return System.Text.RegularExpressions.Regex.Replace(markdown, pattern, replacement);
    }

    private static string ConvertColonFencedBlocks(string markdown)
    {
        // Convert :::languageName blocks to ```languageName format
        // Supports :::mermaid, :::warning, :::info, etc.
        
        // Pattern: :::language at start of line, captures content until closing :::
        // The (?m) flag makes ^ and $ match line starts/ends
        var pattern = @"(?m)^:::(\w+)\s*$\r?\n([\s\S]*?)^:::\s*$";
        var replacement = "```$1\n$2```";
        
        var result = System.Text.RegularExpressions.Regex.Replace(
            markdown, 
            pattern, 
            replacement);
        
        return result;
    }

    private static string GenerateThemeInlineStyle(string theme)
    {
        // Generate inline style that matches the theme to prevent white flash
        // This is applied immediately before external CSS loads
        var isDark = theme.Contains("dark", StringComparison.OrdinalIgnoreCase);
        
        if (isDark)
        {
            // Dark theme colors matching DarkTheme.xaml
            return @"<style>
        html, body { 
            background: #0F0F0F !important; 
            color: #fafafa !important;
        }
    </style>";
        }
        else
        {
            // Light theme colors matching LightTheme.xaml
            return @"<style>
        html, body { 
            background: #FFFFFF !important; 
            color: #171717 !important;
        }
    </style>";
        }
    }
}

public readonly record struct RenderRequest(
    string? Markdown,
    string DocumentPath,
    string? RelativePath,
    string? Anchor,
    string PreferredTheme);

public readonly record struct RenderResult(string Html, string Title, string? TempFilePath = null);
