using MarkRead.ViewModels;

namespace MarkRead.Views;

/// <summary>
/// Settings page for theme preferences and app configuration
/// </summary>
public partial class SettingsPage : ContentPage
{
    public SettingsPage(SettingsViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();

        // Load settings when page appears
        if (BindingContext is SettingsViewModel vm)
        {
            await vm.LoadSettingsCommand.ExecuteAsync(null);
        }
    }
}
