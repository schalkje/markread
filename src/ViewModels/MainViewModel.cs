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
    private readonly IDialogService _dialogService;
    private readonly FileTreeViewModel _fileTreeViewModel;
    private readonly SearchViewModel _searchViewModel;
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
        IDialogService dialogService,
        FileTreeViewModel fileTreeViewModel,
        SearchViewModel searchViewModel,
        IServiceProvider serviceProvider)
    {
        _tabService = tabService;
        _sessionService = sessionService;
        _loggingService = loggingService;
        _keyboardShortcutService = keyboardShortcutService;
        _navigationService = navigationService;
        _dialogService = dialogService;
        _fileTreeViewModel = fileTreeViewModel;
        _searchViewModel = searchViewModel;
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

        // Tab management shortcuts
        _keyboardShortcutService.RegisterShortcut("T", KeyModifiers.Ctrl,
            () => NewTab(), "Open new tab");
        _keyboardShortcutService.RegisterShortcut("W", KeyModifiers.Ctrl, 
            () => CloseTab(ActiveTab?.Id ?? ""), "Close active tab");
        _keyboardShortcutService.RegisterShortcut("W", KeyModifiers.CtrlShift,
            () => _ = CloseAllTabsAsync(), "Close all tabs");
        _keyboardShortcutService.RegisterShortcut("P", KeyModifiers.Ctrl,
            () => TogglePinTab(ActiveTab?.Id ?? ""), "Pin/unpin active tab");

        // Reopen closed tab
        _keyboardShortcutService.RegisterShortcut("T", KeyModifiers.CtrlShift, 
            () => ReopenLastClosedTab(), "Reopen last closed tab");

        // Chord shortcuts
        _keyboardShortcutService.RegisterChordShortcut("K", KeyModifiers.Ctrl,
            "W", KeyModifiers.Ctrl,
            () => _ = CloseOtherTabsAsync(ActiveTab?.Id ?? ""), "Close other tabs");

        // Copy shortcuts
        _keyboardShortcutService.RegisterShortcut("C", KeyModifiers.CtrlShift,
            () => CopyFilePath(), "Copy file path to clipboard");
        _keyboardShortcutService.RegisterShortcut("H", KeyModifiers.CtrlShift,
            () => CopyAsHtml(), "Copy rendered HTML to clipboard");

        // Navigation shortcuts
        _keyboardShortcutService.RegisterShortcut("G", KeyModifiers.Ctrl,
            () => ShowGoToHeadingDialogAsync().ConfigureAwait(false), "Go to heading");
        _keyboardShortcutService.RegisterShortcut("P", KeyModifiers.CtrlShift,
            () => ShowCommandPaletteAsync().ConfigureAwait(false), "Show command palette");

        // View shortcuts
        _keyboardShortcutService.RegisterShortcut("F11", KeyModifiers.None,
            () => ToggleFullscreen(), "Toggle fullscreen");

        // Accessibility shortcuts
        _keyboardShortcutService.RegisterShortcut("T", KeyModifiers.ShiftAlt,
            () => AnnounceTitle(), "Announce current document title for screen reader");

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

        // Search shortcuts
        _keyboardShortcutService.RegisterShortcut("F", KeyModifiers.Ctrl,
            () => ShowSearch(), "Show search");
        _keyboardShortcutService.RegisterShortcut("F3", KeyModifiers.None,
            () => NextSearchMatch(), "Next search match");
        _keyboardShortcutService.RegisterShortcut("F3", KeyModifiers.Shift,
            () => PreviousSearchMatch(), "Previous search match");
        _keyboardShortcutService.RegisterShortcut("Escape", KeyModifiers.None,
            () => HideSearch(), "Hide search");

        // Settings shortcuts
        _keyboardShortcutService.RegisterShortcut("Comma", KeyModifiers.Ctrl,
            () => OpenSettingsAsync().ConfigureAwait(false), "Open settings");
        _keyboardShortcutService.RegisterShortcut("F1", KeyModifiers.None,
            () => ShowKeyboardHelpAsync().ConfigureAwait(false), "Show keyboard shortcuts help");

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
    private void CopyFilePath()
    {
        if (ActiveTab == null || string.IsNullOrEmpty(ActiveTab.DocumentPath))
        {
            _loggingService.LogWarning("No active tab or document path to copy");
            return;
        }

        try
        {
            Clipboard.SetTextAsync(ActiveTab.DocumentPath);
            _loggingService.LogInfo($"Copied file path to clipboard: {ActiveTab.DocumentPath}");
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"Failed to copy file path: {ex.Message}");
        }
    }

    [RelayCommand]
    private void CopyAsHtml()
    {
        if (ActiveTab == null)
        {
            _loggingService.LogWarning("No active tab to copy HTML from");
            return;
        }

        _loggingService.LogInfo("Copy as HTML command executed");
        // TODO: Implement HTML copy from rendered WebView content
    }

    [RelayCommand]
    private async Task ShowGoToHeadingDialogAsync()
    {
        if (ActiveTab == null)
        {
            _loggingService.LogWarning("No active tab for heading navigation");
            return;
        }

        _loggingService.LogInfo("Go to heading command executed");
        // TODO: Extract headings from current document and show selection dialog
        await Task.CompletedTask;
    }

    [RelayCommand]
    private async Task ShowCommandPaletteAsync()
    {
        _loggingService.LogInfo("Command palette requested");
        // TODO: Implement command palette with fuzzy search
        await Task.CompletedTask;
    }

    [RelayCommand]
    private void ToggleFullscreen()
    {
        try
        {
            if (Application.Current?.Windows.Count > 0)
            {
                var mainWindow = Application.Current.Windows[0];
                // MAUI doesn't have direct fullscreen API, would need platform-specific code
                _loggingService.LogInfo("Fullscreen toggle command executed");
                // TODO: Implement platform-specific fullscreen toggle
            }
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"Failed to toggle fullscreen: {ex.Message}");
        }
    }

    [RelayCommand]
    private void AnnounceTitle()
    {
        if (ActiveTab == null)
        {
            _loggingService.LogWarning("No active tab to announce");
            return;
        }

        try
        {
            // Use SemanticScreenReader to announce title for accessibility
            SemanticScreenReader.Announce($"Current document: {ActiveTab.Title}");
            _loggingService.LogInfo($"Announced title for screen reader: {ActiveTab.Title}");
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"Failed to announce title: {ex.Message}");
        }
    }

    [RelayCommand]
    private void CloseTab(string tabId)
    {
        if (string.IsNullOrEmpty(tabId))
            return;

        _tabService.CloseTab(tabId);
    }

    [RelayCommand]
    private async Task CloseAllTabsAsync()
    {
        if (Tabs.Count > 1)
        {
            var confirm = await _dialogService.ShowConfirmationAsync(
                "Close All Tabs",
                $"Are you sure you want to close all {Tabs.Count} tabs?",
                "Close All",
                "Cancel");
                
            if (!confirm)
                return;
        }
        
        _tabService.CloseAllTabs();
    }

    [RelayCommand]
    private async Task CloseOtherTabsAsync(string tabId)
    {
        if (string.IsNullOrEmpty(tabId))
            return;

        var otherTabCount = Tabs.Count - 1;
        if (otherTabCount > 1)
        {
            var confirm = await _dialogService.ShowConfirmationAsync(
                "Close Other Tabs",
                $"Are you sure you want to close {otherTabCount} other tabs?",
                "Close Others",
                "Cancel");
                
            if (!confirm)
                return;
        }

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
            
            // Update search content when active tab changes
            // Note: This will be properly wired when DocumentViewModel is integrated
            // For now, search will work once a document is loaded
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

    // Search commands
    [RelayCommand]
    private void ShowSearch()
    {
        _searchViewModel.ShowSearchCommand.Execute(null);
        _loggingService.LogInfo("Search bar shown");
    }

    [RelayCommand]
    private void HideSearch()
    {
        _searchViewModel.HideSearchCommand.Execute(null);
        _loggingService.LogInfo("Search bar hidden");
    }

    [RelayCommand]
    private void NextSearchMatch()
    {
        _searchViewModel.NextMatchCommand.Execute(null);
    }

    [RelayCommand]
    private void PreviousSearchMatch()
    {
        _searchViewModel.PreviousMatchCommand.Execute(null);
    }
    
    // Keyboard help command
    [RelayCommand]
    private async Task ShowKeyboardHelpAsync()
    {
        try
        {
            var keyboardShortcutsPage = _serviceProvider.GetService(typeof(KeyboardShortcutsPage)) as KeyboardShortcutsPage;
            if (keyboardShortcutsPage != null && Application.Current?.Windows.Count > 0)
            {
                var mainWindow = Application.Current.Windows[0];
                if (mainWindow?.Page != null)
                {
                    await mainWindow.Page.Navigation.PushModalAsync(keyboardShortcutsPage, true);
                    _loggingService.LogInfo("Keyboard shortcuts help page opened");
                }
            }
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"Failed to show keyboard help: {ex.Message}");
        }
    }

    // Navigation bar commands
    [ObservableProperty]
    private bool _isSidebarVisible = true;

    [ObservableProperty]
    private string _currentFilePath = "No file open";

    [RelayCommand]
    private void ToggleSidebar()
    {
        IsSidebarVisible = !IsSidebarVisible;
        _loggingService.LogInfo($"Sidebar toggled: {(IsSidebarVisible ? "visible" : "hidden")}");
    }

    public bool CanNavigateBack => ActiveTab != null && _navigationService.CanGoBack(ActiveTab.Id);
    public bool CanNavigateForward => ActiveTab != null && _navigationService.CanGoForward(ActiveTab.Id);

    [RelayCommand]
    private void NavigateBack()
    {
        GoBack();
        OnPropertyChanged(nameof(CanNavigateBack));
        OnPropertyChanged(nameof(CanNavigateForward));
    }

    [RelayCommand]
    private void NavigateForward()
    {
        GoForward();
        OnPropertyChanged(nameof(CanNavigateBack));
        OnPropertyChanged(nameof(CanNavigateForward));
    }

    [RelayCommand]
    private async Task OpenFolderAsync()
    {
        try
        {
            // MAUI doesn't have a built-in folder picker yet
            // For now, use FilePicker to select a markdown file
            var customFileType = new FilePickerFileType(
                new Dictionary<DevicePlatform, IEnumerable<string>>
                {
                    { DevicePlatform.WinUI, new[] { ".md", ".markdown" } },
                });

            var options = new PickOptions
            {
                PickerTitle = "Select a markdown file to open its folder",
                FileTypes = customFileType,
            };

            var result = await FilePicker.Default.PickAsync(options);
            if (result != null)
            {
                var folderPath = System.IO.Path.GetDirectoryName(result.FullPath);
                if (!string.IsNullOrEmpty(folderPath))
                {
                    _loggingService.LogInfo($"File selected: {result.FullPath}, loading folder: {folderPath}");
                    
                    // Load the folder into the file tree
                    await _fileTreeViewModel.LoadFolderCommand.ExecuteAsync(folderPath);
                    
                    // Update current file path
                    CurrentFilePath = result.FullPath;
                    
                    // TODO: Open the selected file in the markdown viewer
                }
            }
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"Failed to open folder: {ex.Message}");
        }
    }

    [RelayCommand]
    private void ToggleSearch()
    {
        if (_searchViewModel.IsVisible)
        {
            HideSearch();
        }
        else
        {
            ShowSearch();
        }
    }

    [RelayCommand]
    private async Task ShowMenuAsync()
    {
        _loggingService.LogInfo("Menu requested");
        // TODO: Show context menu with export, print, etc.
        await Task.CompletedTask;
    }

    [RelayCommand]
    private async Task ShowSettingsAsync()
    {
        await OpenSettingsAsync();
    }

    [RelayCommand]
    private void ToggleTheme()
    {
        try
        {
            var currentTheme = Application.Current?.UserAppTheme ?? AppTheme.Unspecified;
            var newTheme = currentTheme == AppTheme.Dark ? AppTheme.Light : AppTheme.Dark;
            
            if (Application.Current != null)
            {
                Application.Current.UserAppTheme = newTheme;
                _loggingService.LogInfo($"Theme toggled to: {newTheme}");
            }
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"Failed to toggle theme: {ex.Message}");
        }
    }

    public SearchViewModel SearchViewModel => _searchViewModel;
}
