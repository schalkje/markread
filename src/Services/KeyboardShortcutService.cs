namespace MarkRead.Services;

/// <summary>
/// Implementation of keyboard shortcut service with chord support
/// </summary>
public class KeyboardShortcutService : IKeyboardShortcutService
{
    private readonly Dictionary<string, (Action action, string description)> _shortcuts = new();
    private readonly Dictionary<string, (Action action, string description)> _chordShortcuts = new();
    private readonly ILoggingService _loggingService;
    
    private string? _pendingChordPrefix = null;
    private DateTime _chordTimeout = DateTime.MinValue;
    private const int ChordTimeoutMs = 2000; // 2 seconds to complete a chord

    public KeyboardShortcutService(ILoggingService loggingService)
    {
        _loggingService = loggingService;
    }

    public void RegisterShortcut(string key, KeyModifiers modifiers, Action action, string description)
    {
        var shortcutKey = GetShortcutKey(key, modifiers);
        
        if (_shortcuts.ContainsKey(shortcutKey))
        {
            _loggingService.LogWarning($"Shortcut already registered: {shortcutKey}. Overwriting.");
        }

        _shortcuts[shortcutKey] = (action, description);
        _loggingService.LogInfo($"Registered shortcut: {shortcutKey} - {description}");
    }

    /// <summary>
    /// Register a chord shortcut (e.g., Ctrl+K Ctrl+W)
    /// </summary>
    public void RegisterChordShortcut(string firstKey, KeyModifiers firstModifiers, 
                                     string secondKey, KeyModifiers secondModifiers,
                                     Action action, string description)
    {
        var chordKey = $"{GetShortcutKey(firstKey, firstModifiers)} {GetShortcutKey(secondKey, secondModifiers)}";
        
        if (_chordShortcuts.ContainsKey(chordKey))
        {
            _loggingService.LogWarning($"Chord shortcut already registered: {chordKey}. Overwriting.");
        }

        _chordShortcuts[chordKey] = (action, description);
        _loggingService.LogInfo($"Registered chord shortcut: {chordKey} - {description}");
    }

    public bool HandleKeyPress(string key, KeyModifiers modifiers)
    {
        var shortcutKey = GetShortcutKey(key, modifiers);

        // Check if we're waiting for the second part of a chord
        if (_pendingChordPrefix != null)
        {
            if (DateTime.UtcNow > _chordTimeout)
            {
                // Chord timed out, reset
                _pendingChordPrefix = null;
            }
            else
            {
                // Try to match chord
                var chordKey = $"{_pendingChordPrefix} {shortcutKey}";
                _pendingChordPrefix = null;
                
                if (_chordShortcuts.TryGetValue(chordKey, out var chordShortcut))
                {
                    try
                    {
                        chordShortcut.action.Invoke();
                        _loggingService.LogInfo($"Executed chord shortcut: {chordKey}");
                        return true;
                    }
                    catch (Exception ex)
                    {
                        _loggingService.LogError($"Error executing chord shortcut {chordKey}: {ex.Message}");
                        return false;
                    }
                }
            }
        }

        // Check if this key starts a chord sequence
        foreach (var chordKey in _chordShortcuts.Keys)
        {
            if (chordKey.StartsWith(shortcutKey + " "))
            {
                _pendingChordPrefix = shortcutKey;
                _chordTimeout = DateTime.UtcNow.AddMilliseconds(ChordTimeoutMs);
                _loggingService.LogInfo($"Chord prefix detected: {shortcutKey}, waiting for second key...");
                return true;
            }
        }

        // Try normal shortcut
        if (_shortcuts.TryGetValue(shortcutKey, out var shortcut))
        {
            try
            {
                shortcut.action.Invoke();
                _loggingService.LogInfo($"Executed shortcut: {shortcutKey}");
                return true;
            }
            catch (Exception ex)
            {
                _loggingService.LogError($"Error executing shortcut {shortcutKey}: {ex.Message}");
                return false;
            }
        }

        return false;
    }

    public Dictionary<string, string> GetAllShortcuts()
    {
        var all = _shortcuts.ToDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value.description
        );
        
        foreach (var kvp in _chordShortcuts)
        {
            all[kvp.Key] = kvp.Value.description;
        }
        
        return all;
    }

    public void UnregisterShortcut(string key, KeyModifiers modifiers)
    {
        var shortcutKey = GetShortcutKey(key, modifiers);
        if (_shortcuts.Remove(shortcutKey))
        {
            _loggingService.LogInfo($"Unregistered shortcut: {shortcutKey}");
        }
    }

    private string GetShortcutKey(string key, KeyModifiers modifiers)
    {
        var parts = new List<string>();

        if (modifiers.HasFlag(KeyModifiers.Ctrl))
            parts.Add("Ctrl");
        if (modifiers.HasFlag(KeyModifiers.Shift))
            parts.Add("Shift");
        if (modifiers.HasFlag(KeyModifiers.Alt))
            parts.Add("Alt");

        parts.Add(key);

        return string.Join("+", parts);
    }
}
