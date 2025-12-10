using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MarkRead.Models;
using MarkRead.Services;
using MarkRead.Views;
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
    private readonly IKeyboardShortcutService _keyboardShortcutService;
    private readonly INavigationService _navigationService;
    private readonly FileTreeViewModel _fileTreeViewModel;
    private readonly IServiceProvider _serviceProvider;

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
        IKeyboardShortcutService keyboardShortcutService,
        INavigationService navigationService,
        FileTreeViewModel fileTreeViewModel,
        IServiceProvider serviceProvider)
    {
        _tabService = tabService;
        _sessionService = sessionService;
        _loggingService = loggingService;
        _keyboardShortcutService = keyboardShortcutService;
        _navigationService = navigationService;
        _fileTreeViewModel = fileTreeViewModel;
        _serviceProvider = serviceProvider;

        // Subscribe to tab service events
        _tabService.TabOpened += OnTabOpened;
        _tabService.TabClosed += OnTabClosed;
        _tabService.ActiveTabChanged += OnActiveTabChanged;
        _tabService.TabsReordered += OnTabsReordered;

        // Subscribe to file tree events
        _fileTreeViewModel.FileOpened += OnFileOpened;

        // Register keyboard shortcuts
        RegisterKeyboardShortcuts();
    }

    private void RegisterKeyboardShortcuts()
    {
        // Tab navigation shortcuts
        _keyboardShortcutService.RegisterShortcut("Tab", KeyModifiers.Ctrl, 
            () => NextTab(), "Switch to next tab");
        _keyboardShortcutService.RegisterShortcut("Tab", KeyModifiers.CtrlShift, 
            () => PreviousTab(), "Switch to previous tab");

        // Close tab shortcuts
        _keyboardShortcutService.RegisterShortcut("W", KeyModifiers.Ctrl, 
            () => CloseTab(ActiveTab?.Id ?? ""), "Close active tab");

        // Reopen closed tab
        _keyboardShortcutService.RegisterShortcut("T", KeyModifiers.CtrlShift, 
            () => ReopenLastClosedTab(), "Reopen last closed tab");

        // Back/Forward navigation shortcuts
        _keyboardShortcutService.RegisterShortcut("Left", KeyModifiers.Alt,
            () => GoBack(), "Navigate back");
        _keyboardShortcutService.RegisterShortcut("Right", KeyModifiers.Alt,
            () => GoForward(), "Navigate forward");

        // Scroll shortcuts
        _keyboardShortcutService.RegisterShortcut("Home", KeyModifiers.Ctrl,
            () => ScrollToTop(), "Scroll to top");
        _keyboardShortcutService.RegisterShortcut("End", KeyModifiers.Ctrl,
            () => ScrollToBottom(), "Scroll to bottom");

        // Direct tab access (Ctrl+1 through Ctrl+9)
        for (int i = 1; i <= 9; i++)
        {
            int index = i - 1; // Capture for closure
            _keyboardShortcutService.RegisterShortcut(i.ToString(), KeyModifiers.Ctrl,
                () => SwitchToTabByIndex(index), $"Switch to tab {i}");
        }

        _loggingService.LogInfo("Keyboard shortcuts registered for tab management and navigation");
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

    [RelayCommand]
    private async Task OpenSettingsAsync()
    {
        try
        {
            var settingsPage = _serviceProvider.GetService(typeof(SettingsPage)) as SettingsPage;
            if (settingsPage != null && Application.Current?.Windows.Count > 0)
            {
                var mainWindow = Application.Current.Windows[0];
                if (mainWindow?.Page != null)
                {
                    await mainWindow.Page.Navigation.PushModalAsync(settingsPage, true);
                    _loggingService.LogInfo("Settings page opened");
                }
            }
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"Failed to open settings: {ex.Message}");
        }
    }

    [RelayCommand]
    private void GoBack()
    {
        if (ActiveTab == null) return;

        var previousPath = _navigationService.GoBack(ActiveTab.Id);
        if (previousPath != null)
        {
            // Navigate to previous document
            _loggingService.LogInfo($"Navigating back to: {previousPath}");
            // TODO: Load document in current tab without adding to history
        }
    }

    [RelayCommand]
    private void GoForward()
    {
        if (ActiveTab == null) return;

        var nextPath = _navigationService.GoForward(ActiveTab.Id);
        if (nextPath != null)
        {
            // Navigate to next document
            _loggingService.LogInfo($"Navigating forward to: {nextPath}");
            // TODO: Load document in current tab without adding to history
        }
    }

    [RelayCommand]
    private void ScrollToTop()
    {
        _loggingService.LogInfo("Scroll to top command executed");
        // TODO: Implement WebView scroll to top via JavaScript
    }

    [RelayCommand]
    private void ScrollToBottom()
    {
        _loggingService.LogInfo("Scroll to bottom command executed");
        // TODO: Implement WebView scroll to bottom via JavaScript
    }

    [RelayCommand]
    private void ReorderTabs(List<string> tabIds)
    {
        // Find indices of tabs in the new order
        for (int newIndex = 0; newIndex < tabIds.Count; newIndex++)
        {
            var tabId = tabIds[newIndex];
            var currentIndex = Tabs.ToList().FindIndex(t => t.Id == tabId);
            
            if (currentIndex >= 0 && currentIndex != newIndex)
            {
                // Reorder in TabService
                _tabService.ReorderTabs(currentIndex, newIndex);
            }
        }
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
