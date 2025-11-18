using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media.Animation;
using MarkRead.App.Services;

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
    private FolderExclusionSettings? _exclusionSettings;
    private SettingsService? _settingsService;

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

    public SidebarView(SettingsService settingsService) : this()
    {
        _settingsService = settingsService;
        _ = LoadExclusionSettingsAsync();
    }

    /// <summary>
    /// Sets the SettingsService for this sidebar (for use when created from XAML).
    /// </summary>
    public void SetSettingsService(SettingsService settingsService)
    {
        if (settingsService != null && _settingsService == null)
        {
            _settingsService = settingsService;
            _ = LoadExclusionSettingsAsync();
        }
    }

    private async System.Threading.Tasks.Task LoadExclusionSettingsAsync()
    {
        if (_settingsService != null)
        {
            _exclusionSettings = await _settingsService.LoadFolderExclusionSettingsAsync();
        }
        else
        {
            _exclusionSettings = FolderExclusionSettings.CreateDefault();
        }
    }

    public async System.Threading.Tasks.Task RefreshExclusionSettingsAsync()
    {
        await LoadExclusionSettingsAsync();
        await RefreshTreeAsync();
    }

    public void SetRootFolder(string? folderPath)
    {
        _rootFolder = folderPath;
        
        // Start loading immediately in background
        _ = RefreshTreeAsync();
    }

    private async Task RefreshTreeAsync()
    {
        // Ensure we're on UI thread for initial setup
        if (!Dispatcher.CheckAccess())
        {
            await Dispatcher.InvokeAsync(() => RefreshTreeAsync());
            return;
        }

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

        // Add loading indicator
        var loadingItem = new TreeViewItem
        {
            Header = "Loading...",
            IsEnabled = false
        };
        ApplyTreeViewItemStyle(loadingItem);
        FileTreeView.Items.Add(loadingItem);

        // Load tree structure progressively in true background thread
        _ = Task.Run(async () =>
        {
            try
            {
                var itemsAdded = false;
                var batch = new List<string>();
                const int batchSize = 10; // Update UI every 10 items

                // Enumerate directories in batches
                foreach (var directory in EnumerateDirectoriesSync(_rootFolder!))
                {
                    batch.Add(directory);

                    if (batch.Count >= batchSize)
                    {
                        var itemsToAdd = batch.ToList();
                        batch.Clear();

                        await Dispatcher.InvokeAsync(() =>
                        {
                            if (!itemsAdded)
                            {
                                FileTreeView.Items.Clear();
                                itemsAdded = true;
                            }

                            foreach (var dir in itemsToAdd)
                            {
                                FileTreeView.Items.Add(CreateTreeItem(dir));
                            }
                        });

                        // Give UI thread time to process
                        await Task.Delay(10);
                    }
                }

                // Add remaining directories
                if (batch.Count > 0)
                {
                    var itemsToAdd = batch.ToList();
                    batch.Clear();

                    await Dispatcher.InvokeAsync(() =>
                    {
                        if (!itemsAdded)
                        {
                            FileTreeView.Items.Clear();
                            itemsAdded = true;
                        }

                        foreach (var dir in itemsToAdd)
                        {
                            FileTreeView.Items.Add(CreateTreeItem(dir));
                        }
                    });
                }

                // Enumerate markdown files in batches
                foreach (var file in EnumerateMarkdownFilesSync(_rootFolder!))
                {
                    batch.Add(file);

                    if (batch.Count >= batchSize)
                    {
                        var itemsToAdd = batch.ToList();
                        batch.Clear();

                        await Dispatcher.InvokeAsync(() =>
                        {
                            if (!itemsAdded)
                            {
                                FileTreeView.Items.Clear();
                                itemsAdded = true;
                            }

                            foreach (var f in itemsToAdd)
                            {
                                var fileItem = new TreeViewItem
                                {
                                    Header = Path.GetFileName(f),
                                    Tag = f
                                };
                                ApplyTreeViewItemStyle(fileItem);
                                FileTreeView.Items.Add(fileItem);
                            }
                        });

                        // Give UI thread time to process
                        await Task.Delay(10);
                    }
                }

                // Add remaining files
                if (batch.Count > 0)
                {
                    var itemsToAdd = batch.ToList();

                    await Dispatcher.InvokeAsync(() =>
                    {
                        if (!itemsAdded)
                        {
                            FileTreeView.Items.Clear();
                            itemsAdded = true;
                        }

                        foreach (var f in itemsToAdd)
                        {
                            var fileItem = new TreeViewItem
                            {
                                Header = Path.GetFileName(f),
                                Tag = f
                            };
                            ApplyTreeViewItemStyle(fileItem);
                            FileTreeView.Items.Add(fileItem);
                        }
                    });
                }

                // If no items were added, show appropriate message
                if (!itemsAdded)
                {
                    await Dispatcher.InvokeAsync(() =>
                    {
                        FileTreeView.Items.Clear();
                        if (HasAccessibleContent(_rootFolder!))
                        {
                            var placeholder = new TreeViewItem { Header = "(empty)" };
                            ApplyTreeViewItemStyle(placeholder);
                            FileTreeView.Items.Add(placeholder);
                        }
                    });
                }
            }
            catch (UnauthorizedAccessException)
            {
                await Dispatcher.InvokeAsync(() =>
                {
                    EmptyStateText.Text = "Access denied to folder";
                    EmptyStatePanel.Visibility = Visibility.Visible;
                    FileTreeView.Visibility = Visibility.Collapsed;
                });
            }
            catch (Exception ex)
            {
                await Dispatcher.InvokeAsync(() =>
                {
                    EmptyStateText.Text = $"Error: {ex.Message}";
                    EmptyStatePanel.Visibility = Visibility.Visible;
                    FileTreeView.Visibility = Visibility.Collapsed;
                });
            }
        });
    }

    private IEnumerable<string> EnumerateDirectoriesSync(string path)
    {
        IEnumerable<string> directories;
        try
        {
            directories = Directory.EnumerateDirectories(path)
                .Where(d => !IsHiddenOrSystem(d) && !IsExcludedFolder(d) && ContainsMarkdownFiles(d))
                .OrderBy(d => Path.GetFileName(d));
        }
        catch
        {
            yield break;
        }

        foreach (var directory in directories)
        {
            yield return directory;
        }
    }

    private bool IsExcludedFolder(string path)
    {
        try
        {
            var folderName = Path.GetFileName(path);
            if (string.IsNullOrEmpty(folderName))
                return false;

            // Use configurable exclusion settings
            if (_exclusionSettings != null)
            {
                return _exclusionSettings.IsExcluded(folderName);
            }

            // Fallback to defaults if settings not loaded yet
            var defaultSettings = FolderExclusionSettings.CreateDefault();
            return defaultSettings.IsExcluded(folderName);
        }
        catch
        {
            return false;
        }
    }

    private bool ContainsMarkdownFiles(string path)
    {
        try
        {
            // Quick check: any .md files directly in this folder?
            if (Directory.EnumerateFiles(path, "*.md", SearchOption.TopDirectoryOnly).Any())
            {
                return true;
            }

            // Check subdirectories recursively
            foreach (var subdir in Directory.EnumerateDirectories(path))
            {
                if (IsHiddenOrSystem(subdir) || IsExcludedFolder(subdir))
                {
                    continue;
                }

                if (ContainsMarkdownFiles(subdir))
                {
                    return true;
                }
            }

            return false;
        }
        catch
        {
            // If we can't access the directory, assume it doesn't contain markdown files
            return false;
        }
    }

    private IEnumerable<string> EnumerateMarkdownFilesSync(string path)
    {
        IEnumerable<string> files;
        try
        {
            files = Directory.EnumerateFiles(path, "*.md")
                .Where(f => !IsHiddenOrSystem(f))
                .OrderBy(f => Path.GetFileName(f));
        }
        catch
        {
            yield break;
        }

        foreach (var file in files)
        {
            yield return file;
        }
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
            // Add a dummy item to show the expand arrow
            // Items will be loaded lazily when the folder is expanded
            item.Items.Add(new TreeViewItem { Header = "..." });
            
            // Subscribe to the Expanded event for lazy loading
            item.Expanded += TreeViewItem_Expanded;
        }

        return item;
    }

    private void TreeViewItem_Expanded(object sender, RoutedEventArgs e)
    {
        if (sender is not TreeViewItem item)
        {
            return;
        }

        // Check if this is the first expansion (still has placeholder)
        if (item.Items.Count == 1 && item.Items[0] is TreeViewItem placeholder && placeholder.Header?.ToString() == "...")
        {
            // Replace placeholder with loading indicator
            item.Items.Clear();
            var loadingItem = new TreeViewItem
            {
                Header = "Loading...",
                IsEnabled = false
            };
            ApplyTreeViewItemStyle(loadingItem);
            item.Items.Add(loadingItem);

            // Load children progressively in background
            if (item.Tag is string path && Directory.Exists(path))
            {
                _ = LoadTreeItemChildrenAsync(item, path);
            }
        }
    }

    private async Task LoadTreeItemChildrenAsync(TreeViewItem parentItem, string path)
    {
        await Task.Run(async () =>
        {
            try
            {
                var itemsAdded = false;
                var batch = new List<object>(); // Can hold TreeViewItem or file paths
                const int batchSize = 10;

                // Enumerate directories in batches
                foreach (var directory in EnumerateDirectoriesSync(path))
                {
                    batch.Add(directory);

                    if (batch.Count >= batchSize)
                    {
                        var itemsToAdd = batch.ToList();
                        batch.Clear();

                        await Dispatcher.InvokeAsync(() =>
                        {
                            if (!itemsAdded)
                            {
                                parentItem.Items.Clear();
                                itemsAdded = true;
                            }

                            foreach (var item in itemsToAdd)
                            {
                                if (item is string dir)
                                {
                                    parentItem.Items.Add(CreateTreeItem(dir));
                                }
                            }
                        });

                        await Task.Delay(10);
                    }
                }

                // Add remaining directories
                if (batch.Count > 0)
                {
                    var itemsToAdd = batch.ToList();
                    batch.Clear();

                    await Dispatcher.InvokeAsync(() =>
                    {
                        if (!itemsAdded)
                        {
                            parentItem.Items.Clear();
                            itemsAdded = true;
                        }

                        foreach (var item in itemsToAdd)
                        {
                            if (item is string dir)
                            {
                                parentItem.Items.Add(CreateTreeItem(dir));
                            }
                        }
                    });
                }

                // Enumerate markdown files in batches
                foreach (var file in EnumerateMarkdownFilesSync(path))
                {
                    batch.Add(file);

                    if (batch.Count >= batchSize)
                    {
                        var itemsToAdd = batch.ToList();
                        batch.Clear();

                        await Dispatcher.InvokeAsync(() =>
                        {
                            if (!itemsAdded)
                            {
                                parentItem.Items.Clear();
                                itemsAdded = true;
                            }

                            foreach (var item in itemsToAdd)
                            {
                                if (item is string f)
                                {
                                    var fileItem = new TreeViewItem
                                    {
                                        Header = Path.GetFileName(f),
                                        Tag = f
                                    };
                                    ApplyTreeViewItemStyle(fileItem);
                                    parentItem.Items.Add(fileItem);
                                }
                            }
                        });

                        await Task.Delay(10);
                    }
                }

                // Add remaining files
                if (batch.Count > 0)
                {
                    var itemsToAdd = batch.ToList();

                    await Dispatcher.InvokeAsync(() =>
                    {
                        if (!itemsAdded)
                        {
                            parentItem.Items.Clear();
                            itemsAdded = true;
                        }

                        foreach (var item in itemsToAdd)
                        {
                            if (item is string f)
                            {
                                var fileItem = new TreeViewItem
                                {
                                    Header = Path.GetFileName(f),
                                    Tag = f
                                };
                                ApplyTreeViewItemStyle(fileItem);
                                parentItem.Items.Add(fileItem);
                            }
                        }
                    });
                }

                // If no items were added, show empty placeholder
                if (!itemsAdded)
                {
                    await Dispatcher.InvokeAsync(() =>
                    {
                        parentItem.Items.Clear();
                        var emptyItem = new TreeViewItem
                        {
                            Header = "(empty)",
                            IsEnabled = false
                        };
                        ApplyTreeViewItemStyle(emptyItem);
                        parentItem.Items.Add(emptyItem);
                    });
                }
            }
            catch (UnauthorizedAccessException)
            {
                await Dispatcher.InvokeAsync(() =>
                {
                    parentItem.Items.Clear();
                    var errorItem = new TreeViewItem
                    {
                        Header = "(access denied)",
                        IsEnabled = false
                    };
                    ApplyTreeViewItemStyle(errorItem);
                    parentItem.Items.Add(errorItem);
                });
            }
            catch (Exception ex)
            {
                await Dispatcher.InvokeAsync(() =>
                {
                    parentItem.Items.Clear();
                    var errorItem = new TreeViewItem
                    {
                        Header = $"(error: {ex.Message})",
                        IsEnabled = false
                    };
                    ApplyTreeViewItemStyle(errorItem);
                    parentItem.Items.Add(errorItem);
                });
            }
        });
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

    private void FileTreeView_SelectedItemChanged(object sender, RoutedPropertyChangedEventArgs<object> e)
    {
        if (e.NewValue is TreeViewItem item && item.Tag is string path)
        {
            if (File.Exists(path) && path.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
            {
                FileSelected?.Invoke(this, path);
            }
        }
    }

    public void Refresh()
    {
        _ = RefreshTreeAsync();
    }
}
