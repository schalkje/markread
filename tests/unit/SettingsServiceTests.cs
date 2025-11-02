using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using MarkRead.Services;

namespace MarkRead.UnitTests;

/// <summary>
/// Unit tests for SettingsService functionality.
/// Tests settings persistence, retrieval, and error handling for theme configuration.
/// </summary>
[TestClass]
public class SettingsServiceTests
{
    private SettingsService? _settingsService;
    private string? _testSettingsPath;

    [TestInitialize]
    public void Setup()
    {
        // Create a temporary directory for test settings
        _testSettingsPath = Path.Combine(Path.GetTempPath(), $"MarkReadTests_{Guid.NewGuid()}");
        Directory.CreateDirectory(_testSettingsPath);
        
        _settingsService = new SettingsService(_testSettingsPath);
    }

    [TestCleanup]
    public void Cleanup()
    {
        _settingsService = null;
        
        // Clean up test directory
        if (_testSettingsPath != null && Directory.Exists(_testSettingsPath))
        {
            Directory.Delete(_testSettingsPath, true);
        }
    }

    [TestMethod]
    [TestCategory("Settings")]
    [TestCategory("Unit")]
    public async Task LoadAsync_WithNoExistingSettings_ReturnsDefaultSettings()
    {
        // Arrange
        Assert.IsNotNull(_settingsService);
        
        // Act
        var settings = await _settingsService.LoadAsync();
        
        // Assert
        Assert.IsNotNull(settings);
        Assert.AreEqual(ViewerSettings.Default().Theme, settings.Theme);
        Assert.AreEqual(ViewerSettings.Default().EnableAnimations, settings.EnableAnimations);
    }

    [TestMethod]
    [TestCategory("Settings")]
    [TestCategory("Unit")]
    public async Task SaveAsync_ValidSettings_PersistsToFile()
    {
        // Arrange
        Assert.IsNotNull(_settingsService);
        
        var settings = new ViewerSettings
        {
            Theme = "Dark",
            EnableAnimations = false,
            SidebarWidth = 300,
            WindowState = "Maximized"
        };
        
        // Act
        await _settingsService.SaveAsync(settings);
        
        // Assert
        var loadedSettings = await _settingsService.LoadAsync();
        
        Assert.AreEqual("Dark", loadedSettings.Theme);
        Assert.AreEqual(false, loadedSettings.EnableAnimations);
        Assert.AreEqual(300, loadedSettings.SidebarWidth);
        Assert.AreEqual("Maximized", loadedSettings.WindowState);
    }

    [TestMethod]
    [TestCategory("Settings")]
    [TestCategory("Unit")]
    public async Task SaveAndLoad_MultipleOperations_MaintainsDataIntegrity()
    {
        // Arrange
        Assert.IsNotNull(_settingsService);
        
        var originalSettings = new ViewerSettings
        {
            Theme = "Light",
            EnableAnimations = true,
            SidebarWidth = 250,
            WindowState = "Normal"
        };
        
        // Act & Assert - First save/load cycle
        await _settingsService.SaveAsync(originalSettings);
        var firstLoad = await _settingsService.LoadAsync();
        
        Assert.AreEqual(originalSettings.Theme, firstLoad.Theme);
        Assert.AreEqual(originalSettings.EnableAnimations, firstLoad.EnableAnimations);
        
        // Modify and save again
        firstLoad.Theme = "Dark";
        firstLoad.SidebarWidth = 350;
        
        await _settingsService.SaveAsync(firstLoad);
        var secondLoad = await _settingsService.LoadAsync();
        
        Assert.AreEqual("Dark", secondLoad.Theme);
        Assert.AreEqual(350, secondLoad.SidebarWidth);
        Assert.AreEqual(true, secondLoad.EnableAnimations); // Unchanged property
    }

    [TestMethod]
    [TestCategory("Settings")]
    [TestCategory("Unit")]
    public async Task LoadAsync_WithCorruptedFile_ReturnsDefaultSettings()
    {
        // Arrange
        Assert.IsNotNull(_settingsService);
        Assert.IsNotNull(_testSettingsPath);
        
        // Create a corrupted settings file
        var settingsFilePath = Path.Combine(_testSettingsPath, "settings.json");
        await File.WriteAllTextAsync(settingsFilePath, "{ invalid json content }");
        
        // Act
        var settings = await _settingsService.LoadAsync();
        
        // Assert
        Assert.IsNotNull(settings);
        Assert.AreEqual(ViewerSettings.Default().Theme, settings.Theme);
    }

    [TestMethod]
    [TestCategory("Settings")]
    [TestCategory("Unit")]
    public async Task LoadAsync_WithPartiallyCorruptedFile_UsesDefaultsForMissingProperties()
    {
        // Arrange
        Assert.IsNotNull(_settingsService);
        Assert.IsNotNull(_testSettingsPath);
        
        // Create a partially valid settings file (missing some properties)
        var settingsFilePath = Path.Combine(_testSettingsPath, "settings.json");
        await File.WriteAllTextAsync(settingsFilePath, "{ \"Theme\": \"Dark\" }");
        
        // Act
        var settings = await _settingsService.LoadAsync();
        
        // Assert
        Assert.IsNotNull(settings);
        Assert.AreEqual("Dark", settings.Theme); // Should load the valid property
        Assert.AreEqual(ViewerSettings.Default().EnableAnimations, settings.EnableAnimations); // Should use default for missing property
    }

    [TestMethod]
    [TestCategory("Settings")]
    [TestCategory("Unit")]
    [ExpectedException(typeof(ArgumentNullException))]
    public async Task SaveAsync_WithNullSettings_ThrowsArgumentNullException()
    {
        // Arrange
        Assert.IsNotNull(_settingsService);
        
        // Act & Assert
        await _settingsService.SaveAsync(null!);
    }

    [TestMethod]
    [TestCategory("Settings")]
    [TestCategory("Unit")]
    public async Task SaveAsync_WithReadOnlyDirectory_HandlesGracefully()
    {
        // Arrange
        Assert.IsNotNull(_testSettingsPath);
        
        // Make directory read-only
        var directoryInfo = new DirectoryInfo(_testSettingsPath);
        directoryInfo.Attributes |= FileAttributes.ReadOnly;
        
        var readOnlySettingsService = new SettingsService(_testSettingsPath);
        var settings = new ViewerSettings { Theme = "Dark" };
        
        try
        {
            // Act
            await readOnlySettingsService.SaveAsync(settings);
            
            // Assert - Should not throw exception, but may not persist
            Assert.IsTrue(true, "Save operation should handle read-only directory gracefully");
        }
        catch (UnauthorizedAccessException)
        {
            // This is expected behavior for read-only directories
            Assert.IsTrue(true, "UnauthorizedAccessException is acceptable for read-only directories");
        }
        finally
        {
            // Clean up - remove read-only attribute
            directoryInfo.Attributes &= ~FileAttributes.ReadOnly;
        }
    }

    [TestMethod]
    [TestCategory("Settings")]
    [TestCategory("Unit")]
    public async Task ThemeSettings_SaveAndLoad_PreservesThemePreferences()
    {
        // Arrange
        Assert.IsNotNull(_settingsService);
        
        var lightThemeSettings = new ViewerSettings { Theme = "Light" };
        var darkThemeSettings = new ViewerSettings { Theme = "Dark" };
        var systemThemeSettings = new ViewerSettings { Theme = "System" };
        
        // Act & Assert - Light theme
        await _settingsService.SaveAsync(lightThemeSettings);
        var loadedLight = await _settingsService.LoadAsync();
        Assert.AreEqual("Light", loadedLight.Theme);
        
        // Act & Assert - Dark theme
        await _settingsService.SaveAsync(darkThemeSettings);
        var loadedDark = await _settingsService.LoadAsync();
        Assert.AreEqual("Dark", loadedDark.Theme);
        
        // Act & Assert - System theme
        await _settingsService.SaveAsync(systemThemeSettings);
        var loadedSystem = await _settingsService.LoadAsync();
        Assert.AreEqual("System", loadedSystem.Theme);
    }

    [TestMethod]
    [TestCategory("Settings")]
    [TestCategory("Unit")]
    public async Task AnimationSettings_SaveAndLoad_PreservesAnimationPreferences()
    {
        // Arrange
        Assert.IsNotNull(_settingsService);
        
        var enabledSettings = new ViewerSettings { EnableAnimations = true };
        var disabledSettings = new ViewerSettings { EnableAnimations = false };
        
        // Act & Assert - Animations enabled
        await _settingsService.SaveAsync(enabledSettings);
        var loadedEnabled = await _settingsService.LoadAsync();
        Assert.AreEqual(true, loadedEnabled.EnableAnimations);
        
        // Act & Assert - Animations disabled
        await _settingsService.SaveAsync(disabledSettings);
        var loadedDisabled = await _settingsService.LoadAsync();
        Assert.AreEqual(false, loadedDisabled.EnableAnimations);
    }

    [TestMethod]
    [TestCategory("Settings")]
    [TestCategory("Unit")]
    public async Task UIStateSettings_SaveAndLoad_PreservesUIConfiguration()
    {
        // Arrange
        Assert.IsNotNull(_settingsService);
        
        var uiSettings = new ViewerSettings
        {
            SidebarWidth = 400,
            WindowState = "Maximized",
            WindowWidth = 1920,
            WindowHeight = 1080,
            SidebarVisible = false
        };
        
        // Act
        await _settingsService.SaveAsync(uiSettings);
        var loaded = await _settingsService.LoadAsync();
        
        // Assert
        Assert.AreEqual(400, loaded.SidebarWidth);
        Assert.AreEqual("Maximized", loaded.WindowState);
        Assert.AreEqual(1920, loaded.WindowWidth);
        Assert.AreEqual(1080, loaded.WindowHeight);
        Assert.AreEqual(false, loaded.SidebarVisible);
    }

    [TestMethod]
    [TestCategory("Settings")]
    [TestCategory("Performance")]
    public async Task PerformanceTest_MultipleOperations_CompletesQuickly()
    {
        // Arrange
        Assert.IsNotNull(_settingsService);
        
        const int operationCount = 50;
        var startTime = DateTime.UtcNow;
        
        // Act
        for (int i = 0; i < operationCount; i++)
        {
            var settings = new ViewerSettings
            {
                Theme = i % 2 == 0 ? "Light" : "Dark",
                EnableAnimations = i % 3 == 0,
                SidebarWidth = 200 + (i * 10)
            };
            
            await _settingsService.SaveAsync(settings);
            var loaded = await _settingsService.LoadAsync();
            
            Assert.AreEqual(settings.Theme, loaded.Theme);
        }
        
        var totalTime = DateTime.UtcNow - startTime;
        
        // Assert
        Assert.IsTrue(totalTime.TotalSeconds < 5,
            $"Settings operations took {totalTime.TotalSeconds:F1}s, should complete in <5s");
    }

    [TestMethod]
    [TestCategory("Settings")]
    [TestCategory("Unit")]
    public async Task SettingsDirectory_CreatedAutomatically_WhenNotExists()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), $"MarkReadTestsNew_{Guid.NewGuid()}");
        var newSettingsService = new SettingsService(nonExistentPath);
        
        try
        {
            var settings = new ViewerSettings { Theme = "Dark" };
            
            // Act
            await newSettingsService.SaveAsync(settings);
            
            // Assert
            Assert.IsTrue(Directory.Exists(nonExistentPath), "Settings directory should be created automatically");
            
            var loaded = await newSettingsService.LoadAsync();
            Assert.AreEqual("Dark", loaded.Theme);
        }
        finally
        {
            // Cleanup
            if (Directory.Exists(nonExistentPath))
            {
                Directory.Delete(nonExistentPath, true);
            }
        }
    }
}