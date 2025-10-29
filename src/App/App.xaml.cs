using System.Windows.Input;

using MarkRead.Cli;
using MarkRead.Services;

namespace MarkRead.App;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : System.Windows.Application
{
    public static readonly RoutedUICommand OpenFolderCommand = new(
        "Open Folder",
        nameof(OpenFolderCommand),
        typeof(App),
        new InputGestureCollection { new KeyGesture(Key.O, ModifierKeys.Control) });

    public static readonly RoutedUICommand OpenFileCommand = new(
        "Open File",
        nameof(OpenFileCommand),
        typeof(App),
        new InputGestureCollection { new KeyGesture(Key.O, ModifierKeys.Control | ModifierKeys.Shift) });

    public static readonly RoutedUICommand NewTabCommand = new(
        "New Tab",
        nameof(NewTabCommand),
        typeof(App),
        new InputGestureCollection { new KeyGesture(Key.T, ModifierKeys.Control) });

    public static readonly RoutedUICommand CloseTabCommand = new(
        "Close Tab",
        nameof(CloseTabCommand),
        typeof(App),
        new InputGestureCollection { new KeyGesture(Key.W, ModifierKeys.Control) });

    public static readonly RoutedUICommand FindInDocumentCommand = new(
        "Find in Document",
        nameof(FindInDocumentCommand),
        typeof(App),
        new InputGestureCollection { new KeyGesture(Key.F, ModifierKeys.Control) });

    public static readonly RoutedUICommand NavigateBackCommand = new(
        "Navigate Back",
        nameof(NavigateBackCommand),
        typeof(App),
        new InputGestureCollection { new KeyGesture(Key.Left, ModifierKeys.Alt) });

    public static readonly RoutedUICommand NavigateForwardCommand = new(
        "Navigate Forward",
        nameof(NavigateForwardCommand),
        typeof(App),
        new InputGestureCollection { new KeyGesture(Key.Right, ModifierKeys.Alt) });

    protected override async void OnStartup(System.Windows.StartupEventArgs e)
    {
        base.OnStartup(e);

        System.Diagnostics.Debug.WriteLine("App.OnStartup: START");
        
        // T083: Start monitoring startup performance
        var perfMonitor = StartupPerformanceMonitor.Instance;
        perfMonitor.StartPhase("Application Initialization");

        // Create and show the main window
        var window = new MainWindow();
        MainWindow = window;
        window.Show();
        
        System.Diagnostics.Debug.WriteLine("App.OnStartup: MainWindow created and shown");

        perfMonitor.StartPhase("Input Bindings Setup");
        AddInputBinding(window, OpenFolderCommand);
        AddInputBinding(window, OpenFileCommand);
        AddInputBinding(window, NewTabCommand);
        AddInputBinding(window, CloseTabCommand);
        AddInputBinding(window, FindInDocumentCommand);
        AddInputBinding(window, NavigateBackCommand);
        AddInputBinding(window, NavigateForwardCommand);

        perfMonitor.StartPhase("Shell Initialization");
        var startupArgs = StartupArguments.Parse(e.Args);
        await window.InitializeShellAsync(startupArgs);

        perfMonitor.StartPhase("Startup Complete");
        var report = perfMonitor.CompleteStartup();
        System.Diagnostics.Debug.WriteLine(report);
    }

    private static void AddInputBinding(System.Windows.Window window, RoutedUICommand command)
    {
        foreach (var gesture in command.InputGestures)
        {
            if (gesture is KeyGesture keyGesture)
            {
                window.InputBindings.Add(new KeyBinding(command, keyGesture));
            }
        }
    }
}
