using System.Windows.Input;

namespace MarkRead.App.UI.Start;

public static class StartCommands
{
    public static RoutedUICommand OpenFolder { get; } = new(
        "Open Folder",
        nameof(OpenFolder),
        typeof(StartCommands));

    public static RoutedUICommand OpenFile { get; } = new(
        "Open File",
        nameof(OpenFile),
        typeof(StartCommands));
}
