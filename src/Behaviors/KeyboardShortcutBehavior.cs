using MarkRead.Services;

namespace MarkRead.Behaviors;

/// <summary>
/// Behavior for handling keyboard shortcuts on a page or view
/// </summary>
public class KeyboardShortcutBehavior : Behavior<Page>
{
    private Page? _page;
    private IKeyboardShortcutService? _shortcutService;

    protected override void OnAttachedTo(Page bindable)
    {
        base.OnAttachedTo(bindable);
        _page = bindable;

        // Get keyboard shortcut service from handler
        if (Application.Current?.Handler?.MauiContext?.Services != null)
        {
            _shortcutService = Application.Current.Handler.MauiContext.Services
                .GetService(typeof(IKeyboardShortcutService)) as IKeyboardShortcutService;
        }

        // Note: MAUI doesn't have built-in keyboard event handling at Page level
        // This would need platform-specific implementation via handlers or platform code
        // For Windows, we'd use Microsoft.Maui.Handlers and hook into the native window

#if WINDOWS
        RegisterWindowsKeyboardHandler();
#endif
    }

    protected override void OnDetachingFrom(Page bindable)
    {
        base.OnDetachingFrom(bindable);
#if WINDOWS
        UnregisterWindowsKeyboardHandler();
#endif
        _page = null;
        _shortcutService = null;
    }

#if WINDOWS
    private Microsoft.UI.Xaml.UIElement? _nativeWindow;

    private void RegisterWindowsKeyboardHandler()
    {
        if (_page?.Handler?.PlatformView is Microsoft.UI.Xaml.UIElement element)
        {
            _nativeWindow = element;
            _nativeWindow.KeyDown += OnWindowsKeyDown;
        }
    }

    private void UnregisterWindowsKeyboardHandler()
    {
        if (_nativeWindow != null)
        {
            _nativeWindow.KeyDown -= OnWindowsKeyDown;
            _nativeWindow = null;
        }
    }

    private void OnWindowsKeyDown(object sender, Microsoft.UI.Xaml.Input.KeyRoutedEventArgs e)
    {
        if (_shortcutService == null)
            return;

        // Get modifier keys
        var window = Microsoft.UI.Xaml.Window.Current;
        var ctrlState = window.CoreWindow.GetKeyState(Windows.System.VirtualKey.Control);
        var shiftState = window.CoreWindow.GetKeyState(Windows.System.VirtualKey.Shift);
        var altState = window.CoreWindow.GetKeyState(Windows.System.VirtualKey.Menu);

        var modifiers = KeyModifiers.None;
        if (ctrlState.HasFlag(Windows.UI.Core.CoreVirtualKeyStates.Down))
            modifiers |= KeyModifiers.Ctrl;
        if (shiftState.HasFlag(Windows.UI.Core.CoreVirtualKeyStates.Down))
            modifiers |= KeyModifiers.Shift;
        if (altState.HasFlag(Windows.UI.Core.CoreVirtualKeyStates.Down))
            modifiers |= KeyModifiers.Alt;

        // Convert virtual key to string
        var key = e.Key.ToString();

        // Handle the shortcut
        if (_shortcutService.HandleKeyPress(key, modifiers))
        {
            e.Handled = true;
        }
    }
#endif
}
