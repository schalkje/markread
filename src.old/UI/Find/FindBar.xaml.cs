using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media.Animation;

using WpfUserControl = System.Windows.Controls.UserControl;
using WpfKeyEventArgs = System.Windows.Input.KeyEventArgs;

namespace MarkRead.App.UI.Find;

public partial class FindBar : WpfUserControl
{
    private int _currentMatchIndex;
    private int _totalMatches;
    private bool _isAnimating;

    public FindBar()
    {
        InitializeComponent();
    }

    public event EventHandler<FindEventArgs>? SearchRequested;
    public event EventHandler? CloseRequested;
    public event EventHandler? NextRequested;
    public event EventHandler? PreviousRequested;

    public string SearchQuery => SearchTextBox.Text;

    /// <summary>
    /// Shows the find bar with animation (T074).
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
    /// Hides the find bar with animation (T074).
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
        _currentMatchIndex = 0;
        _totalMatches = 0;
        UpdateMatchCount();
        _isAnimating = false;
    }

    public void UpdateMatchCount(int currentIndex, int totalMatches)
    {
        _currentMatchIndex = currentIndex;
        _totalMatches = totalMatches;
        UpdateMatchCount();
    }

    private void UpdateMatchCount()
    {
        if (_totalMatches == 0)
        {
            MatchCountText.Text = "0 of 0";
        }
        else
        {
            MatchCountText.Text = $"{_currentMatchIndex + 1} of {_totalMatches}";
        }
    }

    private void OnSearchTextChanged(object sender, TextChangedEventArgs e)
    {
        SearchRequested?.Invoke(this, new FindEventArgs(SearchTextBox.Text));
    }

    private void OnSearchKeyDown(object sender, WpfKeyEventArgs e)
    {
        if (e.Key == Key.Escape)
        {
            OnCloseClicked(sender, e);
            e.Handled = true;
        }
        else if (e.Key == Key.F3)
        {
            if (Keyboard.Modifiers.HasFlag(ModifierKeys.Shift))
            {
                OnPreviousClicked(sender, e);
            }
            else
            {
                OnNextClicked(sender, e);
            }
            e.Handled = true;
        }
        else if (e.Key == Key.Enter)
        {
            OnNextClicked(sender, e);
            e.Handled = true;
        }
    }

    private void OnNextClicked(object sender, RoutedEventArgs e)
    {
        NextRequested?.Invoke(this, EventArgs.Empty);
    }

    private void OnPreviousClicked(object sender, RoutedEventArgs e)
    {
        PreviousRequested?.Invoke(this, EventArgs.Empty);
    }

    private void OnCloseClicked(object sender, RoutedEventArgs e)
    {
        Hide();
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }
}

public sealed class FindEventArgs : EventArgs
{
    public FindEventArgs(string query)
    {
        Query = query;
    }

    public string Query { get; }
}
