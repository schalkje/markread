using System.Globalization;

namespace MarkRead.Converters;

/// <summary>
/// Converts node expansion state to accessibility hint
/// </summary>
public class ExpandStateToHintConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is bool isExpanded)
        {
            return isExpanded ? "Double tap to collapse" : "Double tap to expand";
        }

        return "Double tap to toggle";
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
