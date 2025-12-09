namespace MarkRead.Services;

/// <summary>
/// Service for managing navigation history per tab
/// </summary>
public interface INavigationService
{
    /// <summary>
    /// Navigates to a file path and adds it to history
    /// </summary>
    void Navigate(string tabId, string filePath);

    /// <summary>
    /// Goes back to the previous file in history
    /// </summary>
    string? GoBack(string tabId);

    /// <summary>
    /// Goes forward to the next file in history
    /// </summary>
    string? GoForward(string tabId);

    /// <summary>
    /// Checks if back navigation is available for a tab
    /// </summary>
    bool CanGoBack(string tabId);

    /// <summary>
    /// Checks if forward navigation is available for a tab
    /// </summary>
    bool CanGoForward(string tabId);

    /// <summary>
    /// Gets the current path for a tab
    /// </summary>
    string? GetCurrentPath(string tabId);

    /// <summary>
    /// Clears navigation history for a tab
    /// </summary>
    void ClearHistory(string tabId);

    /// <summary>
    /// Removes a tab's navigation history
    /// </summary>
    void RemoveTab(string tabId);
}
