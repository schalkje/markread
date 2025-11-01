using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using MarkRead.Services;
using MarkRead.App;

namespace MarkRead.App.UI.Shell;

/// <summary>
/// Unified navigation bar containing back/forward buttons, file path display,
/// search button, export dropdown, theme toggle, and window controls
/// </summary>
public partial class NavigationBar : System.Windows.Controls.UserControl
{
    private readonly INavigationService? _navigationService;
    private IThemeService? _themeService;
    private EventHandler<ThemeChangedEventArgs>? _themeChangedHandler;

    public NavigationBar()
    {
        InitializeComponent();
    }

    public NavigationBar(INavigationService navigationService) : this()
    {
        _navigationService = navigationService;
        DataContext = navigationService;
    }

    /// <summary>
    /// Dependency property for NavigationService to enable binding
    /// </summary>
    public static readonly DependencyProperty NavigationServiceProperty =
        DependencyProperty.Register(
            nameof(NavigationService),
            typeof(INavigationService),
            typeof(NavigationBar),
            new PropertyMetadata(null, OnNavigationServiceChanged));

    public INavigationService? NavigationService
    {
        get => (INavigationService?)GetValue(NavigationServiceProperty);
        set => SetValue(NavigationServiceProperty, value);
    }

    private static void OnNavigationServiceChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is NavigationBar navBar)
        {
            navBar.DataContext = e.NewValue;
        }
    }

    /// <summary>
    /// Dependency property for ThemeService to enable theme toggling
    /// </summary>
    public static readonly DependencyProperty ThemeServiceProperty =
        DependencyProperty.Register(
            nameof(ThemeService),
            typeof(IThemeService),
            typeof(NavigationBar),
            new PropertyMetadata(null, OnThemeServiceChanged));

    public IThemeService? ThemeService
    {
        get => (IThemeService?)GetValue(ThemeServiceProperty);
        set => SetValue(ThemeServiceProperty, value);
    }

    private static void OnThemeServiceChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is NavigationBar navBar)
        {
            if (navBar._themeService != null && navBar._themeChangedHandler != null)
            {
                navBar._themeService.ThemeChanged -= navBar._themeChangedHandler;
            }

            if (e.NewValue is IThemeService themeService)
            {
                navBar._themeService = themeService;
                navBar._themeChangedHandler = (_, _) => navBar.UpdateThemeIcon();
                themeService.ThemeChanged += navBar._themeChangedHandler;
                navBar.UpdateThemeIcon();
            }
            else
            {
                navBar._themeService = null;
                navBar._themeChangedHandler = null;
            }
        }
    }

    private void UpdateThemeIcon()
    {
        if (_themeService == null || ThemeIcon == null) return;

        var currentTheme = _themeService.GetCurrentTheme();
        
        // Show moon for light mode (clicking will switch to dark)
        // Show sun for dark mode (clicking will switch to light)
        if (currentTheme == ThemeType.Dark)
        {
            // Sun icon
            ThemeIcon.Data = Geometry.Parse("M12 18c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6zm0-10c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zM13 1h-2v3h2V1zm0 19h-2v3h2v-3zM4 13H1v-2h3v2zm19 0h-3v-2h3v2zm-2.1-7.5L19.5 4.1l-1.4 1.4 1.4 1.4 1.4-1.4zM6.3 17.8L4.9 19.2l-1.4-1.4 1.4-1.4 1.4 1.4zM19.5 19.2l-1.4-1.4-1.4 1.4 1.4 1.4 1.4-1.4zM6.3 6.3L4.9 4.9 6.3 3.5 7.7 4.9 6.3 6.3z");
            ThemeToggleButton.ToolTip = "Switch to Light Mode";
        }
        else
        {
            // Moon icon
            ThemeIcon.Data = Geometry.Parse("M9 2c-1.05 0-2.05.16-3 .46 4.06 1.27 7 5.06 7 9.54 0 4.48-2.94 8.27-7 9.54.95.3 1.95.46 3 .46 5.52 0 10-4.48 10-10S14.52 2 9 2z");
            ThemeToggleButton.ToolTip = "Switch to Dark Mode";
        }
    }

    private void MenuButton_Click(object sender, RoutedEventArgs e)
    {
        // Raise event for menu button click (toggle sidebar)
        MenuRequested?.Invoke(this, EventArgs.Empty);
    }

    private void SearchButton_Click(object sender, RoutedEventArgs e)
    {
        // Raise event for search button click
        SearchRequested?.Invoke(this, EventArgs.Empty);
    }

    private void ExportButton_Click(object sender, RoutedEventArgs e)
    {
        // Raise event for export button click
        ExportRequested?.Invoke(this, EventArgs.Empty);
    }

    private async void ThemeToggleButton_Click(object sender, RoutedEventArgs e)
    {
        if (_themeService == null) return;

        var currentTheme = _themeService.GetCurrentTheme();
        var newTheme = currentTheme == ThemeType.Dark ? ThemeType.Light : ThemeType.Dark;
        
        await _themeService.ApplyTheme(newTheme);
    }

    private void MinimizeButton_Click(object sender, RoutedEventArgs e)
    {
        if (Window.GetWindow(this) is Window window)
        {
            window.WindowState = WindowState.Minimized;
        }
    }

    private void MaximizeButton_Click(object sender, RoutedEventArgs e)
    {
        if (Window.GetWindow(this) is Window window)
        {
            window.WindowState = window.WindowState == WindowState.Maximized
                ? WindowState.Normal
                : WindowState.Maximized;
        }
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        Window.GetWindow(this)?.Close();
    }

    private void ExitMenuItem_Click(object sender, RoutedEventArgs e)
    {
        Window.GetWindow(this)?.Close();
    }

    /// <summary>
    /// Event raised when menu button is clicked (toggle sidebar)
    /// </summary>
    public event EventHandler? MenuRequested;

    /// <summary>
    /// Event raised when search button is clicked
    /// </summary>
    public event EventHandler? SearchRequested;

    /// <summary>
    /// Event raised when export button is clicked
    /// </summary>
    public event EventHandler? ExportRequested;
}
