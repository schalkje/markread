using System.Windows;
using System.Windows.Controls;

namespace MarkRead.App.UI.Sidebar.TreeView;

/// <summary>
/// Interaction logic for TreeViewView.xaml
/// </summary>
public partial class TreeViewView : System.Windows.Controls.UserControl
{
    public TreeViewView()
    {
        InitializeComponent();
    }

    private void TreeView_SelectedItemChanged(object sender, RoutedPropertyChangedEventArgs<object> e)
    {
        if (e.NewValue is Services.TreeNode node && DataContext is TreeViewViewModel viewModel)
        {
            viewModel.SelectTreeNodeCommand.Execute(node);
        }
    }
}
