using System.Windows;
using System.Windows.Input;
using System.Diagnostics;

namespace MarkRead.App;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : Application
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

	protected override void OnStartup(StartupEventArgs e)
	{
		base.OnStartup(e);

		if (Current.MainWindow is not Window window)
		{
			return;
		}

		RegisterCommand(window, OpenFolderCommand, "Open folder shortcut invoked");
		RegisterCommand(window, NewTabCommand, "New tab shortcut invoked");
		RegisterCommand(window, CloseTabCommand, "Close tab shortcut invoked");
		RegisterCommand(window, FindInDocumentCommand, "Find shortcut invoked");
		RegisterCommand(window, NavigateBackCommand, "Navigate back shortcut invoked");
		RegisterCommand(window, NavigateForwardCommand, "Navigate forward shortcut invoked");

		ThemeManager.ApplyTheme(ThemeManager.AppTheme.System);
	}

	private static void RegisterCommand(Window window, RoutedUICommand command, string diagnosticMessage)
	{
		window.InputBindings.Add(new KeyBinding(command, (KeyGesture)command.InputGestures[0]));
		window.CommandBindings.Add(new CommandBinding(command,
			(_, __) => Debug.WriteLine(diagnosticMessage),
			CanAlwaysExecute));
	}

	private static void CanAlwaysExecute(object sender, CanExecuteRoutedEventArgs e)
	{
		e.CanExecute = true;
	}
}

