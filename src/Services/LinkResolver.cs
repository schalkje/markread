using System;
using System.IO;

namespace MarkRead.App.Services;

public sealed class LinkResolver
{
    private readonly FolderService _folderService;

    public LinkResolver(FolderService folderService)
    {
        _folderService = folderService;
    }

    public LinkResolutionResult Resolve(string? href, FolderRoot root, string currentDocumentPath)
    {
        if (string.IsNullOrWhiteSpace(href))
        {
            return LinkResolutionResult.Empty;
        }

        var trimmed = href.Trim();
        if (trimmed.StartsWith("#", StringComparison.Ordinal))
        {
            return LinkResolutionResult.ForAnchor(trimmed[1..]);
        }

        SplitAnchor(trimmed, out var pathPart, out var anchorPart);

        if (string.IsNullOrWhiteSpace(pathPart))
        {
            return anchorPart is null ? LinkResolutionResult.Empty : LinkResolutionResult.ForAnchor(anchorPart);
        }

        if (Uri.TryCreate(pathPart, UriKind.Absolute, out var absoluteUri) && !Path.IsPathRooted(pathPart))
        {
            if (absoluteUri.Scheme is "http" or "https" or "mailto")
            {
                return LinkResolutionResult.ForExternal(absoluteUri, anchorPart);
            }

            if (absoluteUri.IsFile && absoluteUri.LocalPath is { Length: > 0 } localFile)
            {
                return ResolveLocalPath(localFile, anchorPart, root);
            }

            return LinkResolutionResult.Blocked($"Unsupported link scheme: {absoluteUri.Scheme}");
        }

        if (Path.IsPathRooted(pathPart))
        {
            return ResolveLocalPath(pathPart, anchorPart, root);
        }

        var baseDirectory = Path.GetDirectoryName(currentDocumentPath);
        if (string.IsNullOrEmpty(baseDirectory))
        {
            baseDirectory = root.Path;
        }

        var combinedPath = Path.GetFullPath(Path.Combine(baseDirectory, pathPart));
        return ResolveLocalPath(combinedPath, anchorPart, root);
    }

    private LinkResolutionResult ResolveLocalPath(string candidatePath, string? anchor, FolderRoot root)
    {
        string normalized;
        try
        {
            normalized = Path.GetFullPath(candidatePath);
        }
        catch (Exception ex)
        {
            return LinkResolutionResult.Blocked($"Unable to resolve path: {ex.Message}");
        }

        if (!_folderService.IsWithinRoot(root.Path, normalized))
        {
            return LinkResolutionResult.Blocked("Path is outside the active root.", normalized, anchor);
        }

        if (!File.Exists(normalized) && !Directory.Exists(normalized))
        {
            return LinkResolutionResult.Blocked("Target file or directory does not exist.", normalized, anchor);
        }

        return LinkResolutionResult.ForInternal(normalized, anchor);
    }

    private static void SplitAnchor(string input, out string pathPart, out string? anchorPart)
    {
        var index = input.IndexOf('#');
        if (index < 0)
        {
            pathPart = input;
            anchorPart = null;
            return;
        }

        pathPart = input[..index];
        anchorPart = index + 1 < input.Length ? input[(index + 1)..] : string.Empty;
    }
}

public readonly struct LinkResolutionResult
{
    private LinkResolutionResult(bool isExternal, bool isAnchor, bool isBlocked, string? localPath, Uri? externalUri, string? anchor, string? message)
    {
        IsExternal = isExternal;
        IsAnchor = isAnchor;
        IsBlocked = isBlocked;
        LocalPath = localPath;
        ExternalUri = externalUri;
        Anchor = anchor;
        Message = message;
    }

    public static LinkResolutionResult Empty { get; } = new(false, false, false, null, null, null, null);

    public bool IsExternal { get; }

    public bool IsAnchor { get; }

    public bool IsBlocked { get; }

    public string? LocalPath { get; }

    public Uri? ExternalUri { get; }

    public string? Anchor { get; }

    public string? Message { get; }

    public static LinkResolutionResult ForInternal(string localPath, string? anchor) => new(false, false, false, localPath, null, anchor, null);

    public static LinkResolutionResult ForExternal(Uri uri, string? anchor) => new(true, false, false, null, anchor is null ? uri : new Uri(uri, "#" + anchor), anchor, null);

    public static LinkResolutionResult ForAnchor(string anchor) => new(false, true, false, null, null, anchor, null);

    public static LinkResolutionResult Blocked(string message, string? localPath = null, string? anchor = null) => new(false, false, true, localPath, null, anchor, message);
}
