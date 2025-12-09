using Microsoft.Extensions.Logging;
using CommunityToolkit.Maui;

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
		// Core services will be registered here as they are migrated from WPF
		// Example from src.old/Services:
		// services.AddSingleton<SettingsService>();
		// services.AddSingleton<HistoryService>();
		// services.AddSingleton<FileWatcherService>();
		// services.AddSingleton<FolderService>();
		// services.AddSingleton<MarkdownService>();
		// services.AddSingleton<SearchService>();
		// services.AddSingleton<NavigationService>();
		// services.AddSingleton<TabService>();
		// services.AddSingleton<SidebarService>();
		// services.AddSingleton<TreeViewService>();
		// services.AddSingleton<TreeViewContextMenuService>();
		// services.AddSingleton<UIStateService>();
		// services.AddSingleton<AnimationService>();
		// services.AddSingleton<HtmlSanitizerService>();
		// services.AddSingleton<LinkResolver>();
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
