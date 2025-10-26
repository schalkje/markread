using System;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;

using MarkRead.App.Rendering;
using MarkRead.App.Services;
using MarkRead.App.UI.Shell;
using MarkRead.App.UI.Start;
using MarkRead.App.UI.Tabs;
using MarkRead.Cli;

using Microsoft.Web.WebView2.Core;

using AppNavigationCommands = MarkRead.App.UI.Shell.NavigationCommands;

namespace MarkRead.App;

/// <summary>
/// Interaction logic for the shell window hosting the WebView renderer.
/// </summary>
public partial class MainWindow : Window
{
    private readonly FolderService _folderService = new();
    private readonly MarkdownService _markdownService = new();
    private readonly HtmlSanitizerService _sanitizer = new();
    private readonly SettingsService _settingsService = new();
    private readonly HistoryService _historyService = new();
    private readonly FileWatcherService _fileWatcherService = new();
    private readonly Renderer _renderer;
    private readonly WebViewHost _webViewHost;
    private readonly LinkResolver _linkResolver;
    private readonly OpenFolderCommand _openFolderCommand;

    private FolderRoot? _currentRoot;
    private DocumentInfo? _currentDocument;
    private IDisposable? _documentWatcher;
    private StartupArguments _startupArguments = StartupArguments.Empty;
    private bool _isInitialized;
    private Guid _currentTabId = Guid.NewGuid(); // Single tab for now, will be expanded in US3
    private NavigationHistory? _currentHistory;
    private ViewerSettings _currentSettings = ViewerSettings.Default();

    public MainWindow()
    {
        InitializeComponent();

        _renderer = new Renderer(_markdownService, _sanitizer);
        _webViewHost = new WebViewHost(MarkdownView, Path.Combine("Rendering", "assets"));
        _webViewHost.BridgeMessageReceived += OnBridgeMessageReceived;
        _webViewHost.LinkClicked += OnLinkClicked;
        _webViewHost.AnchorClicked += OnAnchorClicked;

        _linkResolver = new LinkResolver(_folderService);
        _openFolderCommand = new OpenFolderCommand(_folderService);
        _currentHistory = _historyService.GetOrCreate(_currentTabId);

        // Wire up FindBar events
        FindBar.SearchRequested += OnSearchRequested;
        FindBar.NextRequested += OnFindNextRequested;
        FindBar.PreviousRequested += OnFindPreviousRequested;
        FindBar.CloseRequested += OnFindCloseRequested;

        // Wire up TabsBar events
        TabsBar.TabActivated += OnTabActivated;
        TabsBar.TabClosed += OnTabClosed;
        TabsBar.TabCreated += OnTabCreated;

        CommandBindings.Add(new CommandBinding(App.OpenFolderCommand, async (_, _) => await ExecuteOpenFolderAsync(), CanExecuteWhenInteractive));
        CommandBindings.Add(new CommandBinding(App.OpenFileCommand, async (_, _) => await ExecuteOpenFileAsync(), CanExecuteWhenInteractive));
        CommandBindings.Add(new CommandBinding(StartCommands.OpenFolder, async (_, _) => await ExecuteOpenFolderAsync(), CanExecuteWhenInteractive));
        CommandBindings.Add(new CommandBinding(StartCommands.OpenFile, async (_, _) => await ExecuteOpenFileAsync(), CanExecuteWhenInteractive));
        CommandBindings.Add(new CommandBinding(AppNavigationCommands.GoBack, async (_, _) => await ExecuteGoBackAsync(), CanExecuteGoBack));
        CommandBindings.Add(new CommandBinding(AppNavigationCommands.GoForward, async (_, _) => await ExecuteGoForwardAsync(), CanExecuteGoForward));
        CommandBindings.Add(new CommandBinding(App.FindInDocumentCommand, (_, _) => ExecuteFind(), CanExecuteWhenInteractive));
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
        
        // Apply saved theme
        var theme = _currentSettings.Theme.ToLowerInvariant() switch
        {
            "dark" => ThemeManager.AppTheme.Dark,
            "light" => ThemeManager.AppTheme.Light,
            _ => ThemeManager.AppTheme.System
        };
        ThemeManager.ApplyTheme(theme);
    }

    private async void Window_Loaded(object sender, RoutedEventArgs e)
    {
    await EnsureWebViewAsync();
    await InitializeFromStartupAsync();
    }

    private async Task EnsureWebViewAsync()
    {
        if (_isInitialized)
        {
            return;
        }

    await _webViewHost.InitializeAsync();
        _isInitialized = true;
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
        e.CanExecute = _currentHistory?.CanGoBack ?? false;
        e.Handled = true;
    }

    private void CanExecuteGoForward(object sender, CanExecuteRoutedEventArgs e)
    {
        e.CanExecute = _currentHistory?.CanGoForward ?? false;
        e.Handled = true;
    }

    public void ExecuteOpenFolder()
    {
        System.Diagnostics.Debug.WriteLine("ExecuteOpenFolder called!");
        _ = ExecuteOpenFolderAsync();
    }

    public void ExecuteOpenFile()
    {
        System.Diagnostics.Debug.WriteLine("ExecuteOpenFile called!");
        _ = ExecuteOpenFileAsync();
    }

    private async Task ExecuteGoBackAsync()
    {
        if (_currentHistory is null || !_currentHistory.CanGoBack)
        {
            return;
        }

        var entry = _currentHistory.GoBack();
        if (entry is null || _currentRoot is null)
        {
            return;
        }

        var document = _folderService.TryResolveDocument(_currentRoot, entry.Value.DocumentPath);
        if (document is DocumentInfo doc)
        {
            await LoadDocumentAsync(doc, entry.Value.Anchor, pushHistory: false);
        }
    }

    private async Task ExecuteGoForwardAsync()
    {
        if (_currentHistory is null || !_currentHistory.CanGoForward)
        {
            return;
        }

        var entry = _currentHistory.GoForward();
        if (entry is null || _currentRoot is null)
        {
            return;
        }

        var document = _folderService.TryResolveDocument(_currentRoot, entry.Value.DocumentPath);
        if (document is DocumentInfo doc)
        {
            await LoadDocumentAsync(doc, entry.Value.Anchor, pushHistory: false);
        }
    }

    private async Task ExecuteOpenFolderAsync()
    {
        ShowStartOverlay(false);
        var result = _openFolderCommand.Execute(this);
        if (result is null)
        {
            if (_currentDocument is null)
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
            if (_currentDocument is null)
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

        // Show tabs bar and create initial tab
        TabsBar.Visibility = Visibility.Visible;
        if (TabsBar.Tabs.Count == 0)
        {
            var initialTab = new TabItem(Guid.NewGuid(), result.Root.DisplayName);
            TabsBar.Tabs.Add(initialTab);
            TabsBar.ActiveTab = initialTab;
            _currentTabId = initialTab.Id;
            _currentHistory = _historyService.GetOrCreate(_currentTabId);
        }

        if (result.DefaultDocument is DocumentInfo doc)
        {
            await LoadDocumentAsync(doc);
        }
        else
        {
            ShowStartOverlay(true);
            System.Windows.MessageBox.Show(this, "No Markdown files were found in the selected folder.", "MarkRead", MessageBoxButton.OK, MessageBoxImage.Information);
        }
    }

    private async Task LoadDocumentAsync(DocumentInfo document, string? anchor = null, bool pushHistory = true)
    {
        if (_currentRoot is null)
        {
            return;
        }

        // Save scroll position before loading new document (if same document being reloaded)
        int scrollPosition = 0;
        bool isReload = _currentDocument.HasValue && _currentDocument.Value.FullPath == document.FullPath;
        if (isReload)
        {
            scrollPosition = await _webViewHost.GetScrollPositionAsync();
        }

        _currentDocument = document;
        ShowStartOverlay(false);

        // Push to history before loading
        if (pushHistory && _currentHistory is not null)
        {
            var entry = new NavigationEntry(document.FullPath, anchor);
            _currentHistory.Push(entry);
        }

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
            System.Windows.MessageBox.Show(this, $"Unable to read document: {ex.Message}", "MarkRead", MessageBoxButton.OK, MessageBoxImage.Error);
            return;
        }

        var request = new RenderRequest(
            markdown,
            document.FullPath,
            document.RelativePath,
            anchor,
            ThemeManager.Current.ToString().ToLowerInvariant());

        var renderResult = await _renderer.RenderAsync(request);

        await Dispatcher.InvokeAsync(() =>
        {
            _webViewHost.NavigateToString(renderResult.Html);
            Title = $"MarkRead - {renderResult.Title}";
            SubscribeToDocumentChanges(document);
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
    }

    private void SubscribeToDocumentChanges(DocumentInfo document)
    {
        _documentWatcher?.Dispose();
        _documentWatcher = _fileWatcherService.Watch(document.FullPath, _ =>
        {
            Dispatcher.InvokeAsync(async () => await ReloadCurrentDocumentAsync());
        });
    }

    private async Task ReloadCurrentDocumentAsync()
    {
        if (_currentDocument is DocumentInfo doc)
        {
            await LoadDocumentAsync(doc);
        }
    }

    private void OnBridgeMessageReceived(object? sender, WebViewBridgeEventArgs e)
    {
        if (e.Name.Equals("link-click", StringComparison.OrdinalIgnoreCase))
        {
            if (e.Payload is JsonElement element && element.TryGetProperty("href", out var hrefElement))
            {
                var href = hrefElement.GetString();
                if (!string.IsNullOrWhiteSpace(href))
                {
                    _ = Dispatcher.InvokeAsync(async () => await HandleLinkNavigationAsync(href!));
                }
            }
        }
        else if (e.Name.Equals("anchor-click", StringComparison.OrdinalIgnoreCase))
        {
            if (e.Payload is JsonElement element && element.TryGetProperty("anchor", out var anchorElement))
            {
                var anchor = anchorElement.GetString();
                if (!string.IsNullOrEmpty(anchor))
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
                    if (_currentHistory is not null)
                    {
                        _currentHistory.SearchMatchCount = matchCount;
                        _currentHistory.SearchCurrentIndex = currentIndex;
                    }
                });
            }
        }
    }

    private void OnLinkClicked(object? sender, LinkClickEventArgs e)
    {
        if (e.IsCtrlClick)
        {
            _ = Dispatcher.InvokeAsync(async () => await HandleLinkInNewTabAsync(e.Href));
        }
        else
        {
            _ = Dispatcher.InvokeAsync(async () => await HandleLinkNavigationAsync(e.Href));
        }
    }

    private void OnAnchorClicked(object? sender, AnchorClickEventArgs e)
    {
        // Push anchor navigation to history
        if (_currentDocument is not null && _currentHistory is not null)
        {
            var entry = new NavigationEntry(_currentDocument.Value.FullPath, e.Anchor);
            _currentHistory.Push(entry);
        }
    }

    private async Task HandleLinkNavigationAsync(string href)
    {
        if (_currentRoot is null || _currentDocument is null)
        {
            return;
        }

        var result = _linkResolver.Resolve(href, _currentRoot, _currentDocument.Value.FullPath);

        if (result.IsBlocked)
        {
            var message = result.Message ?? "This link cannot be opened.";
            System.Windows.MessageBox.Show(this, message, "MarkRead", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        if (result.IsAnchor && !string.IsNullOrEmpty(result.Anchor))
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
                await LoadDocumentAsync(doc, result.Anchor);
            }
            else
            {
                System.Windows.MessageBox.Show(this, "Target document could not be resolved within the current root.", "MarkRead", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }
    }

    private async Task HandleLinkInNewTabAsync(string href)
    {
        if (_currentRoot is null || _currentDocument is null)
        {
            return;
        }

        var result = _linkResolver.Resolve(href, _currentRoot, _currentDocument.Value.FullPath);

        // Only open internal documents in new tabs
        if (result.IsBlocked || result.IsExternal || result.IsAnchor)
        {
            // For blocked, external, or anchor links, handle normally
            await HandleLinkNavigationAsync(href);
            return;
        }

        if (!string.IsNullOrEmpty(result.LocalPath))
        {
            var document = _folderService.TryResolveDocument(_currentRoot, result.LocalPath);
            if (document is DocumentInfo doc)
            {
                // Create new tab
                var newTabId = Guid.NewGuid();
                var tabTitle = Path.GetFileNameWithoutExtension(doc.FullPath);
                var newTab = new TabItem(newTabId, tabTitle, doc.FullPath);
                TabsBar.Tabs.Add(newTab);
                TabsBar.ActiveTab = newTab; // Set as active tab
                
                // Switch to new tab
                _currentTabId = newTabId;
                _currentHistory = _historyService.GetOrCreate(_currentTabId);
                
                // Load document in new tab
                await LoadDocumentAsync(doc, result.Anchor);
            }
        }
    }

    private void ExecuteFind()
    {
        if (_currentDocument is null)
        {
            return;
        }

        FindBar.Show();
    }

    private void OnSearchRequested(object? sender, UI.Find.FindEventArgs e)
    {
        if (_currentHistory is not null)
        {
            _currentHistory.SearchQuery = e.Query;
        }

        if (string.IsNullOrWhiteSpace(e.Query))
        {
            _webViewHost.PostMessage("find-clear", null);
            return;
        }

        _webViewHost.PostMessage("find-start", new { query = e.Query });
    }

    private void OnFindNextRequested(object? sender, EventArgs e)
    {
        _webViewHost.PostMessage("find-next", null);
    }

    private void OnFindPreviousRequested(object? sender, EventArgs e)
    {
        _webViewHost.PostMessage("find-previous", null);
    }

    private void OnFindCloseRequested(object? sender, EventArgs e)
    {
        _webViewHost.PostMessage("find-clear", null);
    }

    private void OnTabActivated(object? sender, UI.Tabs.TabEventArgs e)
    {
        _ = Dispatcher.InvokeAsync(async () => await SwitchToTabAsync(e.Tab));
    }

    private void OnTabClosed(object? sender, UI.Tabs.TabEventArgs e)
    {
        // Tab was already removed from the collection by TabsView
        // If this was the active tab, TabsView already activated another tab
        // We just need to handle the case where all tabs are closed
        if (TabsBar.Tabs.Count == 0)
        {
            _currentDocument = null;
            _currentHistory = null;
            ShowStartOverlay(true);
            TabsBar.Visibility = Visibility.Collapsed;
        }
    }

    private void OnTabCreated(object? sender, UI.Tabs.TabEventArgs e)
    {
        // New tab created from the "+" button
        // For now, just show empty state - user can open a file
        _currentTabId = e.Tab.Id;
        _currentHistory = _historyService.GetOrCreate(_currentTabId);
    }

    private async Task SwitchToTabAsync(TabItem tab)
    {
        // Switch to the selected tab
        _currentTabId = tab.Id;
        _currentHistory = _historyService.GetOrCreate(_currentTabId);

        // Load the document if the tab has one
        if (!string.IsNullOrEmpty(tab.DocumentPath) && _currentRoot is not null)
        {
            var document = _folderService.TryResolveDocument(_currentRoot, tab.DocumentPath);
            if (document is DocumentInfo doc)
            {
                await LoadDocumentAsync(doc, pushHistory: false);
            }
        }
        else if (_currentHistory.Current is not null)
        {
            // Load from history
            var entry = _currentHistory.Current.Value;
            if (_currentRoot is not null)
            {
                var document = _folderService.TryResolveDocument(_currentRoot, entry.DocumentPath);
                if (document is DocumentInfo doc)
                {
                    await LoadDocumentAsync(doc, entry.Anchor, pushHistory: false);
                }
            }
        }
        else
        {
            // Empty tab
            ShowStartOverlay(true);
        }
    }

    private void ShowStartOverlay(bool visible)
    {
        if (!Dispatcher.CheckAccess())
        {
            _ = Dispatcher.InvokeAsync(() => ShowStartOverlay(visible));
            return;
        }

        StartOverlay.Visibility = visible ? Visibility.Visible : Visibility.Collapsed;
        MarkdownView.Visibility = visible ? Visibility.Collapsed : Visibility.Visible;
    }

    protected override void OnClosed(EventArgs e)
    {
        base.OnClosed(e);

        _documentWatcher?.Dispose();
        _fileWatcherService.Dispose();
        _webViewHost.Dispose();
    }

    private void Exit_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }
}