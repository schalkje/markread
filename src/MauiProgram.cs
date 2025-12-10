using Microsoft.Extensions.Logging;
using CommunityToolkit.Maui;
using MarkRead.Services;
using MarkRead.Rendering;

namespace MarkRead;

public static class MauiProgram
{
	public static MauiApp CreateMauiApp()
	{
		var builder = MauiApp.CreateBuilder();
		builder
			.UseMauiApp<App>()
			.UseMauiCommunityToolkit()
			.ConfigureFonts(fonts =>
			{
				fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
				fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
			});

		// Register services
		RegisterServices(builder.Services);

		// Register ViewModels
		RegisterViewModels(builder.Services);

		// Register Views
		RegisterViews(builder.Services);

#if DEBUG
		builder.Logging.AddDebug();
#endif

		return builder.Build();
	}

	private static void RegisterServices(IServiceCollection services)
	{
		// Core services
		services.AddSingleton<IMarkdownService, MarkdownService>();
		services.AddSingleton<IFileSystemService, FileSystemService>();
		services.AddSingleton<ISettingsService, SettingsService>();
		services.AddSingleton<IThemeService, ThemeService>();
		services.AddSingleton<ILoggingService, LoggingService>();
		services.AddSingleton<INavigationService, NavigationService>();
		services.AddSingleton<ITabService, TabService>();
		services.AddSingleton<ISessionService, SessionService>();
		services.AddSingleton<IWorkspaceService, WorkspaceService>();
		services.AddSingleton<IKeyboardShortcutService, KeyboardShortcutService>();
		services.AddSingleton<IAccessibilityValidator, AccessibilityValidator>();
		
		// Rendering services
		services.AddSingleton<HtmlTemplateService>();
	}

	private static void RegisterViewModels(IServiceCollection services)
	{
		// ViewModels
		services.AddTransient<ViewModels.DocumentViewModel>();
		services.AddTransient<ViewModels.FileTreeViewModel>();
		services.AddSingleton<ViewModels.MainViewModel>();
		services.AddTransient<ViewModels.SettingsViewModel>();
	}

	private static void RegisterViews(IServiceCollection services)
	{
		// Views
		services.AddTransient<Views.MarkdownView>();
		services.AddTransient<Views.FileTreeView>();
		services.AddTransient<Views.SettingsPage>();
		services.AddTransient<MainPage>();
	}
}
