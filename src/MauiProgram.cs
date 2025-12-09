using Microsoft.Extensions.Logging;
using CommunityToolkit.Maui;
using MarkRead.Services;

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
	}

	private static void RegisterViewModels(IServiceCollection services)
	{
		// ViewModels will be registered here as they are created
		// Example: services.AddTransient<MainViewModel>();
	}

	private static void RegisterViews(IServiceCollection services)
	{
		// Views will be registered here as they are created
		// Example: services.AddTransient<MainPage>();
	}
}
