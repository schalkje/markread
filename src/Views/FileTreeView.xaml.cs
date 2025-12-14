using MarkRead.ViewModels;
using MarkRead.Behaviors;
using Microsoft.Maui.Controls;

namespace MarkRead.Views;

public partial class FileTreeView : ContentView
{
    private FileTreeViewModel? _viewModel;
    private readonly TreeViewKeyboardBehavior _keyboardBehavior;

    public FileTreeView()
    {
        InitializeComponent();
        _keyboardBehavior = new TreeViewKeyboardBehavior();

        // ViewModel will be set via BindingContext from parent
        this.BindingContextChanged += (s, e) =>
        {
            if (BindingContext is FileTreeViewModel vm)
            {
                _viewModel = vm;
            }
        };
    }

    private void OnNodePointerEntered(object? sender, PointerEventArgs e)
    {
        if (sender is Grid grid)
        {
            grid.BackgroundColor = Application.Current?.RequestedTheme == AppTheme.Light
                ? Color.FromArgb("#F0F0F0")
                : Color.FromArgb("#2A2A2A");
        }
    }

    private void OnNodePointerExited(object? sender, PointerEventArgs e)
    {
        if (sender is Grid grid)
        {
            grid.BackgroundColor = Colors.Transparent;
        }
    }

    // Keyboard handlers (would be called by platform-specific code)
    public void OnKeyDown(string key, bool ctrl, bool shift, bool alt)
    {
        if (_viewModel == null) return;
        
        switch (key.ToLower())
        {
            case "down":
            case "arrowdown":
                _keyboardBehavior.HandleKeyDown(_viewModel);
                break;
            case "up":
            case "arrowup":
                _keyboardBehavior.HandleKeyUp(_viewModel);
                break;
            case "right":
            case "arrowright":
                _keyboardBehavior.HandleKeyRight(_viewModel);
                break;
            case "left":
            case "arrowleft":
                _keyboardBehavior.HandleKeyLeft(_viewModel);
                break;
            case "enter":
            case "return":
                if (ctrl)
                    _keyboardBehavior.HandleCtrlEnter(_viewModel);
                else
                    _keyboardBehavior.HandleEnter(_viewModel);
                break;
            case "f5":
                _keyboardBehavior.HandleF5(_viewModel);
                break;
            case "r":
                if (ctrl)
                    _keyboardBehavior.HandleCtrlR(_viewModel);
                break;
        }
    }
}
