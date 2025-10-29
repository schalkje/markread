using System;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media.Animation;

using WpfUserControl = System.Windows.Controls.UserControl;
using WpfKeyEventArgs = System.Windows.Input.KeyEventArgs;

namespace MarkRead.App.UI.Search;

/// <summary>
/// Global search panel for searching across files (T072).
/// </summary>
public partial class GlobalSearchPanel : WpfUserControl
{
    private ObservableCollection<SearchResult> _results;
    private bool _isAnimating;

    public GlobalSearchPanel()
    {
        InitializeComponent();
        _results = new ObservableCollection<SearchResult>();
        ResultsList.ItemsSource = _results;
    }

    public event EventHandler<SearchEventArgs>? SearchRequested;
    public event EventHandler<SearchResultEventArgs>? ResultSelected;
    public event EventHandler? CloseRequested;

    public string SearchQuery => SearchTextBox.Text;
    
    public SearchScope CurrentScope
    {
        get => (SearchScope)ScopeSelector.SelectedIndex;
        set => ScopeSelector.SelectedIndex = (int)value;
    }

    /// <summary>
    /// Shows the global search panel with animation (T074).
    /// </summary>
    public void Show()
    {
        if (_isAnimating) return;

        Visibility = Visibility.Visible;
        _isAnimating = true;

        var showAnimation = (Storyboard)FindResource("ShowAnimation");
        showAnimation.Completed += (s, e) => _isAnimating = false;
        showAnimation.Begin();

        SearchTextBox.Focus();
        SearchTextBox.SelectAll();
    }

    /// <summary>
    /// Hides the global search panel with animation (T074).
    /// </summary>
    public void Hide()
    {
        if (_isAnimating) return;

        _isAnimating = true;

        var hideAnimation = (Storyboard)FindResource("HideAnimation");
        hideAnimation.Begin();
        // Visibility will be set to Collapsed in OnHideAnimationCompleted
    }

    /// <summary>
    /// Called when hide animation completes (T074).
    /// </summary>
    private void OnHideAnimationCompleted(object? sender, EventArgs e)
    {
        Visibility = Visibility.Collapsed;
        ClearResults();
        _isAnimating = false;
    }

    /// <summary>
    /// Updates the displayed search results.
    /// </summary>
    public void UpdateResults(SearchResult[] results)
    {
        _results.Clear();
        
        if (results.Length == 0)
        {
            ShowNoResults();
        }
        else
        {
            foreach (var result in results)
            {
                _results.Add(result);
            }
            ShowResults();
        }
    }

    /// <summary>
    /// Clears all search results.
    /// </summary>
    public void ClearResults()
    {
        _results.Clear();
        ShowSearchPrompt();
    }

    private void ShowSearchPrompt()
    {
        SearchPromptPanel.Visibility = Visibility.Visible;
        NoResultsPanel.Visibility = Visibility.Collapsed;
        ResultsList.Visibility = Visibility.Collapsed;
    }

    private void ShowNoResults()
    {
        SearchPromptPanel.Visibility = Visibility.Collapsed;
        NoResultsPanel.Visibility = Visibility.Visible;
        ResultsList.Visibility = Visibility.Collapsed;
    }

    private void ShowResults()
    {
        SearchPromptPanel.Visibility = Visibility.Collapsed;
        NoResultsPanel.Visibility = Visibility.Collapsed;
        ResultsList.Visibility = Visibility.Visible;
    }

    private void OnSearchTextChanged(object sender, TextChangedEventArgs e)
    {
        var query = SearchTextBox.Text;
        if (string.IsNullOrWhiteSpace(query))
        {
            ClearResults();
        }
        else
        {
            SearchRequested?.Invoke(this, new SearchEventArgs(query, CurrentScope));
        }
    }

    private void OnSearchKeyDown(object sender, WpfKeyEventArgs e)
    {
        if (e.Key == Key.Escape)
        {
            OnCloseClicked(sender, e);
            e.Handled = true;
        }
        else if (e.Key == Key.Enter)
        {
            // Re-trigger search
            SearchRequested?.Invoke(this, new SearchEventArgs(SearchTextBox.Text, CurrentScope));
            e.Handled = true;
        }
    }

    private void OnScopeChanged(object sender, SelectionChangedEventArgs e)
    {
        // Re-run search with new scope if query exists
        if (!string.IsNullOrWhiteSpace(SearchTextBox.Text))
        {
            SearchRequested?.Invoke(this, new SearchEventArgs(SearchTextBox.Text, CurrentScope));
        }
    }

    private void OnResultDoubleClick(object sender, MouseButtonEventArgs e)
    {
        if (ResultsList.SelectedItem is SearchResult result)
        {
            ResultSelected?.Invoke(this, new SearchResultEventArgs(result));
        }
    }

    private void OnCloseClicked(object sender, RoutedEventArgs e)
    {
        Hide();
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }
}

/// <summary>
/// Search scope for global search.
/// </summary>
public enum SearchScope
{
    CurrentFolder = 0,
    OpenFiles = 1,
    EntireWorkspace = 2
}

/// <summary>
/// Event arguments for search requests.
/// </summary>
public sealed class SearchEventArgs : EventArgs
{
    public SearchEventArgs(string query, SearchScope scope)
    {
        Query = query;
        Scope = scope;
    }

    public string Query { get; }
    public SearchScope Scope { get; }
}

/// <summary>
/// Event arguments for search result selection.
/// </summary>
public sealed class SearchResultEventArgs : EventArgs
{
    public SearchResultEventArgs(SearchResult result)
    {
        Result = result;
    }

    public SearchResult Result { get; }
}

/// <summary>
/// Represents a search result item (T072).
/// </summary>
public class SearchResult
{
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public int LineNumber { get; set; }
    public int MatchCount { get; set; }
    public string Preview { get; set; } = string.Empty;
}
