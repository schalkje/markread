using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using Microsoft.Xaml.Behaviors;

namespace MarkRead.App.UI.Sidebar.TreeView;

/// <summary>
/// Interaction logic for TreeViewView.xaml
/// </summary>
public partial class TreeViewView : System.Windows.Controls.UserControl
{
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
                // Use Tag to track if we've already processed this TreeViewItem
                if (treeViewItem.Tag is string tag && tag == "BehaviorAttached")
                    continue;
                
                // Check if behavior is already attached
                var behaviors = Interaction.GetBehaviors(treeViewItem);
                if (!behaviors.Any(b => b is TreeViewItemBehavior))
                {
                    behaviors.Add(new TreeViewItemBehavior());
                }
                
                // Attach context menu if not already present
                if (treeViewItem.ContextMenu == null)
                {
                    treeViewItem.ContextMenu = CreateContextMenu();
                }
                
                // Mark as processed
                treeViewItem.Tag = "BehaviorAttached";
                
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
    
    private ContextMenu CreateContextMenu()
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

    /// <summary>
    /// Context menu handler for toggling folder expand/collapse
    /// </summary>
    private void ContextMenu_ToggleExpand(object sender, RoutedEventArgs e)
    {
        if (sender is MenuItem menuItem && 
            menuItem.Parent is ContextMenu contextMenu &&
            contextMenu.PlacementTarget is TreeViewItem treeViewItem &&
            treeViewItem.DataContext is Services.TreeNode node)
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
            menuItem.Parent is ContextMenu contextMenu &&
            contextMenu.PlacementTarget is TreeViewItem treeViewItem &&
            treeViewItem.DataContext is Services.TreeNode node && 
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
        if (sender is MenuItem menuItem && 
            menuItem.Parent is ContextMenu contextMenu &&
            contextMenu.PlacementTarget is TreeViewItem treeViewItem &&
            treeViewItem.DataContext is Services.TreeNode node)
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
        if (sender is MenuItem menuItem && 
            menuItem.Parent is ContextMenu contextMenu &&
            contextMenu.PlacementTarget is TreeViewItem treeViewItem &&
            treeViewItem.DataContext is Services.TreeNode node)
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
