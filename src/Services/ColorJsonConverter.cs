using System;
using System.Drawing;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MarkRead.Services
{
    /// <summary>
    /// JSON converter for System.Drawing.Color to enable proper serialization/deserialization
    /// </summary>
    public class ColorJsonConverter : JsonConverter<Color>
    {
        public override Color Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.String)
            {
                var colorString = reader.GetString();
                if (string.IsNullOrEmpty(colorString))
                {
                    return Color.Empty;
                }

                // Support hex format: #RRGGBB or #AARRGGBB
                if (colorString.StartsWith("#"))
                {
                    colorString = colorString.Substring(1);
                    
                    if (colorString.Length == 6)
                    {
                        // RGB format
                        var r = Convert.ToByte(colorString.Substring(0, 2), 16);
                        var g = Convert.ToByte(colorString.Substring(2, 2), 16);
                        var b = Convert.ToByte(colorString.Substring(4, 2), 16);
                        return Color.FromArgb(255, r, g, b);
                    }
                    else if (colorString.Length == 8)
                    {
                        // ARGB format
                        var a = Convert.ToByte(colorString.Substring(0, 2), 16);
                        var r = Convert.ToByte(colorString.Substring(2, 2), 16);
                        var g = Convert.ToByte(colorString.Substring(4, 2), 16);
                        var b = Convert.ToByte(colorString.Substring(6, 2), 16);
                        return Color.FromArgb(a, r, g, b);
                    }
                }

                // Try named color
                try
                {
                    return Color.FromName(colorString);
                }
                catch
                {
                    return Color.Empty;
                }
            }
            else if (reader.TokenType == JsonTokenType.Number)
            {
                // Support ARGB as integer
                var argb = reader.GetInt32();
                return Color.FromArgb(argb);
            }

            return Color.Empty;
        }

        public override void Write(Utf8JsonWriter writer, Color value, JsonSerializerOptions options)
        {
            if (value.IsEmpty || value.A == 0)
            {
                writer.WriteStringValue(string.Empty);
                return;
            }

            // Write as #RRGGBB or #AARRGGBB hex string
            if (value.A == 255)
            {
                writer.WriteStringValue($"#{value.R:X2}{value.G:X2}{value.B:X2}");
            }
            else
            {
                writer.WriteStringValue($"#{value.A:X2}{value.R:X2}{value.G:X2}{value.B:X2}");
            }
        }
    }
}
