using MarkRead.ViewModels;

namespace MarkRead.Views;

public partial class SearchBar : ContentView
{
    public SearchBar()
    {
        InitializeComponent();
    }

    protected override void OnBindingContextChanged()
    {
        base.OnBindingContextChanged();

        if (BindingContext is SearchViewModel viewModel)
        {
            // Focus search entry when search bar becomes visible
            viewModel.PropertyChanged += (s, e) =>
            {
                if (e.PropertyName == nameof(SearchViewModel.IsVisible) && viewModel.IsVisible)
                {
                    Dispatcher.Dispatch(() => SearchEntry.Focus());
                }
            };
        }
    }
}
