using System.Text.Json;
using MarkRead.Models;

namespace MarkRead.Services;

/// <summary>
/// Implementation of session persistence service
/// </summary>
public class SessionService : ISessionService
{
    private readonly string _sessionPath;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly ILoggingService _loggingService;

    public SessionService(ILoggingService loggingService)
    {
        _loggingService = loggingService;
        
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var appFolder = Path.Combine(appData, "MarkRead");
        Directory.CreateDirectory(appFolder);
        _sessionPath = Path.Combine(appFolder, "session.json");

        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNameCaseInsensitive = true
        };
    }

    public async Task SaveSessionAsync(SessionState state)
    {
        try
        {
            state.LastSaved = DateTime.UtcNow;
            var json = JsonSerializer.Serialize(state, _jsonOptions);
            await File.WriteAllTextAsync(_sessionPath, json);
            _loggingService.LogInfo("Session state saved successfully");
        }
        catch (Exception ex)
        {
            _loggingService.LogError("Failed to save session state", ex);
        }
    }

    public async Task<SessionState?> LoadSessionAsync()
    {
        if (!File.Exists(_sessionPath))
        {
            _loggingService.LogInfo("No session file found");
            return null;
        }

        try
        {
            var json = await File.ReadAllTextAsync(_sessionPath);
            var state = JsonSerializer.Deserialize<SessionState>(json, _jsonOptions);
            _loggingService.LogInfo("Session state loaded successfully");
            return state;
        }
        catch (Exception ex)
        {
            _loggingService.LogError("Failed to load session state", ex);
            return null;
        }
    }

    public async Task MarkSessionAsNormalExitAsync()
    {
        try
        {
            var state = await LoadSessionAsync();
            if (state != null)
            {
                state.NormalExit = true;
                await SaveSessionAsync(state);
                _loggingService.LogInfo("Session marked as normal exit");
            }
        }
        catch (Exception ex)
        {
            _loggingService.LogError("Failed to mark session as normal exit", ex);
        }
    }

    public async Task<bool> WasAbnormalTerminationAsync()
    {
        var state = await LoadSessionAsync();
        if (state == null)
        {
            return false;
        }

        // If NormalExit is false and session is less than 24 hours old, it was abnormal
        var wasAbnormal = !state.NormalExit && 
                         (DateTime.UtcNow - state.LastSaved).TotalHours < 24;

        _loggingService.LogInfo($"Abnormal termination check: {wasAbnormal}");
        return wasAbnormal;
    }

    public async Task ClearSessionAsync()
    {
        try
        {
            if (File.Exists(_sessionPath))
            {
                File.Delete(_sessionPath);
                _loggingService.LogInfo("Session state cleared");
            }
        }
        catch (Exception ex)
        {
            _loggingService.LogError("Failed to clear session state", ex);
        }

        await Task.CompletedTask;
    }

    public string GetSessionPath() => _sessionPath;
}
