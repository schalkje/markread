using Microsoft.Extensions.DependencyInjection;
using MarkRead.Services;
using MarkRead.Views;
#if WINDOWS
using MarkRead.Platforms.Windows;
#endif

namespace MarkRead;

public partial class App : Application
{
	private readonly MainPage _mainPage;
	private readonly IServiceProvider _serviceProvider;
	private readonly ISessionService _sessionService;
	private readonly ILoggingService _loggingService;
	private readonly IThemeService _themeService;
	private readonly ITabService _tabService;
	private readonly IFileSystemService _fileSystemService;
	private StartupArguments? _startupArguments;

	public App(IServiceProvider serviceProvider)
	{
		InitializeComponent();
		
		_serviceProvider = serviceProvider;
		_sessionService = serviceProvider.GetRequiredService<ISessionService>();
		_loggingService = serviceProvider.GetRequiredService<ILoggingService>();
		_themeService = serviceProvider.GetRequiredService<IThemeService>();
		_tabService = serviceProvider.GetRequiredService<ITabService>();
		_fileSystemService = serviceProvider.GetRequiredService<IFileSystemService>();
		
		// Parse command-line arguments
		ParseStartupArguments();
		
		// Initialize theme before creating window
		_ = InitializeThemeAsync();
		
		// Resolve MainPage from DI container
		_mainPage = serviceProvider.GetRequiredService<MainPage>();
	}
	
	private void ParseStartupArguments()
	{
		try
		{
#if WINDOWS
			var args = Environment.GetCommandLineArgs();
			// Skip first argument (executable path)
			_startupArguments = StartupArguments.Parse(args.Skip(1).ToArray());
			
			if (_startupArguments.HasPath)
			{
				_loggingService.LogInfo($"Startup path detected: {_startupArguments.GetPrimaryPath()}");
			}
#endif
		}
		catch (Exception ex)
		{
			_loggingService.LogError($"Failed to parse startup arguments: {ex.Message}");
		}
	}

	private async Task InitializeThemeAsync()
	{
		try
		{
			await _themeService.InitializeThemeAsync();
			_loggingService.LogInfo("Theme initialized successfully");
		}
		catch (Exception ex)
		{
			_loggingService.LogError($"Failed to initialize theme: {ex.Message}");
		}
	}

	protected override Window CreateWindow(IActivationState? activationState)
	{
		var window = new Window(_mainPage)
		{
			Title = "MarkRead",
			MinimumWidth = 800,
			MinimumHeight = 600
		};
		
#if WINDOWS
		// Set default window size on first launch
		if (window.Handler?.PlatformView is Microsoft.UI.Xaml.Window nativeWindow)
		{
			var scaledWidth = (int)(1200 * nativeWindow.AppWindow.ClientSize.Width / Microsoft.UI.Windowing.DisplayArea.Primary.WorkArea.Width);
			var scaledHeight = (int)(800 * nativeWindow.AppWindow.ClientSize.Height / Microsoft.UI.Windowing.DisplayArea.Primary.WorkArea.Height);
			
			// Only set size if not restored from session
			if (nativeWindow.AppWindow.Size.Width == 0 || nativeWindow.AppWindow.Size.Height == 0)
			{
				nativeWindow.AppWindow.Resize(new Windows.Graphics.SizeInt32 { Width = 1200, Height = 800 });
			}
		}
#endif
		
		// Check for abnormal termination and handle startup arguments after window is created
		MainThread.BeginInvokeOnMainThread(async () =>
		{
			await CheckSessionRecoveryAsync();
			await HandleStartupArgumentsAsync();
		});
		
		return window;
	}
	
	private async Task HandleStartupArgumentsAsync()
	{
		try
		{
			if (_startupArguments == null || !_startupArguments.HasPath)
			{
				return;
			}
			
			var path = _startupArguments.GetPrimaryPath();
			if (string.IsNullOrEmpty(path))
			{
				return;
			}
			
			if (_startupArguments.IsFilePath)
			{
				// Open file behavior
				_loggingService.LogInfo($"Opening file from startup: {path}");
				await OpenFileAsync(path);
			}
			else if (_startupArguments.IsFolderPath)
			{
				// Open folder behavior
				_loggingService.LogInfo($"Opening folder from startup: {path}");
				await OpenFolderAsync(path);
			}
		}
		catch (Exception ex)
		{
			_loggingService.LogError($"Failed to handle startup arguments: {ex.Message}");
		}
	}
	
	private async Task OpenFileAsync(string filePath)
	{
		try
		{
			if (!File.Exists(filePath))
			{
				_loggingService.LogWarning($"Startup file does not exist: {filePath}");
				return;
			}
			
			// Check if it's a markdown file
			var extension = Path.GetExtension(filePath).ToLowerInvariant();
			if (extension != ".md" && extension != ".markdown")
			{
				_loggingService.LogWarning($"Startup file is not a markdown file: {filePath}");
				return;
			}
			
			// Open in new tab
			_tabService.OpenTab(filePath, setActive: true);
			_loggingService.LogInfo($"Opened startup file in tab: {filePath}");
		}
		catch (Exception ex)
		{
			_loggingService.LogError($"Failed to open startup file: {ex.Message}");
		}
	}
	
	private async Task OpenFolderAsync(string folderPath)
	{
		try
		{
			if (!Directory.Exists(folderPath))
			{
				_loggingService.LogWarning($"Startup folder does not exist: {folderPath}");
				return;
			}
			
			// Load folder in file tree
			var fileTreeViewModel = _serviceProvider.GetRequiredService<ViewModels.FileTreeViewModel>();
			await fileTreeViewModel.LoadFolderCommand.ExecuteAsync(folderPath);
			_loggingService.LogInfo($"Loaded startup folder in file tree: {folderPath}");
		}
		catch (Exception ex)
		{
			_loggingService.LogError($"Failed to open startup folder: {ex.Message}");
		}
	}

	private async Task CheckSessionRecoveryAsync()
	{
		try
		{
			if (await _sessionService.WasAbnormalTerminationAsync())
			{
				_loggingService.LogInfo("Abnormal termination detected. Showing session recovery dialog.");
				
				var sessionState = await _sessionService.LoadSessionAsync();
				if (sessionState != null && sessionState.OpenTabs.Count > 0)
				{
					var recoveryPage = new SessionRecoveryPage(sessionState);
					await _mainPage.Navigation.PushModalAsync(recoveryPage, true);
					
					// Wait for user decision
					await Task.Delay(100); // Give time for modal to show
					
					// Check if user chose to restore
					if (recoveryPage.ShouldRestore)
					{
						_loggingService.LogInfo("User chose to restore session");
						// The MainViewModel will handle actual restoration via RestoreSessionAsync
					}
					else
					{
						_loggingService.LogInfo("User chose to start fresh");
						await _sessionService.ClearSessionAsync();
					}
				}
			}
			else
			{
				_loggingService.LogInfo("Normal startup - no session recovery needed");
			}
		}
		catch (Exception ex)
		{
			_loggingService.LogError($"Error during session recovery check: {ex.Message}");
		}
	}

	protected override void OnSleep()
	{
		base.OnSleep();
		// Mark as normal exit when app is put to sleep
		_ = _sessionService.MarkSessionAsNormalExitAsync();
	}

	protected override void OnResume()
	{
		base.OnResume();
		_loggingService.LogInfo("App resumed");
	}
}