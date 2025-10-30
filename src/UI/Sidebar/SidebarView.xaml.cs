using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media.Animation;

namespace MarkRead.App.UI.Sidebar;

/// <summary>
/// File tree sidebar showing folder structure with Markdown files and directories.
/// Enhanced with icons, selection highlighting, and animations.
/// </summary>
public partial class SidebarView : System.Windows.Controls.UserControl
{
    private string? _rootFolder;
    private double _width = 300;
    private bool _isCollapsed;
    private readonly Style? _treeViewItemStyle;

    public event EventHandler<string>? FileSelected;
    public event EventHandler<bool>? CollapsedChanged;
    public event EventHandler<double>? WidthChanged;

    public double SidebarWidth
    {
        get => _width;
        set
        {
            if (Math.Abs(_width - value) > 0.1)
            {
                _width = Math.Max(200, Math.Min(500, value)); // Clamp to valid range
                SidebarGrid.Width = _width;
                WidthChanged?.Invoke(this, _width);
            }
        }
    }

    public bool IsCollapsed
    {
        get => _isCollapsed;
        set
        {
            if (_isCollapsed != value)
            {
                _isCollapsed = value;
                if (_isCollapsed)
                {
                    AnimateCollapse();
                }
                else
                {
                    AnimateExpand();
                }
                CollapsedChanged?.Invoke(this, _isCollapsed);
            }
        }
    }

    public SidebarView()
    {
        InitializeComponent();
        SidebarGrid.Width = _width;
        _treeViewItemStyle = TryFindResource("TreeViewItemStyle") as Style;
    }

    public void SetRootFolder(string? folderPath)
    {
        _rootFolder = folderPath;
        RefreshTree();
    }

    private void AnimateCollapse()
    {
        var collapseStoryboard = (Storyboard)this.Resources["CollapseAnimation"];
        collapseStoryboard?.Begin();
    }

    private void AnimateExpand()
    {
        var expandStoryboard = (Storyboard)this.Resources["ExpandAnimation"];
        if (expandStoryboard != null)
        {
            // Set the target width for the animation
            var widthAnimation = expandStoryboard.Children[0] as DoubleAnimation;
            if (widthAnimation != null)
            {
                widthAnimation.To = _width;
            }
            expandStoryboard.Begin();
        }
    }

    private void RefreshTree()
    {
        FileTreeView.Items.Clear();

        if (string.IsNullOrEmpty(_rootFolder) || !Directory.Exists(_rootFolder))
        {
            EmptyStatePanel.Visibility = Visibility.Visible;
            FileTreeView.Visibility = Visibility.Collapsed;
            RootFolderText.Text = "Folder";
            RootFolderText.ToolTip = null;
            return;
        }

        EmptyStatePanel.Visibility = Visibility.Collapsed;
        FileTreeView.Visibility = Visibility.Visible;
        RootFolderText.Text = Path.GetFileName(_rootFolder) ?? _rootFolder;
        RootFolderText.ToolTip = _rootFolder;

        try
        {
            bool hasItems = false;

            foreach (var directory in GetSortedDirectories(_rootFolder))
            {
                FileTreeView.Items.Add(CreateTreeItem(directory));
                hasItems = true;
            }

            foreach (var file in GetMarkdownFiles(_rootFolder))
            {
                var fileItem = new TreeViewItem
                {
                    Header = Path.GetFileName(file),
                    Tag = file
                };
                ApplyTreeViewItemStyle(fileItem);
                FileTreeView.Items.Add(fileItem);
                hasItems = true;
            }

            if (!hasItems && HasAccessibleContent(_rootFolder))
            {
                var placeholder = new TreeViewItem { Header = "..." };
                ApplyTreeViewItemStyle(placeholder);
                FileTreeView.Items.Add(placeholder);
            }
        }
        catch (UnauthorizedAccessException)
        {
            EmptyStateText.Text = "Access denied to folder";
            EmptyStatePanel.Visibility = Visibility.Visible;
            FileTreeView.Visibility = Visibility.Collapsed;
            RootFolderText.ToolTip = _rootFolder;
        }
        catch (Exception ex)
        {
            EmptyStateText.Text = $"Error: {ex.Message}";
            EmptyStatePanel.Visibility = Visibility.Visible;
            FileTreeView.Visibility = Visibility.Collapsed;
            RootFolderText.ToolTip = _rootFolder;
        }
    }

    private TreeViewItem CreateTreeItem(string path, bool isRoot = false)
    {
        var item = new TreeViewItem
        {
            Header = isRoot ? Path.GetFileName(path) ?? path : Path.GetFileName(path),
            Tag = path
        };

        ApplyTreeViewItemStyle(item);

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
                    Header = Path.GetFileName(file),
                    Tag = file
                };
                ApplyTreeViewItemStyle(fileItem);
                item.Items.Add(fileItem);
            }

            // Add placeholder for lazy loading if there are items
            if (item.Items.Count == 0 && HasAccessibleContent(path))
            {
                var placeholder = new TreeViewItem { Header = "..." };
                ApplyTreeViewItemStyle(placeholder);
                item.Items.Add(placeholder);
            }
        }

        return item;
    }

    private void ApplyTreeViewItemStyle(TreeViewItem item)
    {
        if (_treeViewItemStyle != null)
        {
            item.Style = _treeViewItemStyle;
            item.ItemContainerStyle = _treeViewItemStyle;
        }

        item.SetResourceReference(System.Windows.Controls.Control.ForegroundProperty, "ThemeTextPrimaryBrush");
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
