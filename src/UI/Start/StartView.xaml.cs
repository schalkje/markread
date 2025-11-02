using System.Windows;
using WpfUserControl = System.Windows.Controls.UserControl;

namespace MarkRead.App.UI.Start;

public partial class StartView : WpfUserControl
{
    public StartView()
    {
        InitializeComponent();
    }

    private void OnOpenFolderClicked(object sender, RoutedEventArgs e)
    {
        if (Window.GetWindow(this) is MainWindow mainWindow)
        {
            mainWindow.ExecuteOpenFolder();
        }
    }

    private void OnOpenFileClicked(object sender, RoutedEventArgs e)
    {
        if (Window.GetWindow(this) is MainWindow mainWindow)
        {
            mainWindow.ExecuteOpenFile();
        }
    }
}
