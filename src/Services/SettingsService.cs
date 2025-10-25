using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

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

    public SettingsService()
    {
        string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "MarkRead");
        Directory.CreateDirectory(root);
        _settingsFile = Path.Combine(root, "settings.json");
    }

    public async Task<ViewerSettings> LoadAsync()
    {
        if (!File.Exists(_settingsFile))
        {
            return ViewerSettings.Default();
        }

        await using FileStream stream = File.OpenRead(_settingsFile);
        return await JsonSerializer.DeserializeAsync<ViewerSettings>(stream) ?? ViewerSettings.Default();
    }

    public async Task SaveAsync(ViewerSettings settings)
    {
        await using FileStream stream = File.Create(_settingsFile);
        await JsonSerializer.SerializeAsync(stream, settings, SerializerOptions);
    }
}

public record ViewerSettings(
    string Theme,
    string StartFile,
    bool AutoReload,
    bool ShowFileTree)
{
    public static ViewerSettings Default() => new("system", "readme", true, true);
}
