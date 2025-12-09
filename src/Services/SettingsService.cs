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
    private readonly Dictionary<string, object> _cache = new();

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

        // Load cache from disk
        _ = LoadCacheAsync();
    }

    private async Task LoadCacheAsync()
    {
        if (!File.Exists(_settingsPath))
        {
            return;
        }

        try
        {
            var json = await File.ReadAllTextAsync(_settingsPath);
            var settings = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json, _jsonOptions);
            if (settings != null)
            {
                foreach (var kvp in settings)
                {
                    _cache[kvp.Key] = kvp.Value;
                }
            }
        }
        catch
        {
            // Ignore errors during cache load
        }
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

    public T GetSetting<T>(string key, T defaultValue = default!)
    {
        if (_cache.TryGetValue(key, out var value))
        {
            try
            {
                if (value is JsonElement jsonElement)
                {
                    return jsonElement.Deserialize<T>(_jsonOptions) ?? defaultValue;
                }
                else if (value is T typedValue)
                {
                    return typedValue;
                }
            }
            catch
            {
                // Conversion failed, return default
            }
        }
        return defaultValue;
    }

    public void SetSetting<T>(string key, T value)
    {
        _cache[key] = value!;
        
        // Save asynchronously (fire and forget)
        _ = Task.Run(async () =>
        {
            try
            {
                var json = JsonSerializer.Serialize(_cache, _jsonOptions);
                await File.WriteAllTextAsync(_settingsPath, json);
            }
            catch
            {
                // Ignore save errors
            }
        });
    }
}
