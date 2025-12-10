using MarkRead.ViewModels;
using MarkRead.Rendering;
using MarkRead.Models;
using MarkRead.Services;
using Microsoft.Maui.Controls;
using System.Text.Json;

namespace MarkRead.Views;

public partial class MarkdownView : ContentPage
{
    private readonly DocumentViewModel _viewModel;
    private readonly HtmlTemplateService _htmlTemplateService;
    private readonly ILinkResolver _linkResolver;
    private readonly INavigationService _navigationService;
    private WebView? _webView;
    private bool _isLoading = false;

    public MarkdownView(
        DocumentViewModel viewModel, 
        HtmlTemplateService htmlTemplateService,
        ILinkResolver linkResolver,
        INavigationService navigationService)
    {
        InitializeComponent();
        
        _viewModel = viewModel;
        _htmlTemplateService = htmlTemplateService;
        _linkResolver = linkResolver;
        _navigationService = navigationService;
        BindingContext = _viewModel;

        // Subscribe to document changes
        _viewModel.PropertyChanged += OnViewModelPropertyChanged;
        
        // Initialize WebView
        InitializeWebView();
    }

    private void InitializeWebView()
    {
        // Create WebView for markdown rendering
        _webView = new WebView
        {
            // Note: In .NET MAUI 10, HybridWebView is recommended for better performance
            // For now, using standard WebView with HtmlWebViewSource
            HorizontalOptions = LayoutOptions.Fill,
            VerticalOptions = LayoutOptions.Fill
        };

        // Handle link navigation
        _webView.Navigating += OnWebViewNavigating;

        // Add to container
        if (WebViewContainer.Content == null)
        {
            WebViewContainer.Content = _webView;
        }
    }

    private async void OnViewModelPropertyChanged(object? sender, System.ComponentModel.PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(DocumentViewModel.CurrentDocument) && _viewModel.CurrentDocument != null)
        {
            await RenderDocumentAsync();
        }
    }

    private async void OnWebViewNavigating(object? sender, WebNavigatingEventArgs e)
    {
        // Cancel default navigation - we'll handle it
        e.Cancel = true;

        if (string.IsNullOrEmpty(e.Url))
            return;

        await HandleLinkClickAsync(e.Url);
    }

    private async Task HandleLinkClickAsync(string linkHref)
    {
        if (_viewModel.CurrentDocument == null)
            return;

        // Check if link is external
        if (_linkResolver.IsExternalLink(linkHref))
        {
            await HandleExternalLinkAsync(linkHref);
            return;
        }

        // Resolve internal link
        var workspaceRoot = Path.GetDirectoryName(_viewModel.CurrentDocument.FilePath) ?? string.Empty;
        var resolvedPath = _linkResolver.ResolveLink(linkHref, _viewModel.CurrentDocument.FilePath, workspaceRoot);

        if (resolvedPath == null)
        {
            await DisplayAlertAsync("Navigation Error", $"Could not resolve link: {linkHref}", "OK");
            return;
        }

        // Check if file exists
        if (!_linkResolver.LinkTargetExists(resolvedPath))
        {
            await DisplayAlertAsync("File Not Found", $"The linked file does not exist: {Path.GetFileName(resolvedPath)}", "OK");
            return;
        }

        // Navigate to the document
        await NavigateToDocumentAsync(resolvedPath);
    }

    private async Task HandleExternalLinkAsync(string url)
    {
        // Validate scheme
        if (!_linkResolver.IsAllowedScheme(url))
        {
            await DisplayAlertAsync("Security Warning", $"This link type is not allowed for security reasons.", "OK");
            return;
        }

        // Show confirmation dialog
        var confirm = await DisplayAlertAsync(
            "Open External Link?",
            $"Do you want to open this link in your default browser?\n\n{url}",
            "Open",
            "Cancel");

        if (confirm)
        {
            try
            {
                await Launcher.OpenAsync(url);
            }
            catch (Exception ex)
            {
                await DisplayAlertAsync("Error", $"Failed to open link: {ex.Message}", "OK");
            }
        }
    }

    private async Task NavigateToDocumentAsync(string filePath)
    {
        // Show loading indicator
        ShowLoadingIndicator();

        try
        {
            // Use the LoadDocument command from ViewModel
            if (_viewModel.LoadDocumentCommand.CanExecute(filePath))
            {
                _viewModel.LoadDocumentCommand.Execute(filePath);
            }
        }
        finally
        {
            HideLoadingIndicator();
        }
    }

    private void ShowLoadingIndicator()
    {
        _isLoading = true;
        // TODO: Show actual loading UI (spinner overlay)
    }

    private void HideLoadingIndicator()
    {
        _isLoading = false;
        // TODO: Hide loading UI
    }

    private async Task RenderDocumentAsync()
    {
        if (_viewModel.CurrentDocument == null || _webView == null)
            return;

        try
        {
            // Generate complete HTML page
            var html = await _htmlTemplateService.RenderDocumentAsync(
                _viewModel.CurrentDocument.Content,
                _viewModel.CurrentDocument.Title);

            // Load into WebView
            var htmlSource = new HtmlWebViewSource
            {
                Html = html,
                BaseUrl = Path.GetDirectoryName(_viewModel.CurrentDocument.FilePath)
            };

            _webView.Source = htmlSource;

            // Restore scroll position after rendering
            if (_viewModel.CurrentDocument.ScrollPosition > 0)
            {
                await Task.Delay(100); // Wait for rendering
                await RestoreScrollPositionAsync(_viewModel.CurrentDocument.ScrollPosition);
            }
        }
        catch (Exception ex)
        {
            _viewModel.HasError = true;
            _viewModel.ErrorMessage = $"Failed to render document: {ex.Message}";
        }
    }

    private async Task RestoreScrollPositionAsync(double position)
    {
        if (_webView == null) return;

        // Execute JavaScript to restore scroll position
        var script = $"window.scrollTo(0, {position});";
        await _webView.EvaluateJavaScriptAsync(script);
    }

    protected override void OnDisappearing()
    {
        base.OnDisappearing();
        
        // Unsubscribe from events
        if (_viewModel != null)
        {
            _viewModel.PropertyChanged -= OnViewModelPropertyChanged;
        }
    }
    
    /// <summary>
    /// Highlight search results in the WebView
    /// </summary>
    public async Task HighlightSearchResultsAsync(SearchState searchState)
    {
        if (_webView == null) return;

        if (searchState.Results.Count == 0)
        {
            // Clear highlights if no results
            await _webView.EvaluateJavaScriptAsync("window.clearSearchHighlights();");
            return;
        }

        // Convert search results to JSON for JavaScript
        var matchesJson = JsonSerializer.Serialize(searchState.Results.Select(r => new 
        {
            offset = r.Offset,
            length = r.Length
        }));

        var script = $"window.highlightSearchResults({matchesJson});";
        await _webView.EvaluateJavaScriptAsync(script);
    }

    /// <summary>
    /// Scroll to a specific search match
    /// </summary>
    public async Task ScrollToSearchMatchAsync(int matchIndex)
    {
        if (_webView == null) return;

        var script = $"window.scrollToSearchMatch({matchIndex});";
        await _webView.EvaluateJavaScriptAsync(script);
    }
    
    /// <summary>
    /// Scroll to top of document
    /// </summary>
    public async Task ScrollToTopAsync()
    {
        if (_webView == null) return;
        
        await _webView.EvaluateJavaScriptAsync("window.scrollToTop();");
    }
    
    /// <summary>
    /// Scroll to bottom of document
    /// </summary>
    public async Task ScrollToBottomAsync()
    {
        if (_webView == null) return;
        
        await _webView.EvaluateJavaScriptAsync("window.scrollToBottom();");
    }
}
