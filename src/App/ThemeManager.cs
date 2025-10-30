using System;
using System.ComponentModel;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;
using System.Linq;
using System.Collections.Generic;
using Microsoft.Win32;
using MarkRead.Services;
using MarkRead.App.Services;
using WpfApplication = System.Windows.Application;
using WpfColor = System.Windows.Media.Color;
using DrawingColor = System.Drawing.Color;
using ThemeType = MarkRead.Services.ThemeType;
using ThemeConfiguration = MarkRead.Services.ThemeConfiguration;
using ColorScheme = MarkRead.Services.ColorScheme;

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
    /// Snapshot current theme configuration
    /// </summary>
    ThemeConfiguration GetCurrentConfiguration();

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
    
    // Performance optimization: Cache for resource dictionaries
    private static readonly Dictionary<ThemeType, ResourceDictionary?> _resourceDictionaryCache = new();

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
    /// Initialize theme manager by loading saved settings (T079: Enhanced error handling)
    /// </summary>
    public async Task InitializeAsync()
    {
        try
        {
            _themeConfiguration = await _settingsService.LoadThemeConfigurationAsync();
            var effectiveTheme = _themeConfiguration.GetEffectiveTheme();
            ApplyThemeInternal(effectiveTheme, false); // Don't save during initialization
        }
        catch (Exception ex)
        {
            // T079: Fallback to safe default theme if initialization fails
            OnThemeLoadFailed(ThemeType.System, ex);
            
            // Use factory default configuration
            _themeConfiguration = CreateDefaultThemeConfiguration();
            ApplyThemeInternal(ThemeType.Light, false);
        }
    }

    /// <summary>
    /// Creates a factory default theme configuration (T079).
    /// </summary>
    private static ThemeConfiguration CreateDefaultThemeConfiguration()
    {
        return new ThemeConfiguration
        {
            CurrentTheme = ThemeType.Light,
            SystemThemeFollow = false,
            LastModified = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Switch application theme (T079: Enhanced error handling and fallback)
    /// </summary>
    public async Task<bool> ApplyTheme(ThemeType theme)
    {
        try
        {
            var oldTheme = CurrentTheme;
            var effectiveTheme = ResolveEffectiveTheme(theme);
            
            // Performance optimization: Skip if already applied
            if (effectiveTheme == oldTheme && _themeConfiguration.CurrentTheme == theme)
            {
                return true;
            }
            
            ApplyThemeInternal(theme, true);
            
            // Save the theme preference
            _themeConfiguration.CurrentTheme = theme;
            _themeConfiguration.LastModified = DateTime.UtcNow;
            
            try
            {
                await _settingsService.SaveThemeConfigurationAsync(_themeConfiguration);
            }
            catch (Exception saveEx)
            {
                // T079: Non-fatal - theme is applied but not persisted
                System.Diagnostics.Debug.WriteLine($"Failed to save theme preference: {saveEx.Message}");
                // Continue execution - theme is still applied in memory
            }
            
            OnThemeChanged(oldTheme, effectiveTheme);
            return true;
        }
        catch (Exception ex)
        {
            // T079: Graceful degradation on theme application failure
            System.Diagnostics.Debug.WriteLine($"Theme application failed: {ex.Message}");
            OnThemeLoadFailed(theme, ex);
            
            // Attempt fallback to light theme if not already light
            if (theme != ThemeType.Light)
            {
                try
                {
                    ApplyThemeInternal(ThemeType.Light, false);
                    return false; // Indicate requested theme failed but fallback succeeded
                }
                catch
                {
                    // Even fallback failed - continue with current state
                }
            }
            
            return false;
        }
    }

    private void ApplyThemeInternal(ThemeType theme, bool saveSettings)
    {
        var oldTheme = CurrentTheme;
        var effectiveTheme = ResolveEffectiveTheme(theme);
        CurrentTheme = effectiveTheme;
        
        // Apply WPF theme
        ApplyWpfTheme(effectiveTheme);
        
        // Fire theme changed event if theme actually changed
        if (oldTheme != effectiveTheme)
        {
            OnThemeChanged(oldTheme, effectiveTheme);
        }
        
        // TODO: Apply WebView2 theme in future tasks
        // await ApplyWebView2Theme(effectiveTheme);
    }

    private void ApplyWpfTheme(ThemeType theme)
    {
        if (WpfApplication.Current == null) return;

        var colorScheme = theme == ThemeType.Dark 
            ? _themeConfiguration.DarkColorScheme 
            : _themeConfiguration.LightColorScheme;

        // Switch entire resource dictionaries for instant theme application
        SwitchResourceDictionary(theme);

        // Update dynamic color resources for custom components
        UpdateDynamicColorResources(colorScheme);

        // Update main window if available
        UpdateMainWindow(colorScheme);
    }

    /// <summary>
    /// Switch to the appropriate theme resource dictionary
    /// </summary>
    private static void SwitchResourceDictionary(ThemeType theme)
    {
        var app = WpfApplication.Current;
        if (app?.Resources?.MergedDictionaries == null) return;

        // Performance optimization: Check cache first
        if (!_resourceDictionaryCache.TryGetValue(theme, out var cachedDict))
        {
            // Determine theme resource URI
            var themeUri = theme == ThemeType.Dark 
                ? new Uri("Themes/DarkTheme.xaml", UriKind.Relative)
                : new Uri("Themes/LightTheme.xaml", UriKind.Relative);

            try
            {
                // Load and cache the resource dictionary
                cachedDict = new ResourceDictionary { Source = themeUri };
                _resourceDictionaryCache[theme] = cachedDict;
            }
            catch (Exception ex)
            {
                // Cache the failure to avoid repeated attempts
                _resourceDictionaryCache[theme] = null;
                System.Diagnostics.Debug.WriteLine($"Failed to load theme resource: {ex.Message}");
                return;
            }
        }

        // Skip if cached dictionary is null (failed to load)
        if (cachedDict == null) return;

        try
        {
            // Add new theme dictionary BEFORE removing old ones to avoid resource lookup failures
            app.Resources.MergedDictionaries.Add(cachedDict);

            // Remove existing theme dictionaries (except the one we just added)
            var existingThemes = app.Resources.MergedDictionaries
                .Where(d => d != cachedDict && d.Source?.OriginalString?.Contains("Theme.xaml") == true)
                .ToList();

            foreach (var existingTheme in existingThemes)
            {
                app.Resources.MergedDictionaries.Remove(existingTheme);
            }

            // Set current theme indicator
            app.Resources["CurrentTheme"] = theme;
        }
        catch (Exception ex)
        {
            // Fallback to manual resource updates if ResourceDictionary loading fails
            System.Diagnostics.Debug.WriteLine($"ResourceDictionary switching failed: {ex.Message}");
            // The existing UpdateDynamicColorResources call will handle fallback
        }
    }

    /// <summary>
    /// Update dynamic color resources for components that need runtime color updates
    /// </summary>
    private void UpdateDynamicColorResources(ColorScheme colorScheme)
    {
        var app = WpfApplication.Current;
        if (app?.Resources == null) return;

        // Update dynamic brushes for runtime theme switching
        var resources = new Dictionary<string, SolidColorBrush>
        {
            ["BackgroundBrush"] = ColorToBrush(colorScheme.Background),
            ["ForegroundBrush"] = ColorToBrush(colorScheme.Foreground),
            ["AccentBrush"] = ColorToBrush(colorScheme.Accent),
            ["BorderBrush"] = ColorToBrush(colorScheme.Border),
            ["ButtonBackgroundBrush"] = ColorToBrush(colorScheme.ButtonBackground),
            ["ButtonHoverBackground"] = ColorToBrush(colorScheme.ButtonHover),
            ["ButtonPressedBackground"] = ColorToBrush(DarkenColor(colorScheme.ButtonHover, 0.1f)),
            ["SidebarBackgroundBrush"] = ColorToBrush(colorScheme.SidebarBackground),
            ["TabActiveBackgroundBrush"] = ColorToBrush(colorScheme.TabActiveBackground),
            ["TabInactiveBackgroundBrush"] = ColorToBrush(colorScheme.TabInactiveBackground)
        };

        foreach (var resource in resources)
        {
            app.Resources[resource.Key] = resource.Value;
        }
    }

    /// <summary>
    /// Darken a color by a specified factor
    /// </summary>
    private static DrawingColor DarkenColor(DrawingColor color, float factor)
    {
        return DrawingColor.FromArgb(
            color.A,
            (int)(color.R * (1 - factor)),
            (int)(color.G * (1 - factor)),
            (int)(color.B * (1 - factor))
        );
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

        // Implement actual system theme detection for Windows 10+
        return DetectWindowsSystemTheme();
    }

    /// <summary>
    /// Detect the current Windows system theme preference
    /// </summary>
    private static ThemeType DetectWindowsSystemTheme()
    {
        try
        {
            // Check Windows 10+ theme setting via registry
            using var key = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
            if (key?.GetValue("AppsUseLightTheme") is int appsUseLightTheme)
            {
                return appsUseLightTheme == 0 ? ThemeType.Dark : ThemeType.Light;
            }
        }
        catch (Exception)
        {
            // Registry access might fail due to permissions or missing keys
            // Fall back to light theme
        }

        // Default to light theme if detection fails
        return ThemeType.Light;
    }

    /// <summary>
    /// Get the resolved theme (converts System to actual Light/Dark)
    /// </summary>
    public ThemeType GetResolvedTheme()
    {
        return ResolveEffectiveTheme(CurrentTheme);
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

        if (System.Windows.Application.Current is App app && app.ThemeService is not null)
        {
            var themeType = theme switch
            {
                AppTheme.Dark => ThemeType.Dark,
                AppTheme.Light => ThemeType.Light,
                _ => ThemeType.System
            };

            _ = app.Dispatcher.InvokeAsync(async () => await app.ThemeService.ApplyTheme(themeType));
            UpdateWindowBackground(theme);
        }
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
