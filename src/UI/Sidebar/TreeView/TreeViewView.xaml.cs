using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

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
