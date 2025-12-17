using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using Microsoft.Xaml.Behaviors;

namespace MarkRead.App.UI.Sidebar.TreeView;

/// <summary>
/// Interaction logic for TreeViewView.xaml
/// </summary>
public partial class TreeViewView : System.Windows.Controls.UserControl
{
    private ContextMenu? _folderContextMenu;
    private ContextMenu? _fileContextMenu;
    
    // Attached property to track if behaviors are attached to a TreeViewItem
    private static readonly DependencyProperty IsBehaviorAttachedProperty =
        DependencyProperty.RegisterAttached(
            "IsBehaviorAttached",
            typeof(bool),
            typeof(TreeViewView),
            new PropertyMetadata(false));
    
    private static bool GetIsBehaviorAttached(DependencyObject obj) => (bool)obj.GetValue(IsBehaviorAttachedProperty);
    private static void SetIsBehaviorAttached(DependencyObject obj, bool value) => obj.SetValue(IsBehaviorAttachedProperty, value);
    
    public TreeViewView()
    {
        InitializeComponent();
        
        // T065: Add keyboard input bindings
        this.PreviewKeyDown += OnPreviewKeyDown;
        
        // T070: Add text input for type-ahead search
        this.PreviewTextInput += OnPreviewTextInput;
        
        // Attach context menus to tree items
        FileTreeView.Loaded += OnTreeViewLoaded;
        
        // Attach behaviors to TreeViewItems as they are created
        FileTreeView.ItemContainerGenerator.StatusChanged += OnItemContainerGeneratorStatusChanged;
        
        // Create reusable context menus
        _folderContextMenu = CreateFolderContextMenu();
        _fileContextMenu = CreateFileContextMenu();

        // Subscribe to ViewModel events when DataContext changes
        this.DataContextChanged += OnDataContextChanged;
    }

    private void OnDataContextChanged(object sender, DependencyPropertyChangedEventArgs e)
    {
        // Unsubscribe from old ViewModel
        if (e.OldValue is TreeViewViewModel oldViewModel)
        {
            oldViewModel.ScrollNodeIntoViewRequested -= OnScrollNodeIntoViewRequested;
        }

        // Subscribe to new ViewModel
        if (e.NewValue is TreeViewViewModel newViewModel)
        {
            newViewModel.ScrollNodeIntoViewRequested += OnScrollNodeIntoViewRequested;
        }
    }

    private void OnScrollNodeIntoViewRequested(object? sender, Services.TreeNode node)
    {
        // Find the TreeViewItem for this node and scroll it into view
        if (FileTreeView.ItemContainerGenerator.ContainerFromItem(node) is TreeViewItem treeViewItem)
        {
            treeViewItem.BringIntoView();
        }
        else
        {
            // If the container isn't generated yet, try after a short delay
            Dispatcher.InvokeAsync(async () =>
            {
                await Task.Delay(100);
                if (FileTreeView.ItemContainerGenerator.ContainerFromItem(node) is TreeViewItem delayedItem)
                {
                    delayedItem.BringIntoView();
                }
            }, System.Windows.Threading.DispatcherPriority.Background);
        }
    }

    private void OnTreeViewLoaded(object sender, RoutedEventArgs e)
    {
        // Context menus will be created via DataTriggers in ItemContainerStyle
        // This is just a placeholder for future initialization if needed
    }
    
    private void OnItemContainerGeneratorStatusChanged(object? sender, EventArgs e)
    {
        if (FileTreeView.ItemContainerGenerator.Status == System.Windows.Controls.Primitives.GeneratorStatus.ContainersGenerated)
        {
            AttachBehaviorsToTreeViewItems(FileTreeView);
        }
    }
    
    private void AttachBehaviorsToTreeViewItems(ItemsControl itemsControl)
    {
        foreach (var item in itemsControl.Items)
        {
            if (itemsControl.ItemContainerGenerator.ContainerFromItem(item) is TreeViewItem treeViewItem)
            {
                // Use attached property to track if we've already processed this TreeViewItem
                if (GetIsBehaviorAttached(treeViewItem))
                    continue;
                
                // Check if behavior is already attached
                var behaviors = Interaction.GetBehaviors(treeViewItem);
                if (!behaviors.Any(b => b is TreeViewItemBehavior))
                {
                    behaviors.Add(new TreeViewItemBehavior());
                }
                
                // Always attach context menu opening handler
                treeViewItem.ContextMenuOpening += OnContextMenuOpening;
                
                // Mark as processed
                SetIsBehaviorAttached(treeViewItem, true);
                
                // Handle nested TreeViewItems when they are expanded
                // Use a local copy to avoid closure issues
                var currentItem = treeViewItem;
                EventHandler? statusChangedHandler = null;
                statusChangedHandler = (s, e) =>
                {
                    if (currentItem.ItemContainerGenerator.Status == System.Windows.Controls.Primitives.GeneratorStatus.ContainersGenerated)
                    {
                        AttachBehaviorsToTreeViewItems(currentItem);
                        // Unsubscribe after handling to prevent memory leaks
                        currentItem.ItemContainerGenerator.StatusChanged -= statusChangedHandler;
                    }
                };
                currentItem.ItemContainerGenerator.StatusChanged += statusChangedHandler;
            }
        }
    }
    
    private void OnContextMenuOpening(object sender, ContextMenuEventArgs e)
    {
        // Find the TreeViewItem that was actually right-clicked
        if (e.OriginalSource is DependencyObject source)
        {
            var treeViewItem = FindTreeViewItemFromSource(source);
            if (treeViewItem != null && treeViewItem.DataContext is Services.TreeNode node)
            {
                // Cancel the event on the sender if it's different from the actual clicked item
                if (sender != treeViewItem)
                {
                    e.Handled = true;
                    return;
                }
                
                // Use the appropriate reusable context menu based on node type
                ContextMenu? menu = node.Type == Services.NodeType.Folder 
                    ? _folderContextMenu 
                    : _fileContextMenu;
                
                if (menu != null)
                {
                    // Update all menu item tags to the current node
                    UpdateMenuItemTags(menu, node);
                    
                    // Set the placement target and open manually
                    menu.PlacementTarget = treeViewItem;
                    menu.Placement = System.Windows.Controls.Primitives.PlacementMode.MousePoint;
                    menu.IsOpen = true;
                    
                    // Prevent default context menu behavior
                    e.Handled = true;
                }
            }
            else
            {
                e.Handled = true;
            }
        }
    }
    
    private void UpdateMenuItemTags(ContextMenu menu, Services.TreeNode node)
    {
        foreach (var item in menu.Items)
        {
            if (item is MenuItem menuItem)
            {
                menuItem.Tag = node;
            }
        }
    }
    
    private TreeViewItem? FindTreeViewItemFromSource(DependencyObject source)
    {
        DependencyObject current = source;
        while (current != null)
        {
            if (current is TreeViewItem item)
                return item;
            
            current = VisualTreeHelper.GetParent(current);
        }
        return null;
    }
    
    private ContextMenu CreateFolderContextMenu()
    {
        var contextMenu = new ContextMenu();
        
        // Expand/Collapse
        var expandCollapseItem = new MenuItem { Header = "Expand/Collapse" };
        expandCollapseItem.Click += ContextMenu_ToggleExpand;
        contextMenu.Items.Add(expandCollapseItem);
        
        // Refresh
        var refreshItem = new MenuItem { Header = "Refresh" };
        refreshItem.Click += ContextMenu_Refresh;
        contextMenu.Items.Add(refreshItem);
        
        // Separator
        contextMenu.Items.Add(new Separator());
        
        // Copy Path
        var copyPathItem = new MenuItem { Header = "Copy Path" };
        copyPathItem.Click += ContextMenu_CopyPath;
        contextMenu.Items.Add(copyPathItem);
        
        // Show in Explorer
        var showInExplorerItem = new MenuItem { Header = "Show in Explorer" };
        showInExplorerItem.Click += ContextMenu_ShowInExplorer;
        contextMenu.Items.Add(showInExplorerItem);
        
        return contextMenu;
    }
    
    private ContextMenu CreateFileContextMenu()
    {
        var contextMenu = new ContextMenu();
        
        // Open
        var openItem = new MenuItem { Header = "Open" };
        openItem.Click += ContextMenu_Open;
        contextMenu.Items.Add(openItem);
        
        // Open in New Tab
        var openInNewTabItem = new MenuItem { Header = "Open in New Tab" };
        openInNewTabItem.Click += ContextMenu_OpenInNewTab;
        contextMenu.Items.Add(openInNewTabItem);
        
        // Separator
        contextMenu.Items.Add(new Separator());
        
        // Copy Path
        var copyPathItem = new MenuItem { Header = "Copy Path" };
        copyPathItem.Click += ContextMenu_CopyPath;
        contextMenu.Items.Add(copyPathItem);
        
        return contextMenu;
    }

    /// <summary>
    /// Context menu handler for opening a file
    /// </summary>
    private void ContextMenu_Open(object sender, RoutedEventArgs e)
    {
        if (sender is MenuItem menuItem && 
            menuItem.Tag is Services.TreeNode node &&
            node.Type == Services.NodeType.File &&
            DataContext is TreeViewViewModel viewModel)
        {
            viewModel.SelectTreeNodeCommand.Execute(node);
        }
    }

    /// <summary>
    /// Context menu handler for opening a file in a new tab
    /// </summary>
    private void ContextMenu_OpenInNewTab(object sender, RoutedEventArgs e)
    {
        if (sender is MenuItem menuItem && 
            menuItem.Tag is Services.TreeNode node &&
            node.Type == Services.NodeType.File &&
            DataContext is TreeViewViewModel viewModel)
        {
            viewModel.OpenFileInNewTab(node);
        }
    }

    /// <summary>
    /// Context menu handler for toggling folder expand/collapse
    /// </summary>
    private void ContextMenu_ToggleExpand(object sender, RoutedEventArgs e)
    {
        if (sender is MenuItem menuItem && menuItem.Tag is Services.TreeNode node)
        {
            if (node.Type == Services.NodeType.Folder)
            {
                node.IsExpanded = !node.IsExpanded;
            }
        }
    }

    /// <summary>
    /// Context menu handler for refreshing a folder
    /// </summary>
    private void ContextMenu_Refresh(object sender, RoutedEventArgs e)
    {
        if (sender is MenuItem menuItem && 
            menuItem.Tag is Services.TreeNode node && 
            DataContext is TreeViewViewModel viewModel)
        {
            // Trigger refresh command
            viewModel.RefreshTreeViewCommand.Execute(null);
        }
    }

    /// <summary>
    /// Context menu handler for copying file/folder path
    /// </summary>
    private void ContextMenu_CopyPath(object sender, RoutedEventArgs e)
    {
        if (sender is MenuItem menuItem && menuItem.Tag is Services.TreeNode node)
        {
            try
            {
                System.Windows.Clipboard.SetText(node.FullPath);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to copy path: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Context menu handler for showing file/folder in Explorer
    /// </summary>
    private void ContextMenu_ShowInExplorer(object sender, RoutedEventArgs e)
    {
        if (sender is MenuItem menuItem && menuItem.Tag is Services.TreeNode node)
        {
            try
            {
                if (System.IO.File.Exists(node.FullPath))
                {
                    System.Diagnostics.Process.Start("explorer.exe", $"/select,\"{node.FullPath}\"");
                }
                else if (System.IO.Directory.Exists(node.FullPath))
                {
                    System.Diagnostics.Process.Start("explorer.exe", $"\"{node.FullPath}\"");
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to open Explorer: {ex.Message}");
            }
        }
    }

    private void TreeView_SelectedItemChanged(object sender, RoutedPropertyChangedEventArgs<object> e)
    {
        if (e.NewValue is Services.TreeNode node && DataContext is TreeViewViewModel viewModel)
        {
            viewModel.SelectTreeNodeCommand.Execute(node);
        }
    }

    /// <summary>
    /// T065: Handle keyboard navigation.
    /// Up/Down arrows: Navigate
    /// Right/Enter: Expand or Select
    /// Left/Escape: Collapse
    /// </summary>
    private void OnPreviewKeyDown(object sender, System.Windows.Input.KeyEventArgs e)
    {
        if (DataContext is not TreeViewViewModel viewModel) return;

        switch (e.Key)
        {
            case Key.Up:
                viewModel.NavigateTreeUpCommand.Execute(null);
                e.Handled = true;
                break;

            case Key.Down:
                viewModel.NavigateTreeDownCommand.Execute(null);
                e.Handled = true;
                break;

            case Key.Right:
            case Key.Enter:
                viewModel.ExpandTreeNodeCommand.Execute(null);
                e.Handled = true;
                break;

            case Key.Left:
            case Key.Escape:
                viewModel.CollapseTreeNodeCommand.Execute(null);
                e.Handled = true;
                break;
        }
    }

    /// <summary>
    /// T070: Capture alphanumeric input for type-ahead search.
    /// </summary>
    private void OnPreviewTextInput(object sender, System.Windows.Input.TextCompositionEventArgs e)
    {
        if (DataContext is not TreeViewViewModel viewModel) return;
        if (string.IsNullOrEmpty(e.Text)) return;

        // Only process alphanumeric characters
        foreach (char c in e.Text)
        {
            if (char.IsLetterOrDigit(c) || char.IsWhiteSpace(c))
            {
                viewModel.AppendTypeAheadCharacter(c);
            }
        }
    }
}
