using System.Text.Json;
using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// Settings persistence service using JSON
/// </summary>
public class SettingsService : ISettingsService
{
    private readonly string _settingsPath;
    private readonly JsonSerializerOptions _jsonOptions;

    public SettingsService()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var appFolder = Path.Combine(appData, "MarkRead");
        Directory.CreateDirectory(appFolder);
        _settingsPath = Path.Combine(appFolder, "settings.json");

        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNameCaseInsensitive = true
        };
    }

    public async Task<Settings> LoadAsync()
    {
        if (!File.Exists(_settingsPath))
        {
            return new Settings(); // Return defaults
        }

        try
        {
            var json = await File.ReadAllTextAsync(_settingsPath);
            return JsonSerializer.Deserialize<Settings>(json, _jsonOptions) ?? new Settings();
        }
        catch (Exception)
        {
            // If settings file is corrupted, return defaults
            return new Settings();
        }
    }

    public async Task SaveAsync(Settings settings)
    {
        try
        {
            var json = JsonSerializer.Serialize(settings, _jsonOptions);
            await File.WriteAllTextAsync(_settingsPath, json);
        }
        catch (Exception ex)
        {
            // Log error but don't throw - settings save failure shouldn't crash app
            Console.WriteLine($"Failed to save settings: {ex.Message}");
        }
    }

    public string GetSettingsPath() => _settingsPath;
}
