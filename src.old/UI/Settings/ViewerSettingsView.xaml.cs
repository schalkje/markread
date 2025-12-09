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
        
        // Set zoom mode
        if (_settings.DefaultZoomMode == "FitToWidth")
        {
            FitToWidthMode.IsChecked = true;
        }
        else
        {
            PercentageMode.IsChecked = true;
        }
        
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

        string zoomMode = FitToWidthMode.IsChecked == true ? "FitToWidth" : "Percentage";
        
        return _settings with
        {
            DefaultZoomPercent = ZoomSlider.Value,
            DefaultZoomMode = zoomMode
        };
    }

    private void ZoomMode_Changed(object sender, RoutedEventArgs e)
    {
        SettingsChanged?.Invoke(this, EventArgs.Empty);
    }

    private void ZoomSlider_ValueChanged(object sender, RoutedPropertyChangedEventArgs<double> e)
    {
        UpdateZoomDisplay();
        SettingsChanged?.Invoke(this, EventArgs.Empty);
    }

    private void ResetZoom_Click(object sender, RoutedEventArgs e)
    {
        ZoomSlider.Value = 100.0;
    }

    private void UpdateZoomDisplay()
    {
        if (ZoomValueText != null)
        {
            ZoomValueText.Text = $"{ZoomSlider.Value:F0}%";
        }
    }
}
