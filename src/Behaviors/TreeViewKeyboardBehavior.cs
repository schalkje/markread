using MarkRead.ViewModels;
using MarkRead.Models;

namespace MarkRead.Behaviors;

/// <summary>
/// Keyboard navigation behavior for TreeView
/// Supports Up/Down/Left/Right/Enter navigation
/// </summary>
public class TreeViewKeyboardBehavior : Behavior<CollectionView>
{
    private CollectionView? _collectionView;

    protected override void OnAttachedTo(CollectionView bindable)
    {
        base.OnAttachedTo(bindable);
        _collectionView = bindable;
        
        // MAUI doesn't have direct keyboard event handling on CollectionView
        // This would need platform-specific implementation or use of handlers
        // For now, this is a placeholder for the keyboard navigation logic
    }

    protected override void OnDetachingFrom(CollectionView bindable)
    {
        base.OnDetachingFrom(bindable);
        _collectionView = null;
    }

    // These methods would be called by platform-specific keyboard handlers
    public void HandleKeyDown(FileTreeViewModel viewModel)
    {
        if (viewModel.SelectedNode == null)
        {
            // Select first node
            if (viewModel.Nodes.Count > 0)
            {
                viewModel.SelectedNode = viewModel.Nodes[0];
            }
            return;
        }

        // Find next visible node
        var flatList = FlattenTree(viewModel.Nodes);
        var currentIndex = flatList.IndexOf(viewModel.SelectedNode);
        if (currentIndex >= 0 && currentIndex < flatList.Count - 1)
        {
            viewModel.SelectedNode = flatList[currentIndex + 1];
        }
    }

    public void HandleKeyUp(FileTreeViewModel viewModel)
    {
        if (viewModel.SelectedNode == null)
        {
            // Select last node
            var flat = FlattenTree(viewModel.Nodes);
            if (flat.Count > 0)
            {
                viewModel.SelectedNode = flat[^1];
            }
            return;
        }

        // Find previous visible node
        var flatList = FlattenTree(viewModel.Nodes);
        var currentIndex = flatList.IndexOf(viewModel.SelectedNode);
        if (currentIndex > 0)
        {
            viewModel.SelectedNode = flatList[currentIndex - 1];
        }
    }

    public void HandleKeyRight(FileTreeViewModel viewModel)
    {
        if (viewModel.SelectedNode == null) return;

        if (viewModel.SelectedNode.Type == FileTreeNodeType.Directory)
        {
            if (!viewModel.SelectedNode.IsExpanded)
            {
                if (viewModel.ToggleNodeExpansionCommand.CanExecute(viewModel.SelectedNode))
                    viewModel.ToggleNodeExpansionCommand.Execute(viewModel.SelectedNode);
            }
            else if (viewModel.SelectedNode.Children.Count > 0)
            {
                // Move to first child
                viewModel.SelectedNode = viewModel.SelectedNode.Children[0];
            }
        }
    }

    public void HandleKeyLeft(FileTreeViewModel viewModel)
    {
        if (viewModel.SelectedNode == null) return;

        if (viewModel.SelectedNode.Type == FileTreeNodeType.Directory && viewModel.SelectedNode.IsExpanded)
        {
            // Collapse
            if (viewModel.ToggleNodeExpansionCommand.CanExecute(viewModel.SelectedNode))
                viewModel.ToggleNodeExpansionCommand.Execute(viewModel.SelectedNode);
        }
        else if (viewModel.SelectedNode.Parent != null)
        {
            // Move to parent
            viewModel.SelectedNode = viewModel.SelectedNode.Parent;
        }
    }

    public void HandleEnter(FileTreeViewModel viewModel)
    {
        if (viewModel.SelectedNode == null) return;

        if (viewModel.SelectedNode.Type == FileTreeNodeType.File)
        {
            if (viewModel.OpenFileCommand.CanExecute(viewModel.SelectedNode))
                viewModel.OpenFileCommand.Execute(viewModel.SelectedNode);
        }
        else
        {
            if (viewModel.ToggleNodeExpansionCommand.CanExecute(viewModel.SelectedNode))
                viewModel.ToggleNodeExpansionCommand.Execute(viewModel.SelectedNode);
        }
    }

    public void HandleCtrlEnter(FileTreeViewModel viewModel)
    {
        if (viewModel.SelectedNode?.Type == FileTreeNodeType.File)
        {
            // Open in new tab - will be implemented when tab system is added
            if (viewModel.OpenFileCommand.CanExecute(viewModel.SelectedNode))
                viewModel.OpenFileCommand.Execute(viewModel.SelectedNode);
        }
    }

    public void HandleF5(FileTreeViewModel viewModel)
    {
        if (viewModel.RefreshCommand.CanExecute(null))
            viewModel.RefreshCommand.Execute(null);
    }

    public void HandleCtrlR(FileTreeViewModel viewModel)
    {
        if (viewModel.RefreshCommand.CanExecute(null))
            viewModel.RefreshCommand.Execute(null);
    }

    private List<FileTreeNode> FlattenTree(IEnumerable<FileTreeNode> nodes)
    {
        var result = new List<FileTreeNode>();
        foreach (var node in nodes)
        {
            result.Add(node);
            if (node.IsExpanded && node.Children.Count > 0)
            {
                result.AddRange(FlattenTree(node.Children));
            }
        }
        return result;
    }
}
