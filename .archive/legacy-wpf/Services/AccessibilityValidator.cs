using System;
using WpfColor = System.Windows.Media.Color;

namespace MarkRead.Services
{
    /// <summary>
    /// Utility for validating accessibility compliance (T081).
    /// Ensures color contrast ratios meet WCAG 2.1 Level AA standards.
    /// </summary>
    public static class AccessibilityValidator
    {
        private const double MinimumTextContrastRatio = 4.5;
        private const double MinimumLargeTextContrastRatio = 3.0;
        private const double MinimumUIComponentContrastRatio = 3.0;

        /// <summary>
        /// Calculates the contrast ratio between two colors.
        /// </summary>
        /// <param name="foreground">Foreground color</param>
        /// <param name="background">Background color</param>
        /// <returns>Contrast ratio (1:1 to 21:1)</returns>
        public static double CalculateContrastRatio(WpfColor foreground, WpfColor background)
        {
            var l1 = GetRelativeLuminance(foreground);
            var l2 = GetRelativeLuminance(background);
            
            var lighter = Math.Max(l1, l2);
            var darker = Math.Min(l1, l2);
            
            return (lighter + 0.05) / (darker + 0.05);
        }

        /// <summary>
        /// Validates that text has sufficient contrast ratio (4.5:1 minimum).
        /// </summary>
        public static bool ValidateTextContrast(WpfColor foreground, WpfColor background)
        {
            return CalculateContrastRatio(foreground, background) >= MinimumTextContrastRatio;
        }

        /// <summary>
        /// Validates that large text (18pt+ or 14pt+ bold) has sufficient contrast (3:1 minimum).
        /// </summary>
        public static bool ValidateLargeTextContrast(WpfColor foreground, WpfColor background)
        {
            return CalculateContrastRatio(foreground, background) >= MinimumLargeTextContrastRatio;
        }

        /// <summary>
        /// Validates that UI components have sufficient contrast (3:1 minimum).
        /// </summary>
        public static bool ValidateUIComponentContrast(WpfColor component, WpfColor background)
        {
            return CalculateContrastRatio(component, background) >= MinimumUIComponentContrastRatio;
        }

        /// <summary>
        /// Gets a human-readable assessment of contrast quality.
        /// </summary>
        public static string GetContrastAssessment(double ratio)
        {
            if (ratio >= 7.0) return "AAA (Enhanced)";
            if (ratio >= 4.5) return "AA (Minimum)";
            if (ratio >= 3.0) return "AA Large Text";
            return "Fail";
        }

        /// <summary>
        /// Calculates relative luminance of a color according to WCAG 2.1.
        /// </summary>
        private static double GetRelativeLuminance(WpfColor color)
        {
            var r = GetSRGBValue(color.R / 255.0);
            var g = GetSRGBValue(color.G / 255.0);
            var b = GetSRGBValue(color.B / 255.0);
            
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }

        /// <summary>
        /// Converts sRGB color component to linear RGB.
        /// </summary>
        private static double GetSRGBValue(double component)
        {
            if (component <= 0.03928)
            {
                return component / 12.92;
            }
            
            return Math.Pow((component + 0.055) / 1.055, 2.4);
        }

        /// <summary>
        /// Generates a detailed accessibility report for a color scheme (T081).
        /// </summary>
        public static string GenerateAccessibilityReport(
            WpfColor background,
            WpfColor foreground,
            WpfColor accent,
            WpfColor border,
            WpfColor secondary)
        {
            var textRatio = CalculateContrastRatio(foreground, background);
            var accentRatio = CalculateContrastRatio(accent, background);
            var borderRatio = CalculateContrastRatio(border, background);
            var secondaryRatio = CalculateContrastRatio(secondary, background);

            return $@"Accessibility Report (WCAG 2.1 Level AA):

Text Contrast:
  Foreground/Background: {textRatio:F2}:1 - {GetContrastAssessment(textRatio)}
  {(ValidateTextContrast(foreground, background) ? "✓ PASS" : "✗ FAIL")} (Minimum: 4.5:1)

UI Component Contrast:
  Accent/Background: {accentRatio:F2}:1 - {GetContrastAssessment(accentRatio)}
  {(ValidateUIComponentContrast(accent, background) ? "✓ PASS" : "✗ FAIL")} (Minimum: 3.0:1)
  
  Border/Background: {borderRatio:F2}:1 - {GetContrastAssessment(borderRatio)}
  {(ValidateUIComponentContrast(border, background) ? "✓ PASS" : "✗ FAIL")} (Minimum: 3.0:1)
  
  Secondary/Background: {secondaryRatio:F2}:1 - {GetContrastAssessment(secondaryRatio)}
  {(ValidateTextContrast(secondary, background) ? "✓ PASS" : "✗ FAIL")} (Minimum: 4.5:1)

Overall: {(ValidateTextContrast(foreground, background) && ValidateUIComponentContrast(accent, background) && ValidateUIComponentContrast(border, background) ? "✓ COMPLIANT" : "✗ NON-COMPLIANT")}";
        }
    }
}
