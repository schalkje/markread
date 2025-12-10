using MarkRead.ViewModels;
using MarkRead.Services;
using MarkRead.Models;
using MarkRead.Views;

namespace MarkRead;

public partial class MainPage : ContentPage
{
    private readonly ISettingsService _settingsService;
    private readonly FileTreeViewModel _fileTreeViewModel;
    private readonly MainViewModel _mainViewModel;
    private readonly SearchViewModel _searchViewModel;
    private readonly MarkdownView _markdownView;
    private const string SidebarWidthKey = "SidebarWidth";
    private const string SidebarVisibleKey = "SidebarVisible";
    private const double MinSidebarWidth = 150;
    private const double MaxSidebarWidth = 600;

    public MainPage(
        ISettingsService settingsService, 
        FileTreeViewModel fileTreeViewModel,
        MainViewModel mainViewModel,
        SearchViewModel searchViewModel,
        MarkdownView markdownView)
    {
        InitializeComponent();
        
        _settingsService = settingsService;
        _fileTreeViewModel = fileTreeViewModel;
        _mainViewModel = mainViewModel;
        _searchViewModel = searchViewModel;
        _markdownView = markdownView;
        
        FileTree.BindingContext = _fileTreeViewModel;
        TabBar.BindingContext = _mainViewModel;
        SearchBar.BindingContext = _searchViewModel;
        
        // Add MarkdownView to container
        MarkdownViewContainer.Content = _markdownView;
        
        // Wire up tab swipe navigation for touch
        TabSwipeNav.SwipedLeft += OnTabSwipedLeft;
        TabSwipeNav.SwipedRight += OnTabSwipedRight;
        
        // Wire up edge swipe for sidebar toggle
        SidebarEdgeSwipe.EdgeSwiped += OnEdgeSwiped;
        
        // Subscribe to search events
        _searchViewModel.SearchResultsChanged += OnSearchResultsChanged;
        _searchViewModel.CurrentMatchChanged += OnCurrentMatchChanged;
        
        // Restore sidebar state
        LoadSidebarState();
        
        // Wire up FileTreeViewModel events
        _fileTreeViewModel.FileOpened += OnFileOpened;
    }
    
    private void OnTabSwipedLeft(object? sender, EventArgs e)
    {
        // Swipe left = next tab
        _mainViewModel.NextTabCommand.Execute(null);
    }
    
    private void OnTabSwipedRight(object? sender, EventArgs e)
    {
        // Swipe right = previous tab
        _mainViewModel.PreviousTabCommand.Execute(null);
    }
    
    private void OnEdgeSwiped(object? sender, EventArgs e)
    {
        // Two-finger swipe from edge = toggle sidebar
        ToggleSidebar();
    }

    private void LoadSidebarState()
    {
        // Restore sidebar width
        var savedWidth = _settingsService.GetSetting<double>(SidebarWidthKey);
        if (savedWidth > 0)
        {
            SidebarColumn.Width = new GridLength(Math.Clamp(savedWidth, MinSidebarWidth, MaxSidebarWidth));
        }

        // Restore sidebar visibility
        var isVisible = _settingsService.GetSetting(SidebarVisibleKey, defaultValue: true);
        SetSidebarVisibility(isVisible, animate: false);
    }

    private void OnSplitterPanUpdated(object? sender, PanUpdatedEventArgs e)
    {
        if (e.StatusType == GestureStatus.Running)
        {
            var currentWidth = SidebarColumn.Width.Value;
            var newWidth = Math.Clamp(currentWidth + e.TotalX, MinSidebarWidth, MaxSidebarWidth);
            SidebarColumn.Width = new GridLength(newWidth);
        }
        else if (e.StatusType == GestureStatus.Completed)
        {
            // Save the new width
            _settingsService.SetSetting(SidebarWidthKey, SidebarColumn.Width.Value);
        }
    }

    private void OnFileOpened(object? sender, string filePath)
    {
        // Load file in MarkdownView
        // This will be implemented when we wire up the document loading
        System.Diagnostics.Debug.WriteLine($"File opened: {filePath}");
    }

    public void ToggleSidebar()
    {
        var isCurrentlyVisible = Sidebar.IsVisible;
        SetSidebarVisibility(!isCurrentlyVisible, animate: true);
        _settingsService.SetSetting(SidebarVisibleKey, !isCurrentlyVisible);
    }

    private void SetSidebarVisibility(bool isVisible, bool animate)
    {
        if (animate)
        {
            if (isVisible)
            {
                Sidebar.IsVisible = true;
                _ = Sidebar.FadeToAsync(1, 250, Easing.CubicOut);
                _ = Splitter.FadeToAsync(1, 250, Easing.CubicOut);
            }
            else
            {
                _ = Sidebar.FadeToAsync(0, 250, Easing.CubicIn).ContinueWith(_ =>
                {
                    MainThread.BeginInvokeOnMainThread(() => Sidebar.IsVisible = false);
                });
                _ = Splitter.FadeToAsync(0, 250, Easing.CubicIn);
            }
        }
        else
        {
            Sidebar.IsVisible = isVisible;
            Sidebar.Opacity = isVisible ? 1 : 0;
            Splitter.Opacity = isVisible ? 1 : 0;
        }

        // Adjust grid columns
        if (isVisible)
        {
            var savedWidth = _settingsService.GetSetting<double>(SidebarWidthKey);
            SidebarColumn.Width = new GridLength(savedWidth > 0 ? savedWidth : 250);
            Splitter.IsVisible = true;
        }
        else
        {
            SidebarColumn.Width = new GridLength(0);
            Splitter.IsVisible = false;
        }
    }
    
    private async void OnSearchResultsChanged(object? sender, SearchState state)
    {
        // Forward search results to MarkdownView for highlighting
        await _markdownView.HighlightSearchResultsAsync(state);
    }
    
    private async void OnCurrentMatchChanged(object? sender, int matchIndex)
    {
        // Scroll to the current match in MarkdownView
        await _markdownView.ScrollToSearchMatchAsync(matchIndex);
    }
}
