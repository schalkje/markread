using System.Windows;

namespace MarkRead.App.UI.Help;

/// <summary>
/// Keyboard shortcuts help window
/// </summary>
public partial class KeyboardShortcutsWindow : Window
{
    public KeyboardShortcutsWindow()
    {
        InitializeComponent();
    }

    private void Close_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }
}
