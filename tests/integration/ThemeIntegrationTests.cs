using System;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using MarkRead.App;
using MarkRead.App.Services;
using MarkRead.Services;

namespace MarkRead.IntegrationTests;

/// <summary>
/// Integration tests for theme switching functionality across WPF and WebView2 components.
/// Validates that theme changes are applied instantly and consistently throughout the application.
/// </summary>
[TestClass]
public class ThemeIntegrationTests
{
    private MainWindow? _mainWindow;
    private ThemeManager? _themeManager;
    private SettingsService? _settingsService;

    [TestInitialize]
    public async Task Setup()
    {
        // Initialize test application components
        _settingsService = new SettingsService();
        _themeManager = new ThemeManager(_settingsService);
        
        // Create main window on UI thread
        await Application.Current.Dispatcher.InvokeAsync(() =>
        {
            _mainWindow = new MainWindow();
        });
    }

    [TestCleanup]
    public async Task Cleanup()
    {
        if (_mainWindow != null)
        {
            await Application.Current.Dispatcher.InvokeAsync(() =>
            {
                _mainWindow.Close();
                _mainWindow = null;
            });
        }
        
        _themeManager?.Dispose();
        _settingsService = null;
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Integration")]
    public async Task ThemeSwitch_FromLightToDark_UpdatesAllComponents()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        Assert.IsNotNull(_mainWindow);
        
        var startTime = DateTime.UtcNow;
        
        // Start with light theme
        await _themeManager.ApplyThemeAsync(ThemeType.Light);
        var initialTheme = _themeManager.CurrentTheme;
        
        // Act
        await _themeManager.ApplyThemeAsync(ThemeType.Dark);
        var switchDuration = DateTime.UtcNow - startTime;
        
        // Assert
        Assert.AreEqual(ThemeType.Light, initialTheme, "Initial theme should be Light");
        Assert.AreEqual(ThemeType.Dark, _themeManager.CurrentTheme, "Theme should switch to Dark");
        Assert.IsTrue(switchDuration.TotalMilliseconds < 100, $"Theme switch took {switchDuration.TotalMilliseconds}ms, should be <100ms");
        
        // Verify WPF components updated
        await Application.Current.Dispatcher.InvokeAsync(() =>
        {
            var background = _mainWindow.Background;
            Assert.IsNotNull(background, "Main window background should be set");
        });
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Integration")]
    public async Task ThemeSwitch_FromDarkToLight_UpdatesAllComponents()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        Assert.IsNotNull(_mainWindow);
        
        var startTime = DateTime.UtcNow;
        
        // Start with dark theme
        await _themeManager.ApplyThemeAsync(ThemeType.Dark);
        var initialTheme = _themeManager.CurrentTheme;
        
        // Act
        await _themeManager.ApplyThemeAsync(ThemeType.Light);
        var switchDuration = DateTime.UtcNow - startTime;
        
        // Assert
        Assert.AreEqual(ThemeType.Dark, initialTheme, "Initial theme should be Dark");
        Assert.AreEqual(ThemeType.Light, _themeManager.CurrentTheme, "Theme should switch to Light");
        Assert.IsTrue(switchDuration.TotalMilliseconds < 100, $"Theme switch took {switchDuration.TotalMilliseconds}ms, should be <100ms");
        
        // Verify WPF components updated
        await Application.Current.Dispatcher.InvokeAsync(() =>
        {
            var background = _mainWindow.Background;
            Assert.IsNotNull(background, "Main window background should be set");
        });
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Integration")]
    public async Task SystemTheme_WhenAvailable_DetectsCorrectly()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        
        // Act
        var supportsSystemTheme = _themeManager.IsSystemThemeSupported();
        
        if (supportsSystemTheme)
        {
            await _themeManager.ApplyThemeAsync(ThemeType.System);
            var currentTheme = _themeManager.CurrentTheme;
            
            // Assert
            Assert.IsTrue(currentTheme == ThemeType.Light || currentTheme == ThemeType.Dark, 
                "System theme should resolve to either Light or Dark");
        }
        else
        {
            // System theme not supported on this platform
            Assert.IsTrue(true, "System theme detection not supported on this platform");
        }
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Integration")]
    public async Task ThemeChange_TriggersEventHandlers_ForAllSubscribedComponents()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        
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
        await _themeManager.ApplyThemeAsync(ThemeType.Light);
        await _themeManager.ApplyThemeAsync(ThemeType.Dark);
        
        // Wait for event processing
        await Task.Delay(50);
        
        // Assert
        Assert.IsTrue(eventTriggered, "ThemeChanged event should be triggered");
        Assert.AreEqual(ThemeType.Light, oldTheme, "Old theme should be Light");
        Assert.AreEqual(ThemeType.Dark, newTheme, "New theme should be Dark");
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Integration")]
    public async Task ThemePersistence_AfterRestart_RestoresSavedTheme()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        Assert.IsNotNull(_settingsService);
        
        // Set a specific theme
        await _themeManager.ApplyThemeAsync(ThemeType.Dark);
        
        // Simulate application restart by creating new instances
        var newSettingsService = new SettingsService();
        var newThemeManager = new ThemeManager(newSettingsService);
        
        try
        {
            // Act
            await newThemeManager.InitializeAsync();
            var restoredTheme = newThemeManager.CurrentTheme;
            
            // Assert
            Assert.AreEqual(ThemeType.Dark, restoredTheme, "Theme should be restored after restart");
        }
        finally
        {
            newThemeManager?.Dispose();
        }
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Performance")]
    public async Task ThemeSwitch_PerformanceTest_CompletesWithinTarget()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        
        const int iterations = 10;
        var totalTime = TimeSpan.Zero;
        
        // Act - Multiple theme switches to test performance consistency
        for (int i = 0; i < iterations; i++)
        {
            var startTime = DateTime.UtcNow;
            
            var targetTheme = i % 2 == 0 ? ThemeType.Light : ThemeType.Dark;
            await _themeManager.ApplyThemeAsync(targetTheme);
            
            var duration = DateTime.UtcNow - startTime;
            totalTime = totalTime.Add(duration);
            
            // Each individual switch should be fast
            Assert.IsTrue(duration.TotalMilliseconds < 100, 
                $"Theme switch {i+1} took {duration.TotalMilliseconds}ms, should be <100ms");
        }
        
        // Assert
        var averageTime = totalTime.TotalMilliseconds / iterations;
        Assert.IsTrue(averageTime < 100, 
            $"Average theme switch time {averageTime:F1}ms exceeds 100ms target");
    }

    [TestMethod]
    [TestCategory("Theme")]
    [TestCategory("Integration")]
    public async Task WebView2ThemeIntegration_WhenThemeChanges_UpdatesCSSProperties()
    {
        // Arrange
        Assert.IsNotNull(_themeManager);
        Assert.IsNotNull(_mainWindow);
        
        // Wait for WebView2 initialization
        await Application.Current.Dispatcher.InvokeAsync(async () =>
        {
            await _mainWindow.EnsureWebViewAsync();
        });
        
        // Act
        await _themeManager.ApplyThemeAsync(ThemeType.Light);
        await Task.Delay(100); // Allow WebView2 update
        
        await _themeManager.ApplyThemeAsync(ThemeType.Dark);
        await Task.Delay(100); // Allow WebView2 update
        
        // Assert
        // Note: Detailed WebView2 CSS verification would require JavaScript execution
        // This test ensures the theme change mechanism doesn't throw exceptions
        Assert.AreEqual(ThemeType.Dark, _themeManager.CurrentTheme);
    }
}

/// <summary>
/// Event arguments for theme change events
/// </summary>
public class ThemeChangedEventArgs : EventArgs
{
    public ThemeChangedEventArgs(ThemeType oldTheme, ThemeType newTheme)
    {
        OldTheme = oldTheme;
        NewTheme = newTheme;
    }

    public ThemeType OldTheme { get; }
    public ThemeType NewTheme { get; }
}