namespace MarkRead.Services;

/// <summary>
/// Service for validating accessibility compliance (WCAG 2.1 AA)
/// Implements contrast ratio calculations per WCAG 2.1 specifications
/// </summary>
public class AccessibilityValidator : IAccessibilityValidator
{
    private readonly ILoggingService _logger;

    // WCAG 2.1 contrast ratio thresholds
    private const double TextContrastThreshold = 4.5;        // Normal text (AA)
    private const double LargeTextContrastThreshold = 3.0;   // Large text (AA)
    private const double ComponentContrastThreshold = 3.0;   // UI components (AA)
    private const double AAATextContrastThreshold = 7.0;     // Normal text (AAA)
    private const double AAALargeTextContrastThreshold = 4.5; // Large text (AAA)

    public AccessibilityValidator(ILoggingService logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Calculate contrast ratio between two colors using WCAG formula
    /// Formula: (L1 + 0.05) / (L2 + 0.05) where L1 is lighter, L2 is darker
    /// </summary>
    public double CalculateContrastRatio(Color foreground, Color background)
    {
        var foregroundLuminance = CalculateRelativeLuminance(foreground);
        var backgroundLuminance = CalculateRelativeLuminance(background);

        var lighter = Math.Max(foregroundLuminance, backgroundLuminance);
        var darker = Math.Min(foregroundLuminance, backgroundLuminance);

        return (lighter + 0.05) / (darker + 0.05);
    }

    /// <summary>
    /// Validate text contrast meets WCAG AA standard (4.5:1)
    /// </summary>
    public bool ValidateTextContrast(Color foreground, Color background)
    {
        var ratio = CalculateContrastRatio(foreground, background);
        return ratio >= TextContrastThreshold;
    }

    /// <summary>
    /// Validate large text contrast meets WCAG AA standard (3.0:1)
    /// </summary>
    public bool ValidateLargeTextContrast(Color foreground, Color background)
    {
        var ratio = CalculateContrastRatio(foreground, background);
        return ratio >= LargeTextContrastThreshold;
    }

    /// <summary>
    /// Validate UI component contrast meets WCAG AA standard (3.0:1)
    /// </summary>
    public bool ValidateComponentContrast(Color foreground, Color background)
    {
        var ratio = CalculateContrastRatio(foreground, background);
        return ratio >= ComponentContrastThreshold;
    }

    /// <summary>
    /// Validate entire theme for accessibility compliance
    /// </summary>
    public Dictionary<string, (double ContrastRatio, string Issue)> ValidateTheme(Dictionary<string, Color> themeColors)
    {
        var issues = new Dictionary<string, (double, string)>();

        if (!themeColors.ContainsKey("Background") || !themeColors.ContainsKey("OnBackground"))
        {
            _logger.LogWarning("Theme validation: Missing required colors (Background/OnBackground)");
            return issues;
        }

        var background = themeColors["Background"];

        // Validate primary text colors
        ValidateColorPair(issues, "OnBackground", themeColors, background, TextContrastThreshold, "Normal text");
        ValidateColorPair(issues, "OnSurface", themeColors, themeColors.GetValueOrDefault("Surface", background), TextContrastThreshold, "Normal text");
        ValidateColorPair(issues, "TextPrimary", themeColors, background, TextContrastThreshold, "Primary text");
        ValidateColorPair(issues, "TextSecondary", themeColors, background, TextContrastThreshold, "Secondary text");

        // Validate UI component colors
        ValidateColorPair(issues, "Border", themeColors, background, ComponentContrastThreshold, "UI component");
        ValidateColorPair(issues, "Primary", themeColors, Colors.White, ComponentContrastThreshold, "Primary button");

        // Validate state colors
        ValidateColorPair(issues, "Error", themeColors, background, ComponentContrastThreshold, "Error indicator");
        ValidateColorPair(issues, "Success", themeColors, background, ComponentContrastThreshold, "Success indicator");
        ValidateColorPair(issues, "Warning", themeColors, background, ComponentContrastThreshold, "Warning indicator");

        // Validate link colors
        ValidateColorPair(issues, "LinkColor", themeColors, background, TextContrastThreshold, "Link text");

        if (issues.Count > 0)
        {
            _logger.LogWarning($"Theme validation found {issues.Count} accessibility issue(s)");
        }
        else
        {
            _logger.LogInfo("Theme validation passed: All colors meet WCAG AA standards");
        }

        return issues;
    }

    /// <summary>
    /// Get human-readable contrast level description
    /// </summary>
    public string GetContrastLevel(double contrastRatio)
    {
        if (contrastRatio >= AAATextContrastThreshold)
            return "AAA Normal Text";
        if (contrastRatio >= TextContrastThreshold)
            return "AA Normal Text";
        if (contrastRatio >= LargeTextContrastThreshold)
            return "AA Large Text / UI Components";
        return "Fail (Below WCAG Standards)";
    }

    /// <summary>
    /// Calculate relative luminance of a color per WCAG 2.1 spec
    /// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
    /// </summary>
    private double CalculateRelativeLuminance(Color color)
    {
        // Convert RGB to decimal (0-1)
        double r = color.Red;
        double g = color.Green;
        double b = color.Blue;

        // Apply gamma correction
        r = r <= 0.03928 ? r / 12.92 : Math.Pow((r + 0.055) / 1.055, 2.4);
        g = g <= 0.03928 ? g / 12.92 : Math.Pow((g + 0.055) / 1.055, 2.4);
        b = b <= 0.03928 ? b / 12.92 : Math.Pow((b + 0.055) / 1.055, 2.4);

        // Calculate luminance using sRGB coefficients
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    /// <summary>
    /// Helper to validate a color pair and add to issues if below threshold
    /// </summary>
    private void ValidateColorPair(
        Dictionary<string, (double, string)> issues,
        string colorKey,
        Dictionary<string, Color> themeColors,
        Color background,
        double threshold,
        string context)
    {
        if (!themeColors.ContainsKey(colorKey))
            return;

        var foreground = themeColors[colorKey];
        var ratio = CalculateContrastRatio(foreground, background);

        if (ratio < threshold)
        {
            var issue = $"{context} contrast ratio {ratio:F2}:1 is below threshold {threshold:F1}:1";
            issues[colorKey] = (ratio, issue);
            _logger.LogWarning($"Accessibility issue: {colorKey} - {issue}");
        }
    }
}
