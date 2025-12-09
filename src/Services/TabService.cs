using MarkRead.Models;
using System.Collections.ObjectModel;

namespace MarkRead.Services;

/// <summary>
/// Implementation of tab management service
/// </summary>
public class TabService : ITabService
{
    private readonly ObservableCollection<DocumentTab> _tabs = new();
    private readonly Stack<DocumentTab> _closedTabs = new();
    private readonly ILoggingService _loggingService;
    private DocumentTab? _activeTab;

    public IReadOnlyList<DocumentTab> Tabs => _tabs;
    public DocumentTab? ActiveTab => _activeTab;

    public event EventHandler<DocumentTab>? TabOpened;
    public event EventHandler<DocumentTab>? TabClosed;
    public event EventHandler<DocumentTab>? ActiveTabChanged;
    public event EventHandler? TabsReordered;

    public TabService(ILoggingService loggingService)
    {
        _loggingService = loggingService;
    }

    public DocumentTab OpenTab(string documentPath, string? workspaceFolder = null, bool setActive = true)
    {
        // Check if tab already exists
        var existingTab = _tabs.FirstOrDefault(t => t.DocumentPath == documentPath);
        if (existingTab != null)
        {
            if (setActive)
            {
                SwitchToTab(existingTab.Id);
            }
            return existingTab;
        }

        var tab = new DocumentTab
        {
            Id = Guid.NewGuid().ToString(),
            Title = Path.GetFileNameWithoutExtension(documentPath),
            DocumentPath = documentPath,
            WorkspaceFolder = workspaceFolder ?? string.Empty,
            IsActive = setActive
        };

        _tabs.Add(tab);
        
        if (setActive)
        {
            SetActiveTab(tab);
        }

        TabOpened?.Invoke(this, tab);
        _loggingService.LogInfo($"Opened tab: {tab.Title} ({tab.Id})");

        return tab;
    }

    public bool CloseTab(string tabId)
    {
        var tab = _tabs.FirstOrDefault(t => t.Id == tabId);
        if (tab == null)
        {
            return false;
        }

        // Don't close pinned tabs without confirmation
        if (tab.IsPinned)
        {
            _loggingService.LogWarning($"Attempted to close pinned tab: {tab.Title}");
            return false;
        }

        _tabs.Remove(tab);
        _closedTabs.Push(tab);

        // Keep only last 10 closed tabs
        while (_closedTabs.Count > 10)
        {
            _closedTabs.TryPop(out _);
        }

        TabClosed?.Invoke(this, tab);
        _loggingService.LogInfo($"Closed tab: {tab.Title} ({tab.Id})");

        // If closing active tab, activate another
        if (tab.IsActive && _tabs.Count > 0)
        {
            var nextTab = _tabs[0];
            SwitchToTab(nextTab.Id);
        }
        else if (_tabs.Count == 0)
        {
            _activeTab = null;
        }

        return true;
    }

    public void CloseAllTabs()
    {
        var tabsToClose = _tabs.Where(t => !t.IsPinned).ToList();
        foreach (var tab in tabsToClose)
        {
            CloseTab(tab.Id);
        }
    }

    public void CloseOtherTabs(string tabId)
    {
        var tabsToClose = _tabs.Where(t => t.Id != tabId && !t.IsPinned).ToList();
        foreach (var tab in tabsToClose)
        {
            CloseTab(tab.Id);
        }
    }

    public bool SwitchToTab(string tabId)
    {
        var tab = _tabs.FirstOrDefault(t => t.Id == tabId);
        if (tab == null)
        {
            return false;
        }

        SetActiveTab(tab);
        return true;
    }

    public bool SwitchToNextTab()
    {
        if (_activeTab == null || _tabs.Count <= 1)
        {
            return false;
        }

        var currentIndex = _tabs.IndexOf(_activeTab);
        var nextIndex = (currentIndex + 1) % _tabs.Count;
        return SwitchToTab(_tabs[nextIndex].Id);
    }

    public bool SwitchToPreviousTab()
    {
        if (_activeTab == null || _tabs.Count <= 1)
        {
            return false;
        }

        var currentIndex = _tabs.IndexOf(_activeTab);
        var previousIndex = currentIndex == 0 ? _tabs.Count - 1 : currentIndex - 1;
        return SwitchToTab(_tabs[previousIndex].Id);
    }

    public bool SwitchToTabByIndex(int index)
    {
        if (index < 1 || index > _tabs.Count)
        {
            return false;
        }

        return SwitchToTab(_tabs[index - 1].Id);
    }

    public void ReorderTabs(int oldIndex, int newIndex)
    {
        if (oldIndex < 0 || oldIndex >= _tabs.Count ||
            newIndex < 0 || newIndex >= _tabs.Count)
        {
            return;
        }

        var tab = _tabs[oldIndex];
        _tabs.RemoveAt(oldIndex);
        _tabs.Insert(newIndex, tab);

        TabsReordered?.Invoke(this, EventArgs.Empty);
        _loggingService.LogInfo($"Reordered tab: {tab.Title} from {oldIndex} to {newIndex}");
    }

    public void TogglePinTab(string tabId)
    {
        var tab = _tabs.FirstOrDefault(t => t.Id == tabId);
        if (tab == null)
        {
            return;
        }

        tab.IsPinned = !tab.IsPinned;
        _loggingService.LogInfo($"Toggled pin for tab: {tab.Title} (pinned: {tab.IsPinned})");
    }

    public DocumentTab? GetTab(string tabId)
    {
        return _tabs.FirstOrDefault(t => t.Id == tabId);
    }

    public DocumentTab? ReopenLastClosedTab()
    {
        if (!_closedTabs.TryPop(out var tab))
        {
            return null;
        }

        return OpenTab(tab.DocumentPath, setActive: true);
    }

    private void SetActiveTab(DocumentTab tab)
    {
        if (_activeTab != null)
        {
            _activeTab.IsActive = false;
        }

        _activeTab = tab;
        tab.IsActive = true;

        ActiveTabChanged?.Invoke(this, tab);
        _loggingService.LogInfo($"Switched to tab: {tab.Title}");
    }
}
