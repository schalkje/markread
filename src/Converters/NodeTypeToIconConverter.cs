using System.Globalization;
using MarkRead.Models;

namespace MarkRead.Converters;

/// <summary>
/// Converts node type and expansion state to appropriate icon
/// </summary>
public class NodeTypeToIconConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is FileTreeNodeType nodeType)
        {
            return nodeType switch
            {
                FileTreeNodeType.Directory => "📁", // Folder icon
                FileTreeNodeType.File => "📄", // File icon
                _ => "❓"
            };
        }
        return "❓";
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
