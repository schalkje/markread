using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

namespace MarkRead.UI.Sidebar;

/// <summary>
/// File tree sidebar showing folder structure with Markdown files and directories.
/// </summary>
public partial class SidebarView : System.Windows.Controls.UserControl
{
    private string? _rootFolder;

    public event EventHandler<string>? FileSelected;

    public SidebarView()
    {
        InitializeComponent();
    }

    public void SetRootFolder(string? folderPath)
    {
        _rootFolder = folderPath;
        RefreshTree();
    }

    private void RefreshTree()
    {
        FileTreeView.Items.Clear();

        if (string.IsNullOrEmpty(_rootFolder) || !Directory.Exists(_rootFolder))
        {
            EmptyStateText.Visibility = Visibility.Visible;
            FileTreeView.Visibility = Visibility.Collapsed;
            RootFolderText.Text = "Folder";
            return;
        }

        EmptyStateText.Visibility = Visibility.Collapsed;
        FileTreeView.Visibility = Visibility.Visible;
        RootFolderText.Text = Path.GetFileName(_rootFolder) ?? _rootFolder;

        try
        {
            var rootItem = CreateTreeItem(_rootFolder, isRoot: true);
            FileTreeView.Items.Add(rootItem);
            rootItem.IsExpanded = true;
        }
        catch (UnauthorizedAccessException)
        {
            EmptyStateText.Text = "Access denied to folder";
            EmptyStateText.Visibility = Visibility.Visible;
            FileTreeView.Visibility = Visibility.Collapsed;
        }
        catch (Exception ex)
        {
            EmptyStateText.Text = $"Error: {ex.Message}";
            EmptyStateText.Visibility = Visibility.Visible;
            FileTreeView.Visibility = Visibility.Collapsed;
        }
    }

    private TreeViewItem CreateTreeItem(string path, bool isRoot = false)
    {
        var item = new TreeViewItem
        {
            Header = isRoot ? Path.GetFileName(path) ?? path : Path.GetFileName(path),
            Tag = path
        };

        if (Directory.Exists(path))
        {
            // Add folders first
            var directories = GetSortedDirectories(path);
            foreach (var dir in directories)
            {
                item.Items.Add(CreateTreeItem(dir));
            }

            // Add markdown files
            var markdownFiles = GetMarkdownFiles(path);
            foreach (var file in markdownFiles)
            {
                var fileItem = new TreeViewItem
                {
                    Header = $"📄 {Path.GetFileName(file)}",
                    Tag = file
                };
                item.Items.Add(fileItem);
            }

            // Add placeholder for lazy loading if there are items
            if (item.Items.Count == 0 && HasAccessibleContent(path))
            {
                item.Items.Add(new TreeViewItem { Header = "..." });
            }
        }

        return item;
    }

    private IEnumerable<string> GetSortedDirectories(string path)
    {
        try
        {
            return Directory.GetDirectories(path)
                .Where(d => !IsHiddenOrSystem(d))
                .OrderBy(d => Path.GetFileName(d));
        }
        catch
        {
            return Enumerable.Empty<string>();
        }
    }

    private IEnumerable<string> GetMarkdownFiles(string path)
    {
        try
        {
            return Directory.GetFiles(path, "*.md")
                .Where(f => !IsHiddenOrSystem(f))
                .OrderBy(f => Path.GetFileName(f));
        }
        catch
        {
            return Enumerable.Empty<string>();
        }
    }

    private bool IsHiddenOrSystem(string path)
    {
        try
        {
            var attributes = File.GetAttributes(path);
            return (attributes & FileAttributes.Hidden) != 0 ||
                   (attributes & FileAttributes.System) != 0;
        }
        catch
        {
            return false;
        }
    }

    private bool HasAccessibleContent(string path)
    {
        try
        {
            return Directory.EnumerateFileSystemEntries(path).Any();
        }
        catch
        {
            return false;
        }
    }

    private void FileTreeView_MouseDoubleClick(object sender, MouseButtonEventArgs e)
    {
        if (FileTreeView.SelectedItem is TreeViewItem item && item.Tag is string path)
        {
            if (File.Exists(path) && path.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
            {
                FileSelected?.Invoke(this, path);
            }
        }
    }

    public void Refresh()
    {
        RefreshTree();
    }
}
