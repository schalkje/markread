using CommunityToolkit.Mvvm.Input;

namespace MarkRead.Views;

public partial class KeyboardShortcutsPage : ContentPage
{
    public KeyboardShortcutsPage()
    {
        InitializeComponent();
        BindingContext = this;
    }

    [RelayCommand]
    private async Task Close()
    {
        await Navigation.PopModalAsync(true);
    }
}
