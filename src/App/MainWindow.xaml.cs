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

        CommandBindings.Add(new CommandBinding(App.OpenFolderCommand, async (_, _) => await ExecuteOpenFolderAsync(), CanExecuteWhenInteractive));
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
    Title = $"MarkRead - {result.Root.DisplayName}";

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
            markdown = await File.ReadAllTextAsync(document.FullPath);
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

        if (!string.IsNullOrEmpty(anchor))
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
        _ = Dispatcher.InvokeAsync(async () => await HandleLinkNavigationAsync(e.Href));
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
}