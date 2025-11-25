using System;
using System.Windows;
using MarkRead.App.Services;
using WpfUserControl = System.Windows.Controls.UserControl;

namespace MarkRead.App.UI.Settings;

/// <summary>
/// User control for viewer settings (zoom, display options).
/// </summary>
public partial class ViewerSettingsView : WpfUserControl
{
    private ViewerSettings? _settings;

    public event EventHandler? SettingsChanged;

    public ViewerSettingsView()
    {
        InitializeComponent();
    }

    /// <summary>
    /// Initialize the view with current settings.
    /// </summary>
    public void Initialize(ViewerSettings settings)
    {
        _settings = settings ?? throw new ArgumentNullException(nameof(settings));
        
        // Set slider value
        ZoomSlider.Value = _settings.DefaultZoomPercent;
        UpdateZoomDisplay();
    }

    /// <summary>
    /// Get the updated settings from the UI.
    /// </summary>
    public ViewerSettings GetSettings()
    {
        if (_settings == null)
            throw new InvalidOperationException("Settings not initialized. Call Initialize() first.");

        return _settings with
        {
            DefaultZoomPercent = ZoomSlider.Value
        };
    }

    private void ZoomSlider_ValueChanged(object sender, RoutedPropertyChangedEventArgs<double> e)
    {
        UpdateZoomDisplay();
        SettingsChanged?.Invoke(this, EventArgs.Empty);
    }

    private void UpdateZoomDisplay()
    {
        if (ZoomValueText != null)
        {
            ZoomValueText.Text = $"{ZoomSlider.Value:F0}%";
        }
    }
}
