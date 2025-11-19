using System.Diagnostics;
using System.IO;
using System.Windows;

namespace MarkRead.App.Services;

/// <summary>
/// Service for handling context menu actions on tree view nodes.
/// </summary>
public class TreeViewContextMenuService
{
    /// <summary>
    /// Copies the file or folder path to the clipboard.
    /// </summary>
    public void CopyPathToClipboard(string path)
    {
        try
        {
            System.Windows.Clipboard.SetText(path);
        }
        catch (Exception ex)
        {
            // Clipboard operations can fail if another app has it locked
            Debug.WriteLine($"Failed to copy path to clipboard: {ex.Message}");
        }
    }

    /// <summary>
    /// Opens Windows Explorer and selects the specified file or folder.
    /// </summary>
    public void ShowInWindowsExplorer(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                // For files, open Explorer and select the file
                Process.Start("explorer.exe", $"/select,\"{path}\"");
            }
            else if (Directory.Exists(path))
            {
                // For folders, just open the folder
                Process.Start("explorer.exe", $"\"{path}\"");
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Failed to open Windows Explorer: {ex.Message}");
        }
    }
}
