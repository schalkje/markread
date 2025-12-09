using Microsoft.Extensions.DependencyInjection;
using MarkRead.Services;
using MarkRead.Views;

namespace MarkRead;

public partial class App : Application
{
	private readonly MainPage _mainPage;
	private readonly IServiceProvider _serviceProvider;
	private readonly ISessionService _sessionService;
	private readonly ILoggingService _loggingService;

	public App(IServiceProvider serviceProvider)
	{
		InitializeComponent();
		
		_serviceProvider = serviceProvider;
		_sessionService = serviceProvider.GetRequiredService<ISessionService>();
		_loggingService = serviceProvider.GetRequiredService<ILoggingService>();
		
		// Resolve MainPage from DI container
		_mainPage = serviceProvider.GetRequiredService<MainPage>();
	}

	protected override Window CreateWindow(IActivationState? activationState)
	{
		var window = new Window(_mainPage);
		
		// Check for abnormal termination after window is created
		MainThread.BeginInvokeOnMainThread(async () =>
		{
			await CheckSessionRecoveryAsync();
		});
		
		return window;
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