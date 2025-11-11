using System;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;

using Microsoft.Web.WebView2.Core;

using MarkRead.App.Rendering;
using MarkRead.App.Services;
using MarkRead.App.UI.Shell;
using MarkRead.App.UI.Start;
using MarkRead.Cli;
using MarkRead.Services;

using AppNavigationCommands = MarkRead.App.UI.Shell.NavigationCommands;
using TabItemModel = MarkRead.App.UI.Tabs.TabItem;
using WpfMessageBox = System.Windows.MessageBox;
using WpfButton = System.Windows.Controls.Button;

namespace MarkRead.App;

/// <summary>
/// Interaction logic for the shell window hosting tabbed WebView renderers.
/// </summary>
public partial class MainWindow : Window
{
    private readonly FolderService _folderService = new();
    private readonly MarkdownService _markdownService = new();
    private readonly HtmlSanitizerService _sanitizer = new();
    private readonly SettingsService _settingsService;
    private readonly HistoryService _historyService = new();
    private readonly FileWatcherService _fileWatcherService = new();
    private readonly TabService _tabService = new();
    private readonly INavigationService _navigationService = new NavigationService();
    private readonly Renderer _renderer;
    private readonly LinkResolver _linkResolver;
    private readonly OpenFolderCommand _openFolderCommand;
    private readonly ThemeManager _themeManager;

    private FolderRoot? _currentRoot;
    private IDisposable? _documentWatcher;
    private StartupArguments _startupArguments = StartupArguments.Empty;
    private ViewerSettings _currentSettings = ViewerSettings.Default();
    private WebViewHost? _webViewHost;
    private bool _isInitialized;

    public MainWindow()
    {
        InitializeComponent();

        if (System.Windows.Application.Current is not App app)
        {
            throw new InvalidOperationException("Application services are not available.");
        }

        _settingsService = app.SettingsService;
        _themeManager = app.ThemeManager;

        _renderer = new Renderer(_markdownService, _sanitizer);
        _linkResolver = new LinkResolver(_folderService);
        _openFolderCommand = new OpenFolderCommand(_folderService);
        _webViewHost = new WebViewHost(MarkdownView, Path.Combine("Rendering", "assets"));

        // Set initial WebView2 background color based on current theme (before initialization)
        SetInitialWebViewBackground();

        // Subscribe to theme change events for WebView2 coordination
        _themeManager.ThemeChanged += OnThemeChanged;
        _themeManager.ThemeLoadFailed += OnThemeLoadFailed;

        // Subscribe to TabService events
        _tabService.ActiveTabChanged += OnActiveTabChanged;
        _tabService.TabClosed += OnTabClosed;

        this.TabControl.ItemsSource = _tabService.Tabs;

        // Wire up NavigationBar ThemeService (icon will update after theme initialization)
        this.NavigationBar.ThemeService = _themeManager;
        this.NavigationBar.NavigationService = _navigationService;
        _navigationService.ClearCurrentFile();

        // Wire up FindBar events
        FindBar.SearchRequested += OnSearchRequested;
        FindBar.NextRequested += OnFindNextRequested;
        FindBar.PreviousRequested += OnFindPreviousRequested;
        FindBar.CloseRequested += OnFindCloseRequested;

        // Wire up Sidebar events
        SidebarContent.FileSelected += OnSidebarFileSelected;

        CommandBindings.Add(new CommandBinding(App.OpenFolderCommand, async (_, _) => await ExecuteOpenFolderAsync(), CanExecuteWhenInteractive));
        CommandBindings.Add(new CommandBinding(App.OpenFileCommand, async (_, _) => await ExecuteOpenFileAsync(), CanExecuteWhenInteractive));
        CommandBindings.Add(new CommandBinding(StartCommands.OpenFolder, async (_, _) => await ExecuteOpenFolderAsync(), CanExecuteWhenInteractive));
        CommandBindings.Add(new CommandBinding(StartCommands.OpenFile, async (_, _) => await ExecuteOpenFileAsync(), CanExecuteWhenInteractive));
        CommandBindings.Add(new CommandBinding(AppNavigationCommands.GoBack, async (_, _) => await ExecuteGoBackAsync(), CanExecuteGoBack));
        CommandBindings.Add(new CommandBinding(AppNavigationCommands.GoForward, async (_, _) => await ExecuteGoForwardAsync(), CanExecuteGoForward));
        CommandBindings.Add(new CommandBinding(App.FindInDocumentCommand, (_, _) => ExecuteFind(), CanExecuteWhenInteractive));

        // Add keyboard event handler for tab shortcuts
        this.PreviewKeyDown += Window_PreviewKeyDown;
    }

    internal void InitializeShell(StartupArguments startupArguments)
    {
        _startupArguments = startupArguments;
    }

    internal async Task InitializeShellAsync(StartupArguments startupArguments)
    {
        _startupArguments = startupArguments;
        
        // Load settings from disk
        _currentSettings = await _settingsService.LoadAsync();

        // Theme manager is initialized during application startup
    }

    private async void Window_Loaded(object sender, RoutedEventArgs e)
    {
        await EnsureWebViewAsync();
        await InitializeFromStartupAsync();
    }

    private void Window_PreviewKeyDown(object sender, System.Windows.Input.KeyEventArgs e)
    {
        // Handle tab navigation shortcuts
        if (e.Key == Key.Tab && (Keyboard.Modifiers & ModifierKeys.Control) == ModifierKeys.Control)
        {
            if ((Keyboard.Modifiers & ModifierKeys.Shift) == ModifierKeys.Shift)
            {
                // Ctrl+Shift+Tab - Previous tab
                _tabService.ActivatePreviousTab();
                e.Handled = true;
            }
            else
            {
                // Ctrl+Tab - Next tab
                _tabService.ActivateNextTab();
                e.Handled = true;
            }
        }
        // Handle close tab shortcut
        else if (e.Key == Key.F4 && (Keyboard.Modifiers & ModifierKeys.Control) == ModifierKeys.Control)
        {
            // Ctrl+F4 - Close active tab
            _tabService.CloseActiveTab();
            e.Handled = true;
        }
    }

    private async Task EnsureWebViewAsync()
    {
        if (_isInitialized || _webViewHost is null)
        {
            return;
        }

        await _webViewHost.InitializeAsync();
        _webViewHost.BridgeMessageReceived += OnBridgeMessageReceived;
        _webViewHost.LinkClicked += OnLinkClicked;
        _webViewHost.AnchorClicked += OnAnchorClicked;
        _isInitialized = true;
        
        // Inject initial theme into WebView after initialization
        var currentTheme = _themeManager.CurrentTheme;
        var themeName = currentTheme.ToString().ToLowerInvariant();
        var themeConfig = _themeManager.GetCurrentConfiguration();
        var colorScheme = currentTheme == ThemeType.Dark 
            ? themeConfig.DarkColorScheme 
            : themeConfig.LightColorScheme;
        
        // Set WebView2 default background color to match theme
        UpdateWebViewBackgroundColor(colorScheme.Background);
        
        try
        {
            await _webViewHost.InjectThemeFromColorSchemeAsync(themeName, colorScheme);
        }
        catch
        {
            // Theme injection failed, but application can continue
        }
    }

    private async Task InitializeFromStartupAsync()
    {
        if (_startupArguments.PathKind == StartupPathKind.Directory && _startupArguments.FullPath is not null)
        {
            await LoadRootFromPathAsync(_startupArguments.FullPath);
            return;
        }

        if (_startupArguments.PathKind == StartupPathKind.File && _startupArguments.FullPath is not null)
        {
            await LoadFileAndRootAsync(_startupArguments.FullPath);
            return;
        }

        ShowStartOverlay(true);
    }

    private void CanExecuteWhenInteractive(object sender, CanExecuteRoutedEventArgs e)
    {
        e.CanExecute = true;
        e.Handled = true;
    }

    private void CanExecuteGoBack(object sender, CanExecuteRoutedEventArgs e)
    {
        var currentTab = GetCurrentTab();
        var history = currentTab is not null ? _historyService.GetOrCreate(currentTab.Id) : null;
        e.CanExecute = history?.CanGoBack ?? false;
        e.Handled = true;
    }

    private void CanExecuteGoForward(object sender, CanExecuteRoutedEventArgs e)
    {
        var currentTab = GetCurrentTab();
        var history = currentTab is not null ? _historyService.GetOrCreate(currentTab.Id) : null;
        e.CanExecute = history?.CanGoForward ?? false;
        e.Handled = true;
    }

    public void ExecuteOpenFolder()
    {
        _ = ExecuteOpenFolderAsync();
    }

    public void ExecuteOpenFile()
    {
        _ = ExecuteOpenFileAsync();
    }

    private async Task ExecuteGoBackAsync()
    {
        var currentTab = GetCurrentTab();
        if (currentTab is null || _currentRoot is null)
        {
            return;
        }

        var history = _historyService.GetOrCreate(currentTab.Id);
        if (!history.CanGoBack)
        {
            return;
        }

        var entry = history.GoBack();
        if (entry is null)
        {
            return;
        }

        var document = _folderService.TryResolveDocument(_currentRoot, entry.Value.DocumentPath);
        if (document is DocumentInfo doc)
        {
            await LoadDocumentInTabAsync(currentTab, doc, entry.Value.Anchor, pushHistory: false);
        }
    }

    private async Task ExecuteGoForwardAsync()
    {
        var currentTab = GetCurrentTab();
        if (currentTab is null || _currentRoot is null)
        {
            return;
        }

        var history = _historyService.GetOrCreate(currentTab.Id);
        if (!history.CanGoForward)
        {
            return;
        }

        var entry = history.GoForward();
        if (entry is null)
        {
            return;
        }

        var document = _folderService.TryResolveDocument(_currentRoot, entry.Value.DocumentPath);
        if (document is DocumentInfo doc)
        {
            await LoadDocumentInTabAsync(currentTab, doc, entry.Value.Anchor, pushHistory: false);
        }
    }

    private async Task ExecuteOpenFolderAsync()
    {
        var result = _openFolderCommand.Execute(this);
        if (result is null)
        {
            if (_tabService.Tabs.Count == 0)
            {
                ShowStartOverlay(true);
            }
            return;
        }

        await LoadRootAsync(result.Value);
    }

    private async Task ExecuteOpenFileAsync()
    {
        var dialog = new Microsoft.Win32.OpenFileDialog
        {
            Filter = "Markdown files (*.md;*.markdown;*.mdx)|*.md;*.markdown;*.mdx|All files (*.*)|*.*",
            Multiselect = false
        };

        if (dialog.ShowDialog(this) != true)
        {
            if (_tabService.Tabs.Count == 0)
            {
                ShowStartOverlay(true);
            }
            return;
        }

        await LoadFileAndRootAsync(dialog.FileName);
    }

    private async Task LoadRootFromPathAsync(string path)
    {
        try
        {
            var root = _folderService.CreateRoot(path);
            var defaultDocument = _folderService.ResolveDefaultDocument(root);
            await LoadRootAsync(new FolderOpenResult(root, defaultDocument));
        }
        catch (InvalidOperationException ex)
        {
            System.Windows.MessageBox.Show(this, ex.Message, "MarkRead", MessageBoxButton.OK, MessageBoxImage.Error);
            ShowStartOverlay(true);
        }
    }

    private async Task LoadFileAndRootAsync(string fullPath)
    {
        string directory = Path.GetDirectoryName(fullPath) ?? fullPath;
        try
        {
            var root = _folderService.CreateRoot(directory);
            var document = _folderService.TryResolveDocument(root, fullPath) ?? new DocumentInfo(fullPath, Path.GetFileName(fullPath), 0, DateTime.UtcNow);
            await LoadRootAsync(new FolderOpenResult(root, document));
        }
        catch (InvalidOperationException ex)
        {
            System.Windows.MessageBox.Show(this, ex.Message, "MarkRead", MessageBoxButton.OK, MessageBoxImage.Error);
            ShowStartOverlay(true);
        }
    }

    private async Task LoadRootAsync(FolderOpenResult result)
    {
        _currentRoot = result.Root;
        _renderer.SetRootPath(result.Root.Path);
        Title = $"MarkRead - {result.Root.DisplayName}";

        _navigationService.ClearCurrentFile();
        _navigationService.UpdateHistoryState(false, false);

        // Initialize sidebar with folder root
        SidebarContent.SetRootFolder(result.Root.Path);

        // Create initial tab if no tabs exist
        if (_tabService.Tabs.Count == 0)
        {
            var initialTab = new TabItemModel(Guid.NewGuid(), result.Root.DisplayName);
            await AddTabAsync(initialTab);
        }

        // Show tabs and load document
        ShowStartOverlay(false);
        TabBarContainer.Visibility = Visibility.Visible;
        MarkdownView.Visibility = Visibility.Visible;

        if (result.DefaultDocument is DocumentInfo doc)
        {
            var currentTab = GetCurrentTab();
            if (currentTab is not null)
            {
                await LoadDocumentInTabAsync(currentTab, doc);
            }
        }
        else
        {
            var currentTab = GetCurrentTab();
            if (currentTab is not null)
            {
                await ShowNoMarkdownFilesMessageAsync(currentTab, result.Root.Path);
            }
        }
    }

    private Task AddTabAsync(TabItemModel tab)
    {
        _tabService.AddTab(tab);
        UpdateNavigationHistoryState();
        return Task.CompletedTask;
    }

    private async void OnTreeViewFileNavigationRequested(object? sender, UI.Sidebar.TreeView.FileNavigationEventArgs e)
    {
        if (_currentRoot == null) return;

        var document = _folderService.TryResolveDocument(_currentRoot, e.FilePath) 
            ?? new DocumentInfo(e.FilePath, Path.GetFileName(e.FilePath), 0, DateTime.UtcNow);

        var currentTab = GetCurrentTab();
        if (currentTab != null)
        {
            await LoadDocumentInTabAsync(currentTab, document);
        }
    }

    private async Task LoadDocumentInTabAsync(TabItemModel tab, DocumentInfo document, string? anchor = null, bool pushHistory = true)
    {
        if (_currentRoot is null || _webViewHost is null)
        {
            return;
        }

        // Save scroll position before loading new document (if same document being reloaded)
        int scrollPosition = 0;
        bool isReload = tab.DocumentPath == document.FullPath;
        if (isReload)
        {
            scrollPosition = await _webViewHost.GetScrollPositionAsync();
        }

        tab.DocumentPath = document.FullPath;
        tab.Title = Path.GetFileNameWithoutExtension(document.FullPath);

        // Push to history before loading
        if (pushHistory)
        {
            var history = _historyService.GetOrCreate(tab.Id);
            var entry = new NavigationEntry(document.FullPath, anchor);
            history.Push(entry);
        }

        _navigationService.UpdateCurrentFile(document.FullPath, _currentRoot?.Path);

        string markdown;
        try
        {
            var fileInfo = new FileInfo(document.FullPath);
            bool isLargeFile = fileInfo.Length > 1024 * 1024; // > 1MB

            if (isLargeFile)
            {
                _webViewHost.ShowLoadingIndicator();
            }

            markdown = await File.ReadAllTextAsync(document.FullPath);

            if (isLargeFile)
            {
                _webViewHost.HideLoadingIndicator();
            }
        }
        catch (IOException ex)
        {
            _navigationService.ClearCurrentFile();
            System.Windows.MessageBox.Show(this, $"Unable to read document: {ex.Message}", "MarkRead", MessageBoxButton.OK, MessageBoxImage.Error);
            return;
        }

        var resolvedTheme = _themeManager.GetResolvedTheme().ToString().ToLowerInvariant();

        var request = new RenderRequest(
            markdown,
            document.FullPath,
            document.RelativePath,
            anchor,
            resolvedTheme);

        var renderResult = await _renderer.RenderAsync(request);

        await Dispatcher.InvokeAsync(() =>
        {
            // Prefer navigating to temp file for proper file:// origin (allows local images to load)
            // Fall back to NavigateToString if temp file creation failed
            if (!string.IsNullOrEmpty(renderResult.TempFilePath) && File.Exists(renderResult.TempFilePath))
            {
                _webViewHost.NavigateToFile(renderResult.TempFilePath);
            }
            else
            {
                _webViewHost.NavigateToString(renderResult.Html);
            }
            
            Title = $"MarkRead - {renderResult.Title}";
            SubscribeToDocumentChanges(tab, document);
        });

        await _webViewHost.WaitForReadyAsync();

        // Restore scroll position for reloads, or navigate to anchor
        if (isReload && scrollPosition > 0 && string.IsNullOrEmpty(anchor))
        {
            _webViewHost.RestoreScrollPosition(scrollPosition);
        }
        else if (!string.IsNullOrEmpty(anchor))
        {
            _webViewHost.PostMessage("scroll-to", new { anchor });
        }

        UpdateNavigationHistoryState();
    }

    private void SubscribeToDocumentChanges(TabItemModel tab, DocumentInfo document)
    {
        _documentWatcher?.Dispose();
        _documentWatcher = _fileWatcherService.Watch(document.FullPath, _ =>
        {
            Dispatcher.InvokeAsync(async () => await ReloadCurrentDocumentAsync(tab));
        });
    }

    private async Task ReloadCurrentDocumentAsync(TabItemModel tab)
    {
        if (_currentRoot is null || string.IsNullOrEmpty(tab.DocumentPath))
        {
            return;
        }

        var document = _folderService.TryResolveDocument(_currentRoot, tab.DocumentPath);
        if (document is DocumentInfo doc)
        {
            await LoadDocumentInTabAsync(tab, doc, pushHistory: false);
        }
    }

    private async Task ShowNoMarkdownFilesMessageAsync(TabItemModel tab, string folderPath)
    {
        if (_webViewHost is null)
        {
            return;
        }

        tab.DocumentPath = string.Empty;
        tab.Title = "No Files";

        _navigationService.ClearCurrentFile();

        var folderName = Path.GetFileName(folderPath);
        if (string.IsNullOrEmpty(folderName))
        {
            folderName = folderPath;
        }

        var resolvedTheme = _themeManager.GetResolvedTheme().ToString().ToLowerInvariant();
        
        // Create a friendly message in markdown format
        var markdown = $@"# No Markdown Files Found

The folder **{folderName}** does not contain any Markdown files.

## What you can do:

- **Open a different folder** using `Ctrl+O` or the File menu
- **Open a specific file** using `Ctrl+Shift+O`
- Add `.md`, `.markdown`, or `.mdx` files to this folder

---

**Folder path:** `{folderPath}`
";

        var request = new RenderRequest(
            markdown,
            folderPath,
            null,
            null,
            resolvedTheme);

        var renderResult = await _renderer.RenderAsync(request);

        await Dispatcher.InvokeAsync(() =>
        {
            if (!string.IsNullOrEmpty(renderResult.TempFilePath) && File.Exists(renderResult.TempFilePath))
            {
                _webViewHost.NavigateToFile(renderResult.TempFilePath);
            }
            else
            {
                _webViewHost.NavigateToString(renderResult.Html);
            }
            
            Title = "MarkRead - No Markdown Files";
        });

        await _webViewHost.WaitForReadyAsync();
        UpdateNavigationHistoryState();
    }

    private void OnBridgeMessageReceived(object? sender, WebViewBridgeEventArgs e)
    {
        var tab = GetCurrentTab();
        if (tab is null) return;

        if (e.Name.Equals("link-click", StringComparison.OrdinalIgnoreCase))
        {
            if (e.Payload is JsonElement element && element.TryGetProperty("href", out var hrefElement))
            {
                var href = hrefElement.GetString();
                if (!string.IsNullOrWhiteSpace(href))
                {
                    _ = Dispatcher.InvokeAsync(async () => await HandleLinkNavigationAsync(tab, href!));
                }
            }
        }
        else if (e.Name.Equals("anchor-click", StringComparison.OrdinalIgnoreCase))
        {
            if (e.Payload is JsonElement element && element.TryGetProperty("anchor", out var anchorElement))
            {
                var anchor = anchorElement.GetString();
                if (!string.IsNullOrEmpty(anchor) && _webViewHost is not null)
                {
                    _webViewHost.PostMessage("scroll-to", new { anchor });
                }
            }
        }
        else if (e.Name.Equals("find-result", StringComparison.OrdinalIgnoreCase))
        {
            if (e.Payload is JsonElement element)
            {
                var matchCount = element.TryGetProperty("matchCount", out var matchCountProp) ? matchCountProp.GetInt32() : 0;
                var currentIndex = element.TryGetProperty("currentIndex", out var currentIndexProp) ? currentIndexProp.GetInt32() : -1;

                _ = Dispatcher.InvokeAsync(() =>
                {
                    FindBar.UpdateMatchCount(currentIndex, matchCount);
                    var history = _historyService.GetOrCreate(tab.Id);
                    history.SearchMatchCount = matchCount;
                    history.SearchCurrentIndex = currentIndex;
                });
            }
        }
    }

    private void OnLinkClicked(object? sender, LinkClickEventArgs e)
    {
        var tab = GetCurrentTab();
        if (tab is null) return;

        if (e.IsCtrlClick)
        {
            _ = Dispatcher.InvokeAsync(async () => await HandleLinkInNewTabAsync(e.Href));
        }
        else
        {
            _ = Dispatcher.InvokeAsync(async () => await HandleLinkNavigationAsync(tab, e.Href));
        }
    }

    private void OnAnchorClicked(object? sender, AnchorClickEventArgs e)
    {
        var tab = GetCurrentTab();
        if (tab is null) return;

        // Push anchor navigation to history
        if (!string.IsNullOrEmpty(tab.DocumentPath))
        {
            var history = _historyService.GetOrCreate(tab.Id);
            var entry = new NavigationEntry(tab.DocumentPath, e.Anchor);
            history.Push(entry);
        }
    }

    private async Task HandleLinkNavigationAsync(TabItemModel tab, string href)
    {
        if (_currentRoot is null || string.IsNullOrEmpty(tab.DocumentPath))
        {
            return;
        }

        var result = _linkResolver.Resolve(href, _currentRoot, tab.DocumentPath);

        if (result.IsBlocked)
        {
            var message = result.Message ?? "This link cannot be opened.";
            System.Windows.MessageBox.Show(this, message, "MarkRead", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        if (result.IsAnchor && !string.IsNullOrEmpty(result.Anchor) && _webViewHost is not null)
        {
            _webViewHost.PostMessage("scroll-to", new { anchor = result.Anchor });
            return;
        }

        if (result.IsExternal && result.ExternalUri is not null)
        {
            try
            {
                Process.Start(new ProcessStartInfo(result.ExternalUri.ToString()) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show(this, $"Unable to open link: {ex.Message}", "MarkRead", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            return;
        }

        if (!string.IsNullOrEmpty(result.LocalPath))
        {
            var document = _folderService.TryResolveDocument(_currentRoot, result.LocalPath);
            if (document is DocumentInfo doc)
            {
                await LoadDocumentInTabAsync(tab, doc, result.Anchor);
            }
            else
            {
                System.Windows.MessageBox.Show(this, "Target document could not be resolved within the current root.", "MarkRead", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }
    }

    private async Task HandleLinkInNewTabAsync(string href)
    {
        var currentTab = GetCurrentTab();
        if (_currentRoot is null || currentTab is null || string.IsNullOrEmpty(currentTab.DocumentPath))
        {
            return;
        }

        var result = _linkResolver.Resolve(href, _currentRoot, currentTab.DocumentPath);

        // Only open internal documents in new tabs
        if (result.IsBlocked || result.IsExternal || result.IsAnchor)
        {
            // For blocked, external, or anchor links, handle normally in current tab
            await HandleLinkNavigationAsync(currentTab, href);
            return;
        }

        if (!string.IsNullOrEmpty(result.LocalPath))
        {
            var document = _folderService.TryResolveDocument(_currentRoot, result.LocalPath);
            if (document is DocumentInfo doc)
            {
                // Create new tab
                var tabTitle = Path.GetFileNameWithoutExtension(doc.FullPath);
                var newTab = new TabItemModel(Guid.NewGuid(), tabTitle, doc.FullPath);
                await AddTabAsync(newTab);
                _tabService.SetActiveTab(newTab);
                
                // Load document in new tab
                await LoadDocumentInTabAsync(newTab, doc, result.Anchor);
            }
        }
    }

    private void ExecuteFind()
    {
        var currentTab = GetCurrentTab();
        if (currentTab is null || string.IsNullOrEmpty(currentTab.DocumentPath))
        {
            return;
        }

        FindBar.Show();
    }

    private void OnSearchRequested(object? sender, UI.Find.FindEventArgs e)
    {
        var currentTab = GetCurrentTab();
        if (currentTab is null || _webViewHost is null)
        {
            return;
        }

        var history = _historyService.GetOrCreate(currentTab.Id);
        history.SearchQuery = e.Query;

        if (string.IsNullOrWhiteSpace(e.Query))
        {
            _webViewHost.PostMessage("find-clear", null);
            return;
        }

        _webViewHost.PostMessage("find-start", new { query = e.Query });
    }

    private void OnFindNextRequested(object? sender, EventArgs e)
    {
        if (_webViewHost is not null)
        {
            _webViewHost.PostMessage("find-next", null);
        }
    }

    private void OnFindPreviousRequested(object? sender, EventArgs e)
    {
        if (_webViewHost is not null)
        {
            _webViewHost.PostMessage("find-previous", null);
        }
    }

    private void OnFindCloseRequested(object? sender, EventArgs e)
    {
        if (_webViewHost is not null)
        {
            _webViewHost.PostMessage("find-clear", null);
        }
    }

    private void TabControl_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        // Sync manual tab selection to TabService
        if (e.AddedItems.Count > 0 && e.AddedItems[0] is TabItemModel tab)
        {
            if (_tabService.ActiveTab != tab)
            {
                _tabService.SetActiveTab(tab);
            }
        }
    }

    private void CloseTab_Click(object sender, RoutedEventArgs e)
    {
        if (sender is System.Windows.Controls.Button button && button.Tag is Guid tabId)
        {
            var tab = _tabService.FindTab(tabId);
            if (tab is not null)
            {
                _tabService.CloseTab(tabId);
                // TabClosed event handler will manage UI visibility
            }
        }
    }

    private TabItemModel? GetCurrentTab()
    {
        return _tabService.ActiveTab;
    }

    private void UpdateNavigationHistoryState()
    {
        var currentTab = GetCurrentTab();
        if (currentTab is null)
        {
            _navigationService.UpdateHistoryState(false, false);
            return;
        }

        var history = _historyService.GetOrCreate(currentTab.Id);
        _navigationService.UpdateHistoryState(history.CanGoBack, history.CanGoForward);
    }

    private void ShowStartOverlay(bool visible)
    {
        if (!Dispatcher.CheckAccess())
        {
            _ = Dispatcher.InvokeAsync(() => ShowStartOverlay(visible));
            return;
        }

        // Determine which overlay to show based on whether a folder is loaded
        bool hasFolderLoaded = _currentRoot is not null;

        if (visible)
        {
            _navigationService.ClearCurrentFile();
            _navigationService.UpdateHistoryState(false, false);
            if (hasFolderLoaded)
            {
                // Folder loaded but no file selected - show welcome overlay
                StartScreen.Visibility = Visibility.Collapsed;
                WelcomeOverlay.Visibility = Visibility.Visible;
                SidebarPanel.Visibility = Visibility.Visible;
                SidebarColumn.Width = new GridLength(280); // Restore sidebar when folder is loaded
            }
            else
            {
                // No folder loaded - show start screen and hide sidebar
                StartScreen.Visibility = Visibility.Visible;
                WelcomeOverlay.Visibility = Visibility.Collapsed;
                SidebarPanel.Visibility = Visibility.Collapsed;
                SidebarColumn.Width = new GridLength(0);
            }
            TabBarContainer.Visibility = Visibility.Collapsed;
        }
        else
        {
            // Hide all overlays, show content and sidebar
            StartScreen.Visibility = Visibility.Collapsed;
            WelcomeOverlay.Visibility = Visibility.Collapsed;
            SidebarPanel.Visibility = Visibility.Visible;
            SidebarColumn.Width = new GridLength(280); // Restore to mockup width
            UpdateNavigationHistoryState();
        }
    }

    protected override void OnClosed(EventArgs e)
    {
        base.OnClosed(e);

        // Unsubscribe from theme events
        _themeManager.ThemeChanged -= OnThemeChanged;
        _themeManager.ThemeLoadFailed -= OnThemeLoadFailed;

        // Unsubscribe from TabService events
        _tabService.ActiveTabChanged -= OnActiveTabChanged;
        _tabService.TabClosed -= OnTabClosed;

        _documentWatcher?.Dispose();
        _fileWatcherService.Dispose();
        _webViewHost?.Dispose();
    }

    private void OnActiveTabChanged(object? sender, TabItemModel? e)
    {
        // Sync TabService.ActiveTab to TabControl.SelectedItem
        var tab = e ?? _tabService.ActiveTab;
        if (tab is not null)
        {
            if (this.TabControl.SelectedItem != tab)
            {
                this.TabControl.SelectedItem = tab;
            }
            
            if (!string.IsNullOrEmpty(tab.DocumentPath))
            {
                var doc = new DocumentInfo(tab.DocumentPath, Path.GetFileName(tab.DocumentPath), 0, DateTime.UtcNow);
                _ = LoadDocumentInTabAsync(tab, doc, pushHistory: false);
            }
            else
            {
                _navigationService.ClearCurrentFile();
            }
        }
        else
        {
            _navigationService.ClearCurrentFile();
        }
        
        UpdateNavigationHistoryState();
        CommandManager.InvalidateRequerySuggested();
    }

    private void OnTabClosed(object? sender, TabItemModel e)
    {
        // If no tabs left, show start overlay
        if (_tabService.Tabs.Count == 0)
        {
            ShowStartOverlay(true);
            this.TabBarContainer.Visibility = Visibility.Collapsed;
            this.MarkdownView.Visibility = Visibility.Collapsed;
        }
        else
        {
            UpdateNavigationHistoryState();
        }
    }

    private async void OnThemeChanged(object? sender, ThemeChangedEventArgs e)
    {
        // Get the color scheme for the theme
        var themeConfig = _themeManager.GetCurrentConfiguration();
        var colorScheme = e.NewTheme == ThemeType.Dark 
            ? themeConfig.DarkColorScheme 
            : themeConfig.LightColorScheme;
        
        // Update WebView2 default background color to prevent white flash
        UpdateWebViewBackgroundColor(colorScheme.Background);
        
        // Apply theme to WebView2 content if available and initialized
        // Do NOT reload the document - just update the theme styling
        if (_webViewHost != null && _webViewHost.IsInitialized)
        {
            var themeName = e.NewTheme.ToString().ToLowerInvariant();
            
            // Inject theme CSS variables into the WebView
            try
            {
                await _webViewHost.InjectThemeFromColorSchemeAsync(themeName, colorScheme);
            }
            catch
            {
                // Theme injection failed, but application can continue
            }
            
            // Also send apply-theme message to update the data-theme attribute on body
            // This ensures both the CSS variables and data-theme attribute are updated
            _webViewHost.PostMessage("apply-theme", new { theme = themeName });
        }
    }

    private void OnThemeLoadFailed(object? sender, ThemeErrorEventArgs e)
    {
        // Log or handle theme loading errors
    }

    /// <summary>
    /// Sets initial WebView2 background color before CoreWebView2 initialization
    /// </summary>
    private void SetInitialWebViewBackground()
    {
        try
        {
            var currentTheme = _themeManager.CurrentTheme;
            var themeConfig = _themeManager.GetCurrentConfiguration();
            var colorScheme = currentTheme == ThemeType.Dark
                ? themeConfig.DarkColorScheme
                : themeConfig.LightColorScheme;

            // Set default background color BEFORE CoreWebView2 initializes
            MarkdownView.DefaultBackgroundColor = colorScheme.Background;
        }
        catch
        {
            // Background color setting failed, but application can continue
        }
    }

    /// <summary>
    /// Updates the WebView2 default background color to prevent white flash during navigation
    /// </summary>
    private void UpdateWebViewBackgroundColor(System.Drawing.Color backgroundColor)
    {
        try
        {
            // Set default background color (works even before CoreWebView2 is initialized)
            MarkdownView.DefaultBackgroundColor = backgroundColor;
            
            // If CoreWebView2 is available, also set the preferred color scheme
            if (MarkdownView?.CoreWebView2 is not null)
            {
                MarkdownView.CoreWebView2.Profile.PreferredColorScheme = 
                    backgroundColor.GetBrightness() < 0.5 
                        ? CoreWebView2PreferredColorScheme.Dark 
                        : CoreWebView2PreferredColorScheme.Light;
            }
        }
        catch
        {
            // Background color update failed, but application can continue
        }
    }

    private void Exit_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }

    // New UI event handlers
    private void SidebarToggle_Click(object sender, RoutedEventArgs e)
    {
        var toggle = sender as ToggleButton;
        if (toggle is not null && SidebarPanel is not null && SidebarColumn is not null)
        {
            if (toggle.IsChecked == true)
            {
                SidebarPanel.Visibility = Visibility.Visible;
                SidebarColumn.Width = new GridLength(300);
            }
            else
            {
                SidebarPanel.Visibility = Visibility.Collapsed;
                SidebarColumn.Width = new GridLength(0);
            }
        }
    }

    private async void ThemeToggle_Click(object sender, RoutedEventArgs e)
    {
        var currentTheme = _themeManager.CurrentTheme;
        var newTheme = currentTheme == ThemeType.Dark ? ThemeType.Light : ThemeType.Dark;

        await _themeManager.ApplyTheme(newTheme);
    }

    private void ExportButton_Click(object sender, RoutedEventArgs e)
    {
        var button = sender as System.Windows.Controls.Button;
        if (button?.ContextMenu is not null)
        {
            button.ContextMenu.PlacementTarget = button;
            button.ContextMenu.Placement = PlacementMode.Bottom;
            button.ContextMenu.IsOpen = true;
        }
    }

    private void Minimize_Click(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Minimized;
    }

    private void Maximize_Click(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState == WindowState.Maximized 
            ? WindowState.Normal 
            : WindowState.Maximized;
    }

    private void Close_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }

    private void HistoryButton_Click(object sender, RoutedEventArgs e)
    {
        // TODO: Implement history dropdown functionality
        // This will show a dropdown with navigation history similar to the mockup
    }

    // UI Helper methods - file path display now handled by NavigationBar

    // Sidebar integration
    private void OnSidebarFileSelected(object? sender, string filePath)
    {
        if (_currentRoot is null || string.IsNullOrEmpty(filePath))
        {
            return;
        }

        // Resolve the document from the file path
        var document = _folderService.TryResolveDocument(_currentRoot, filePath);
        if (document is DocumentInfo doc)
        {
            // Check if the file is already open in a tab
            var existingTab = _tabService.Tabs.FirstOrDefault(t => t.DocumentPath == filePath);
            if (existingTab is not null)
            {
                // Just activate the existing tab
                _tabService.SetActiveTab(existingTab);
                return;
            }

            // Ensure tab bar and content are visible
            ShowStartOverlay(false);
            TabBarContainer.Visibility = Visibility.Visible;
            MarkdownView.Visibility = Visibility.Visible;

            // Create a new tab for the file
            var tabTitle = Path.GetFileNameWithoutExtension(doc.FullPath);
            var newTab = new TabItemModel(Guid.NewGuid(), tabTitle, doc.FullPath);
            
            _ = Task.Run(async () =>
            {
                await Dispatcher.InvokeAsync(async () =>
                {
                    await AddTabAsync(newTab);
                    _tabService.SetActiveTab(newTab);
                    await LoadDocumentInTabAsync(newTab, doc);
                });
            });
        }
    }

    // NavigationBar event handlers
    private void NavigationBar_MenuRequested(object? sender, EventArgs e)
    {
        // Toggle sidebar visibility
        if (SidebarPanel.Visibility == Visibility.Visible)
        {
            SidebarPanel.Visibility = Visibility.Collapsed;
            SidebarColumn.Width = new GridLength(0);
        }
        else
        {
            SidebarPanel.Visibility = Visibility.Visible;
            SidebarColumn.Width = new GridLength(280);
        }
    }

    private void NavigationBar_SearchRequested(object? sender, EventArgs e)
    {
        FindBar?.Show();
    }

    private void NavigationBar_ExportRequested(object? sender, EventArgs e)
    {
        // TODO: Show export dropdown menu
        // For now, just show a placeholder message
        WpfMessageBox.Show("Export functionality coming soon", "Export", MessageBoxButton.OK);
    }
}
