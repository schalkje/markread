namespace MarkRead.Services;

/// <summary>
/// Service for sanitizing HTML content to prevent XSS attacks
/// </summary>
public interface IHtmlSanitizerService
{
    /// <summary>
    /// Sanitizes HTML content by removing potentially dangerous elements and attributes
    /// </summary>
    /// <param name="html">The HTML content to sanitize</param>
    /// <returns>Sanitized HTML</returns>
    string Sanitize(string html);

    /// <summary>
    /// Sanitizes HTML content with custom allowed tags and attributes
    /// </summary>
    string SanitizeWithAllowlist(string html, HashSet<string> allowedTags, HashSet<string> allowedAttributes);
}
