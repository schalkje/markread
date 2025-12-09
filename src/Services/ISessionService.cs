using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// Service for persisting and restoring application session state
/// </summary>
public interface ISessionService
{
    /// <summary>
    /// Saves the current session state
    /// </summary>
    Task SaveSessionAsync(SessionState state);

    /// <summary>
    /// Loads the last session state
    /// </summary>
    Task<SessionState?> LoadSessionAsync();

    /// <summary>
    /// Marks the session as normally closed
    /// </summary>
    Task MarkSessionAsNormalExitAsync();

    /// <summary>
    /// Checks if the last session was abnormally terminated
    /// </summary>
    Task<bool> WasAbnormalTerminationAsync();

    /// <summary>
    /// Clears the session state
    /// </summary>
    Task ClearSessionAsync();

    /// <summary>
    /// Gets the session file path
    /// </summary>
    string GetSessionPath();
}
