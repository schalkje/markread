using System.Globalization;
using MarkRead.Models;

namespace MarkRead.Converters;

/// <summary>
/// Converts tree node level to indentation width
/// </summary>
public class LevelToIndentConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is int level)
        {
            return level * 16; // 16 pixels per level
        }
        return 0;
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
