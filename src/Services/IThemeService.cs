using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// Service for managing application themes with system detection
/// </summary>
public interface IThemeService
{
    /// <summary>
    /// Gets the current theme
    /// </summary>
    Theme GetCurrentTheme();

    /// <summary>
    /// Gets the current theme type preference (Light, Dark, or System)
    /// </summary>
    ThemeType GetThemePreference();

    /// <summary>
    /// Sets the application theme and persists preference
    /// </summary>
    void SetTheme(ThemeType themeType);

    /// <summary>
    /// Get CSS content for current theme to inject into WebView
    /// </summary>
    string GetThemeCss();

    /// <summary>
    /// Get current effective theme type (resolves System to Light/Dark)
    /// </summary>
    ThemeType GetEffectiveThemeType();

    /// <summary>
    /// Initialize theme from saved preference
    /// </summary>
    Task InitializeThemeAsync();

    /// <summary>
    /// Event raised when theme changes
    /// </summary>
    event EventHandler<ThemeType>? ThemeChanged;
}
