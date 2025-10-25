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

        if (System.Windows.Application.Current is null)
        {
            return;
        }

        System.Windows.Application.Current.Resources["ApplicationTheme"] = theme;
        UpdateWindowBackground(theme);
    }

    private static void UpdateWindowBackground(AppTheme theme)
    {
        if (System.Windows.Application.Current?.MainWindow is not System.Windows.Window window)
        {
            return;
        }

        window.Background = theme switch
        {
            AppTheme.Dark => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(0x20, 0x20, 0x20)),
            AppTheme.Light => System.Windows.Media.Brushes.White,
            _ => System.Windows.SystemColors.WindowBrush
        };
        window.Foreground = theme switch
        {
            AppTheme.Dark => System.Windows.Media.Brushes.WhiteSmoke,
            _ => System.Windows.SystemColors.WindowTextBrush
        };
    }
}
