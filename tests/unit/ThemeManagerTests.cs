using System;
using System.Threading.Tasks;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using MarkRead.App;
using MarkRead.App.Services;
using MarkRead.Services;

namespace MarkRead.UnitTests;

/// <summary>
/// Unit tests for ThemeManager class functionality.
/// Tests theme persistence, event handling, and core theme management operations.
/// </summary>
[TestClass]
public class ThemeManagerTests
{
    private SettingsService? _settingsService;
    private ThemeManager? _themeManager;

    [TestInitialize]
    public void Setup()
    {
        _settingsService = new SettingsService();
        _themeManager = new ThemeManager(_settingsService);
    }

    [TestCleanup]
    public void Cleanup()
    {
        _themeManager?.Dispose();
        _themeManager = null;
        _settingsService = null;
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Unit")]
    public void Constructor_WithValidSettingsService_InitializesCorrectly()
    {
        // Arrange & Act
        using var themeManager = new ThemeManager(_settingsService!);
        
        // Assert
        Assert.IsNotNull(themeManager);
        Assert.AreEqual(ThemeType.System, themeManager.CurrentTheme); // Default theme
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Unit")]
    [ExpectedException(typeof(ArgumentNullException))]
    public void Constructor_WithNullSettingsService_ThrowsArgumentNullException()
    {
        // Act & Assert
        using var themeManager = new ThemeManager(null!);
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Unit")]
    public async Task ApplyThemeAsync_ValidTheme_UpdatesCurrentTheme()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        var initialTheme = _themeManager.CurrentTheme;
        
        // Act
        var result = await _themeManager.ApplyThemeAsync(ThemeType.Dark);
        
        // Assert
        Assert.IsTrue(result, "ApplyThemeAsync should return true for successful theme change");
        Assert.AreEqual(ThemeType.Dark, _themeManager.CurrentTheme);
        Assert.AreNotEqual(initialTheme, _themeManager.CurrentTheme);
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Unit")]
    public async Task ApplyThemeAsync_SameTheme_ReturnsFalseAndDoesNotTriggerEvent()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        
        await _themeManager.ApplyThemeAsync(ThemeType.Light);
        
        bool eventTriggered = false;
        _themeManager.ThemeChanged += (s, e) => eventTriggered = true;
        
        // Act
        var result = await _themeManager.ApplyThemeAsync(ThemeType.Light);
        
        // Assert
        Assert.IsFalse(result, "ApplyThemeAsync should return false when theme is unchanged");
        Assert.IsFalse(eventTriggered, "ThemeChanged event should not trigger for same theme");
        Assert.AreEqual(ThemeType.Light, _themeManager.CurrentTheme);
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Unit")]
    public async Task ApplyThemeAsync_DifferentTheme_TriggersThemeChangedEvent()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        
        await _themeManager.ApplyThemeAsync(ThemeType.Light);
        
        bool eventTriggered = false;
        ThemeType? oldTheme = null;
        ThemeType? newTheme = null;
        
        _themeManager.ThemeChanged += (sender, args) =>
        {
            eventTriggered = true;
            oldTheme = args.OldTheme;
            newTheme = args.NewTheme;
        };
        
        // Act
        await _themeManager.ApplyThemeAsync(ThemeType.Dark);
        
        // Assert
        Assert.IsTrue(eventTriggered, "ThemeChanged event should be triggered");
        Assert.AreEqual(ThemeType.Light, oldTheme);
        Assert.AreEqual(ThemeType.Dark, newTheme);
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Unit")]
    public void GetAvailableThemes_ReturnsAllSupportedThemes()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        
        // Act
        var availableThemes = _themeManager.GetAvailableThemes();
        
        // Assert
        Assert.IsNotNull(availableThemes);
        CollectionAssert.Contains(availableThemes.ToList(), ThemeType.Light);
        CollectionAssert.Contains(availableThemes.ToList(), ThemeType.Dark);
        CollectionAssert.Contains(availableThemes.ToList(), ThemeType.System);
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Unit")]
    public void IsSystemThemeSupported_ReturnsConsistentResult()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        
        // Act
        var supported1 = _themeManager.IsSystemThemeSupported();
        var supported2 = _themeManager.IsSystemThemeSupported();
        
        // Assert
        Assert.AreEqual(supported1, supported2, "IsSystemThemeSupported should return consistent results");
        // Note: Actual value depends on OS/platform, so we just test consistency
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Unit")]
    public async Task SystemThemeDetection_WhenSupported_ResolvesToConcreteTheme()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        
        // Act
        if (_themeManager.IsSystemThemeSupported())
        {
            await _themeManager.ApplyThemeAsync(ThemeType.System);
            var resolvedTheme = _themeManager.GetResolvedTheme();
            
            // Assert
            Assert.IsTrue(resolvedTheme == ThemeType.Light || resolvedTheme == ThemeType.Dark,
                "System theme should resolve to either Light or Dark");
            Assert.AreNotEqual(ThemeType.System, resolvedTheme,
                "Resolved theme should be concrete, not System");
        }
        else
        {
            // System theme not supported, should fall back to default
            await _themeManager.ApplyThemeAsync(ThemeType.System);
            var resolvedTheme = _themeManager.GetResolvedTheme();
            
            Assert.IsTrue(resolvedTheme == ThemeType.Light || resolvedTheme == ThemeType.Dark,
                "Unsupported system theme should fall back to Light or Dark");
        }
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Unit")]
    public async Task ThemePersistence_SavesAndRestoresThemePreference()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        Assert.IsNotNull(_settingsService);
        
        // Act - Set and persist theme
        await _themeManager.ApplyThemeAsync(ThemeType.Dark);
        
        // Create new instance to simulate app restart
        using var newThemeManager = new ThemeManager(_settingsService);
        await newThemeManager.InitializeAsync();
        
        // Assert
        Assert.AreEqual(ThemeType.Dark, newThemeManager.CurrentTheme,
            "Theme should be restored from persistence");
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Unit")]
    public async Task InitializeAsync_WithNoSavedSettings_UsesDefaultTheme()
    {
        // Arrange
        var cleanSettingsService = new SettingsService();
        using var themeManager = new ThemeManager(cleanSettingsService);
        
        // Act
        await themeManager.InitializeAsync();
        
        // Assert
        var currentTheme = themeManager.CurrentTheme;
        Assert.IsTrue(currentTheme == ThemeType.System || currentTheme == ThemeType.Light,
            "Default theme should be System or Light");
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Unit")]
    public async Task InitializeAsync_WithCorruptedSettings_FallsBackToDefault()
    {
        // Arrange
        Assert.IsNotNull(_settingsService);
        
        // Simulate corrupted settings by saving invalid theme value
        var settings = await _settingsService.LoadAsync();
        settings.Theme = "InvalidThemeValue";
        await _settingsService.SaveAsync(settings);
        
        using var themeManager = new ThemeManager(_settingsService);
        
        // Act
        await themeManager.InitializeAsync();
        
        // Assert
        var currentTheme = themeManager.CurrentTheme;
        Assert.IsTrue(currentTheme == ThemeType.System || currentTheme == ThemeType.Light,
            "Should fall back to default theme when settings are corrupted");
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Unit")]
    public async Task PerformanceTest_MultipleThemeSwitches_CompletesQuickly()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        
        const int switchCount = 20;
        var startTime = DateTime.UtcNow;
        
        // Act
        for (int i = 0; i < switchCount; i++)
        {
            var theme = i % 2 == 0 ? ThemeType.Light : ThemeType.Dark;
            await _themeManager.ApplyThemeAsync(theme);
        }
        
        var totalTime = DateTime.UtcNow - startTime;
        
        // Assert
        var averageTimePerSwitch = totalTime.TotalMilliseconds / switchCount;
        Assert.IsTrue(averageTimePerSwitch < 50,
            $"Average theme switch time {averageTimePerSwitch:F1}ms should be <50ms");
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Unit")]
    public async Task Dispose_WithActiveThemeManager_CleansUpProperly()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        
        bool eventTriggered = false;
        _themeManager.ThemeChanged += (s, e) => eventTriggered = true;
        
        // Act
        _themeManager.Dispose();
        
        // Try to trigger event after disposal
        try
        {
            await _themeManager.ApplyThemeAsync(ThemeType.Dark);
        }
        catch (ObjectDisposedException)
        {
            // Expected behavior after disposal
        }
        
        // Assert
        Assert.IsFalse(eventTriggered, "Events should not trigger after disposal");
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Unit")]
    public void ThemeChangedEvent_WithMultipleSubscribers_NotifiesAllSubscribers()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        
        int subscriber1Called = 0;
        int subscriber2Called = 0;
        
        _themeManager.ThemeChanged += (s, e) => subscriber1Called++;
        _themeManager.ThemeChanged += (s, e) => subscriber2Called++;
        
        // Act
        _ = Task.Run(async () => await _themeManager.ApplyThemeAsync(ThemeType.Dark));
        
        // Wait for async event handling
        Task.Delay(100).Wait();
        
        // Assert
        Assert.AreEqual(1, subscriber1Called, "First subscriber should be notified");
        Assert.AreEqual(1, subscriber2Called, "Second subscriber should be notified");
    }
}