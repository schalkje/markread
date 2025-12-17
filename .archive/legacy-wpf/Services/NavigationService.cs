using System;
using System.ComponentModel;

namespace MarkRead.Services;

/// <summary>
/// Service interface for managing navigation state and history
/// Coordinates navigation operations and button state updates
/// </summary>
public interface INavigationService : INotifyPropertyChanged
{
    /// <summary>
    /// Gets whether back navigation is available
    /// </summary>
    bool CanGoBack { get; }

    /// <summary>
    /// Gets whether forward navigation is available
    /// </summary>
    bool CanGoForward { get; }

    /// <summary>
    /// Gets the current file path being displayed
    /// </summary>
    string? CurrentFilePath { get; }

    /// <summary>
    /// Gets the relative path from the root folder
    /// </summary>
    string? RelativeFilePath { get; }

    /// <summary>
    /// Updates the current file path
    /// </summary>
    /// <param name="fullPath">Full absolute path to the file</param>
    /// <param name="rootPath">Root folder path for calculating relative path</param>
    void UpdateCurrentFile(string fullPath, string? rootPath = null);

    /// <summary>
    /// Clears the current file information
    /// </summary>
    void ClearCurrentFile();

    /// <summary>
    /// Notifies that back navigation occurred
    /// </summary>
    void NotifyBackNavigation();

    /// <summary>
    /// Notifies that forward navigation occurred
    /// </summary>
    void NotifyForwardNavigation();

    /// <summary>
    /// Updates navigation history state
    /// </summary>
    /// <param name="canGoBack">Whether back navigation is available</param>
    /// <param name="canGoForward">Whether forward navigation is available</param>
    void UpdateHistoryState(bool canGoBack, bool canGoForward);

    /// <summary>
    /// Event raised when navigation state changes
    /// </summary>
    event EventHandler? NavigationStateChanged;
}

/// <summary>
/// Default implementation of navigation service
/// </summary>
public class NavigationService : INavigationService
{
    private bool _canGoBack;
    private bool _canGoForward;
    private string? _currentFilePath;
    private string? _relativeFilePath;

    public event PropertyChangedEventHandler? PropertyChanged;
    public event EventHandler? NavigationStateChanged;

    public bool CanGoBack
    {
        get => _canGoBack;
        private set
        {
            if (_canGoBack != value)
            {
                _canGoBack = value;
                OnPropertyChanged(nameof(CanGoBack));
                OnNavigationStateChanged();
            }
        }
    }

    public bool CanGoForward
    {
        get => _canGoForward;
        private set
        {
            if (_canGoForward != value)
            {
                _canGoForward = value;
                OnPropertyChanged(nameof(CanGoForward));
                OnNavigationStateChanged();
            }
        }
    }

    public string? CurrentFilePath
    {
        get => _currentFilePath;
        private set
        {
            if (_currentFilePath != value)
            {
                _currentFilePath = value;
                OnPropertyChanged(nameof(CurrentFilePath));
            }
        }
    }

    public string? RelativeFilePath
    {
        get => _relativeFilePath;
        private set
        {
            if (_relativeFilePath != value)
            {
                _relativeFilePath = value;
                OnPropertyChanged(nameof(RelativeFilePath));
            }
        }
    }

    public void UpdateCurrentFile(string fullPath, string? rootPath = null)
    {
        if (string.IsNullOrWhiteSpace(fullPath))
        {
            ClearCurrentFile();
            return;
        }

        CurrentFilePath = fullPath;

        if (!string.IsNullOrEmpty(rootPath) && !string.IsNullOrEmpty(fullPath))
        {
            try
            {
                RelativeFilePath = System.IO.Path.GetRelativePath(rootPath, fullPath);
            }
            catch
            {
                // If relative path calculation fails, use filename only
                RelativeFilePath = System.IO.Path.GetFileName(fullPath);
            }
        }
        else
        {
            RelativeFilePath = System.IO.Path.GetFileName(fullPath);
        }
    }

    public void ClearCurrentFile()
    {
        CurrentFilePath = null;
        RelativeFilePath = null;
    }

    public void NotifyBackNavigation()
    {
        OnNavigationStateChanged();
    }

    public void NotifyForwardNavigation()
    {
        OnNavigationStateChanged();
    }

    public void UpdateHistoryState(bool canGoBack, bool canGoForward)
    {
        CanGoBack = canGoBack;
        CanGoForward = canGoForward;
    }

    protected virtual void OnPropertyChanged(string propertyName)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }

    protected virtual void OnNavigationStateChanged()
    {
        NavigationStateChanged?.Invoke(this, EventArgs.Empty);
    }
}
