namespace MarkRead.Services;

/// <summary>
/// Service for resolving and validating markdown links with security checks
/// </summary>
public class LinkResolver : ILinkResolver
{
    private readonly ILoggingService _logger;
    private static readonly string[] AllowedSchemes = { "http", "https", "mailto" };
    private static readonly string[] ExternalPrefixes = { "http://", "https://", "mailto:", "ftp://", "file://" };

    public LinkResolver(ILoggingService logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Resolve a markdown link to an absolute file path
    /// </summary>
    public string? ResolveLink(string linkHref, string currentDocumentPath, string workspaceRoot)
    {
        if (string.IsNullOrWhiteSpace(linkHref))
            return null;

        // External links are not resolved to file paths
        if (IsExternalLink(linkHref))
        {
            _logger.LogDebug($"Link is external: {linkHref}");
            return null;
        }

        // Split anchor from path
        var (pathWithoutAnchor, anchor) = SplitAnchor(linkHref);

        // Handle different link types
        string resolvedPath;

        if (Path.IsPathRooted(pathWithoutAnchor))
        {
            // Absolute path (rare in markdown, but handle it)
            resolvedPath = Path.GetFullPath(pathWithoutAnchor);
        }
        else if (pathWithoutAnchor.StartsWith("/"))
        {
            // Root-relative path (relative to workspace root)
            var relativePath = pathWithoutAnchor.TrimStart('/');
            resolvedPath = Path.GetFullPath(Path.Combine(workspaceRoot, relativePath));
        }
        else
        {
            // Relative path (relative to current document)
            var currentDir = Path.GetDirectoryName(currentDocumentPath) ?? workspaceRoot;
            resolvedPath = Path.GetFullPath(Path.Combine(currentDir, pathWithoutAnchor));
        }

        // Security check: ensure resolved path is within workspace
        if (!IsPathWithinWorkspace(resolvedPath, workspaceRoot))
        {
            _logger.LogWarning($"Security: Link resolved outside workspace: {linkHref} -> {resolvedPath}");
            return null;
        }

        _logger.LogDebug($"Resolved link: {linkHref} -> {resolvedPath}" + (anchor != null ? $" #{anchor}" : ""));
        return resolvedPath;
    }

    /// <summary>
    /// Check if a link is internal (within workspace) or external
    /// </summary>
    public bool IsExternalLink(string linkHref)
    {
        if (string.IsNullOrWhiteSpace(linkHref))
            return false;

        var lowerHref = linkHref.ToLowerInvariant();
        return ExternalPrefixes.Any(prefix => lowerHref.StartsWith(prefix));
    }

    /// <summary>
    /// Validate that a resolved path is within the workspace root (security check)
    /// Prevents directory traversal attacks (../../etc/passwd)
    /// </summary>
    public bool IsPathWithinWorkspace(string resolvedPath, string workspaceRoot)
    {
        try
        {
            var fullResolvedPath = Path.GetFullPath(resolvedPath);
            var fullWorkspaceRoot = Path.GetFullPath(workspaceRoot);

            // Ensure resolved path starts with workspace root
            return fullResolvedPath.StartsWith(fullWorkspaceRoot, StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error validating path: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Validate URL scheme for external links (allow http, https, mailto)
    /// </summary>
    public bool IsAllowedScheme(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return false;

        try
        {
            var uri = new Uri(url, UriKind.Absolute);
            return AllowedSchemes.Contains(uri.Scheme.ToLowerInvariant());
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Extract anchor/fragment from link (#heading-name)
    /// </summary>
    public (string Path, string? Anchor) SplitAnchor(string linkHref)
    {
        if (string.IsNullOrWhiteSpace(linkHref))
            return (string.Empty, null);

        var anchorIndex = linkHref.IndexOf('#');
        if (anchorIndex == -1)
            return (linkHref, null);

        if (anchorIndex == 0)
            return (string.Empty, linkHref.Substring(1)); // Just an anchor (#heading)

        var path = linkHref.Substring(0, anchorIndex);
        var anchor = linkHref.Substring(anchorIndex + 1);
        return (path, string.IsNullOrWhiteSpace(anchor) ? null : anchor);
    }

    /// <summary>
    /// Check if link target exists in file system
    /// </summary>
    public bool LinkTargetExists(string resolvedPath)
    {
        if (string.IsNullOrWhiteSpace(resolvedPath))
            return false;

        try
        {
            return File.Exists(resolvedPath) || Directory.Exists(resolvedPath);
        }
        catch
        {
            return false;
        }
    }
}
