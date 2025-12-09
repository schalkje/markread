namespace MarkRead.Models;

/// <summary>
/// Represents application theme configuration
/// </summary>
public class Theme
{
    /// <summary>
    /// Current theme type
    /// </summary>
    public ThemeType Type { get; set; } = ThemeType.Light;

    /// <summary>
    /// Background color
    /// </summary>
    public string BackgroundColor { get; set; } = "#FFFFFF";

    /// <summary>
    /// Surface color (for elevated elements)
    /// </summary>
    public string SurfaceColor { get; set; } = "#F5F5F5";

    /// <summary>
    /// Primary brand color
    /// </summary>
    public string PrimaryColor { get; set; } = "#0078D4";

    /// <summary>
    /// Text color on background
    /// </summary>
    public string TextColor { get; set; } = "#000000";

    /// <summary>
    /// Base font family
    /// </summary>
    public string FontFamily { get; set; } = "OpenSans";

    /// <summary>
    /// Base font size (in pixels)
    /// </summary>
    public int FontSize { get; set; } = 14;

    /// <summary>
    /// Line height multiplier
    /// </summary>
    public double LineHeight { get; set; } = 1.6;
}

/// <summary>
/// Available theme types
/// </summary>
public enum ThemeType
{
    Light,
    Dark,
    System
}
