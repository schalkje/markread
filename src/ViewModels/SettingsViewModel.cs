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
    
    [ObservableProperty]
    private double _defaultZoom = 1.0;
    
    [ObservableProperty]
    private StartupBehavior _startupBehavior = StartupBehavior.Ask;
    
    [ObservableProperty]
    private string _excludedFoldersText = string.Empty;
    
    private Settings? _currentSettings;

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
            _currentSettings = await _settingsService.LoadAsync();
            SelectedTheme = _currentSettings.ThemePreference;
            DefaultZoom = _currentSettings.DefaultZoom;
            StartupBehavior = _currentSettings.StartupBehavior;
            ExcludedFoldersText = string.Join(Environment.NewLine, _currentSettings.ExcludedFolders);
            UpdateThemeDisplayText();
            _logger.LogInfo("Settings loaded successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed to load settings: {ex.Message}");
        }
    }
    
    /// <summary>
    /// Save settings to storage
    /// </summary>
    [RelayCommand]
    private async Task SaveSettingsAsync()
    {
        try
        {
            IsSaving = true;
            
            if (_currentSettings == null)
            {
                _currentSettings = await _settingsService.LoadAsync();
            }
            
            _currentSettings.ThemePreference = SelectedTheme;
            _currentSettings.DefaultZoom = DefaultZoom;
            _currentSettings.StartupBehavior = StartupBehavior;
            
            // Parse excluded folders
            _currentSettings.ExcludedFolders = ExcludedFoldersText
                .Split(new[] { Environment.NewLine, "\n", "," }, StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .ToList();
            
            await _settingsService.SaveAsync(_currentSettings);
            _logger.LogInfo("Settings saved successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed to save settings: {ex.Message}");
        }
        finally
        {
            IsSaving = false;
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
            DefaultZoom = 1.0;
            StartupBehavior = StartupBehavior.Ask;
            ExcludedFoldersText = ".git\nnode_modules\nbin\nobj\n.vscode\n.env\nvenv\n__pycache__";
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
