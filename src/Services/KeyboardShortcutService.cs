namespace MarkRead.Services;

/// <summary>
/// Implementation of keyboard shortcut service
/// </summary>
public class KeyboardShortcutService : IKeyboardShortcutService
{
    private readonly Dictionary<string, (Action action, string description)> _shortcuts = new();
    private readonly ILoggingService _loggingService;

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

    public bool HandleKeyPress(string key, KeyModifiers modifiers)
    {
        var shortcutKey = GetShortcutKey(key, modifiers);

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
        return _shortcuts.ToDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value.description
        );
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
