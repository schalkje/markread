namespace MarkRead.Services;

/// <summary>
/// Service for application logging
/// </summary>
public interface ILoggingService
{
    /// <summary>
    /// Logs an error message
    /// </summary>
    void LogError(string message, Exception? exception = null);

    /// <summary>
    /// Logs a warning message
    /// </summary>
    void LogWarning(string message);

    /// <summary>
    /// Logs an info message
    /// </summary>
    void LogInfo(string message);

    /// <summary>
    /// Logs a debug message
    /// </summary>
    void LogDebug(string message);
}
