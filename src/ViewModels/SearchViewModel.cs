using System.Windows.Input;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MarkRead.Models;
using MarkRead.Services;

namespace MarkRead.ViewModels;

/// <summary>
/// ViewModel for search bar UI
/// </summary>
public partial class SearchViewModel : ObservableObject
{
    private readonly ISearchService _searchService;
    private readonly ILoggingService _logger;
    
    [ObservableProperty]
    private string _query = string.Empty;

    [ObservableProperty]
    private bool _isVisible;

    [ObservableProperty]
    private bool _caseSensitive;

    [ObservableProperty]
    private bool _useRegex;

    [ObservableProperty]
    private bool _wholeWord;

    [ObservableProperty]
    private string _matchCountText = string.Empty;

    private SearchState? _currentState;
    private string? _currentContent;

    public SearchViewModel(ISearchService searchService, ILoggingService logger)
    {
        _searchService = searchService;
        _logger = logger;
    }

    /// <summary>
    /// Event raised when search results change
    /// </summary>
    public event EventHandler<SearchState>? SearchResultsChanged;

    /// <summary>
    /// Event raised when current match changes
    /// </summary>
    public event EventHandler<int>? CurrentMatchChanged;

    /// <summary>
    /// Show search bar and focus input
    /// </summary>
    [RelayCommand]
    private void ShowSearch()
    {
        IsVisible = true;
        _logger.LogInfo("Search bar shown");
    }

    /// <summary>
    /// Hide search bar and clear results
    /// </summary>
    [RelayCommand]
    private void HideSearch()
    {
        IsVisible = false;
        Query = string.Empty;
        _currentState = null;
        MatchCountText = string.Empty;
        SearchResultsChanged?.Invoke(this, _searchService.ClearSearch());
        _logger.LogInfo("Search bar hidden");
    }

    /// <summary>
    /// Toggle case sensitive search
    /// </summary>
    [RelayCommand]
    private void ToggleCaseSensitive()
    {
        CaseSensitive = !CaseSensitive;
        if (!string.IsNullOrWhiteSpace(Query))
        {
            PerformSearch();
        }
    }

    /// <summary>
    /// Toggle regex search
    /// </summary>
    [RelayCommand]
    private void ToggleRegex()
    {
        UseRegex = !UseRegex;
        if (!string.IsNullOrWhiteSpace(Query))
        {
            PerformSearch();
        }
    }

    /// <summary>
    /// Toggle whole word search
    /// </summary>
    [RelayCommand]
    private void ToggleWholeWord()
    {
        WholeWord = !WholeWord;
        if (!string.IsNullOrWhiteSpace(Query))
        {
            PerformSearch();
        }
    }

    /// <summary>
    /// Navigate to next match (F3)
    /// </summary>
    [RelayCommand]
    private void NextMatch()
    {
        if (_currentState == null || _currentState.MatchCount == 0) return;

        var newIndex = _searchService.GetNextMatchIndex(_currentState.CurrentIndex, _currentState.MatchCount);
        _currentState.CurrentIndex = newIndex;
        UpdateMatchCountText();
        CurrentMatchChanged?.Invoke(this, newIndex);
        _logger.LogInfo($"Navigate to match {newIndex + 1} of {_currentState.MatchCount}");
    }

    /// <summary>
    /// Navigate to previous match (Shift+F3)
    /// </summary>
    [RelayCommand]
    private void PreviousMatch()
    {
        if (_currentState == null || _currentState.MatchCount == 0) return;

        var newIndex = _searchService.GetPreviousMatchIndex(_currentState.CurrentIndex, _currentState.MatchCount);
        _currentState.CurrentIndex = newIndex;
        UpdateMatchCountText();
        CurrentMatchChanged?.Invoke(this, newIndex);
        _logger.LogInfo($"Navigate to match {newIndex + 1} of {_currentState.MatchCount}");
    }

    /// <summary>
    /// Set document content for searching
    /// </summary>
    public void SetContent(string content)
    {
        _currentContent = content;
        if (!string.IsNullOrWhiteSpace(Query))
        {
            PerformSearch();
        }
    }

    /// <summary>
    /// Perform search with current query and options
    /// </summary>
    public void PerformSearch()
    {
        if (string.IsNullOrWhiteSpace(_currentContent) || string.IsNullOrWhiteSpace(Query))
        {
            _currentState = _searchService.ClearSearch();
            MatchCountText = string.Empty;
            SearchResultsChanged?.Invoke(this, _currentState);
            return;
        }

        _currentState = _searchService.Search(_currentContent, Query, CaseSensitive, UseRegex, WholeWord);
        UpdateMatchCountText();
        SearchResultsChanged?.Invoke(this, _currentState);

        if (_currentState.MatchCount > 0)
        {
            CurrentMatchChanged?.Invoke(this, 0);
        }
    }

    private void UpdateMatchCountText()
    {
        if (_currentState == null || _currentState.MatchCount == 0)
        {
            MatchCountText = string.Empty;
        }
        else
        {
            MatchCountText = $"{_currentState.CurrentIndex + 1} of {_currentState.MatchCount}";
        }
    }

    partial void OnQueryChanged(string value)
    {
        // Real-time search as user types
        PerformSearch();
    }
}
