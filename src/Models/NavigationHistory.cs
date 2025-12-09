namespace MarkRead.Models;

/// <summary>
/// Represents navigation history for a tab
/// </summary>
public class NavigationHistory
{
    private readonly Stack<string> _backStack = new();
    private readonly Stack<string> _forwardStack = new();
    private string? _currentPath;

    /// <summary>
    /// Gets the current file path
    /// </summary>
    public string? CurrentPath => _currentPath;

    /// <summary>
    /// Gets whether back navigation is possible
    /// </summary>
    public bool CanGoBack => _backStack.Count > 0;

    /// <summary>
    /// Gets whether forward navigation is possible
    /// </summary>
    public bool CanGoForward => _forwardStack.Count > 0;

    /// <summary>
    /// Navigates to a new path
    /// </summary>
    public void Navigate(string path)
    {
        if (_currentPath != null)
        {
            _backStack.Push(_currentPath);
        }

        _currentPath = path;
        _forwardStack.Clear(); // Clear forward history on new navigation
    }

    /// <summary>
    /// Navigates back to the previous path
    /// </summary>
    public string? GoBack()
    {
        if (!CanGoBack)
            return null;

        if (_currentPath != null)
        {
            _forwardStack.Push(_currentPath);
        }

        _currentPath = _backStack.Pop();
        return _currentPath;
    }

    /// <summary>
    /// Navigates forward to the next path
    /// </summary>
    public string? GoForward()
    {
        if (!CanGoForward)
            return null;

        if (_currentPath != null)
        {
            _backStack.Push(_currentPath);
        }

        _currentPath = _forwardStack.Pop();
        return _currentPath;
    }

    /// <summary>
    /// Clears all navigation history
    /// </summary>
    public void Clear()
    {
        _backStack.Clear();
        _forwardStack.Clear();
        _currentPath = null;
    }
}
