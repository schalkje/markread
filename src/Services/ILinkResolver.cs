namespace MarkRead.Services;

/// <summary>
/// Service for resolving and validating markdown links
/// </summary>
public interface ILinkResolver
{
    /// <summary>
    /// Resolve a markdown link to an absolute file path
    /// </summary>
    /// <param name="linkHref">Link href from markdown (relative, absolute, anchor, etc.)</param>
    /// <param name="currentDocumentPath">Path of the document containing the link</param>
    /// <param name="workspaceRoot">Root folder of the workspace</param>
    /// <returns>Resolved absolute path, or null if link is external/invalid</returns>
    string? ResolveLink(string linkHref, string currentDocumentPath, string workspaceRoot);

    /// <summary>
    /// Check if a link is internal (within workspace) or external
    /// </summary>
    /// <param name="linkHref">Link href to check</param>
    /// <returns>True if link is external (http/https/mailto/etc.)</returns>
    bool IsExternalLink(string linkHref);

    /// <summary>
    /// Validate that a resolved path is within the workspace root (security check)
    /// </summary>
    /// <param name="resolvedPath">Absolute path to validate</param>
    /// <param name="workspaceRoot">Root folder that path must be within</param>
    /// <returns>True if path is within workspace, false if outside (security violation)</returns>
    bool IsPathWithinWorkspace(string resolvedPath, string workspaceRoot);

    /// <summary>
    /// Validate URL scheme for external links (allow http, https, mailto)
    /// </summary>
    /// <param name="url">URL to validate</param>
    /// <returns>True if scheme is allowed</returns>
    bool IsAllowedScheme(string url);

    /// <summary>
    /// Extract anchor/fragment from link (#heading-name)
    /// </summary>
    /// <param name="linkHref">Link that may contain anchor</param>
    /// <returns>Tuple of (path without anchor, anchor id or null)</returns>
    (string Path, string? Anchor) SplitAnchor(string linkHref);

    /// <summary>
    /// Check if link target exists in file system
    /// </summary>
    /// <param name="resolvedPath">Absolute path to check</param>
    /// <returns>True if file/directory exists</returns>
    bool LinkTargetExists(string resolvedPath);
}
