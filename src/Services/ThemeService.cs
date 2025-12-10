using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// Theme management service with MAUI integration, system detection, and persistence
/// </summary>
public class ThemeService : IThemeService
{
    private readonly ISettingsService _settingsService;
    private readonly ILoggingService _logger;
    private Theme _currentTheme;
    private ThemeType _themePreference = ThemeType.System;

    public event EventHandler<ThemeType>? ThemeChanged;

    public ThemeService(ISettingsService settingsService, ILoggingService logger)
    {
        _settingsService = settingsService;
        _logger = logger;
        _currentTheme = CreateLightTheme();

        // Listen for system theme changes
        if (Application.Current != null)
        {
            Application.Current.RequestedThemeChanged += OnSystemThemeChanged;
        }
    }

    public Theme GetCurrentTheme() => _currentTheme;
    
    public ThemeType GetThemePreference() => _themePreference;

    public ThemeType GetEffectiveThemeType()
    {
        if (_themePreference == ThemeType.System)
        {
            var isDark = Application.Current?.RequestedTheme == AppTheme.Dark;
            return isDark ? ThemeType.Dark : ThemeType.Light;
        }
        return _themePreference;
    }

    public async Task InitializeThemeAsync()
    {
        try
        {
            var settings = await _settingsService.LoadAsync();
            var savedTheme = settings.ThemePreference;
            
            _logger.LogInfo($"Initializing theme: {savedTheme}");
            SetTheme(savedTheme);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed to initialize theme: {ex.Message}");
            SetTheme(ThemeType.System); // Fallback to system theme
        }
    }

    public void SetTheme(ThemeType themeType)
    {
        _themePreference = themeType;

        // Resolve system theme to actual Light/Dark
        var effectiveType = GetEffectiveThemeType();
        
        _currentTheme = effectiveType switch
        {
            ThemeType.Dark => CreateDarkTheme(),
            _ => CreateLightTheme()
        };

        // Update MAUI app theme without flicker
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

        // Persist preference asynchronously
        _ = Task.Run(async () =>
        {
            try
            {
                var settings = await _settingsService.LoadAsync();
                settings.ThemePreference = themeType;
                await _settingsService.SaveAsync(settings);
                _logger.LogInfo($"Theme preference saved: {themeType}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to save theme preference: {ex.Message}");
            }
        });

        ThemeChanged?.Invoke(this, effectiveType);
        _logger.LogInfo($"Theme changed: {themeType} (effective: {effectiveType})");
    }

    public string GetThemeCss()
    {
        var effectiveType = GetEffectiveThemeType();
        return effectiveType == ThemeType.Dark ? GetDarkThemeCss() : GetLightThemeCss();
    }

    private void OnSystemThemeChanged(object? sender, AppThemeChangedEventArgs e)
    {
        // Only react if user preference is System
        if (_themePreference == ThemeType.System)
        {
            _logger.LogInfo($"System theme changed to: {e.RequestedTheme}");
            SetTheme(ThemeType.System); // Refresh theme based on new system setting
        }
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

    private string GetLightThemeCss() => @"
:root {
    --bg-color: #FFFFFF;
    --surface-color: #F5F5F5;
    --text-color: #212529;
    --text-secondary: #6C757D;
    --primary-color: #0078D4;
    --border-color: #DEE2E6;
    --code-bg: #F8F9FA;
    --code-border: #DEE2E6;
    --inline-code-bg: #E9ECEF;
    --inline-code-text: #D63384;
    --link-color: #0078D4;
    --link-hover: #005A9E;
    --blockquote-border: #6C757D;
    --blockquote-bg: #F8F9FA;
    --table-border: #DEE2E6;
    --table-header-bg: #F8F9FA;
    --syntax-keyword: #0000FF;
    --syntax-string: #A31515;
    --syntax-comment: #008000;
    --syntax-function: #795E26;
    --syntax-variable: #001080;
    --syntax-number: #098658;
}";

    private string GetDarkThemeCss() => @"
:root {
    --bg-color: #1E1E1E;
    --surface-color: #2D2D30;
    --text-color: #FFFFFF;
    --text-secondary: #ADB5BD;
    --primary-color: #3399FF;
    --border-color: #3E3E42;
    --code-bg: #1E1E1E;
    --code-border: #3E3E42;
    --inline-code-bg: #2D2D30;
    --inline-code-text: #E685B5;
    --link-color: #3399FF;
    --link-hover: #66B3FF;
    --blockquote-border: #ADB5BD;
    --blockquote-bg: #2D2D30;
    --table-border: #3E3E42;
    --table-header-bg: #2D2D30;
    --syntax-keyword: #569CD6;
    --syntax-string: #CE9178;
    --syntax-comment: #6A9955;
    --syntax-function: #DCDCAA;
    --syntax-variable: #9CDCFE;
    --syntax-number: #B5CEA8;
}";
}
