using System;
using System.Windows;
using MarkRead.App.Services;
using MarkRead.Services;

namespace MarkRead.App.UI.Settings;

/// <summary>
/// Settings window for configuring application preferences.
/// </summary>
public partial class SettingsWindow : Window
{
    private readonly SettingsService _settingsService;
    private ViewerSettings _viewerSettings;
    private FolderExclusionSettings _folderExclusionSettings;
    private bool _settingsChanged;

    public event EventHandler? SettingsSaved;

    public SettingsWindow(SettingsService settingsService)
    {
        _settingsService = settingsService ?? throw new ArgumentNullException(nameof(settingsService));
        _viewerSettings = ViewerSettings.Default();
        _folderExclusionSettings = new FolderExclusionSettings();
        
        InitializeComponent();
        Loaded += SettingsWindow_Loaded;
    }

    private async void SettingsWindow_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            // Load current settings
            _viewerSettings = await _settingsService.LoadAsync();
            _folderExclusionSettings = await _settingsService.LoadFolderExclusionSettingsAsync();
            
            // Initialize UI with loaded settings
            ViewerSettingsPanel.Initialize(_viewerSettings);
            ViewerSettingsPanel.SettingsChanged += OnSettingsChanged;
            
            FolderExclusionsPanel.Initialize(_folderExclusionSettings);
            FolderExclusionsPanel.SettingsChanged += OnSettingsChanged;
        }
        catch (Exception ex)
        {
            System.Windows.MessageBox.Show(
                $"Failed to load settings: {ex.Message}",
                "Error",
                System.Windows.MessageBoxButton.OK,
                System.Windows.MessageBoxImage.Error);
        }
    }

    private void OnSettingsChanged(object? sender, EventArgs e)
    {
        _settingsChanged = true;
    }

    private async void SaveButton_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            // Get updated settings from the panels
            var updatedViewerSettings = ViewerSettingsPanel.GetSettings();
            var updatedFolderSettings = FolderExclusionsPanel.GetSettings();
            
            // Save to disk
            await _settingsService.SaveAsync(updatedViewerSettings);
            await _settingsService.SaveFolderExclusionSettingsAsync(updatedFolderSettings);
            
            // Notify listeners
            SettingsSaved?.Invoke(this, EventArgs.Empty);
            
            DialogResult = true;
            Close();
        }
        catch (Exception ex)
        {
            System.Windows.MessageBox.Show(
                $"Failed to save settings: {ex.Message}",
                "Error",
                System.Windows.MessageBoxButton.OK,
                System.Windows.MessageBoxImage.Error);
        }
    }

    private void CancelButton_Click(object sender, RoutedEventArgs e)
    {
        if (_settingsChanged)
        {
            var result = System.Windows.MessageBox.Show(
                "You have unsaved changes. Are you sure you want to close?",
                "Unsaved Changes",
                System.Windows.MessageBoxButton.YesNo,
                System.Windows.MessageBoxImage.Warning);
            
            if (result != System.Windows.MessageBoxResult.Yes)
                return;
        }
        
        DialogResult = false;
        Close();
    }

    private async void ResetButton_Click(object sender, RoutedEventArgs e)
    {
        var result = System.Windows.MessageBox.Show(
            "This will reset all settings on this page to their default values. Continue?",
            "Reset to Defaults",
            System.Windows.MessageBoxButton.YesNo,
            System.Windows.MessageBoxImage.Question);
        
        if (result == System.Windows.MessageBoxResult.Yes)
        {
            try
            {
                // Determine which tab is active and reset accordingly
                if (SettingsTabControl.SelectedIndex == 0) // Viewer tab
                {
                    _viewerSettings = ViewerSettings.Default();
                    ViewerSettingsPanel.Initialize(_viewerSettings);
                    await _settingsService.SaveAsync(_viewerSettings);
                }
                else if (SettingsTabControl.SelectedIndex == 1) // Folder Exclusions tab
                {
                    _folderExclusionSettings = FolderExclusionSettings.CreateDefault();
                    FolderExclusionsPanel.Initialize(_folderExclusionSettings);
                    await _settingsService.SaveFolderExclusionSettingsAsync(_folderExclusionSettings);
                }
                
                _settingsChanged = true;
                
                System.Windows.MessageBox.Show(
                    "Settings have been reset to defaults.",
                    "Reset Complete",
                    System.Windows.MessageBoxButton.OK,
                    System.Windows.MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show(
                    $"Failed to reset settings: {ex.Message}",
                    "Error",
                    System.Windows.MessageBoxButton.OK,
                    System.Windows.MessageBoxImage.Error);
            }
        }
    }
}
