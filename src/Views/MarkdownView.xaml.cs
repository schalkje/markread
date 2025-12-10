using MarkRead.ViewModels;
using MarkRead.Rendering;
using MarkRead.Models;
using Microsoft.Maui.Controls;
using System.Text.Json;

namespace MarkRead.Views;

public partial class MarkdownView : ContentPage
{
    private readonly DocumentViewModel _viewModel;
    private readonly HtmlTemplateService _htmlTemplateService;
    private WebView? _webView;

    public MarkdownView(DocumentViewModel viewModel, HtmlTemplateService htmlTemplateService)
    {
        InitializeComponent();
        
        _viewModel = viewModel;
        _htmlTemplateService = htmlTemplateService;
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
}
