using System;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;

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
    
    // Performance optimization: Cache last injected theme to avoid redundant CSS injection
    private string? _lastInjectedTheme;

    public WebViewHost(WebView2 webView, string assetRootRelativePath, string virtualHostName = "appassets")
    {
        _webView = webView ?? throw new ArgumentNullException(nameof(webView));
        _virtualHostName = virtualHostName;
        _assetRoot = ResolveAssetRoot(assetRootRelativePath);
    }

    public event EventHandler<WebViewBridgeEventArgs>? BridgeMessageReceived;
    public event EventHandler<LinkClickEventArgs>? LinkClicked;
    public event EventHandler<AnchorClickEventArgs>? AnchorClicked;

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

    public async Task<int> GetScrollPositionAsync()
    {
        ThrowIfDisposed();
        if (_core is null)
        {
            return 0;
        }

        try
        {
            var result = await _core.ExecuteScriptAsync("window.scrollY || document.documentElement.scrollTop || 0");
            if (int.TryParse(result, out var position))
            {
                return position;
            }
        }
        catch
        {
            // Ignore errors getting scroll position
        }

        return 0;
    }

    public void RestoreScrollPosition(int position)
    {
        ThrowIfDisposed();
        if (_core is null || position <= 0)
        {
            return;
        }

        PostMessage("restore-scroll", new { position });
    }

    public void ShowLoadingIndicator()
    {
        PostMessage("show-loading", null);
    }

    public void HideLoadingIndicator()
    {
        PostMessage("hide-loading", null);
    }

    /// <summary>
    /// Inject theme CSS custom properties into the WebView2 content
    /// </summary>
    public async Task InjectThemeAsync(string themeName, Dictionary<string, string> themeProperties)
    {
        ThrowIfDisposed();
        if (_core is null)
        {
            throw new InvalidOperationException("WebView2 has not been initialized.");
        }

        // Performance optimization: Skip if same theme already injected
        var themeKey = $"{themeName}:{string.Join(",", themeProperties.Select(kv => $"{kv.Key}={kv.Value}"))}";
        if (_lastInjectedTheme == themeKey)
        {
            return;
        }

        try
        {
            // Build CSS custom properties string
            var cssProperties = new StringBuilder();
            foreach (var property in themeProperties)
            {
                cssProperties.AppendLine($"  --{property.Key}: {property.Value};");
            }

            // Create CSS injection script
            var cssInjectionScript = $@"
                (function() {{
                    // Remove existing theme stylesheets
                    const existingThemeStyles = document.querySelectorAll('style[data-theme-injected]');
                    existingThemeStyles.forEach(style => style.remove());

                    // Create new theme stylesheet
                    const style = document.createElement('style');
                    style.setAttribute('data-theme-injected', 'true');
                    style.setAttribute('data-theme-name', '{themeName}');
                    style.textContent = `
                        :root {{
{cssProperties}
                        }}
                        
                        /* Add theme-specific class to body */
                        body {{
                            color-scheme: {(themeName.Contains("dark", StringComparison.OrdinalIgnoreCase) ? "dark" : "light")};
                        }}
                    `;
                    
                    // Add to document head
                    document.head.appendChild(style);
                    
                    // Update body class for theme detection
                    document.body.classList.remove('theme-light', 'theme-dark', 'theme-system');
                    document.body.classList.add('theme-{themeName.ToLowerInvariant()}');
                    
                    // Dispatch theme change event for JavaScript listeners
                    const themeEvent = new CustomEvent('themeChanged', {{
                        detail: {{ theme: '{themeName}', properties: {JsonSerializer.Serialize(themeProperties)} }}
                    }});
                    document.dispatchEvent(themeEvent);
                    
                    // Return success indicator
                    return true;
                }})();
            ";

            // Execute the injection script
            var result = await _core.ExecuteScriptAsync(cssInjectionScript);
            
            // Verify injection success
            if (result != "true")
            {
                throw new InvalidOperationException($"Theme injection failed: {result}");
            }
            
            // Cache the successfully injected theme
            _lastInjectedTheme = themeKey;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to inject theme '{themeName}': {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Inject theme from MarkRead Services color scheme
    /// </summary>
    public async Task InjectThemeFromColorSchemeAsync(string themeName, MarkRead.Services.ColorScheme colorScheme)
    {
        ThrowIfDisposed();
        
        // Convert ColorScheme to CSS custom properties
        var themeProperties = new Dictionary<string, string>
        {
            ["bg-primary"] = ColorToCssHex(colorScheme.Background),
            ["bg-secondary"] = ColorToCssHex(colorScheme.SidebarBackground),
            ["fg-primary"] = ColorToCssHex(colorScheme.Foreground),
            ["accent-color"] = ColorToCssHex(colorScheme.Accent),
            ["border-color"] = ColorToCssHex(colorScheme.Border),
            ["button-bg"] = ColorToCssHex(colorScheme.ButtonBackground),
            ["button-hover"] = ColorToCssHex(colorScheme.ButtonHover),
            ["tab-active-bg"] = ColorToCssHex(colorScheme.TabActiveBackground),
            ["tab-inactive-bg"] = ColorToCssHex(colorScheme.TabInactiveBackground),
            
            // Additional computed colors for better UX
            ["text-muted"] = themeName.Contains("dark", StringComparison.OrdinalIgnoreCase) ? "#a1a1aa" : "#71717a",
            ["text-link"] = ColorToCssHex(colorScheme.Accent),
            ["shadow-color"] = themeName.Contains("dark", StringComparison.OrdinalIgnoreCase) ? "#000000" : "#00000010",
            
            // Markdown-specific theme properties
            ["code-bg"] = themeName.Contains("dark", StringComparison.OrdinalIgnoreCase) ? "#27272a" : "#f4f4f5",
            ["blockquote-border"] = ColorToCssHex(colorScheme.Border),
            ["table-border"] = ColorToCssHex(colorScheme.Border),
            ["table-header-bg"] = ColorToCssHex(colorScheme.ButtonBackground)
        };

        await InjectThemeAsync(themeName, themeProperties);
    }

    /// <summary>
    /// Get current theme information from WebView2
    /// </summary>
    public async Task<string?> GetCurrentThemeAsync()
    {
        ThrowIfDisposed();
        if (_core is null)
        {
            return null;
        }

        try
        {
            var script = @"
                (function() {
                    const themeStyle = document.querySelector('style[data-theme-injected]');
                    return themeStyle ? themeStyle.getAttribute('data-theme-name') : null;
                })();
            ";

            var result = await _core.ExecuteScriptAsync(script);
            return result?.Trim('"'); // Remove JSON string quotes
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Check if theme has been successfully applied to WebView2
    /// </summary>
    public async Task<bool> IsThemeAppliedAsync()
    {
        ThrowIfDisposed();
        if (_core is null)
        {
            return false;
        }

        try
        {
            var script = @"
                (function() {
                    const themeStyle = document.querySelector('style[data-theme-injected]');
                    return themeStyle !== null;
                })();
            ";

            var result = await _core.ExecuteScriptAsync(script);
            return result == "true";
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Convert System.Drawing.Color to CSS hex string
    /// </summary>
    private static string ColorToCssHex(System.Drawing.Color color)
    {
        if (color.A < 255)
        {
            // Include alpha channel for semi-transparent colors
            return $"#{color.R:X2}{color.G:X2}{color.B:X2}{color.A:X2}";
        }
        else
        {
            // Standard hex color for opaque colors
            return $"#{color.R:X2}{color.G:X2}{color.B:X2}";
        }
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

    public void NavigateToFile(string htmlFilePath)
    {
        ThrowIfDisposed();
        if (_core is null)
        {
            throw new InvalidOperationException("WebView2 has not been initialized.");
        }

        if (!File.Exists(htmlFilePath))
        {
            throw new FileNotFoundException("HTML file not found.", htmlFilePath);
        }

        var uri = new Uri(htmlFilePath).AbsoluteUri;
        _core.Navigate(uri);
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

        // Allow local file access when HTML is loaded via NavigateToString
        _core.Settings.IsScriptEnabled = true;

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

        if (message.Name.Equals("link-click", StringComparison.OrdinalIgnoreCase))
        {
            var href = ExtractPayloadString(message.Payload, "href");
            if (!string.IsNullOrWhiteSpace(href))
            {
                LinkClicked?.Invoke(this, new LinkClickEventArgs(href, isCtrlClick: false));
            }
            return;
        }

        if (message.Name.Equals("link-ctrl-click", StringComparison.OrdinalIgnoreCase))
        {
            var href = ExtractPayloadString(message.Payload, "href");
            if (!string.IsNullOrWhiteSpace(href))
            {
                LinkClicked?.Invoke(this, new LinkClickEventArgs(href, isCtrlClick: true));
            }
            return;
        }

        if (message.Name.Equals("anchor-click", StringComparison.OrdinalIgnoreCase))
        {
            var anchor = ExtractPayloadString(message.Payload, "anchor");
            if (!string.IsNullOrWhiteSpace(anchor))
            {
                AnchorClicked?.Invoke(this, new AnchorClickEventArgs(anchor));
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

    private static string? ExtractPayloadString(object? payload, string key)
    {
        if (payload is null)
        {
            return null;
        }

        try
        {
            var json = JsonSerializer.Serialize(payload);
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty(key, out var property))
            {
                return property.GetString();
            }
        }
        catch
        {
            // Ignore extraction errors
        }

        return null;
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

public sealed class LinkClickEventArgs : EventArgs
{
    public LinkClickEventArgs(string href, bool isCtrlClick)
    {
        Href = href;
        IsCtrlClick = isCtrlClick;
    }

    public string Href { get; }

    public bool IsCtrlClick { get; }
}

public sealed class AnchorClickEventArgs : EventArgs
{
    public AnchorClickEventArgs(string anchor)
    {
        Anchor = anchor;
    }

    public string Anchor { get; }
}
