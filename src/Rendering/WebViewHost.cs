using System;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace MarkRead.App.Rendering;

public sealed class WebViewHost : IDisposable
{
    private readonly WebView2 _webView;
    private readonly string _virtualHostName;
    private readonly string _assetRoot;
    private readonly JsonSerializerOptions _serializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private CoreWebView2? _core;
    private TaskCompletionSource<bool>? _readyCompletionSource;
    private bool _disposed;

    public WebViewHost(WebView2 webView, string assetRootRelativePath, string virtualHostName = "appassets")
    {
        _webView = webView ?? throw new ArgumentNullException(nameof(webView));
        _virtualHostName = virtualHostName;
        _assetRoot = ResolveAssetRoot(assetRootRelativePath);
    }

    public event EventHandler<WebViewBridgeEventArgs>? BridgeMessageReceived;

    public CoreWebView2? Core => _core;

    public bool IsInitialized => _core is not null;

    public Task InitializeAsync()
    {
        ThrowIfDisposed();
        return EnsureInitializedAsync();
    }

    public async Task WaitForReadyAsync(CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        await EnsureInitializedAsync().ConfigureAwait(false);
        if (_readyCompletionSource is null)
        {
            _readyCompletionSource = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        }

        using var registration = cancellationToken.Register(() => _readyCompletionSource.TrySetCanceled(cancellationToken));
        await _readyCompletionSource.Task.ConfigureAwait(false);
    }

    public void PostMessage(string name, object? payload = null)
    {
        ThrowIfDisposed();
        if (_core is null)
        {
            throw new InvalidOperationException("WebView2 has not been initialized.");
        }

        var message = new BridgeMessage(name, payload);
        var json = JsonSerializer.Serialize(message, _serializerOptions);
        _core.PostWebMessageAsJson(json);
    }

    public void NavigateToString(string html)
    {
        ThrowIfDisposed();
        if (_core is null)
        {
            throw new InvalidOperationException("WebView2 has not been initialized.");
        }

        _core.NavigateToString(html);
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        if (_core is not null)
        {
            _core.WebMessageReceived -= OnWebMessageReceived;
            _core.NavigationCompleted -= OnNavigationCompleted;
        }

        _disposed = true;
    }

    private async Task EnsureInitializedAsync()
    {
        if (_core is not null)
        {
            return;
        }

        await _webView.EnsureCoreWebView2Async();
        _core = _webView.CoreWebView2 ?? throw new InvalidOperationException("Unable to acquire CoreWebView2 instance.");

        _core.Settings.AreDefaultContextMenusEnabled = false;
        _core.Settings.AreDevToolsEnabled = true;
        _core.Settings.IsZoomControlEnabled = false;
        _core.Settings.AreBrowserAcceleratorKeysEnabled = true;

        _core.SetVirtualHostNameToFolderMapping(_virtualHostName, _assetRoot, CoreWebView2HostResourceAccessKind.Allow);

        _core.WebMessageReceived += OnWebMessageReceived;
        _core.NavigationCompleted += OnNavigationCompleted;
    }

    private void OnNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (!e.IsSuccess)
        {
            return;
        }

        _readyCompletionSource ??= new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        if (!_readyCompletionSource.Task.IsCompleted)
        {
            _readyCompletionSource.TrySetResult(true);
        }
    }

    private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        BridgeMessage? message = null;
        try
        {
            message = JsonSerializer.Deserialize<BridgeMessage>(e.WebMessageAsJson, _serializerOptions);
        }
        catch
        {
            // Ignore malformed messages.
        }

        if (message is null || string.IsNullOrWhiteSpace(message.Name))
        {
            return;
        }

        if (message.Name.Equals("ready", StringComparison.OrdinalIgnoreCase))
        {
            _readyCompletionSource ??= new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            if (!_readyCompletionSource.Task.IsCompleted)
            {
                _readyCompletionSource.TrySetResult(true);
            }
            return;
        }

        BridgeMessageReceived?.Invoke(this, new WebViewBridgeEventArgs(message.Name, message.Payload));
    }

    private static string ResolveAssetRoot(string assetRootRelativePath)
    {
        if (string.IsNullOrWhiteSpace(assetRootRelativePath))
        {
            throw new ArgumentException("Asset root path must be provided.", nameof(assetRootRelativePath));
        }

        var baseDirectory = AppContext.BaseDirectory;
        return Path.GetFullPath(Path.Combine(baseDirectory, assetRootRelativePath));
    }

    private void ThrowIfDisposed()
    {
        if (_disposed)
        {
            throw new ObjectDisposedException(nameof(WebViewHost));
        }
    }

    private sealed record BridgeMessage(string Name, object? Payload);
}

public sealed class WebViewBridgeEventArgs : EventArgs
{
    public WebViewBridgeEventArgs(string name, object? payload)
    {
        Name = name;
        Payload = payload;
    }

    public string Name { get; }

    public object? Payload { get; }
}
