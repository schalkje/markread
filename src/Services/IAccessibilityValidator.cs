namespace MarkRead.Services;

/// <summary>
/// Service for validating accessibility compliance (WCAG 2.1 AA)
/// </summary>
public interface IAccessibilityValidator
{
    /// <summary>
    /// Calculate contrast ratio between two colors
    /// </summary>
    /// <param name="foreground">Foreground color (text)</param>
    /// <param name="background">Background color</param>
    /// <returns>Contrast ratio (e.g., 4.5, 7.2)</returns>
    double CalculateContrastRatio(Color foreground, Color background);

    /// <summary>
    /// Validate text contrast meets WCAG AA standard (4.5:1)
    /// </summary>
    /// <param name="foreground">Text color</param>
    /// <param name="background">Background color</param>
    /// <returns>True if contrast ratio >= 4.5:1</returns>
    bool ValidateTextContrast(Color foreground, Color background);

    /// <summary>
    /// Validate large text contrast meets WCAG AA standard (3.0:1)
    /// Large text is 18pt+ regular or 14pt+ bold
    /// </summary>
    /// <param name="foreground">Text color</param>
    /// <param name="background">Background color</param>
    /// <returns>True if contrast ratio >= 3.0:1</returns>
    bool ValidateLargeTextContrast(Color foreground, Color background);

    /// <summary>
    /// Validate UI component contrast meets WCAG AA standard (3.0:1)
    /// For borders, icons, and active UI elements
    /// </summary>
    /// <param name="foreground">Component color</param>
    /// <param name="background">Background color</param>
    /// <returns>True if contrast ratio >= 3.0:1</returns>
    bool ValidateComponentContrast(Color foreground, Color background);

    /// <summary>
    /// Validate entire theme for accessibility compliance
    /// </summary>
    /// <param name="themeColors">Dictionary of theme color keys and Color values</param>
    /// <returns>Dictionary of failed color pairs with contrast ratios</returns>
    Dictionary<string, (double ContrastRatio, string Issue)> ValidateTheme(Dictionary<string, Color> themeColors);

    /// <summary>
    /// Get human-readable contrast level description
    /// </summary>
    /// <param name="contrastRatio">Contrast ratio value</param>
    /// <returns>Description like "AAA Large Text", "AA Normal Text", "Fail"</returns>
    string GetContrastLevel(double contrastRatio);
}
