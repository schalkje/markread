namespace MarkRead.Services;

/// <summary>
/// Service for managing keyboard shortcuts throughout the application
/// </summary>
public interface IKeyboardShortcutService
{
    /// <summary>
    /// Registers a keyboard shortcut handler
    /// </summary>
    /// <param name="key">The key for the shortcut</param>
    /// <param name="modifiers">Modifier keys (Ctrl, Shift, Alt)</param>
    /// <param name="action">Action to execute when shortcut is triggered</param>
    /// <param name="description">Description of the shortcut for help display</param>
    void RegisterShortcut(string key, KeyModifiers modifiers, Action action, string description);

    /// <summary>
    /// Registers a chord keyboard shortcut (e.g., Ctrl+K Ctrl+W)
    /// </summary>
    void RegisterChordShortcut(string firstKey, KeyModifiers firstModifiers,
                              string secondKey, KeyModifiers secondModifiers,
                              Action action, string description);

    /// <summary>
    /// Handles a key press event
    /// </summary>
    /// <param name="key">The pressed key</param>
    /// <param name="modifiers">Active modifier keys</param>
    /// <returns>True if the shortcut was handled, false otherwise</returns>
    bool HandleKeyPress(string key, KeyModifiers modifiers);

    /// <summary>
    /// Gets all registered shortcuts for display in help
    /// </summary>
    Dictionary<string, string> GetAllShortcuts();

    /// <summary>
    /// Unregisters a keyboard shortcut
    /// </summary>
    void UnregisterShortcut(string key, KeyModifiers modifiers);
}

/// <summary>
/// Modifier keys for keyboard shortcuts
/// </summary>
[Flags]
public enum KeyModifiers
{
    None = 0,
    Ctrl = 1,
    Shift = 2,
    Alt = 4,
    CtrlShift = Ctrl | Shift,
    CtrlAlt = Ctrl | Alt,
    ShiftAlt = Shift | Alt,
    CtrlShiftAlt = Ctrl | Shift | Alt
}
