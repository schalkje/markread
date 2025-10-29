using System;
using System.Collections.ObjectModel;
using MarkRead.App.UI.Tabs;

namespace MarkRead.Services;

/// <summary>
/// Service interface for managing tab state and operations
/// </summary>
public interface ITabService
{
    /// <summary>
    /// Collection of all open tabs
    /// </summary>
    ObservableCollection<TabItem> Tabs { get; }

    /// <summary>
    /// The currently active tab
    /// </summary>
    TabItem? ActiveTab { get; set; }

    /// <summary>
    /// Maximum number of tabs that can be open simultaneously (0 = unlimited)
    /// </summary>
    int MaxTabCount { get; set; }

    /// <summary>
    /// Add a new tab to the collection
    /// </summary>
    void AddTab(TabItem tab);

    /// <summary>
    /// Close a specific tab
    /// </summary>
    void CloseTab(TabItem tab);

    /// <summary>
    /// Close a tab by its ID
    /// </summary>
    void CloseTab(Guid tabId);

    /// <summary>
    /// Close all tabs
    /// </summary>
    void CloseAllTabs();

    /// <summary>
    /// Close all tabs except the active one
    /// </summary>
    void CloseOtherTabs();

    /// <summary>
    /// Find a tab by its ID
    /// </summary>
    TabItem? FindTab(Guid tabId);

    /// <summary>
    /// Find a tab by its document path
    /// </summary>
    TabItem? FindTabByPath(string documentPath);

    /// <summary>
    /// Set a tab as active
    /// </summary>
    void SetActiveTab(TabItem tab);

    /// <summary>
    /// Event raised when the active tab changes
    /// </summary>
    event EventHandler<TabItem?>? ActiveTabChanged;

    /// <summary>
    /// Event raised when a tab is added
    /// </summary>
    event EventHandler<TabItem>? TabAdded;

    /// <summary>
    /// Event raised when a tab is closed
    /// </summary>
    event EventHandler<TabItem>? TabClosed;
}

/// <summary>
/// Default implementation of ITabService
/// </summary>
public class TabService : ITabService
{
    private TabItem? _activeTab;

    public TabService()
    {
        Tabs = new ObservableCollection<TabItem>();
        MaxTabCount = 0; // unlimited
    }

    public ObservableCollection<TabItem> Tabs { get; }

    public TabItem? ActiveTab
    {
        get => _activeTab;
        set
        {
            if (_activeTab != value)
            {
                if (_activeTab != null)
                {
                    _activeTab.IsActive = false;
                }

                _activeTab = value;

                if (_activeTab != null)
                {
                    _activeTab.IsActive = true;
                }

                ActiveTabChanged?.Invoke(this, _activeTab);
            }
        }
    }

    public int MaxTabCount { get; set; }

    public event EventHandler<TabItem?>? ActiveTabChanged;
    public event EventHandler<TabItem>? TabAdded;
    public event EventHandler<TabItem>? TabClosed;

    public void AddTab(TabItem tab)
    {
        if (tab == null)
            throw new ArgumentNullException(nameof(tab));

        if (MaxTabCount > 0 && Tabs.Count >= MaxTabCount)
        {
            throw new InvalidOperationException($"Maximum tab count ({MaxTabCount}) reached");
        }

        Tabs.Add(tab);
        TabAdded?.Invoke(this, tab);

        // Automatically set as active if it's the first tab
        if (Tabs.Count == 1)
        {
            SetActiveTab(tab);
        }
    }

    public void CloseTab(TabItem tab)
    {
        if (tab == null)
            throw new ArgumentNullException(nameof(tab));

        var index = Tabs.IndexOf(tab);
        if (index < 0)
            return;

        Tabs.RemoveAt(index);
        TabClosed?.Invoke(this, tab);

        // If we closed the active tab, activate another one
        if (ActiveTab == tab)
        {
            if (Tabs.Count > 0)
            {
                // Activate the tab at the same index, or the last tab if we were at the end
                var newIndex = Math.Min(index, Tabs.Count - 1);
                SetActiveTab(Tabs[newIndex]);
            }
            else
            {
                ActiveTab = null;
            }
        }
    }

    public void CloseTab(Guid tabId)
    {
        var tab = FindTab(tabId);
        if (tab != null)
        {
            CloseTab(tab);
        }
    }

    public void CloseAllTabs()
    {
        while (Tabs.Count > 0)
        {
            CloseTab(Tabs[0]);
        }
    }

    public void CloseOtherTabs()
    {
        if (ActiveTab == null)
            return;

        var tabToKeep = ActiveTab;
        var tabsToClose = Tabs.Where(t => t != tabToKeep).ToList();

        foreach (var tab in tabsToClose)
        {
            CloseTab(tab);
        }
    }

    public TabItem? FindTab(Guid tabId)
    {
        return Tabs.FirstOrDefault(t => t.Id == tabId);
    }

    public TabItem? FindTabByPath(string documentPath)
    {
        if (string.IsNullOrEmpty(documentPath))
            return null;

        return Tabs.FirstOrDefault(t => 
            string.Equals(t.DocumentPath, documentPath, StringComparison.OrdinalIgnoreCase));
    }

    public void SetActiveTab(TabItem tab)
    {
        if (tab == null)
            throw new ArgumentNullException(nameof(tab));

        if (!Tabs.Contains(tab))
            throw new InvalidOperationException("Tab is not in the collection");

        ActiveTab = tab;
    }
}
