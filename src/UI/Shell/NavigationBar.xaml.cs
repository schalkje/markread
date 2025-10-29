using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using MarkRead.Services;

namespace MarkRead.App.UI.Shell;

/// <summary>
/// Unified navigation bar containing back/forward buttons, file path display,
/// search button, export dropdown, and window controls
/// </summary>
public partial class NavigationBar : System.Windows.Controls.UserControl
{
    private readonly INavigationService? _navigationService;

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

    /// <summary>
    /// Event raised when search button is clicked
    /// </summary>
    public event EventHandler? SearchRequested;

    /// <summary>
    /// Event raised when export button is clicked
    /// </summary>
    public event EventHandler? ExportRequested;
}
