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

    private readonly MarkdownService _markdownService;
    private readonly HtmlSanitizerService _sanitizer;
    private readonly string _templatePath;
    private readonly SemaphoreSlim _templateLock = new(1, 1);
    private string? _templateCache;

    public Renderer(MarkdownService markdownService, HtmlSanitizerService sanitizer)
    {
        _markdownService = markdownService ?? throw new ArgumentNullException(nameof(markdownService));
        _sanitizer = sanitizer ?? throw new ArgumentNullException(nameof(sanitizer));
        _templatePath = ResolveTemplatePath();
    }

    public async Task<RenderResult> RenderAsync(RenderRequest request, CancellationToken cancellationToken = default)
    {
        if (request.DocumentPath is null)
        {
            throw new ArgumentException("Document path must be provided.", nameof(request));
        }

        var markdown = request.Markdown ?? string.Empty;
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

        var sanitized = _sanitizer.Sanitize(html, baseUri);
        var template = await LoadTemplateAsync(cancellationToken).ConfigureAwait(false);
        var stateJson = BuildStateJson(request);

        var output = template
            .Replace(ContentToken, sanitized, StringComparison.Ordinal)
            .Replace(StateToken, stateJson, StringComparison.Ordinal);

        var title = DetermineTitle(markdown, request.DocumentPath);
        return new RenderResult(output, title);
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
}

public readonly record struct RenderRequest(
    string? Markdown,
    string DocumentPath,
    string? RelativePath,
    string? Anchor,
    string PreferredTheme);

public readonly record struct RenderResult(string Html, string Title);
