using System;

namespace MarkRead.Services
{
    /// <summary>
    /// Controls animation behavior and performance
    /// </summary>
    public class AnimationSettings
    {
        /// <summary>
        /// Gets or sets the global animation toggle
        /// </summary>
        public bool AnimationsEnabled { get; set; } = true;

        /// <summary>
        /// Gets or sets the accessibility reduced motion preference
        /// </summary>
        public bool ReducedMotion { get; set; } = false;

        /// <summary>
        /// Gets or sets the theme transition time in milliseconds
        /// </summary>
        public int ThemeSwitchDuration { get; set; } = 200;

        /// <summary>
        /// Gets or sets the tab transition time in milliseconds
        /// </summary>
        public int TabAnimationDuration { get; set; } = 150;

        /// <summary>
        /// Gets or sets the sidebar collapse/expand time in milliseconds
        /// </summary>
        public int SidebarAnimationDuration { get; set; } = 250;

        /// <summary>
        /// Gets or sets when the settings were last modified
        /// </summary>
        public DateTime LastModified { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Validates that animation settings contain valid values
        /// </summary>
        public bool IsValid()
        {
            // Animation durations must be 0-1000 milliseconds
            if (ThemeSwitchDuration < 0 || ThemeSwitchDuration > 1000)
                return false;

            if (TabAnimationDuration < 0 || TabAnimationDuration > 1000)
                return false;

            if (SidebarAnimationDuration < 0 || SidebarAnimationDuration > 1000)
                return false;

            return true;
        }

        /// <summary>
        /// Gets the effective duration for theme switching, considering reduced motion settings
        /// </summary>
        public int GetEffectiveThemeDuration()
        {
            if (!AnimationsEnabled || ReducedMotion)
                return 0;

            return ThemeSwitchDuration;
        }

        /// <summary>
        /// Gets the effective duration for tab animations, considering reduced motion settings
        /// </summary>
        public int GetEffectiveTabDuration()
        {
            if (!AnimationsEnabled || ReducedMotion)
                return 0;

            return TabAnimationDuration;
        }

        /// <summary>
        /// Gets the effective duration for sidebar animations, considering reduced motion settings
        /// </summary>
        public int GetEffectiveSidebarDuration()
        {
            if (!AnimationsEnabled || ReducedMotion)
                return 0;

            return SidebarAnimationDuration;
        }

        /// <summary>
        /// Sets reduced motion preference and updates all durations accordingly
        /// </summary>
        public void SetReducedMotion(bool enabled)
        {
            ReducedMotion = enabled;
            LastModified = DateTime.UtcNow;
        }

        /// <summary>
        /// Disables all animations globally
        /// </summary>
        public void DisableAllAnimations()
        {
            AnimationsEnabled = false;
            LastModified = DateTime.UtcNow;
        }

        /// <summary>
        /// Enables all animations with default durations
        /// </summary>
        public void EnableAllAnimations()
        {
            AnimationsEnabled = true;
            ReducedMotion = false;
            LastModified = DateTime.UtcNow;
        }

        /// <summary>
        /// Applies performance optimization by reducing animation complexity
        /// </summary>
        public void ApplyPerformanceMode()
        {
            if (!AnimationsEnabled)
                return;

            // Reduce durations for better performance during intensive operations
            ThemeSwitchDuration = Math.Min(ThemeSwitchDuration, 100);
            TabAnimationDuration = Math.Min(TabAnimationDuration, 75);
            SidebarAnimationDuration = Math.Min(SidebarAnimationDuration, 100);
            
            LastModified = DateTime.UtcNow;
        }

        /// <summary>
        /// Creates default animation settings with reasonable performance values
        /// </summary>
        public static AnimationSettings CreateDefault()
        {
            return new AnimationSettings
            {
                AnimationsEnabled = true,
                ReducedMotion = false,
                ThemeSwitchDuration = 200,
                TabAnimationDuration = 150,
                SidebarAnimationDuration = 250,
                LastModified = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Creates animation settings optimized for accessibility
        /// </summary>
        public static AnimationSettings CreateAccessible()
        {
            return new AnimationSettings
            {
                AnimationsEnabled = true,
                ReducedMotion = true,
                ThemeSwitchDuration = 0,
                TabAnimationDuration = 0,
                SidebarAnimationDuration = 0,
                LastModified = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Creates animation settings optimized for performance
        /// </summary>
        public static AnimationSettings CreatePerformance()
        {
            return new AnimationSettings
            {
                AnimationsEnabled = true,
                ReducedMotion = false,
                ThemeSwitchDuration = 100,
                TabAnimationDuration = 75,
                SidebarAnimationDuration = 100,
                LastModified = DateTime.UtcNow
            };
        }
    }

    /// <summary>
    /// Represents different performance modes for animations
    /// </summary>
    public enum PerformanceMode
    {
        Full,       // All animations enabled with full durations
        Reduced,    // Reduced animation durations for better performance
        Disabled    // All animations disabled
    }
}