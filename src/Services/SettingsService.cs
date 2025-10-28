using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Threading;

namespace MarkRead.App.Services;

/// <summary>
/// Persists viewer settings to disk. Stub implementation saves a JSON file under LocalApplicationData.
/// Later phases will extend validation and error handling.
/// </summary>
public class SettingsService
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly string _settingsFile;
    private readonly string _treeViewSettingsFile;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private ViewerSettings _currentSettings = ViewerSettings.Default();
    private TreeViewSettings _currentTreeViewSettings = new();
    private bool _isLoaded;
    private bool _isTreeViewSettingsLoaded;

    public SettingsService()
    {
        string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "MarkRead");
        Directory.CreateDirectory(root);
        _settingsFile = Path.Combine(root, "settings.json");
        _treeViewSettingsFile = Path.Combine(root, "treeview-settings.json");
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

    /// <summary>
    /// T046: Loads TreeViewSettings from disk.
    /// </summary>
    public async Task<TreeViewSettings> LoadTreeViewSettingsAsync()
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            if (_isTreeViewSettingsLoaded)
            {
                return _currentTreeViewSettings;
            }

            if (!File.Exists(_treeViewSettingsFile))
            {
                _currentTreeViewSettings = new TreeViewSettings();
                _isTreeViewSettingsLoaded = true;
                return _currentTreeViewSettings;
            }

            await using FileStream stream = File.OpenRead(_treeViewSettingsFile);
            var loaded = await JsonSerializer.DeserializeAsync<TreeViewSettings>(stream).ConfigureAwait(false);
            _currentTreeViewSettings = loaded ?? new TreeViewSettings();
            _isTreeViewSettingsLoaded = true;
            return _currentTreeViewSettings;
        }
        catch (JsonException)
        {
            _currentTreeViewSettings = new TreeViewSettings();
            _isTreeViewSettingsLoaded = true;
            return _currentTreeViewSettings;
        }
        catch (IOException)
        {
            return _currentTreeViewSettings;
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// T046: Saves TreeViewSettings to disk.
    /// </summary>
    public async Task SaveTreeViewSettingsAsync(TreeViewSettings settings)
    {
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            await PersistTreeViewSettingsAsync(settings).ConfigureAwait(false);
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// T046: Updates TreeViewSettings using an updater function.
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
            if (!_isTreeViewSettingsLoaded)
            {
                await LoadTreeViewSettingsAsync().ConfigureAwait(false);
            }

            var updated = updater(_currentTreeViewSettings);
            await PersistTreeViewSettingsAsync(updated).ConfigureAwait(false);
            return _currentTreeViewSettings;
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task PersistTreeViewSettingsAsync(TreeViewSettings settings)
    {
        var tempFile = _treeViewSettingsFile + ".tmp";

        try
        {
            await using (FileStream stream = File.Create(tempFile))
            {
                await JsonSerializer.SerializeAsync(stream, settings, SerializerOptions).ConfigureAwait(false);
            }

            File.Copy(tempFile, _treeViewSettingsFile, overwrite: true);
            _currentTreeViewSettings = settings;
            _isTreeViewSettingsLoaded = true;
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
    LastSessionData? LastSession = null)
{
    public static ViewerSettings Default() => new("system", "readme", true, true);
}

public record LastSessionData(
    string[] OpenDocuments,
    int ActiveTabIndex,
    string? LastFolderRoot = null);
