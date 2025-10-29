using System;
using System.ComponentModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Animation;
using MarkRead.App;
using MarkRead.Services;
using WpfApplication = System.Windows.Application;

namespace MarkRead.UI.Shell;

/// <summary>
/// Theme toggle button control that cycles between Light, Dark, and System themes
/// </summary>
public partial class ThemeToggleButton : System.Windows.Controls.UserControl, INotifyPropertyChanged
{
    private readonly ThemeManager _themeManager;
    private ThemeType _currentTheme = ThemeType.System;

    public event PropertyChangedEventHandler? PropertyChanged;

    /// <summary>
    /// Current theme type for data binding
    /// </summary>
    public ThemeType CurrentTheme
    {
        get => _currentTheme;
        private set
        {
            if (_currentTheme != value)
            {
                _currentTheme = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(CurrentTheme)));
                UpdateThemeIcon();
                UpdateTooltip();
            }
        }
    }

    public ThemeToggleButton()
    {
        InitializeComponent();
        
        // Wire up unloaded event for cleanup
        Unloaded += ThemeToggleButton_Unloaded;
        
        // Get theme manager instance (will be injected via DI in full implementation)
        _themeManager = WpfApplication.Current.MainWindow?.DataContext as ThemeManager 
            ?? throw new InvalidOperationException("ThemeManager not available");
        
        // Subscribe to theme changes
        _themeManager.PropertyChanged += OnThemeManagerPropertyChanged;
        
        // Initialize current theme
        CurrentTheme = _themeManager.CurrentTheme;
        
        // Set initial theme icon and tooltip
        UpdateThemeIcon();
        UpdateTooltip();
    }

    /// <summary>
    /// Handle theme toggle button click
    /// </summary>
    private async void ThemeToggleBtn_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            // Start animation
            var animation = FindResource("ThemeSwitchAnimation") as Storyboard;
            animation?.Begin();

            // Cycle to next theme
            var nextTheme = GetNextTheme(CurrentTheme);
            
            // Apply theme through theme manager
            var success = await _themeManager.ApplyTheme(nextTheme);
            
            if (!success)
            {
                // Revert animation if theme application failed
                IconRotateTransform.Angle = 0;
                ShowThemeError($"Failed to apply {nextTheme} theme");
            }
        }
        catch (Exception ex)
        {
            // Handle theme switching errors
            IconRotateTransform.Angle = 0;
            ShowThemeError($"Theme switching error: {ex.Message}");
        }
    }

    /// <summary>
    /// Get the next theme in the cycle
    /// </summary>
    private static ThemeType GetNextTheme(ThemeType current)
    {
        return current switch
        {
            ThemeType.System => ThemeType.Light,
            ThemeType.Light => ThemeType.Dark,
            ThemeType.Dark => ThemeType.System,
            _ => ThemeType.System
        };
    }

    /// <summary>
    /// Update theme icon based on current theme
    /// </summary>
    private void UpdateThemeIcon()
    {
        if (ThemeIcon == null) return;

        var iconKey = CurrentTheme switch
        {
            ThemeType.Light => "LightThemeIcon",
            ThemeType.Dark => "DarkThemeIcon",
            ThemeType.System => "SystemThemeIcon",
            _ => "SystemThemeIcon"
        };

        if (FindResource(iconKey) is StreamGeometry iconGeometry)
        {
            ThemeIcon.Data = iconGeometry;
        }
    }

    /// <summary>
    /// Update tooltip text based on current theme
    /// </summary>
    private void UpdateTooltip()
    {
        var nextTheme = GetNextTheme(CurrentTheme);
        var tooltipText = $"Switch to {nextTheme} theme (currently: {CurrentTheme})";
        ThemeToggleBtn.ToolTip = tooltipText;
    }

    /// <summary>
    /// Handle theme manager property changes
    /// </summary>
    private void OnThemeManagerPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(ThemeManager.CurrentTheme))
        {
            // Update current theme when theme manager changes
            Dispatcher.BeginInvoke(() =>
            {
                CurrentTheme = _themeManager.CurrentTheme;
            });
        }
    }

    /// <summary>
    /// Show theme switching error to user
    /// </summary>
    private void ShowThemeError(string message)
    {
        // In a full implementation, this would show a proper error notification
        // For now, just update the tooltip to show the error
        ThemeToggleBtn.ToolTip = $"Error: {message}";
        
        // Reset tooltip after a delay
        var timer = new System.Windows.Threading.DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(3)
        };
        timer.Tick += (s, e) =>
        {
            timer.Stop();
            UpdateTooltip();
        };
        timer.Start();
    }

    /// <summary>
    /// Cleanup event subscriptions when control is unloaded
    /// </summary>
    private void ThemeToggleButton_Unloaded(object sender, RoutedEventArgs e)
    {
        if (_themeManager != null)
        {
            _themeManager.PropertyChanged -= OnThemeManagerPropertyChanged;
        }
    }
}