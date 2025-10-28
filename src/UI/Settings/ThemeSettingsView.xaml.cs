using System;
using System.Windows;
using MarkRead.App;
using MarkRead.App.Services;

namespace MarkRead.UI.Settings;

/// <summary>
/// Theme settings dialog to choose system/dark/light mode and other preferences.
/// </summary>
public partial class ThemeSettingsView : Window
{
    private readonly SettingsService _settingsService;
    private ViewerSettings _currentSettings;
    private TreeViewSettings _currentTreeViewSettings = new();

    public ThemeSettingsView(SettingsService settingsService, ViewerSettings currentSettings)
    {
        _settingsService = settingsService ?? throw new ArgumentNullException(nameof(settingsService));
        _currentSettings = currentSettings ?? throw new ArgumentNullException(nameof(currentSettings));
        
        InitializeComponent();
        LoadCurrentSettings();
    }

    private async void LoadCurrentSettings()
    {
        // Set theme radio buttons
        switch (_currentSettings.Theme.ToLowerInvariant())
        {
            case "dark":
                DarkThemeRadio.IsChecked = true;
                break;
            case "light":
                LightThemeRadio.IsChecked = true;
                break;
            default:
                SystemThemeRadio.IsChecked = true;
                break;
        }

        // Set other checkboxes
        AutoReloadCheckBox.IsChecked = _currentSettings.AutoReload;
        ShowFileTreeCheckBox.IsChecked = _currentSettings.ShowFileTree;

        // T055: Load TreeView settings
        _currentTreeViewSettings = await _settingsService.LoadTreeViewSettingsAsync();
        TreeViewDefaultVisibleCheckBox.IsChecked = _currentTreeViewSettings.DefaultVisible;
    }

    private void ThemeRadio_Checked(object sender, RoutedEventArgs e)
    {
        // Apply theme immediately for preview
        if (!IsLoaded) return;

        ThemeManager.AppTheme theme;
        if (DarkThemeRadio.IsChecked == true)
            theme = ThemeManager.AppTheme.Dark;
        else if (LightThemeRadio.IsChecked == true)
            theme = ThemeManager.AppTheme.Light;
        else
            theme = ThemeManager.AppTheme.System;

        ThemeManager.ApplyTheme(theme);
    }

    private async void OkButton_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            // Get selected theme
            string themeValue = "system";
            if (DarkThemeRadio.IsChecked == true)
                themeValue = "dark";
            else if (LightThemeRadio.IsChecked == true)
                themeValue = "light";

            // Create updated settings
            var updatedSettings = _currentSettings with
            {
                Theme = themeValue,
                AutoReload = AutoReloadCheckBox.IsChecked == true,
                ShowFileTree = ShowFileTreeCheckBox.IsChecked == true
            };

            // Persist to disk
            await _settingsService.SaveAsync(updatedSettings);

            // T055: Save TreeView settings
            var updatedTreeViewSettings = new TreeViewSettings
            {
                DefaultVisible = TreeViewDefaultVisibleCheckBox.IsChecked == true,
                PerFolderSettings = _currentTreeViewSettings.PerFolderSettings // Preserve per-folder settings
            };
            await _settingsService.SaveTreeViewSettingsAsync(updatedTreeViewSettings);

            DialogResult = true;
            Close();
        }
        catch (Exception ex)
        {
            System.Windows.MessageBox.Show(
                $"Failed to save settings: {ex.Message}",
                "Error",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
        }
    }

    private void CancelButton_Click(object sender, RoutedEventArgs e)
    {
        // Restore original theme
        var originalTheme = _currentSettings.Theme.ToLowerInvariant() switch
        {
            "dark" => ThemeManager.AppTheme.Dark,
            "light" => ThemeManager.AppTheme.Light,
            _ => ThemeManager.AppTheme.System
        };
        ThemeManager.ApplyTheme(originalTheme);

        DialogResult = false;
        Close();
    }
}
