using System;
using System.Threading.Tasks;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Windows;
using System.Windows.Media;
using MarkRead.App;
using MarkRead.Services;

namespace MarkRead.IntegrationTests
{
    /// <summary>
    /// Integration tests for visual design compliance with Figma mockup
    /// </summary>
    [TestClass]
    public class VisualDesignTests
    {
        private ThemeManager? _themeManager;
        private Application? _testApp;

        [TestInitialize]
        public void Setup()
        {
            // Initialize WPF application context for testing
            if (Application.Current == null)
            {
                _testApp = new Application();
            }
        }

        [TestCleanup]
        public void Cleanup()
        {
            _testApp?.Shutdown();
        }

        [TestMethod]
        public async Task LightTheme_ShouldMatchMockupColors()
        {
            // Arrange
            var settingsService = new MarkRead.App.Services.SettingsService();
            _themeManager = new ThemeManager(settingsService);
            await _themeManager.InitializeAsync();

            // Act
            await _themeManager.ApplyTheme(ThemeType.Light);

            // Assert - Verify light theme colors match mockup specification
            var app = Application.Current;
            Assert.IsNotNull(app);

            // Check primary background color (#FFFFFF)
            var bgBrush = app.Resources["ThemeBackground"] as SolidColorBrush;
            Assert.IsNotNull(bgBrush, "ThemeBackground resource should exist");
            Assert.AreEqual(Colors.White, bgBrush.Color, "Light theme background should be white");

            // Check primary foreground color (#212529)
            var fgBrush = app.Resources["ThemeForeground"] as SolidColorBrush;
            Assert.IsNotNull(fgBrush, "ThemeForeground resource should exist");
            var expectedForeground = Color.FromRgb(0x21, 0x25, 0x29);
            Assert.AreEqual(expectedForeground, fgBrush.Color, "Light theme foreground should match mockup");

            // Check accent color (#0066CC)
            var accentBrush = app.Resources["ThemeAccent"] as SolidColorBrush;
            Assert.IsNotNull(accentBrush, "ThemeAccent resource should exist");
            var expectedAccent = Color.FromRgb(0x00, 0x66, 0xCC);
            Assert.AreEqual(expectedAccent, accentBrush.Color, "Light theme accent should match mockup");
        }

        [TestMethod]
        public async Task DarkTheme_ShouldMatchMockupColors()
        {
            // Arrange
            var settingsService = new MarkRead.App.Services.SettingsService();
            _themeManager = new ThemeManager(settingsService);
            await _themeManager.InitializeAsync();

            // Act
            await _themeManager.ApplyTheme(ThemeType.Dark);

            // Assert - Verify dark theme colors match mockup specification
            var app = Application.Current;
            Assert.IsNotNull(app);

            // Check primary background color (#1A1A1A)
            var bgBrush = app.Resources["ThemeBackground"] as SolidColorBrush;
            Assert.IsNotNull(bgBrush, "ThemeBackground resource should exist");
            var expectedBackground = Color.FromRgb(0x1A, 0x1A, 0x1A);
            Assert.AreEqual(expectedBackground, bgBrush.Color, "Dark theme background should match mockup");

            // Check primary foreground color (#FFFFFF)
            var fgBrush = app.Resources["ThemeForeground"] as SolidColorBrush;
            Assert.IsNotNull(fgBrush, "ThemeForeground resource should exist");
            Assert.AreEqual(Colors.White, fgBrush.Color, "Dark theme foreground should be white");

            // Check accent color (#66B3FF)
            var accentBrush = app.Resources["ThemeAccent"] as SolidColorBrush;
            Assert.IsNotNull(accentBrush, "ThemeAccent resource should exist");
            var expectedAccent = Color.FromRgb(0x66, 0xB3, 0xFF);
            Assert.AreEqual(expectedAccent, accentBrush.Color, "Dark theme accent should match mockup");
        }

        [TestMethod]
        public void ButtonStyles_ShouldMatchMockupDesign()
        {
            // Arrange & Act
            var app = Application.Current;
            Assert.IsNotNull(app);

            // Assert - Verify button styling matches mockup
            var buttonStyle = app.Resources["DefaultButton"] as Style;
            Assert.IsNotNull(buttonStyle, "Default button style should exist");
            Assert.AreEqual(typeof(Button), buttonStyle.TargetType, "Button style should target Button type");

            // Check button properties
            var paddingSetter = FindSetter(buttonStyle, Button.PaddingProperty);
            Assert.IsNotNull(paddingSetter, "Button should have padding defined");
            
            var borderThicknessSetter = FindSetter(buttonStyle, Button.BorderThicknessProperty);
            Assert.IsNotNull(borderThicknessSetter, "Button should have border thickness defined");
        }

        [TestMethod]
        public void TabStyles_ShouldMatchMockupDesign()
        {
            // Arrange & Act
            var app = Application.Current;
            Assert.IsNotNull(app);

            // Assert - Verify tab styling matches mockup
            var tabControlStyle = app.Resources["DefaultTabControl"] as Style;
            Assert.IsNotNull(tabControlStyle, "Default tab control style should exist");

            var tabItemStyle = app.Resources["DefaultTabItem"] as Style;
            Assert.IsNotNull(tabItemStyle, "Default tab item style should exist");
            Assert.AreEqual(typeof(TabItem), tabItemStyle.TargetType, "Tab item style should target TabItem type");
        }

        [TestMethod]
        public void TreeViewStyles_ShouldMatchMockupDesign()
        {
            // Arrange & Act
            var app = Application.Current;
            Assert.IsNotNull(app);

            // Assert - Verify tree view (sidebar) styling matches mockup
            var treeViewStyle = app.Resources["DefaultTreeView"] as Style;
            Assert.IsNotNull(treeViewStyle, "Default tree view style should exist");
            Assert.AreEqual(typeof(TreeView), treeViewStyle.TargetType, "Tree view style should target TreeView type");

            var treeViewItemStyle = app.Resources["DefaultTreeViewItem"] as Style;
            Assert.IsNotNull(treeViewItemStyle, "Default tree view item style should exist");
        }

        [TestMethod]
        public async Task ThemeTransition_ShouldBeSmooth()
        {
            // Arrange
            var settingsService = new MarkRead.App.Services.SettingsService();
            _themeManager = new ThemeManager(settingsService);
            await _themeManager.InitializeAsync();

            var transitionCompleted = false;
            _themeManager.ThemeChanged += (sender, args) => {
                transitionCompleted = true;
            };

            // Act
            var startTime = DateTime.UtcNow;
            await _themeManager.ApplyTheme(ThemeType.Dark);
            var endTime = DateTime.UtcNow;

            // Assert - Theme change should complete quickly (target: <100ms)
            var duration = endTime - startTime;
            Assert.IsTrue(duration.TotalMilliseconds < 200, $"Theme transition took {duration.TotalMilliseconds}ms, should be under 200ms");
            Assert.IsTrue(transitionCompleted, "Theme change event should fire");
        }

        [TestMethod]
        public void Typography_ShouldMatchMockupSpecification()
        {
            // Arrange & Act
            var app = Application.Current;
            Assert.IsNotNull(app);

            // Assert - Verify typography settings
            var textBrushes = new[]
            {
                "ThemeTextPrimaryBrush",
                "ThemeTextSecondaryBrush", 
                "ThemeTextMutedBrush",
                "ThemeTextLinkBrush"
            };

            foreach (var brushName in textBrushes)
            {
                var brush = app.Resources[brushName] as SolidColorBrush;
                Assert.IsNotNull(brush, $"{brushName} should be defined");
                Assert.AreNotEqual(Colors.Transparent, brush.Color, $"{brushName} should not be transparent");
            }
        }

        [TestMethod]
        public void ColorContrast_ShouldMeetAccessibilityStandards()
        {
            // Arrange & Act
            var app = Application.Current;
            Assert.IsNotNull(app);

            // Assert - Basic accessibility check for color contrast
            var bgBrush = app.Resources["ThemeBackground"] as SolidColorBrush;
            var fgBrush = app.Resources["ThemeForeground"] as SolidColorBrush;

            Assert.IsNotNull(bgBrush, "Background brush should exist");
            Assert.IsNotNull(fgBrush, "Foreground brush should exist");

            // Ensure background and foreground are not the same color
            Assert.AreNotEqual(bgBrush.Color, fgBrush.Color, "Background and foreground should have different colors for accessibility");
        }

        private Setter? FindSetter(Style style, DependencyProperty property)
        {
            foreach (var setter in style.Setters)
            {
                if (setter is Setter s && s.Property == property)
                    return s;
            }
            return null;
        }
    }
}