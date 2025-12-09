using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MarkRead.Models;
using MarkRead.Services;
using System.Collections.ObjectModel;

namespace MarkRead.ViewModels;

/// <summary>
/// Main ViewModel for the application
/// </summary>
public partial class MainViewModel : ObservableObject
{
    private readonly ITabService _tabService;
    private readonly ISessionService _sessionService;
    private readonly ILoggingService _loggingService;
    private readonly FileTreeViewModel _fileTreeViewModel;

    [ObservableProperty]
    private ObservableCollection<TabViewModel> _tabs = new();

    [ObservableProperty]
    private TabViewModel? _activeTab;

    [ObservableProperty]
    private bool _showTabOverflowWarning;

    public MainViewModel(
        ITabService tabService,
        ISessionService sessionService,
        ILoggingService loggingService,
        FileTreeViewModel fileTreeViewModel)
    {
        _tabService = tabService;
        _sessionService = sessionService;
        _loggingService = loggingService;
        _fileTreeViewModel = fileTreeViewModel;

        // Subscribe to tab service events
        _tabService.TabOpened += OnTabOpened;
        _tabService.TabClosed += OnTabClosed;
        _tabService.ActiveTabChanged += OnActiveTabChanged;
        _tabService.TabsReordered += OnTabsReordered;

        // Subscribe to file tree events
        _fileTreeViewModel.FileOpened += OnFileOpened;
    }

    [RelayCommand]
    private void NewTab()
    {
        // Open a blank tab or prompt for file
        _loggingService.LogInfo("New tab command executed");
        // TODO: Implement new tab logic when we have a file picker
    }

    [RelayCommand]
    private void CloseTab(string tabId)
    {
        if (string.IsNullOrEmpty(tabId))
            return;

        _tabService.CloseTab(tabId);
    }

    [RelayCommand]
    private void CloseAllTabs()
    {
        _tabService.CloseAllTabs();
    }

    [RelayCommand]
    private void CloseOtherTabs(string tabId)
    {
        if (string.IsNullOrEmpty(tabId))
            return;

        _tabService.CloseOtherTabs(tabId);
    }

    [RelayCommand]
    private void SwitchToTab(string tabId)
    {
        if (string.IsNullOrEmpty(tabId))
            return;

        _tabService.SwitchToTab(tabId);
    }

    [RelayCommand]
    private void NextTab()
    {
        _tabService.SwitchToNextTab();
    }

    [RelayCommand]
    private void PreviousTab()
    {
        _tabService.SwitchToPreviousTab();
    }

    [RelayCommand]
    private void SwitchToTabByIndex(int index)
    {
        _tabService.SwitchToTabByIndex(index);
    }

    [RelayCommand]
    private void TogglePinTab(string tabId)
    {
        if (string.IsNullOrEmpty(tabId))
            return;

        _tabService.TogglePinTab(tabId);
    }

    [RelayCommand]
    private void ReopenLastClosedTab()
    {
        _tabService.ReopenLastClosedTab();
    }

    public void ReorderTabs(int oldIndex, int newIndex)
    {
        _tabService.ReorderTabs(oldIndex, newIndex);
    }

    private void OnTabOpened(object? sender, DocumentTab tab)
    {
        var tabViewModel = new TabViewModel(tab);
        Tabs.Add(tabViewModel);

        // Show warning if more than 20 tabs open
        ShowTabOverflowWarning = Tabs.Count > 20;

        _loggingService.LogInfo($"Tab added to UI: {tab.Title}");
    }

    private void OnTabClosed(object? sender, DocumentTab tab)
    {
        var tabViewModel = Tabs.FirstOrDefault(t => t.Id == tab.Id);
        if (tabViewModel != null)
        {
            Tabs.Remove(tabViewModel);
        }

        ShowTabOverflowWarning = Tabs.Count > 20;

        _loggingService.LogInfo($"Tab removed from UI: {tab.Title}");
    }

    private void OnActiveTabChanged(object? sender, DocumentTab tab)
    {
        var tabViewModel = Tabs.FirstOrDefault(t => t.Id == tab.Id);
        if (tabViewModel != null)
        {
            ActiveTab = tabViewModel;
            
            // Update all tab IsActive states
            foreach (var t in Tabs)
            {
                t.Update();
            }
        }
    }

    private void OnTabsReordered(object? sender, EventArgs e)
    {
        // Refresh tabs collection to match service order
        var orderedTabs = _tabService.Tabs
            .Select(t => Tabs.FirstOrDefault(vm => vm.Id == t.Id))
            .Where(vm => vm != null)
            .ToList();

        Tabs.Clear();
        foreach (var tab in orderedTabs)
        {
            if (tab != null)
            {
                Tabs.Add(tab);
            }
        }
    }

    private void OnFileOpened(object? sender, string filePath)
    {
        // Open file in new tab
        _tabService.OpenTab(filePath, setActive: true);
    }

    public async Task SaveSessionAsync()
    {
        var state = new SessionState
        {
            OpenTabs = _tabService.Tabs.Select(t => t.Id).ToList(),
            ActiveTabId = _tabService.ActiveTab?.Id
        };

        await _sessionService.SaveSessionAsync(state);
    }

    public async Task<bool> RestoreSessionAsync()
    {
        var wasAbnormal = await _sessionService.WasAbnormalTerminationAsync();
        if (!wasAbnormal)
        {
            return false;
        }

        var state = await _sessionService.LoadSessionAsync();
        if (state == null)
        {
            return false;
        }

        // TODO: Restore tabs from session state
        // This requires tab document state to be saved as well

        return true;
    }
}
