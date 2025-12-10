using MarkRead.Models;
using System.Globalization;

namespace MarkRead.Converters;

/// <summary>
/// Converts node type to action hint for accessibility
/// </summary>
public class NodeTypeToActionHintConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is FileTreeNodeType nodeType)
        {
            return nodeType switch
            {
                FileTreeNodeType.File => "Double tap to open file",
                FileTreeNodeType.Directory => "Double tap to expand or collapse folder",
                _ => "Double tap to select"
            };
        }

        return "Double tap to select";
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
