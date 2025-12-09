using Microsoft.Extensions.DependencyInjection;

namespace MarkRead;

public partial class App : Application
{
	private readonly MainPage _mainPage;

	public App(IServiceProvider serviceProvider)
	{
		InitializeComponent();
		
		// Resolve MainPage from DI container
		_mainPage = serviceProvider.GetRequiredService<MainPage>();
	}

	protected override Window CreateWindow(IActivationState? activationState)
	{
		return new Window(_mainPage);
	}
}