using MarkRead.Models;
using System.Globalization;

namespace MarkRead.Converters;

/// <summary>
/// Converts FileTreeNode type to accessibility description text
/// </summary>
public class NodeTypeToAccessibilityTextConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is FileTreeNodeType nodeType)
        {
            return nodeType switch
            {
                FileTreeNodeType.File => "File",
                FileTreeNodeType.Directory => "Folder",
                _ => "Item"
            };
        }

        return "Item";
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
