using System.Windows.Input;

using MarkRead.Cli;

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

    protected override void OnStartup(System.Windows.StartupEventArgs e)
    {
        base.OnStartup(e);

        if (Current.MainWindow is not MainWindow window)
        {
            return;
        }

        AddInputBinding(window, OpenFolderCommand);
        AddInputBinding(window, NewTabCommand);
        AddInputBinding(window, CloseTabCommand);
        AddInputBinding(window, FindInDocumentCommand);
        AddInputBinding(window, NavigateBackCommand);
        AddInputBinding(window, NavigateForwardCommand);

        window.InitializeShell(StartupArguments.Parse(e.Args));

        ThemeManager.ApplyTheme(ThemeManager.AppTheme.System);
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
