using System.Collections.Concurrent;
using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// Service for managing per-tab navigation history
/// </summary>
public class NavigationService : INavigationService
{
    private readonly ConcurrentDictionary<string, NavigationHistory> _histories = new();
    private readonly ILoggingService _loggingService;

    public NavigationService(ILoggingService loggingService)
    {
        _loggingService = loggingService;
    }

    /// <summary>
    /// Navigates to a file path and adds it to history
    /// </summary>
    public void Navigate(string tabId, string filePath)
    {
        var history = _histories.GetOrAdd(tabId, _ => new NavigationHistory());
        history.Navigate(filePath);
        _loggingService.LogInfo($"Navigated to: {filePath} (tab: {tabId})");
    }

    /// <summary>
    /// Goes back to the previous file in history
    /// </summary>
    public string? GoBack(string tabId)
    {
        if (!_histories.TryGetValue(tabId, out var history))
            return null;

        var previousPath = history.GoBack();
        if (previousPath != null)
        {
            _loggingService.LogInfo($"Navigated back to: {previousPath} (tab: {tabId})");
        }

        return previousPath;
    }

    /// <summary>
    /// Goes forward to the next file in history
    /// </summary>
    public string? GoForward(string tabId)
    {
        if (!_histories.TryGetValue(tabId, out var history))
            return null;

        var nextPath = history.GoForward();
        if (nextPath != null)
        {
            _loggingService.LogInfo($"Navigated forward to: {nextPath} (tab: {tabId})");
        }

        return nextPath;
    }

    /// <summary>
    /// Checks if back navigation is available for a tab
    /// </summary>
    public bool CanGoBack(string tabId)
    {
        return _histories.TryGetValue(tabId, out var history) && history.CanGoBack;
    }

    /// <summary>
    /// Checks if forward navigation is available for a tab
    /// </summary>
    public bool CanGoForward(string tabId)
    {
        return _histories.TryGetValue(tabId, out var history) && history.CanGoForward;
    }

    /// <summary>
    /// Gets the current path for a tab
    /// </summary>
    public string? GetCurrentPath(string tabId)
    {
        return _histories.TryGetValue(tabId, out var history) ? history.CurrentPath : null;
    }

    /// <summary>
    /// Clears navigation history for a tab
    /// </summary>
    public void ClearHistory(string tabId)
    {
        if (_histories.TryGetValue(tabId, out var history))
        {
            history.Clear();
            _loggingService.LogInfo($"Cleared navigation history (tab: {tabId})");
        }
    }

    /// <summary>
    /// Removes a tab's navigation history
    /// </summary>
    public void RemoveTab(string tabId)
    {
        if (_histories.TryRemove(tabId, out _))
        {
            _loggingService.LogInfo($"Removed navigation history (tab: {tabId})");
        }
    }
}
