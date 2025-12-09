using System.Collections.Concurrent;

namespace MarkRead.Services;

/// <summary>
/// File-based logging service with rotation
/// </summary>
public class LoggingService : ILoggingService
{
    private readonly string _logDirectory;
    private readonly long _maxFileSize = 10 * 1024 * 1024; // 10MB
    private readonly int _maxFiles = 5;
    private readonly ConcurrentQueue<string> _logQueue = new();
    private readonly SemaphoreSlim _writeLock = new(1, 1);

    public LoggingService()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        _logDirectory = Path.Combine(appData, "MarkRead", "Logs");
        Directory.CreateDirectory(_logDirectory);

        // Start background log writer
        Task.Run(ProcessLogQueue);
    }

    public void LogError(string message, Exception? exception = null)
    {
        var logMessage = FormatLogMessage("ERROR", message, exception);
        EnqueueLog(logMessage);
    }

    public void LogWarning(string message)
    {
        var logMessage = FormatLogMessage("WARN", message);
        EnqueueLog(logMessage);
    }

    public void LogInfo(string message)
    {
        var logMessage = FormatLogMessage("INFO", message);
        EnqueueLog(logMessage);
    }

    public void LogDebug(string message)
    {
#if DEBUG
        var logMessage = FormatLogMessage("DEBUG", message);
        EnqueueLog(logMessage);
#endif
    }

    private string FormatLogMessage(string level, string message, Exception? exception = null)
    {
        var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
        var exceptionText = exception != null ? $"\n{exception}" : string.Empty;
        return $"[{timestamp}] [{level}] {message}{exceptionText}";
    }

    private void EnqueueLog(string message)
    {
        _logQueue.Enqueue(message);
    }

    private async Task ProcessLogQueue()
    {
        while (true)
        {
            try
            {
                if (_logQueue.TryDequeue(out var message))
                {
                    await WriteLogAsync(message);
                }
                else
                {
                    await Task.Delay(100); // Wait for more logs
                }
            }
            catch
            {
                // Suppress errors in logging itself
            }
        }
    }

    private async Task WriteLogAsync(string message)
    {
        await _writeLock.WaitAsync();
        try
        {
            var logFile = GetCurrentLogFile();
            await File.AppendAllTextAsync(logFile, message + Environment.NewLine);

            // Check if rotation is needed
            var fileInfo = new FileInfo(logFile);
            if (fileInfo.Length > _maxFileSize)
            {
                RotateLogs();
            }
        }
        finally
        {
            _writeLock.Release();
        }
    }

    private string GetCurrentLogFile()
    {
        return Path.Combine(_logDirectory, "markread.log");
    }

    private void RotateLogs()
    {
        var currentLog = GetCurrentLogFile();

        // Rotate existing logs
        for (int i = _maxFiles - 1; i >= 1; i--)
        {
            var oldFile = Path.Combine(_logDirectory, $"markread.{i}.log");
            var newFile = Path.Combine(_logDirectory, $"markread.{i + 1}.log");

            if (File.Exists(oldFile))
            {
                if (i == _maxFiles - 1)
                {
                    File.Delete(oldFile); // Delete oldest
                }
                else
                {
                    File.Move(oldFile, newFile, true);
                }
            }
        }

        // Move current log to .1
        if (File.Exists(currentLog))
        {
            File.Move(currentLog, Path.Combine(_logDirectory, "markread.1.log"), true);
        }
    }
}
