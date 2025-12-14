using CommunityToolkit.Mvvm.Input;
using MarkRead.Services;
using MarkRead.ViewModels;
using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace MarkRead.Views;

public partial class WelcomePage : ContentPage, INotifyPropertyChanged
{
    private readonly ISettingsService _settingsService;
    private readonly ILoggingService _loggingService;
    private readonly IServiceProvider _serviceProvider;
    private readonly FileTreeViewModel _fileTreeViewModel;
    private readonly ITabService _tabService;
    private readonly IWorkspaceService _workspaceService;
    private bool _isStartViewMode;
    private bool _dontShowAgain;

    public bool DontShowAgain 
    { 
        get => _dontShowAgain;
        set => SetProperty(ref _dontShowAgain, value);
    }

    public bool IsStartViewMode
    {
        get => _isStartViewMode;
        set
        {
            if (SetProperty(ref _isStartViewMode, value))
            {
                OnPropertyChanged(nameof(IsWelcomeInfoMode));
            }
        }
    }

    public bool IsWelcomeInfoMode => !IsStartViewMode;

    public WelcomePage(
        ISettingsService settingsService,
        ILoggingService loggingService,
        IServiceProvider serviceProvider,
        FileTreeViewModel fileTreeViewModel,
        ITabService tabService,
        IWorkspaceService workspaceService)
    {
        _settingsService = settingsService;
        _loggingService = loggingService;
        _serviceProvider = serviceProvider;
        _fileTreeViewModel = fileTreeViewModel;
        _tabService = tabService;
        _workspaceService = workspaceService;
        
        InitializeComponent();
        BindingContext = this;
    }

    public void SetMode(bool isStartViewMode)
    {
        IsStartViewMode = isStartViewMode;
    }

    [RelayCommand]
    private async Task OpenFolder()
    {
        try
        {
            _loggingService.LogInfo("Open folder command from welcome page");
            
#if WINDOWS
            var folderPicker = new Windows.Storage.Pickers.FolderPicker();
            var window = (Application.Current?.Windows[0]?.Handler?.PlatformView as Microsoft.UI.Xaml.Window);
            var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(window);
            WinRT.Interop.InitializeWithWindow.Initialize(folderPicker, hwnd);
            
            folderPicker.SuggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.DocumentsLibrary;
            folderPicker.FileTypeFilter.Add("*");
            
            var folder = await folderPicker.PickSingleFolderAsync();
            
            if (folder != null)
            {
                _loggingService.LogInfo($"Folder selected: {folder.Path}");
                
                // Set workspace root
                await _workspaceService.SetRootAsync(folder.Path);
                
                // Load folder in file tree
                await _fileTreeViewModel.LoadFolderCommand.ExecuteAsync(folder.Path);
                
                // Close welcome page if in start view mode
                if (IsStartViewMode)
                {
                    await Navigation.PopModalAsync(true);
                }
                else
                {
                    await SavePreferencesAndClose();
                }
            }
            else
            {
                _loggingService.LogInfo("Folder picker cancelled by user");
            }
#else
            _loggingService.LogWarning("Folder picker not implemented for this platform");
            await DisplayAlert("Not Available", "Folder picker is only available on Windows.", "OK");
#endif
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"Failed to open folder: {ex.Message}");
            await DisplayAlert("Error", $"Failed to open folder: {ex.Message}", "OK");
        }
    }

    [RelayCommand]
    private async Task OpenFile()
    {
        try
        {
            _loggingService.LogInfo("Open file command from welcome page");
            
#if WINDOWS
            var filePicker = new Windows.Storage.Pickers.FileOpenPicker();
            var window = (Application.Current?.Windows[0]?.Handler?.PlatformView as Microsoft.UI.Xaml.Window);
            var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(window);
            WinRT.Interop.InitializeWithWindow.Initialize(filePicker, hwnd);
            
            filePicker.SuggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.DocumentsLibrary;
            filePicker.FileTypeFilter.Add(".md");
            filePicker.FileTypeFilter.Add(".markdown");
            
            var file = await filePicker.PickSingleFileAsync();
            
            if (file != null)
            {
                _loggingService.LogInfo($"File selected: {file.Path}");
                
                // Set workspace root to parent directory
                var parentDir = System.IO.Path.GetDirectoryName(file.Path);
                if (!string.IsNullOrEmpty(parentDir))
                {
                    await _workspaceService.SetRootAsync(parentDir);
                    await _fileTreeViewModel.LoadFolderCommand.ExecuteAsync(parentDir);
                }
                
                // Open file in tab
                _tabService.OpenTab(file.Path, setActive: true);
                
                // Close welcome page if in start view mode
                if (IsStartViewMode)
                {
                    await Navigation.PopModalAsync(true);
                }
                else
                {
                    await SavePreferencesAndClose();
                }
            }
            else
            {
                _loggingService.LogInfo("File picker cancelled by user");
            }
#else
            _loggingService.LogWarning("File picker not implemented for this platform");
            await DisplayAlert("Not Available", "File picker is only available on Windows.", "OK");
#endif
        }
        catch (Exception ex)
        {
            _loggingService.LogError($"Failed to open file: {ex.Message}");
            await DisplayAlert("Error", $"Failed to open file: {ex.Message}", "OK");
        }
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
        if (DontShowAgain && !IsStartViewMode)
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
        if (!IsStartViewMode)
        {
            await SavePreferencesAndClose();
        }
    }

    private bool SetProperty<T>(ref T backingStore, T value, [CallerMemberName] string propertyName = "")
    {
        if (EqualityComparer<T>.Default.Equals(backingStore, value))
            return false;

        backingStore = value;
        OnPropertyChanged(propertyName);
        return true;
    }

    public new event PropertyChangedEventHandler? PropertyChanged;

    protected new void OnPropertyChanged([CallerMemberName] string propertyName = "")
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
