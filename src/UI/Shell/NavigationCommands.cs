using System.Windows.Input;

namespace MarkRead.App.UI.Shell;

public static class NavigationCommands
{
    public static readonly RoutedUICommand GoBack = new(
        "Go Back",
        nameof(GoBack),
        typeof(NavigationCommands),
        new InputGestureCollection
        {
            new KeyGesture(Key.Left, ModifierKeys.Alt)
        });

    public static readonly RoutedUICommand GoForward = new(
        "Go Forward",
        nameof(GoForward),
        typeof(NavigationCommands),
        new InputGestureCollection
        {
            new KeyGesture(Key.Right, ModifierKeys.Alt)
        });
}
