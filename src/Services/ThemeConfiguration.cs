using System;
using System.Drawing;
using Microsoft.Win32;

namespace MarkRead.Services
{
    /// <summary>
    /// Represents the available theme types for the application
    /// </summary>
    public enum ThemeType
    {
        Light,
        Dark,
        System
    }

    /// <summary>
    /// Manages application theme settings and color schemes
    /// </summary>
    public class ThemeConfiguration
    {
        /// <summary>
        /// Gets or sets the current active theme selection
        /// </summary>
        public ThemeType CurrentTheme { get; set; } = ThemeType.System;

        /// <summary>
        /// Gets or sets whether to follow OS theme preference
        /// </summary>
        public bool SystemThemeFollow { get; set; } = true;

        /// <summary>
        /// Gets or sets the light theme color definitions
        /// </summary>
        public ColorScheme LightColorScheme { get; set; } = ColorScheme.CreateLightDefault();

        /// <summary>
        /// Gets or sets the dark theme color definitions
        /// </summary>
        public ColorScheme DarkColorScheme { get; set; } = ColorScheme.CreateDarkDefault();

        /// <summary>
        /// Gets or sets the settings modification timestamp
        /// </summary>
        public DateTime LastModified { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Validates that the theme configuration is valid
        /// </summary>
        public bool IsValid()
        {
            return Enum.IsDefined(typeof(ThemeType), CurrentTheme) &&
                   LightColorScheme?.IsValid() == true &&
                   DarkColorScheme?.IsValid() == true;
        }

        /// <summary>
        /// Gets the effective theme based on current settings and system state
        /// </summary>
        public ThemeType GetEffectiveTheme()
        {
            if (!SystemThemeFollow)
                return CurrentTheme;

            if (CurrentTheme == ThemeType.System)
            {
                return DetectWindowsSystemTheme();
            }

            return CurrentTheme;
        }

        /// <summary>
        /// Detects the current Windows system theme preference
        /// </summary>
        private static ThemeType DetectWindowsSystemTheme()
        {
            try
            {
                // Check Windows Registry for theme preference
                using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
                if (key?.GetValue("AppsUseLightTheme") is int appsUseLightTheme)
                {
                    return appsUseLightTheme == 1 ? ThemeType.Light : ThemeType.Dark;
                }
            }
            catch
            {
                // If we can't access registry, default to light theme
            }

            return ThemeType.Light;
        }
    }

    /// <summary>
    /// Defines color palette for light or dark theme
    /// </summary>
    public class ColorScheme
    {
        /// <summary>
        /// Primary background color
        /// </summary>
        public Color Background { get; set; }

        /// <summary>
        /// Primary text color
        /// </summary>
        public Color Foreground { get; set; }

        /// <summary>
        /// Highlight and selection color
        /// </summary>
        public Color Accent { get; set; }

        /// <summary>
        /// Border and separator color
        /// </summary>
        public Color Border { get; set; }

        /// <summary>
        /// Button background color
        /// </summary>
        public Color ButtonBackground { get; set; }

        /// <summary>
        /// Button hover state color
        /// </summary>
        public Color ButtonHover { get; set; }

        /// <summary>
        /// Sidebar area background
        /// </summary>
        public Color SidebarBackground { get; set; }

        /// <summary>
        /// Active tab background
        /// </summary>
        public Color TabActiveBackground { get; set; }

        /// <summary>
        /// Inactive tab background
        /// </summary>
        public Color TabInactiveBackground { get; set; }

        /// <summary>
        /// Validates that all colors are properly set and meet accessibility standards
        /// </summary>
        public bool IsValid()
        {
            // Check that no color is completely transparent
            var colors = new[] { Background, Foreground, Accent, Border, ButtonBackground, 
                               ButtonHover, SidebarBackground, TabActiveBackground, TabInactiveBackground };
            
            foreach (var color in colors)
            {
                if (color.A == 0) return false;
            }

            // TODO: Add color contrast ratio validation for accessibility compliance
            return true;
        }

        /// <summary>
        /// Creates a default light theme color scheme
        /// </summary>
        public static ColorScheme CreateLightDefault()
        {
            return new ColorScheme
            {
                Background = Color.FromArgb(255, 255, 255, 255),      // #FFFFFF
                Foreground = Color.FromArgb(255, 33, 37, 41),         // #212529
                Accent = Color.FromArgb(255, 0, 102, 204),            // #0066CC
                Border = Color.FromArgb(255, 222, 226, 230),          // #DEE2E6
                ButtonBackground = Color.FromArgb(255, 248, 249, 250), // #F8F9FA
                ButtonHover = Color.FromArgb(255, 233, 236, 239),     // #E9ECEF
                SidebarBackground = Color.FromArgb(255, 248, 249, 250), // #F8F9FA
                TabActiveBackground = Color.FromArgb(255, 255, 255, 255), // #FFFFFF
                TabInactiveBackground = Color.FromArgb(255, 248, 249, 250) // #F8F9FA
            };
        }

        /// <summary>
        /// Creates a default dark theme color scheme
        /// </summary>
        public static ColorScheme CreateDarkDefault()
        {
            return new ColorScheme
            {
                Background = Color.FromArgb(255, 26, 26, 26),         // #1A1A1A
                Foreground = Color.FromArgb(255, 255, 255, 255),      // #FFFFFF
                Accent = Color.FromArgb(255, 102, 179, 255),          // #66B3FF
                Border = Color.FromArgb(255, 68, 68, 68),             // #444444
                ButtonBackground = Color.FromArgb(255, 51, 51, 51),   // #333333
                ButtonHover = Color.FromArgb(255, 68, 68, 68),        // #444444
                SidebarBackground = Color.FromArgb(255, 34, 34, 34),  // #222222
                TabActiveBackground = Color.FromArgb(255, 51, 51, 51), // #333333
                TabInactiveBackground = Color.FromArgb(255, 34, 34, 34) // #222222
            };
        }
    }
}