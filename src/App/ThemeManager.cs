using System.Windows;
using System.Windows.Media;

namespace MarkRead.App;

/// <summary>
/// Lightweight theme bootstrap to toggle system/dark/light modes.
/// Future phases will merge resource dictionaries and extend styling.
/// </summary>
public static class ThemeManager
{
    public enum AppTheme
    {
        System,
        Dark,
        Light
    }

    private static AppTheme _current = AppTheme.System;

    public static AppTheme Current => _current;

    public static void ApplyTheme(AppTheme theme)
    {
        _current = theme;

        if (Application.Current is null)
        {
            return;
        }

        Application.Current.Resources["ApplicationTheme"] = theme;
        UpdateWindowBackground(theme);
    }

    private static void UpdateWindowBackground(AppTheme theme)
    {
        if (Application.Current?.MainWindow is not Window window)
        {
            return;
        }

        window.Background = theme switch
        {
            AppTheme.Dark => new SolidColorBrush(Color.FromRgb(0x20, 0x20, 0x20)),
            AppTheme.Light => Brushes.White,
            _ => SystemColors.WindowBrush
        };
        window.Foreground = theme switch
        {
            AppTheme.Dark => Brushes.WhiteSmoke,
            _ => SystemColors.WindowTextBrush
        };
    }
}
