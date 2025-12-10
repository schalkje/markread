using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MarkRead.Models;
using MarkRead.Services;

namespace MarkRead.ViewModels;

/// <summary>
/// ViewModel for settings page with theme preferences and other configuration
/// </summary>
public partial class SettingsViewModel : ObservableObject
{
    private readonly IThemeService _themeService;
    private readonly ISettingsService _settingsService;
    private readonly ILoggingService _logger;

    [ObservableProperty]
    private ThemeType _selectedTheme;

    [ObservableProperty]
    private string _themeDisplayText = "System";

    [ObservableProperty]
    private bool _isSaving;

    public SettingsViewModel(
        IThemeService themeService,
        ISettingsService settingsService,
        ILoggingService logger)
    {
        _themeService = themeService;
        _settingsService = settingsService;
        _logger = logger;

        // Initialize from current preference
        _selectedTheme = _themeService.GetThemePreference();
        UpdateThemeDisplayText();

        // Listen for theme changes from other sources
        _themeService.ThemeChanged += OnThemeChanged;
    }

    /// <summary>
    /// Cycle through theme options: Light → Dark → System → Light
    /// </summary>
    [RelayCommand]
    private async Task CycleThemeAsync()
    {
        var nextTheme = SelectedTheme switch
        {
            ThemeType.Light => ThemeType.Dark,
            ThemeType.Dark => ThemeType.System,
            ThemeType.System => ThemeType.Light,
            _ => ThemeType.System
        };

        await SetThemeAsync(nextTheme);
    }

    /// <summary>
    /// Set theme to specific type
    /// </summary>
    [RelayCommand]
    private async Task SetThemeAsync(ThemeType themeType)
    {
        try
        {
            IsSaving = true;
            SelectedTheme = themeType;
            UpdateThemeDisplayText();

            _themeService.SetTheme(themeType);
            _logger.LogInfo($"Theme set to: {themeType}");

            // Brief delay for visual feedback
            await Task.Delay(150);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed to set theme: {ex.Message}");
        }
        finally
        {
            IsSaving = false;
        }
    }

    /// <summary>
    /// Load settings from storage
    /// </summary>
    [RelayCommand]
    private async Task LoadSettingsAsync()
    {
        try
        {
            var settings = await _settingsService.LoadAsync();
            SelectedTheme = settings.ThemePreference;
            UpdateThemeDisplayText();
            _logger.LogInfo("Settings loaded successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed to load settings: {ex.Message}");
        }
    }

    /// <summary>
    /// Reset settings to defaults
    /// </summary>
    [RelayCommand]
    private async Task ResetToDefaultsAsync()
    {
        try
        {
            IsSaving = true;
            await SetThemeAsync(ThemeType.System);
            _logger.LogInfo("Settings reset to defaults");
        }
        finally
        {
            IsSaving = false;
        }
    }

    private void OnThemeChanged(object? sender, ThemeType newTheme)
    {
        // Update UI if theme was changed externally (e.g., keyboard shortcut)
        if (SelectedTheme != _themeService.GetThemePreference())
        {
            SelectedTheme = _themeService.GetThemePreference();
            UpdateThemeDisplayText();
        }
    }

    private void UpdateThemeDisplayText()
    {
        ThemeDisplayText = SelectedTheme switch
        {
            ThemeType.Light => "☀️ Light",
            ThemeType.Dark => "🌙 Dark",
            ThemeType.System => "💻 System",
            _ => "System"
        };
    }
}
