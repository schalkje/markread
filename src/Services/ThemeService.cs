using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// Theme management service with MAUI integration
/// </summary>
public class ThemeService : IThemeService
{
    private Theme _currentTheme;

    public event EventHandler<ThemeType>? ThemeChanged;

    public ThemeService()
    {
        _currentTheme = CreateLightTheme();
    }

    public Theme GetCurrentTheme() => _currentTheme;

    public void SetTheme(ThemeType themeType)
    {
        _currentTheme = themeType switch
        {
            ThemeType.Light => CreateLightTheme(),
            ThemeType.Dark => CreateDarkTheme(),
            ThemeType.System => CreateSystemTheme(),
            _ => CreateLightTheme()
        };

        // Update MAUI app theme
        if (Application.Current != null)
        {
            Application.Current.UserAppTheme = themeType switch
            {
                ThemeType.Light => AppTheme.Light,
                ThemeType.Dark => AppTheme.Dark,
                ThemeType.System => AppTheme.Unspecified,
                _ => AppTheme.Light
            };
        }

        ThemeChanged?.Invoke(this, themeType);
    }

    private Theme CreateLightTheme() => new()
    {
        Type = ThemeType.Light,
        BackgroundColor = "#FFFFFF",
        SurfaceColor = "#F5F5F5",
        PrimaryColor = "#0078D4",
        TextColor = "#000000",
        FontFamily = "OpenSans",
        FontSize = 14,
        LineHeight = 1.6
    };

    private Theme CreateDarkTheme() => new()
    {
        Type = ThemeType.Dark,
        BackgroundColor = "#1E1E1E",
        SurfaceColor = "#2D2D30",
        PrimaryColor = "#0078D4",
        TextColor = "#FFFFFF",
        FontFamily = "OpenSans",
        FontSize = 14,
        LineHeight = 1.6
    };

    private Theme CreateSystemTheme()
    {
        // Detect system theme
        var isDark = Application.Current?.RequestedTheme == AppTheme.Dark;
        return isDark ? CreateDarkTheme() : CreateLightTheme();
    }
}
