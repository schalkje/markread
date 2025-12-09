namespace MarkRead.Models;

/// <summary>
/// Application settings persisted to disk
/// </summary>
public class Settings
{
    /// <summary>
    /// Theme preference
    /// </summary>
    public ThemeType ThemePreference { get; set; } = ThemeType.System;

    /// <summary>
    /// Last window X position
    /// </summary>
    public int WindowX { get; set; } = 100;

    /// <summary>
    /// Last window Y position
    /// </summary>
    public int WindowY { get; set; } = 100;

    /// <summary>
    /// Last window width
    /// </summary>
    public int WindowWidth { get; set; } = 1200;

    /// <summary>
    /// Last window height
    /// </summary>
    public int WindowHeight { get; set; } = 800;

    /// <summary>
    /// Indicates if window was maximized
    /// </summary>
    public bool WindowMaximized { get; set; }

    /// <summary>
    /// Indicates if sidebar is visible
    /// </summary>
    public bool SidebarVisible { get; set; } = true;

    /// <summary>
    /// Sidebar width in pixels
    /// </summary>
    public int SidebarWidth { get; set; } = 300;

    /// <summary>
    /// Last opened folder path
    /// </summary>
    public string LastFolderPath { get; set; } = string.Empty;

    /// <summary>
    /// Recently opened folders (max 10)
    /// </summary>
    public List<string> RecentFolders { get; set; } = new();

    /// <summary>
    /// Open tabs (persisted across sessions)
    /// </summary>
    public List<Tab> OpenTabs { get; set; } = new();

    /// <summary>
    /// Active tab ID
    /// </summary>
    public Guid? ActiveTabId { get; set; }

    /// <summary>
    /// Default zoom level (1.0 = 100%)
    /// </summary>
    public double DefaultZoom { get; set; } = 1.0;

    /// <summary>
    /// Folder exclusion patterns
    /// </summary>
    public List<string> ExcludedFolders { get; set; } = new()
    {
        ".git",
        "node_modules",
        "bin",
        "obj",
        ".vscode",
        ".env",
        "venv",
        "__pycache__"
    };
}
