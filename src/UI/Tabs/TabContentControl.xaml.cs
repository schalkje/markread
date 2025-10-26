using System;
using System.IO;

using MarkRead.App.Rendering;

namespace MarkRead.App.UI.Tabs;

/// <summary>
/// A user control that encapsulates a WebView2 control and its host for a single tab.
/// </summary>
public partial class TabContentControl : System.Windows.Controls.UserControl, IDisposable
{
    private WebViewHost? _webViewHost;
    private System.Threading.Tasks.TaskCompletionSource<bool>? _initializationTcs;
    private bool _disposed;

    public TabContentControl()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, System.Windows.RoutedEventArgs e)
    {
        System.Diagnostics.Debug.WriteLine("TabContentControl.OnLoaded: Control loaded into visual tree");
        
        // Initialize WebView2 now that we're in the visual tree
        if (_webViewHost is null)
        {
            await InitializeWebViewAsync();
        }
    }

    public WebViewHost? Host => _webViewHost;

    public async System.Threading.Tasks.Task InitializeAsync()
    {
        System.Diagnostics.Debug.WriteLine("TabContentControl.InitializeAsync: Waiting for initialization");
        
        // If already initialized, return immediately
        if (_webViewHost is not null)
        {
            System.Diagnostics.Debug.WriteLine("TabContentControl.InitializeAsync: Already initialized");
            return;
        }

        // If we're already loaded, initialize now
        if (IsLoaded)
        {
            await InitializeWebViewAsync();
            return;
        }

        // Otherwise, wait for the Loaded event to trigger initialization
        _initializationTcs ??= new System.Threading.Tasks.TaskCompletionSource<bool>();
        await _initializationTcs.Task;
    }

    private async System.Threading.Tasks.Task InitializeWebViewAsync()
    {
        System.Diagnostics.Debug.WriteLine("TabContentControl.InitializeWebViewAsync: Starting");
        
        if (_webViewHost is not null)
        {
            System.Diagnostics.Debug.WriteLine("TabContentControl.InitializeWebViewAsync: Already initialized");
            return;
        }

        try
        {
            System.Diagnostics.Debug.WriteLine("TabContentControl.InitializeWebViewAsync: Creating WebViewHost");
            _webViewHost = new WebViewHost(WebView, Path.Combine("Rendering", "assets"));
            System.Diagnostics.Debug.WriteLine("TabContentControl.InitializeWebViewAsync: Calling WebViewHost.InitializeAsync");
            await _webViewHost.InitializeAsync();
            System.Diagnostics.Debug.WriteLine("TabContentControl.InitializeWebViewAsync: WebViewHost initialized successfully");
            
            // Signal that initialization is complete
            _initializationTcs?.TrySetResult(true);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"TabContentControl.InitializeWebViewAsync: EXCEPTION - {ex.Message}");
            System.Diagnostics.Debug.WriteLine($"TabContentControl.InitializeWebViewAsync: Stack trace - {ex.StackTrace}");
            _initializationTcs?.TrySetException(ex);
            throw;
        }
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _webViewHost?.Dispose();
        _webViewHost = null;
        _disposed = true;
    }
}
