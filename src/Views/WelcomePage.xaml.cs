using CommunityToolkit.Mvvm.Input;
using MarkRead.Services;

namespace MarkRead.Views;

public partial class WelcomePage : ContentPage
{
    private readonly ISettingsService _settingsService;
    private readonly ILoggingService _loggingService;
    private readonly IServiceProvider _serviceProvider;

    public bool DontShowAgain { get; set; }

    public WelcomePage(
        ISettingsService settingsService,
        ILoggingService loggingService,
        IServiceProvider serviceProvider)
    {
        _settingsService = settingsService;
        _loggingService = loggingService;
        _serviceProvider = serviceProvider;
        
        InitializeComponent();
        BindingContext = this;
    }

    [RelayCommand]
    private async Task OpenFolder()
    {
        // TODO: Implement folder picker
        _loggingService.LogInfo("Open folder command from welcome page");
        await SavePreferencesAndClose();
    }

    [RelayCommand]
    private async Task ViewShortcuts()
    {
        try
        {
            var keyboardShortcutsPage = _serviceProvider.GetService(typeof(KeyboardShortcutsPage)) as KeyboardShortcutsPage;
            if (keyboardShortcutsPage != null)
            {
                await Navigation.PushModalAsync(keyboardShortcutsPage, true);
                _loggingService.LogInfo("Keyboard shortcuts page opened from welcome page");
            }
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"Failed to show keyboard shortcuts from welcome page: {ex.Message}");
        }
    }

    private async Task SavePreferencesAndClose()
    {
        if (DontShowAgain)
        {
            var settings = await _settingsService.LoadAsync();
            // TODO: Add ShowWelcomeScreen property to Settings model
            // settings.ShowWelcomeScreen = false;
            await _settingsService.SaveAsync(settings);
            _loggingService.LogInfo("Welcome screen disabled by user preference");
        }

        await Navigation.PopModalAsync(true);
    }

    protected override async void OnDisappearing()
    {
        base.OnDisappearing();
        await SavePreferencesAndClose();
    }
}
