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
        System.Diagnostics.Debug.WriteLine("OnOpenFolderClicked fired!");
        if (Window.GetWindow(this) is MainWindow mainWindow)
        {
            System.Diagnostics.Debug.WriteLine($"Found MainWindow: {mainWindow}");
            mainWindow.ExecuteOpenFolder();
        }
        else
        {
            System.Diagnostics.Debug.WriteLine("MainWindow not found!");
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
