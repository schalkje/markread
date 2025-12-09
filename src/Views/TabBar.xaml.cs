using MarkRead.ViewModels;

namespace MarkRead.Views;

public partial class TabBar : ContentView
{
    public TabBar()
    {
        InitializeComponent();
    }

    protected override void OnBindingContextChanged()
    {
        base.OnBindingContextChanged();
        
        if (BindingContext is MainViewModel viewModel)
        {
            // Subscribe to tab changes for smooth animations
            viewModel.PropertyChanged += OnViewModelPropertyChanged;
        }
    }

    private void OnViewModelPropertyChanged(object? sender, System.ComponentModel.PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(MainViewModel.ActiveTab))
        {
            // Trigger smooth transition animation when active tab changes
            AnimateTabSwitch();
        }
    }

    private async void AnimateTabSwitch()
    {
        // Smooth fade animation for tab switching
        await this.FadeToAsync(0.9, 100, Easing.CubicOut);
        await this.FadeToAsync(1.0, 100, Easing.CubicIn);
    }
}
