using System.Globalization;

namespace MarkRead.Converters;

/// <summary>
/// Converts bool to search option button background color
/// </summary>
public class BoolToSearchOptionBackgroundConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is bool isActive)
        {
            if (isActive)
            {
                // Active state - use accent color
                return Application.Current?.Resources["PrimaryAccent"] as Color;
            }
            else
            {
                // Inactive state - transparent
                return Colors.Transparent;
            }
        }
        return Colors.Transparent;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
