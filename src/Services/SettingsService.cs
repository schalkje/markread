using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Threading;
using System.Drawing;
using AnimationSettings = MarkRead.Services.AnimationSettings;
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
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly string _settingsFile;
    private readonly string _themeSettingsFile;
    private readonly string _uiStateFile;
    private readonly string _animationSettingsFile;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private ViewerSettings _currentSettings = ViewerSettings.Default();
    private ThemeConfiguration? _themeConfiguration;
    private UIState? _uiState;
    private AnimationSettings? _animationSettings;
    private bool _isLoaded;

    public SettingsService()
    {
        string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "MarkRead");
        Directory.CreateDirectory(root);
        _settingsFile = Path.Combine(root, "settings.json");
        _themeSettingsFile = Path.Combine(root, "theme-settings.json");
        _uiStateFile = Path.Combine(root, "ui-state.json");
        _animationSettingsFile = Path.Combine(root, "animation-settings.json");
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
    /// Loads theme configuration from disk
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

    /// <summary>
    /// Creates backup copies of all settings files
    /// </summary>
    public async Task CreateBackupAsync()
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
            
            if (File.Exists(_settingsFile))
                File.Copy(_settingsFile, $"{_settingsFile}.backup-{timestamp}");
            
            if (File.Exists(_themeSettingsFile))
                File.Copy(_themeSettingsFile, $"{_themeSettingsFile}.backup-{timestamp}");
            
            if (File.Exists(_uiStateFile))
                File.Copy(_uiStateFile, $"{_uiStateFile}.backup-{timestamp}");
            
            if (File.Exists(_animationSettingsFile))
                File.Copy(_animationSettingsFile, $"{_animationSettingsFile}.backup-{timestamp}");
        }
        finally
        {
            _gate.Release();
        }
    }
}

public record ViewerSettings(
    string Theme,
    string StartFile,
    bool AutoReload,
    bool ShowFileTree,
    LastSessionData? LastSession = null)
{
    public static ViewerSettings Default() => new("system", "readme", true, true);
}

public record LastSessionData(
    string[] OpenDocuments,
    int ActiveTabIndex,
    string? LastFolderRoot = null);
