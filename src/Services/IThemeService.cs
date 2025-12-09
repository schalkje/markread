using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// Service for managing application themes
/// </summary>
public interface IThemeService
{
    /// <summary>
    /// Gets the current theme
    /// </summary>
    Theme GetCurrentTheme();

    /// <summary>
    /// Sets the application theme
    /// </summary>
    void SetTheme(ThemeType themeType);

    /// <summary>
    /// Event raised when theme changes
    /// </summary>
    event EventHandler<ThemeType>? ThemeChanged;
}
