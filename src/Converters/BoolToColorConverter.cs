using System.Globalization;

namespace MarkRead.Converters;

/// <summary>
/// Converts a boolean value to a color based on the converter parameter.
/// Used for styling active vs inactive tabs.
/// </summary>
public class BoolToColorConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is not bool boolValue || parameter is not string param)
            return Colors.Transparent;

        var isDark = Application.Current?.RequestedTheme == AppTheme.Dark;

        return param switch
        {
            "active" => boolValue 
                ? (isDark ? Color.FromArgb("#2D2D2D") : Color.FromArgb("#FFFFFF"))
                : (isDark ? Color.FromArgb("#1E1E1E") : Color.FromArgb("#F3F3F3")),
            _ => Colors.Transparent
        };
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
