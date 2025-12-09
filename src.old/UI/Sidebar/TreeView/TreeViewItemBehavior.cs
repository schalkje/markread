using Microsoft.Xaml.Behaviors;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;

namespace MarkRead.App.UI.Sidebar.TreeView;

/// <summary>
/// Behavior for TreeViewItem to handle custom mouse interactions.
/// Enables single-click toggle for folders and Ctrl+Click for opening files in new tabs.
/// </summary>
public class TreeViewItemBehavior : Behavior<TreeViewItem>
{
    protected override void OnAttached()
    {
        base.OnAttached();
        AssociatedObject.PreviewMouseLeftButtonDown += OnMouseLeftButtonDown;
    }

    protected override void OnDetaching()
    {
        AssociatedObject.PreviewMouseLeftButtonDown -= OnMouseLeftButtonDown;
        base.OnDetaching();
    }

    private void OnMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (sender is not TreeViewItem item || item.DataContext is not Services.TreeNode node)
            return;

        // CRITICAL: Only handle if this TreeViewItem is the DIRECT target, not a parent in the chain
        // Check if the click is on a child TreeViewItem
        if (IsClickOnChildTreeViewItem(e, item))
            return;

        // Handle folder clicks
        if (node.Type == Services.NodeType.Folder)
        {
            // Don't interfere if user clicked on the toggle button (arrow)
            if (IsClickOnToggleButton(e))
                return;

            // Single-click toggles expand/collapse
            node.IsExpanded = !node.IsExpanded;
            e.Handled = true;
        }
        // Handle file clicks with Ctrl modifier
        else if (node.Type == Services.NodeType.File)
        {
            bool ctrlPressed = Keyboard.Modifiers.HasFlag(ModifierKeys.Control);
            if (ctrlPressed)
            {
                // Ctrl+Click on file - open in new tab
                var viewModel = FindViewModel(item);
                if (viewModel != null)
                {
                    viewModel.OpenFileInNewTab(node);
                    e.Handled = true;
                }
            }
            // Normal click is handled by TreeView selection logic
        }
    }

    /// <summary>
    /// Checks if the click originated from a child TreeViewItem.
    /// This prevents parent TreeViewItems from handling clicks on their children.
    /// </summary>
    private bool IsClickOnChildTreeViewItem(MouseButtonEventArgs e, TreeViewItem thisItem)
    {
        if (e.OriginalSource is not DependencyObject source)
            return false;

        DependencyObject current = source;

        // Walk up the visual tree
        while (current != null && current != thisItem)
        {
            // If we find another TreeViewItem before reaching thisItem,
            // it means the click is on a child TreeViewItem
            if (current is TreeViewItem childItem && childItem != thisItem)
                return true;

            current = VisualTreeHelper.GetParent(current);
        }

        return false;
    }

    /// <summary>
    /// Detects if the click was on the toggle button (arrow/expander).
    /// Walks up the visual tree to find ToggleButton.
    /// </summary>
    private bool IsClickOnToggleButton(MouseButtonEventArgs e)
    {
        if (e.OriginalSource is not DependencyObject source)
            return false;

        DependencyObject current = source;
        var treeViewItem = AssociatedObject;

        // Walk up the visual tree
        while (current != null && current != treeViewItem)
        {
            // Check if we hit a ToggleButton (the expander arrow)
            if (current is System.Windows.Controls.Primitives.ToggleButton)
                return true;

            current = VisualTreeHelper.GetParent(current);
        }

        return false;
    }

    /// <summary>
    /// Finds the TreeViewViewModel from the visual tree.
    /// </summary>
    private TreeViewViewModel? FindViewModel(DependencyObject element)
    {
        DependencyObject current = element;
        while (current != null)
        {
            if (current is FrameworkElement fe && fe.DataContext is TreeViewViewModel vm)
                return vm;

            current = VisualTreeHelper.GetParent(current);
        }
        return null;
    }
}
