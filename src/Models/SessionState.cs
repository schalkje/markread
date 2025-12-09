namespace MarkRead.Models;

/// <summary>
/// Represents the application session state for persistence
/// </summary>
public class SessionState
{
    /// <summary>
    /// List of open tab IDs in order
    /// </summary>
    public List<string> OpenTabs { get; set; } = new();

    /// <summary>
    /// ID of the currently active tab
    /// </summary>
    public string? ActiveTabId { get; set; }

    /// <summary>
    /// Window state information (position, size, maximized)
    /// </summary>
    public WindowState WindowState { get; set; } = new();

    /// <summary>
    /// Timestamp of last save
    /// </summary>
    public DateTime LastSaved { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Whether the session was closed normally (true) or crashed (false)
    /// </summary>
    public bool NormalExit { get; set; } = false;
}

/// <summary>
/// Represents window state for persistence
/// </summary>
public class WindowState
{
    public double X { get; set; }
    public double Y { get; set; }
    public double Width { get; set; } = 1200;
    public double Height { get; set; } = 800;
    public bool IsMaximized { get; set; }
}
