using System;
using System.ComponentModel;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;
using MarkRead.Services;
using MarkRead.App.Services;
using WpfApplication = System.Windows.Application;
using WpfColor = System.Windows.Media.Color;
using DrawingColor = System.Drawing.Color;

namespace MarkRead.App;

/// <summary>
/// Service interface for theme management operations
/// </summary>
public interface IThemeService : INotifyPropertyChanged
{
    /// <summary>
    /// Gets the current active theme
    /// </summary>
    ThemeType CurrentTheme { get; }

    /// <summary>
    /// Switch application theme
    /// </summary>
    Task<bool> ApplyTheme(ThemeType theme);

    /// <summary>
    /// Retrieve active theme
    /// </summary>
    ThemeType GetCurrentTheme();

    /// <summary>
    /// List supported themes
    /// </summary>
    System.Collections.Generic.IEnumerable<ThemeType> GetAvailableThemes();

    /// <summary>
    /// Check OS theme detection capability
    /// </summary>
    bool IsSystemThemeSupported();

    /// <summary>
    /// Fired when theme is successfully applied
    /// </summary>
    event EventHandler<ThemeChangedEventArgs>? ThemeChanged;

    /// <summary>
    /// Fired when theme application fails
    /// </summary>
    event EventHandler<ThemeErrorEventArgs>? ThemeLoadFailed;
}

/// <summary>
/// Event arguments for theme change notifications
/// </summary>
public class ThemeChangedEventArgs : EventArgs
{
    public ThemeType OldTheme { get; }
    public ThemeType NewTheme { get; }

    public ThemeChangedEventArgs(ThemeType oldTheme, ThemeType newTheme)
    {
        OldTheme = oldTheme;
        NewTheme = newTheme;
    }
}

/// <summary>
/// Event arguments for theme error notifications
/// </summary>
public class ThemeErrorEventArgs : EventArgs
{
    public ThemeType AttemptedTheme { get; }
    public Exception Error { get; }

    public ThemeErrorEventArgs(ThemeType attemptedTheme, Exception error)
    {
        AttemptedTheme = attemptedTheme;
        Error = error;
    }
}

/// <summary>
/// Enhanced theme manager with comprehensive light/dark theme support,
/// resource dictionary management, and WebView2 integration
/// </summary>
public class ThemeManager : IThemeService, INotifyPropertyChanged
{
    private readonly SettingsService _settingsService;
    private ThemeConfiguration _themeConfiguration;
    private ThemeType _currentTheme = ThemeType.System;

    public event PropertyChangedEventHandler? PropertyChanged;
    public event EventHandler<ThemeChangedEventArgs>? ThemeChanged;
    public event EventHandler<ThemeErrorEventArgs>? ThemeLoadFailed;

    /// <summary>
    /// Gets the current active theme
    /// </summary>
    public ThemeType CurrentTheme
    {
        get => _currentTheme;
        private set
        {
            if (_currentTheme != value)
            {
                _currentTheme = value;
                OnPropertyChanged(nameof(CurrentTheme));
            }
        }
    }

    public ThemeManager(SettingsService settingsService)
    {
        _settingsService = settingsService ?? throw new ArgumentNullException(nameof(settingsService));
        _themeConfiguration = new ThemeConfiguration();
    }

    /// <summary>
    /// Initialize theme manager by loading saved settings
    /// </summary>
    public async Task InitializeAsync()
    {
        try
        {
            _themeConfiguration = await _settingsService.LoadThemeConfigurationAsync();
            var effectiveTheme = _themeConfiguration.GetEffectiveTheme();
            await ApplyThemeInternal(effectiveTheme, false); // Don't save during initialization
        }
        catch (Exception ex)
        {
            // Fallback to light theme if initialization fails
            OnThemeLoadFailed(ThemeType.System, ex);
            await ApplyThemeInternal(ThemeType.Light, false);
        }
    }

    /// <summary>
    /// Switch application theme
    /// </summary>
    public async Task<bool> ApplyTheme(ThemeType theme)
    {
        try
        {
            var oldTheme = CurrentTheme;
            await ApplyThemeInternal(theme, true);
            
            // Save the theme preference
            _themeConfiguration.CurrentTheme = theme;
            _themeConfiguration.LastModified = DateTime.UtcNow;
            await _settingsService.SaveThemeConfigurationAsync(_themeConfiguration);
            
            OnThemeChanged(oldTheme, theme);
            return true;
        }
        catch (Exception ex)
        {
            OnThemeLoadFailed(theme, ex);
            return false;
        }
    }

    private async Task ApplyThemeInternal(ThemeType theme, bool saveSettings)
    {
        var effectiveTheme = ResolveEffectiveTheme(theme);
        CurrentTheme = effectiveTheme;
        
        // Apply WPF theme
        ApplyWpfTheme(effectiveTheme);
        
        // TODO: Apply WebView2 theme in future tasks
        // await ApplyWebView2Theme(effectiveTheme);
    }

    private void ApplyWpfTheme(ThemeType theme)
    {
        if (WpfApplication.Current == null) return;

        var colorScheme = theme == ThemeType.Dark 
            ? _themeConfiguration.DarkColorScheme 
            : _themeConfiguration.LightColorScheme;

        // Update application resources
        WpfApplication.Current.Resources["ApplicationTheme"] = theme;
        WpfApplication.Current.Resources["ThemeBackground"] = ColorToBrush(colorScheme.Background);
        WpfApplication.Current.Resources["ThemeForeground"] = ColorToBrush(colorScheme.Foreground);
        WpfApplication.Current.Resources["ThemeAccent"] = ColorToBrush(colorScheme.Accent);
        WpfApplication.Current.Resources["ThemeBorder"] = ColorToBrush(colorScheme.Border);
        WpfApplication.Current.Resources["ThemeButtonBackground"] = ColorToBrush(colorScheme.ButtonBackground);
        WpfApplication.Current.Resources["ThemeButtonHover"] = ColorToBrush(colorScheme.ButtonHover);
        WpfApplication.Current.Resources["ThemeSidebarBackground"] = ColorToBrush(colorScheme.SidebarBackground);
        WpfApplication.Current.Resources["ThemeTabActive"] = ColorToBrush(colorScheme.TabActiveBackground);
        WpfApplication.Current.Resources["ThemeTabInactive"] = ColorToBrush(colorScheme.TabInactiveBackground);

        // Update main window if available
        UpdateMainWindow(colorScheme);
    }

    private void UpdateMainWindow(ColorScheme colorScheme)
    {
        if (WpfApplication.Current?.MainWindow is not Window window) return;

        window.Background = ColorToBrush(colorScheme.Background);
        window.Foreground = ColorToBrush(colorScheme.Foreground);
    }

    private static SolidColorBrush ColorToBrush(DrawingColor color)
    {
        return new SolidColorBrush(WpfColor.FromArgb(color.A, color.R, color.G, color.B));
    }

    private ThemeType ResolveEffectiveTheme(ThemeType theme)
    {
        if (theme != ThemeType.System) return theme;

        // TODO: Implement actual system theme detection
        // For now, default to light theme
        return ThemeType.Light;
    }

    /// <summary>
    /// Retrieve active theme
    /// </summary>
    public ThemeType GetCurrentTheme() => CurrentTheme;

    /// <summary>
    /// List supported themes
    /// </summary>
    public System.Collections.Generic.IEnumerable<ThemeType> GetAvailableThemes()
    {
        return new[] { ThemeType.Light, ThemeType.Dark, ThemeType.System };
    }

    /// <summary>
    /// Check OS theme detection capability
    /// </summary>
    public bool IsSystemThemeSupported()
    {
        // TODO: Check Windows version and API availability
        return Environment.OSVersion.Version.Major >= 10;
    }

    /// <summary>
    /// Get current theme configuration
    /// </summary>
    public ThemeConfiguration GetCurrentConfiguration()
    {
        return _themeConfiguration;
    }

    protected virtual void OnPropertyChanged(string propertyName)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }

    protected virtual void OnThemeChanged(ThemeType oldTheme, ThemeType newTheme)
    {
        ThemeChanged?.Invoke(this, new ThemeChangedEventArgs(oldTheme, newTheme));
    }

    protected virtual void OnThemeLoadFailed(ThemeType attemptedTheme, Exception error)
    {
        ThemeLoadFailed?.Invoke(this, new ThemeErrorEventArgs(attemptedTheme, error));
    }
}

/// <summary>
/// Legacy static theme manager for backward compatibility
/// </summary>
public static class LegacyThemeManager
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
