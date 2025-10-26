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
    private bool _disposed;

    public TabContentControl()
    {
        InitializeComponent();
    }

    public WebViewHost? Host => _webViewHost;

    public async System.Threading.Tasks.Task InitializeAsync()
    {
        if (_webViewHost is not null)
        {
            return;
        }

        _webViewHost = new WebViewHost(WebView, Path.Combine("Rendering", "assets"));
        await _webViewHost.InitializeAsync();
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
