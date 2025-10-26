using System;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

using MarkRead.App.Rendering;
using MarkRead.App.Services;
using MarkRead.App.UI.Shell;
using MarkRead.App.UI.Start;
using MarkRead.Cli;

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
    private readonly SettingsService _settingsService = new();
    private readonly HistoryService _historyService = new();
    private readonly FileWatcherService _fileWatcherService = new();
    private readonly Renderer _renderer;
    private readonly LinkResolver _linkResolver;
    private readonly OpenFolderCommand _openFolderCommand;

    private FolderRoot? _currentRoot;
    private IDisposable? _documentWatcher;
    private StartupArguments _startupArguments = StartupArguments.Empty;
    private ViewerSettings _currentSettings = ViewerSettings.Default();
    private ObservableCollection<TabItemModel> _tabs = new();

    public MainWindow()
    {
        InitializeComponent();

        _renderer = new Renderer(_markdownService, _sanitizer);
        _linkResolver = new LinkResolver(_folderService);
        _openFolderCommand = new OpenFolderCommand(_folderService);

        this.TabControl.ItemsSource = _tabs;

        // Wire up FindBar events
        FindBar.SearchRequested += OnSearchRequested;
        FindBar.NextRequested += OnFindNextRequested;
        FindBar.PreviousRequested += OnFindPreviousRequested;
        FindBar.CloseRequested += OnFindCloseRequested;

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
        await InitializeFromStartupAsync();
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
        ShowStartOverlay(false);
        var result = _openFolderCommand.Execute(this);
        if (result is null)
        {
            if (_tabs.Count == 0)
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
            if (_tabs.Count == 0)
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

        // Create initial tab if no tabs exist
        if (_tabs.Count == 0)
        {
            var initialTab = new TabItemModel(Guid.NewGuid(), result.Root.DisplayName);
            await AddTabAsync(initialTab);
        }

        // Show tabs and load document
        this.TabControl.Visibility = Visibility.Visible;
        ShowStartOverlay(false);

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
            ShowStartOverlay(true);
            System.Windows.MessageBox.Show(this, "No Markdown files were found in the selected folder.", "MarkRead", MessageBoxButton.OK, MessageBoxImage.Information);
        }
    }

    private async Task AddTabAsync(TabItemModel tab)
    {
        // Create and initialize the content control
        var content = new UI.Tabs.TabContentControl();
        await content.InitializeAsync();
        
        // Wire up events for this tab's WebViewHost
        if (content.Host is not null)
        {
            content.Host.BridgeMessageReceived += (s, e) => OnBridgeMessageReceived(tab, s, e);
            content.Host.LinkClicked += (s, e) => OnLinkClicked(tab, s, e);
            content.Host.AnchorClicked += (s, e) => OnAnchorClicked(tab, s, e);
        }

        tab.Content = content;
        _tabs.Add(tab);
        this.TabControl.SelectedItem = tab;
    }

    private async Task LoadDocumentInTabAsync(TabItemModel tab, DocumentInfo document, string? anchor = null, bool pushHistory = true)
    {
        if (_currentRoot is null || tab.Content?.Host is null)
        {
            return;
        }

        var webViewHost = tab.Content.Host;

        // Save scroll position before loading new document (if same document being reloaded)
        int scrollPosition = 0;
        bool isReload = tab.DocumentPath == document.FullPath;
        if (isReload)
        {
            scrollPosition = await webViewHost.GetScrollPositionAsync();
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

        string markdown;
        try
        {
            var fileInfo = new FileInfo(document.FullPath);
            bool isLargeFile = fileInfo.Length > 1024 * 1024; // > 1MB

            if (isLargeFile)
            {
                webViewHost.ShowLoadingIndicator();
            }

            markdown = await File.ReadAllTextAsync(document.FullPath);

            if (isLargeFile)
            {
                webViewHost.HideLoadingIndicator();
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
            webViewHost.NavigateToString(renderResult.Html);
            Title = $"MarkRead - {renderResult.Title}";
            SubscribeToDocumentChanges(tab, document);
        });

        await webViewHost.WaitForReadyAsync();

        // Restore scroll position for reloads, or navigate to anchor
        if (isReload && scrollPosition > 0 && string.IsNullOrEmpty(anchor))
        {
            webViewHost.RestoreScrollPosition(scrollPosition);
        }
        else if (!string.IsNullOrEmpty(anchor))
        {
            webViewHost.PostMessage("scroll-to", new { anchor });
        }
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

    private void OnBridgeMessageReceived(TabItemModel tab, object? sender, WebViewBridgeEventArgs e)
    {
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
                if (!string.IsNullOrEmpty(anchor) && tab.Content?.Host is not null)
                {
                    tab.Content.Host.PostMessage("scroll-to", new { anchor });
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

    private void OnLinkClicked(TabItemModel tab, object? sender, LinkClickEventArgs e)
    {
        if (e.IsCtrlClick)
        {
            _ = Dispatcher.InvokeAsync(async () => await HandleLinkInNewTabAsync(e.Href));
        }
        else
        {
            _ = Dispatcher.InvokeAsync(async () => await HandleLinkNavigationAsync(tab, e.Href));
        }
    }

    private void OnAnchorClicked(TabItemModel tab, object? sender, AnchorClickEventArgs e)
    {
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

        if (result.IsAnchor && !string.IsNullOrEmpty(result.Anchor) && tab.Content?.Host is not null)
        {
            tab.Content.Host.PostMessage("scroll-to", new { anchor = result.Anchor });
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
        if (currentTab is null || currentTab.Content?.Host is null)
        {
            return;
        }

        var history = _historyService.GetOrCreate(currentTab.Id);
        history.SearchQuery = e.Query;

        if (string.IsNullOrWhiteSpace(e.Query))
        {
            currentTab.Content.Host.PostMessage("find-clear", null);
            return;
        }

        currentTab.Content.Host.PostMessage("find-start", new { query = e.Query });
    }

    private void OnFindNextRequested(object? sender, EventArgs e)
    {
        var currentTab = GetCurrentTab();
        if (currentTab?.Content?.Host is not null)
        {
            currentTab.Content.Host.PostMessage("find-next", null);
        }
    }

    private void OnFindPreviousRequested(object? sender, EventArgs e)
    {
        var currentTab = GetCurrentTab();
        if (currentTab?.Content?.Host is not null)
        {
            currentTab.Content.Host.PostMessage("find-previous", null);
        }
    }

    private void OnFindCloseRequested(object? sender, EventArgs e)
    {
        var currentTab = GetCurrentTab();
        if (currentTab?.Content?.Host is not null)
        {
            currentTab.Content.Host.PostMessage("find-clear", null);
        }
    }

    private void TabControl_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        // Tab switching is now just visibility changes - no re-rendering needed!
        // Each tab maintains its own WebView2 instance and state
        CommandManager.InvalidateRequerySuggested();
    }

    private void CloseTab_Click(object sender, RoutedEventArgs e)
    {
        if (sender is System.Windows.Controls.Button button && button.Tag is Guid tabId)
        {
            var tab = _tabs.FirstOrDefault(t => t.Id == tabId);
            if (tab is not null)
            {
                // Dispose the content control
                tab.Content?.Dispose();
                
                // Remove from collection
                var index = _tabs.IndexOf(tab);
                _tabs.Remove(tab);

                // If this was the last tab, show start overlay
                if (_tabs.Count == 0)
                {
                    ShowStartOverlay(true);
                    this.TabControl.Visibility = Visibility.Collapsed;
                }
                else if (index >= 0)
                {
                    // Select adjacent tab
                    var newIndex = Math.Min(index, _tabs.Count - 1);
                    this.TabControl.SelectedItem = _tabs[newIndex];
                }
            }
        }
    }

    private TabItemModel? GetCurrentTab()
    {
        return this.TabControl.SelectedItem as TabItemModel;
    }

    private void ShowStartOverlay(bool visible)
    {
        if (!Dispatcher.CheckAccess())
        {
            _ = Dispatcher.InvokeAsync(() => ShowStartOverlay(visible));
            return;
        }

        StartOverlay.Visibility = visible ? Visibility.Visible : Visibility.Collapsed;
        if (visible)
        {
            this.TabControl.Visibility = Visibility.Collapsed;
        }
    }

    protected override void OnClosed(EventArgs e)
    {
        base.OnClosed(e);

        _documentWatcher?.Dispose();
        _fileWatcherService.Dispose();
        
        // Dispose all tab content controls
        foreach (var tab in _tabs)
        {
            tab.Content?.Dispose();
        }
    }

    private void Exit_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }
}
