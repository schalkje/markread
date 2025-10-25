using System.Windows;
using System.Threading.Tasks;

using Microsoft.Web.WebView2.Core;

namespace MarkRead.App;

/// <summary>
/// Interaction logic for the shell window hosting the WebView renderer.
/// </summary>
public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }

    private async void Window_Loaded(object sender, RoutedEventArgs e)
    {
        await InitializeWebViewAsync();
    }

    private async Task InitializeWebViewAsync()
    {
        if (MarkdownView.CoreWebView2 is null)
        {
            await MarkdownView.EnsureCoreWebView2Async();
        }

        CoreWebView2 core = MarkdownView.CoreWebView2!;
        core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.AreDevToolsEnabled = true;
        core.Settings.IsZoomControlEnabled = false;

        const string placeholderHtml = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>MarkRead</title></head><body style='font-family:Segoe UI, sans-serif;padding:2rem;color:#2d2d2d;'><h1>MarkRead</h1><p>Viewer initialized. Implement rendering pipeline.</p></body></html>";
        core.NavigateToString(placeholderHtml);
    }
}