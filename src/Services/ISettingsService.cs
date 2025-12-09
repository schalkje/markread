using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// Service for loading and saving application settings
/// </summary>
public interface ISettingsService
{
    /// <summary>
    /// Loads settings from disk
    /// </summary>
    Task<Settings> LoadAsync();

    /// <summary>
    /// Saves settings to disk
    /// </summary>
    Task SaveAsync(Settings settings);

    /// <summary>
    /// Gets the settings file path
    /// </summary>
    string GetSettingsPath();

    /// <summary>
    /// Gets a setting value by key
    /// </summary>
    T GetSetting<T>(string key, T defaultValue = default!);

    /// <summary>
    /// Sets a setting value by key
    /// </summary>
    void SetSetting<T>(string key, T value);
}
