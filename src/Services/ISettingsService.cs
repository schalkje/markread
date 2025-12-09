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
}
