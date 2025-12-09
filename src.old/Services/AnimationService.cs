using System;
using System.ComponentModel;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media.Animation;
using MarkRead.App.Services;

namespace MarkRead.Services
{
    /// <summary>
    /// Represents different types of tab transitions
    /// </summary>
    public enum TabTransitionType
    {
        Open,
        Close,
        Switch,
        Scroll
    }

    /// <summary>
    /// Service interface for animation management operations
    /// </summary>
    public interface IAnimationService : INotifyPropertyChanged
    {
        /// <summary>
        /// Gets the current animation settings
        /// </summary>
        AnimationSettings CurrentSettings { get; }

        /// <summary>
        /// Generate theme switch animation
        /// </summary>
        Storyboard CreateThemeTransition();

        /// <summary>
        /// Generate tab management animations
        /// </summary>
        Storyboard CreateTabTransition(TabTransitionType type);

        /// <summary>
        /// Adjust animation complexity
        /// </summary>
        void SetPerformanceMode(PerformanceMode mode);

        /// <summary>
        /// Check if animations are currently enabled
        /// </summary>
        bool AreAnimationsEnabled();

        /// <summary>
        /// Get effective duration for specific animation type
        /// </summary>
        TimeSpan GetEffectiveDuration(AnimationType type);
    }

    /// <summary>
    /// Types of animations supported by the service
    /// </summary>
    public enum AnimationType
    {
        ThemeSwitch,
        TabTransition,
        SidebarToggle
    }

    /// <summary>
    /// Implementation of animation service for managing application animations
    /// </summary>
    public class AnimationService : IAnimationService, INotifyPropertyChanged
    {
        private readonly SettingsService _settingsService;
        private AnimationSettings _currentSettings;

        public event PropertyChangedEventHandler? PropertyChanged;

        /// <summary>
        /// Gets the current animation settings
        /// </summary>
        public AnimationSettings CurrentSettings
        {
            get => _currentSettings;
            private set
            {
                if (_currentSettings != value)
                {
                    _currentSettings = value;
                    OnPropertyChanged(nameof(CurrentSettings));
                }
            }
        }

        public AnimationService(SettingsService settingsService)
        {
            _settingsService = settingsService ?? throw new ArgumentNullException(nameof(settingsService));
            _currentSettings = AnimationSettings.CreateDefault();
        }

        /// <summary>
        /// Initialize the service by loading saved settings
        /// </summary>
        public async Task InitializeAsync()
        {
            CurrentSettings = await LoadAnimationSettings();
        }

        /// <summary>
        /// Generate theme switch animation
        /// </summary>
        public Storyboard CreateThemeTransition()
        {
            var storyboard = new Storyboard();
            
            if (!AreAnimationsEnabled())
                return storyboard;

            var duration = GetEffectiveDuration(AnimationType.ThemeSwitch);
            
            // Create opacity animation for smooth theme transition
            var opacityAnimation = new DoubleAnimation
            {
                From = 1.0,
                To = 0.0,
                Duration = new Duration(TimeSpan.FromMilliseconds(duration.TotalMilliseconds / 2)),
                AutoReverse = true
            };

            storyboard.Children.Add(opacityAnimation);
            return storyboard;
        }

        /// <summary>
        /// Generate tab management animations
        /// </summary>
        public Storyboard CreateTabTransition(TabTransitionType type)
        {
            var storyboard = new Storyboard();
            
            if (!AreAnimationsEnabled())
                return storyboard;

            var duration = GetEffectiveDuration(AnimationType.TabTransition);

            switch (type)
            {
                case TabTransitionType.Open:
                    CreateTabOpenAnimation(storyboard, duration);
                    break;
                case TabTransitionType.Close:
                    CreateTabCloseAnimation(storyboard, duration);
                    break;
                case TabTransitionType.Switch:
                    CreateTabSwitchAnimation(storyboard, duration);
                    break;
                case TabTransitionType.Scroll:
                    CreateTabScrollAnimation(storyboard, duration);
                    break;
            }

            return storyboard;
        }

        private void CreateTabOpenAnimation(Storyboard storyboard, TimeSpan duration)
        {
            // Scale animation for tab opening
            var scaleAnimation = new DoubleAnimation
            {
                From = 0.0,
                To = 1.0,
                Duration = new Duration(duration),
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
            };

            storyboard.Children.Add(scaleAnimation);
        }

        private void CreateTabCloseAnimation(Storyboard storyboard, TimeSpan duration)
        {
            // Scale and fade animation for tab closing
            var scaleAnimation = new DoubleAnimation
            {
                From = 1.0,
                To = 0.0,
                Duration = new Duration(duration),
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseIn }
            };

            var fadeAnimation = new DoubleAnimation
            {
                From = 1.0,
                To = 0.0,
                Duration = new Duration(duration)
            };

            storyboard.Children.Add(scaleAnimation);
            storyboard.Children.Add(fadeAnimation);
        }

        private void CreateTabSwitchAnimation(Storyboard storyboard, TimeSpan duration)
        {
            // Quick highlight animation for tab switching
            var highlightAnimation = new ColorAnimation
            {
                Duration = new Duration(duration),
                AutoReverse = true,
                EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseInOut }
            };

            storyboard.Children.Add(highlightAnimation);
        }

        private void CreateTabScrollAnimation(Storyboard storyboard, TimeSpan duration)
        {
            // Smooth translate animation for tab scrolling
            var translateAnimation = new DoubleAnimation
            {
                Duration = new Duration(duration),
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseInOut }
            };

            storyboard.Children.Add(translateAnimation);
        }

        /// <summary>
        /// Adjust animation complexity
        /// </summary>
        public void SetPerformanceMode(PerformanceMode mode)
        {
            var newSettings = CurrentSettings;

            switch (mode)
            {
                case PerformanceMode.Full:
                    newSettings.EnableAllAnimations();
                    break;
                case PerformanceMode.Reduced:
                    newSettings.ApplyPerformanceMode();
                    break;
                case PerformanceMode.Disabled:
                    newSettings.DisableAllAnimations();
                    break;
            }

            _ = SaveAnimationSettings(newSettings);
        }

        /// <summary>
        /// Check if animations are currently enabled
        /// </summary>
        public bool AreAnimationsEnabled()
        {
            return CurrentSettings.AnimationsEnabled && !CurrentSettings.ReducedMotion;
        }

        /// <summary>
        /// Get effective duration for specific animation type
        /// </summary>
        public TimeSpan GetEffectiveDuration(AnimationType type)
        {
            var duration = type switch
            {
                AnimationType.ThemeSwitch => CurrentSettings.GetEffectiveThemeDuration(),
                AnimationType.TabTransition => CurrentSettings.GetEffectiveTabDuration(),
                AnimationType.SidebarToggle => CurrentSettings.GetEffectiveSidebarDuration(),
                _ => 0
            };

            return TimeSpan.FromMilliseconds(duration);
        }

        /// <summary>
        /// Create sidebar toggle animation
        /// </summary>
        public Storyboard CreateSidebarToggleAnimation(bool isCollapsing)
        {
            var storyboard = new Storyboard();
            
            if (!AreAnimationsEnabled())
                return storyboard;

            var duration = GetEffectiveDuration(AnimationType.SidebarToggle);
            
            // Width animation for sidebar collapse/expand
            var widthAnimation = new DoubleAnimation
            {
                Duration = new Duration(duration),
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseInOut }
            };

            if (isCollapsing)
            {
                widthAnimation.To = 0;
            }
            else
            {
                widthAnimation.To = 300; // Default sidebar width
            }

            storyboard.Children.Add(widthAnimation);
            return storyboard;
        }

        private async Task<AnimationSettings> LoadAnimationSettings()
        {
            try
            {
                return await _settingsService.LoadAnimationSettingsAsync();
            }
            catch
            {
                return AnimationSettings.CreateDefault();
            }
        }

        private async Task SaveAnimationSettings(AnimationSettings settings)
        {
            try
            {
                await _settingsService.SaveAnimationSettingsAsync(settings);
                CurrentSettings = settings;
            }
            catch
            {
                // Ignore save errors, keep current settings in memory
            }
        }

        protected virtual void OnPropertyChanged(string propertyName)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}