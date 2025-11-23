using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Threading;
using System.Drawing;
using AnimationSettings = MarkRead.Services.AnimationSettings;
using ColorJsonConverter = MarkRead.Services.ColorJsonConverter;
using ThemeConfiguration = MarkRead.Services.ThemeConfiguration;
using UIState = MarkRead.Services.UIState;

namespace MarkRead.App.Services;

/// <summary>
/// Persists viewer settings to disk. Enhanced implementation supports theme configuration,
/// UI state, and animation settings with JSON persistence under LocalApplicationData.
/// </summary>
public class SettingsService
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new ColorJsonConverter() }
    };

    private readonly string _settingsFile;
    private readonly string _themeSettingsFile;
    private readonly string _uiStateFile;
    private readonly string _animationSettingsFile;
    private readonly string _treeViewSettingsFile;
    private readonly string _folderExclusionSettingsFile;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private ViewerSettings _currentSettings = ViewerSettings.Default();
    private ThemeConfiguration? _themeConfiguration;
    private UIState? _uiState;
    private AnimationSettings? _animationSettings;
    private TreeViewSettings? _treeViewSettings;
    private FolderExclusionSettings? _folderExclusionSettings;
    private bool _isLoaded;

    public SettingsService()
    {
        string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "MarkRead");
        Directory.CreateDirectory(root);
        _settingsFile = Path.Combine(root, "settings.json");
        _themeSettingsFile = Path.Combine(root, "theme-settings.json");
        _uiStateFile = Path.Combine(root, "ui-state.json");
        _animationSettingsFile = Path.Combine(root, "animation-settings.json");
        _treeViewSettingsFile = Path.Combine(root, "treeview-settings.json");
        _folderExclusionSettingsFile = Path.Combine(root, "folder-exclusion-settings.json");
    }

    public async Task<ViewerSettings> LoadAsync()
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            if (_isLoaded)
            {
                return _currentSettings;
            }

            if (!File.Exists(_settingsFile))
            {
                _currentSettings = ViewerSettings.Default();
                _isLoaded = true;
                return _currentSettings;
            }

            await using FileStream stream = File.OpenRead(_settingsFile);
            var loaded = await JsonSerializer.DeserializeAsync<ViewerSettings>(stream).ConfigureAwait(false);
            _currentSettings = loaded ?? ViewerSettings.Default();
            _isLoaded = true;
            return _currentSettings;
        }
        catch (JsonException)
        {
            _currentSettings = ViewerSettings.Default();
            _isLoaded = true;
            return _currentSettings;
        }
        catch (IOException)
        {
            return _currentSettings;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task SaveAsync(ViewerSettings settings)
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            await PersistAsync(settings).ConfigureAwait(false);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<ViewerSettings> UpdateAsync(Func<ViewerSettings, ViewerSettings> updater)
    {
        if (updater is null)
        {
            throw new ArgumentNullException(nameof(updater));
        }

        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            if (!_isLoaded)
            {
                await LoadAsync().ConfigureAwait(false);
            }

            var updated = updater(_currentSettings);
            await PersistAsync(updated).ConfigureAwait(false);
            return _currentSettings;
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task PersistAsync(ViewerSettings settings)
    {
        var tempFile = _settingsFile + ".tmp";

        try
        {
            await using (FileStream stream = File.Create(tempFile))
            {
                await JsonSerializer.SerializeAsync(stream, settings, SerializerOptions).ConfigureAwait(false);
            }

            File.Copy(tempFile, _settingsFile, overwrite: true);
            _currentSettings = settings;
            _isLoaded = true;
        }
        finally
        {
            if (File.Exists(tempFile))
            {
                try
                {
                    File.Delete(tempFile);
                }
                catch
                {
                    // Ignored: temp file cleanup best effort.
                }
            }
        }
    }

    // Theme Configuration Management

    /// <summary>
    /// Loads theme configuration from disk (T080: Enhanced with corruption detection)
    /// </summary>
    public async Task<ThemeConfiguration> LoadThemeConfigurationAsync()
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            if (_themeConfiguration != null)
                return _themeConfiguration;

            if (!File.Exists(_themeSettingsFile))
            {
                _themeConfiguration = new ThemeConfiguration();
                return _themeConfiguration;
            }

            // Check for corruption before loading
            if (IsFileCorrupted(_themeSettingsFile))
            {
                await RestoreFromBackupAsync();
                
                // If still corrupted or doesn't exist, use default
                if (!File.Exists(_themeSettingsFile) || IsFileCorrupted(_themeSettingsFile))
                {
                    _themeConfiguration = new ThemeConfiguration();
                    await PersistThemeConfigurationAsync(_themeConfiguration); // Save default
                    return _themeConfiguration;
                }
            }

            await using FileStream stream = File.OpenRead(_themeSettingsFile);
            var loaded = await JsonSerializer.DeserializeAsync<ThemeConfiguration>(stream).ConfigureAwait(false);
            _themeConfiguration = loaded ?? new ThemeConfiguration();
            return _themeConfiguration;
        }
        catch (JsonException)
        {
            _themeConfiguration = new ThemeConfiguration();
            return _themeConfiguration;
        }
        catch (IOException)
        {
            return _themeConfiguration ?? new ThemeConfiguration();
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// Saves theme configuration to disk
    /// </summary>
    public async Task SaveThemeConfigurationAsync(ThemeConfiguration themeConfig)
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            await PersistThemeConfigurationAsync(themeConfig).ConfigureAwait(false);
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task PersistThemeConfigurationAsync(ThemeConfiguration themeConfig)
    {
        var tempFile = _themeSettingsFile + ".tmp";

        try
        {
            await using (FileStream stream = File.Create(tempFile))
            {
                await JsonSerializer.SerializeAsync(stream, themeConfig, SerializerOptions).ConfigureAwait(false);
            }

            File.Copy(tempFile, _themeSettingsFile, overwrite: true);
            _themeConfiguration = themeConfig;
        }
        finally
        {
            if (File.Exists(tempFile))
            {
                try
                {
                    File.Delete(tempFile);
                }
                catch
                {
                    // Ignored: temp file cleanup best effort.
                }
            }
        }
    }

    // UI State Management

    /// <summary>
    /// Loads UI state from disk
    /// </summary>
    public async Task<UIState> LoadUIStateAsync()
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            if (_uiState != null)
                return _uiState;

            if (!File.Exists(_uiStateFile))
            {
                _uiState = UIState.CreateDefault();
                return _uiState;
            }

            await using FileStream stream = File.OpenRead(_uiStateFile);
            var loaded = await JsonSerializer.DeserializeAsync<UIState>(stream).ConfigureAwait(false);
            _uiState = loaded ?? UIState.CreateDefault();
            
            // Validate loaded state
            if (!_uiState.IsValid())
            {
                _uiState = UIState.CreateDefault();
            }

            return _uiState;
        }
        catch (JsonException)
        {
            _uiState = UIState.CreateDefault();
            return _uiState;
        }
        catch (IOException)
        {
            return _uiState ?? UIState.CreateDefault();
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// Saves UI state to disk
    /// </summary>
    public async Task SaveUIStateAsync(UIState uiState)
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            await PersistUIStateAsync(uiState).ConfigureAwait(false);
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task PersistUIStateAsync(UIState uiState)
    {
        var tempFile = _uiStateFile + ".tmp";

        try
        {
            await using (FileStream stream = File.Create(tempFile))
            {
                await JsonSerializer.SerializeAsync(stream, uiState, SerializerOptions).ConfigureAwait(false);
            }

            File.Copy(tempFile, _uiStateFile, overwrite: true);
            _uiState = uiState;
        }
        finally
        {
            if (File.Exists(tempFile))
            {
                try
                {
                    File.Delete(tempFile);
                }
                catch
                {
                    // Ignored: temp file cleanup best effort.
                }
            }
        }
    }

    // Animation Settings Management

    /// <summary>
    /// Loads animation settings from disk
    /// </summary>
    public async Task<AnimationSettings> LoadAnimationSettingsAsync()
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            if (_animationSettings != null)
                return _animationSettings;

            if (!File.Exists(_animationSettingsFile))
            {
                _animationSettings = AnimationSettings.CreateDefault();
                return _animationSettings;
            }

            await using FileStream stream = File.OpenRead(_animationSettingsFile);
            var loaded = await JsonSerializer.DeserializeAsync<AnimationSettings>(stream).ConfigureAwait(false);
            _animationSettings = loaded ?? AnimationSettings.CreateDefault();
            
            // Validate loaded settings
            if (!_animationSettings.IsValid())
            {
                _animationSettings = AnimationSettings.CreateDefault();
            }

            return _animationSettings;
        }
        catch (JsonException)
        {
            _animationSettings = AnimationSettings.CreateDefault();
            return _animationSettings;
        }
        catch (IOException)
        {
            return _animationSettings ?? AnimationSettings.CreateDefault();
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// Saves animation settings to disk
    /// </summary>
    public async Task SaveAnimationSettingsAsync(AnimationSettings animationSettings)
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            await PersistAnimationSettingsAsync(animationSettings).ConfigureAwait(false);
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task PersistAnimationSettingsAsync(AnimationSettings animationSettings)
    {
        var tempFile = _animationSettingsFile + ".tmp";

        try
        {
            await using (FileStream stream = File.Create(tempFile))
            {
                await JsonSerializer.SerializeAsync(stream, animationSettings, SerializerOptions).ConfigureAwait(false);
            }

            File.Copy(tempFile, _animationSettingsFile, overwrite: true);
            _animationSettings = animationSettings;
        }
        finally
        {
            if (File.Exists(tempFile))
            {
                try
                {
                    File.Delete(tempFile);
                }
                catch
                {
                    // Ignored: temp file cleanup best effort.
                }
            }
        }
    }

    // TreeView Settings Management

    /// <summary>
    /// Loads TreeView settings from disk
    /// </summary>
    public async Task<TreeViewSettings> LoadTreeViewSettingsAsync()
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            if (_treeViewSettings != null)
                return _treeViewSettings;

            if (!File.Exists(_treeViewSettingsFile))
            {
                _treeViewSettings = new TreeViewSettings();
                return _treeViewSettings;
            }

            await using FileStream stream = File.OpenRead(_treeViewSettingsFile);
            var loaded = await JsonSerializer.DeserializeAsync<TreeViewSettings>(stream).ConfigureAwait(false);
            _treeViewSettings = loaded ?? new TreeViewSettings();
            return _treeViewSettings;
        }
        catch (JsonException)
        {
            _treeViewSettings = new TreeViewSettings();
            return _treeViewSettings;
        }
        catch (IOException)
        {
            return _treeViewSettings ?? new TreeViewSettings();
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// Saves TreeView settings to disk
    /// </summary>
    public async Task SaveTreeViewSettingsAsync(TreeViewSettings treeViewSettings)
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            await PersistTreeViewSettingsAsync(treeViewSettings).ConfigureAwait(false);
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// Updates TreeView settings using an updater function
    /// </summary>
    public async Task<TreeViewSettings> UpdateTreeViewSettingsAsync(Func<TreeViewSettings, TreeViewSettings> updater)
    {
        if (updater is null)
        {
            throw new ArgumentNullException(nameof(updater));
        }

        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            if (_treeViewSettings == null)
            {
                await LoadTreeViewSettingsAsync().ConfigureAwait(false);
            }

            var updated = updater(_treeViewSettings!);
            await PersistTreeViewSettingsAsync(updated).ConfigureAwait(false);
            return _treeViewSettings!;
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task PersistTreeViewSettingsAsync(TreeViewSettings treeViewSettings)
    {
        var tempFile = _treeViewSettingsFile + ".tmp";

        try
        {
            await using (FileStream stream = File.Create(tempFile))
            {
                await JsonSerializer.SerializeAsync(stream, treeViewSettings, SerializerOptions).ConfigureAwait(false);
            }

            File.Copy(tempFile, _treeViewSettingsFile, overwrite: true);
            _treeViewSettings = treeViewSettings;
        }
        finally
        {
            if (File.Exists(tempFile))
            {
                try
                {
                    File.Delete(tempFile);
                }
                catch
                {
                    // Ignored: temp file cleanup best effort.
                }
            }
        }
    }

    /// <summary>
    /// Creates backup copies of all settings files (T080: Enhanced backup system)
    /// </summary>
    public async Task CreateBackupAsync()
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
            
            if (File.Exists(_settingsFile))
                File.Copy(_settingsFile, $"{_settingsFile}.backup-{timestamp}", overwrite: true);
            
            if (File.Exists(_themeSettingsFile))
                File.Copy(_themeSettingsFile, $"{_themeSettingsFile}.backup-{timestamp}", overwrite: true);
            
            if (File.Exists(_uiStateFile))
                File.Copy(_uiStateFile, $"{_uiStateFile}.backup-{timestamp}", overwrite: true);
            
            if (File.Exists(_animationSettingsFile))
                File.Copy(_animationSettingsFile, $"{_animationSettingsFile}.backup-{timestamp}", overwrite: true);
            
            if (File.Exists(_treeViewSettingsFile))
                File.Copy(_treeViewSettingsFile, $"{_treeViewSettingsFile}.backup-{timestamp}", overwrite: true);
            
            if (File.Exists(_folderExclusionSettingsFile))
                File.Copy(_folderExclusionSettingsFile, $"{_folderExclusionSettingsFile}.backup-{timestamp}", overwrite: true);
            
            // Clean up old backups (keep last 5)
            CleanupOldBackups();
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// Restores settings from the most recent backup (T080).
    /// </summary>
    public async Task<bool> RestoreFromBackupAsync()
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            var settingsDir = Path.GetDirectoryName(_settingsFile);
            if (settingsDir == null) return false;

            var backupFiles = Directory.GetFiles(settingsDir, "*.backup-*");
            if (backupFiles.Length == 0) return false;

            // Find most recent backup
            Array.Sort(backupFiles);
            var mostRecent = backupFiles[^1];
            var timestamp = mostRecent.Split(".backup-")[^1];

            // Restore all settings files from that backup
            RestoreFile($"{_settingsFile}.backup-{timestamp}", _settingsFile);
            RestoreFile($"{_themeSettingsFile}.backup-{timestamp}", _themeSettingsFile);
            RestoreFile($"{_uiStateFile}.backup-{timestamp}", _uiStateFile);
            RestoreFile($"{_animationSettingsFile}.backup-{timestamp}", _animationSettingsFile);
            RestoreFile($"{_treeViewSettingsFile}.backup-{timestamp}", _treeViewSettingsFile);
            RestoreFile($"{_folderExclusionSettingsFile}.backup-{timestamp}", _folderExclusionSettingsFile);

            // Clear cached settings to force reload
            _isLoaded = false;
            _themeConfiguration = null;
            _uiState = null;
            _animationSettings = null;
            _treeViewSettings = null;
            _folderExclusionSettings = null;

            return true;
        }
        catch
        {
            return false;
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// Resets all settings to factory defaults (T080).
    /// </summary>
    public async Task ResetToFactoryDefaultsAsync()
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            // Create backup before reset
            await CreateBackupAsync();

            // Delete all settings files
            if (File.Exists(_settingsFile)) File.Delete(_settingsFile);
            if (File.Exists(_themeSettingsFile)) File.Delete(_themeSettingsFile);
            if (File.Exists(_uiStateFile)) File.Delete(_uiStateFile);
            if (File.Exists(_animationSettingsFile)) File.Delete(_animationSettingsFile);
            if (File.Exists(_treeViewSettingsFile)) File.Delete(_treeViewSettingsFile);
            if (File.Exists(_folderExclusionSettingsFile)) File.Delete(_folderExclusionSettingsFile);

            // Reset in-memory state
            _currentSettings = ViewerSettings.Default();
            _themeConfiguration = new ThemeConfiguration();
            _uiState = UIState.CreateDefault();
            _animationSettings = AnimationSettings.CreateDefault();
            _treeViewSettings = new TreeViewSettings();
            _folderExclusionSettings = FolderExclusionSettings.CreateDefault();
            _isLoaded = false;

            // Save factory defaults
            await PersistAsync(_currentSettings);
            await PersistThemeConfigurationAsync(_themeConfiguration);
            await PersistUIStateAsync(_uiState);
            await PersistAnimationSettingsAsync(_animationSettings);
            await PersistTreeViewSettingsAsync(_treeViewSettings);
            await PersistFolderExclusionSettingsAsync(_folderExclusionSettings);
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// Detects if a settings file is corrupted (T080).
    /// </summary>
    private static bool IsFileCorrupted(string filePath)
    {
        if (!File.Exists(filePath)) return false;

        try
        {
            var content = File.ReadAllText(filePath);
            // Basic corruption checks
            if (string.IsNullOrWhiteSpace(content)) return true;
            if (!content.TrimStart().StartsWith("{")) return true;
            if (!content.TrimEnd().EndsWith("}")) return true;
            
            // Try to parse as JSON
            using var doc = JsonDocument.Parse(content);
            return false;
        }
        catch
        {
            return true;
        }
    }

    /// <summary>
    /// Cleans up old backup files, keeping only the most recent 5 (T080).
    /// </summary>
    private void CleanupOldBackups()
    {
        try
        {
            var settingsDir = Path.GetDirectoryName(_settingsFile);
            if (settingsDir == null) return;

            var backupFiles = Directory.GetFiles(settingsDir, "*.backup-*");
            if (backupFiles.Length <= 5) return;

            Array.Sort(backupFiles);
            
            // Delete all but the 5 most recent
            for (int i = 0; i < backupFiles.Length - 5; i++)
            {
                try
                {
                    File.Delete(backupFiles[i]);
                }
                catch
                {
                    // Ignore cleanup failures
                }
            }
        }
        catch
        {
            // Ignore cleanup failures
        }
    }

    /// <summary>
    /// Restores a single file from backup (T080).
    /// </summary>
    private static void RestoreFile(string backupPath, string targetPath)
    {
        if (File.Exists(backupPath))
        {
            File.Copy(backupPath, targetPath, overwrite: true);
        }
    }

    // Folder Exclusion Settings Management

    /// <summary>
    /// Loads folder exclusion settings from disk.
    /// </summary>
    public async Task<FolderExclusionSettings> LoadFolderExclusionSettingsAsync()
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            if (_folderExclusionSettings != null)
                return _folderExclusionSettings;

            if (!File.Exists(_folderExclusionSettingsFile))
            {
                _folderExclusionSettings = FolderExclusionSettings.CreateDefault();
                return _folderExclusionSettings;
            }

            await using FileStream stream = File.OpenRead(_folderExclusionSettingsFile);
            var loaded = await JsonSerializer.DeserializeAsync<FolderExclusionSettings>(stream).ConfigureAwait(false);
            _folderExclusionSettings = loaded ?? FolderExclusionSettings.CreateDefault();
            return _folderExclusionSettings;
        }
        catch (JsonException)
        {
            _folderExclusionSettings = FolderExclusionSettings.CreateDefault();
            return _folderExclusionSettings;
        }
        catch (IOException)
        {
            return _folderExclusionSettings ?? FolderExclusionSettings.CreateDefault();
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// Forces a reload of folder exclusion settings from disk, bypassing cache.
    /// </summary>
    public async Task<FolderExclusionSettings> ReloadFolderExclusionSettingsAsync()
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            // Clear cache to force reload
            _folderExclusionSettings = null;
        }
        finally
        {
            _gate.Release();
        }

        // Now load fresh from disk
        return await LoadFolderExclusionSettingsAsync();
    }

    /// <summary>
    /// Saves folder exclusion settings to disk.
    /// </summary>
    public async Task SaveFolderExclusionSettingsAsync(FolderExclusionSettings folderExclusionSettings)
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            await PersistFolderExclusionSettingsAsync(folderExclusionSettings).ConfigureAwait(false);
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// Updates folder exclusion settings using an updater function.
    /// </summary>
    public async Task<FolderExclusionSettings> UpdateFolderExclusionSettingsAsync(Func<FolderExclusionSettings, FolderExclusionSettings> updater)
    {
        if (updater is null)
        {
            throw new ArgumentNullException(nameof(updater));
        }

        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            if (_folderExclusionSettings == null)
            {
                await LoadFolderExclusionSettingsAsync().ConfigureAwait(false);
            }

            var updated = updater(_folderExclusionSettings!);
            await PersistFolderExclusionSettingsAsync(updated).ConfigureAwait(false);
            return _folderExclusionSettings!;
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task PersistFolderExclusionSettingsAsync(FolderExclusionSettings folderExclusionSettings)
    {
        var tempFile = _folderExclusionSettingsFile + ".tmp";

        try
        {
            await using (FileStream stream = File.Create(tempFile))
            {
                await JsonSerializer.SerializeAsync(stream, folderExclusionSettings, SerializerOptions).ConfigureAwait(false);
            }

            File.Copy(tempFile, _folderExclusionSettingsFile, overwrite: true);
            _folderExclusionSettings = folderExclusionSettings;
        }
        finally
        {
            if (File.Exists(tempFile))
            {
                try
                {
                    File.Delete(tempFile);
                }
                catch
                {
                    // Ignored: temp file cleanup best effort.
                }
            }
        }
    }
}

public record ViewerSettings(
    string Theme,
    string StartFile,
    bool AutoReload,
    bool ShowFileTree,
    LastSessionData? LastSession = null,
    double DefaultZoomPercent = 100.0)
{
    public static ViewerSettings Default() => new("system", "readme", true, true);
    
    /// <summary>
    /// Validates and returns a copy of settings with clamped values.
    /// </summary>
    public ViewerSettings Validate()
    {
        var validatedZoom = Math.Clamp(DefaultZoomPercent, 10.0, 1000.0);
        if (Math.Abs(validatedZoom - DefaultZoomPercent) > 0.01)
        {
            return this with { DefaultZoomPercent = validatedZoom };
        }
        return this;
    }
}

public record LastSessionData(
    string[] OpenDocuments,
    int ActiveTabIndex,
    string? LastFolderRoot = null);
