using System.Globalization;

namespace MarkRead.Converters;

/// <summary>
/// Converts a count/integer to a visibility boolean.
/// Returns true if count > 0, false otherwise.
/// </summary>
public class CountToVisibilityConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is int count)
        {
            return count > 0;
        }
        return false;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
