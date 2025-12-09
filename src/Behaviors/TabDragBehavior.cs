using MarkRead.ViewModels;

namespace MarkRead.Behaviors;

/// <summary>
/// Enables drag-to-reorder functionality for tab items.
/// Provides smooth visual feedback during drag operations and persists tab order.
/// </summary>
public class TabDragBehavior : Behavior<View>
{
    private View? _associatedView;
    private double _startX;
    private double _startY;
    private bool _isDragging;
    private const double DragThreshold = 10; // Minimum distance to start drag
    private MainViewModel? _viewModel;
    private TabViewModel? _draggedTab;

    protected override void OnAttachedTo(View bindable)
    {
        base.OnAttachedTo(bindable);
        _associatedView = bindable;

        // Add pan gesture recognizer for drag
        var panGesture = new PanGestureRecognizer();
        panGesture.PanUpdated += OnPanUpdated;
        bindable.GestureRecognizers.Add(panGesture);

        // Get MainViewModel from ancestor
        if (bindable.BindingContext is TabViewModel tabViewModel)
        {
            _draggedTab = tabViewModel;
            _viewModel = FindMainViewModel(bindable);
        }
    }

    protected override void OnDetachingFrom(View bindable)
    {
        base.OnDetachingFrom(bindable);
        
        if (bindable.GestureRecognizers.Count > 0)
        {
            var panGesture = bindable.GestureRecognizers.OfType<PanGestureRecognizer>().FirstOrDefault();
            if (panGesture != null)
            {
                panGesture.PanUpdated -= OnPanUpdated;
                bindable.GestureRecognizers.Remove(panGesture);
            }
        }

        _associatedView = null;
        _draggedTab = null;
        _viewModel = null;
    }

    private void OnPanUpdated(object? sender, PanUpdatedEventArgs e)
    {
        if (_associatedView == null || _draggedTab == null || _viewModel == null)
            return;

        switch (e.StatusType)
        {
            case GestureStatus.Started:
                HandleDragStarted(e);
                break;

            case GestureStatus.Running:
                HandleDragRunning(e);
                break;

            case GestureStatus.Completed:
            case GestureStatus.Canceled:
                HandleDragCompleted();
                break;
        }
    }

    private void HandleDragStarted(PanUpdatedEventArgs e)
    {
        _startX = e.TotalX;
        _startY = e.TotalY;
        _isDragging = false;
    }

    private void HandleDragRunning(PanUpdatedEventArgs e)
    {
        if (_associatedView == null || _viewModel == null || _draggedTab == null)
            return;

        // Check if drag threshold exceeded
        var distance = Math.Sqrt(Math.Pow(e.TotalX - _startX, 2) + Math.Pow(e.TotalY - _startY, 2));
        if (!_isDragging && distance > DragThreshold)
        {
            _isDragging = true;
            // Start drag visual feedback
            _ = AnimateDragStartAsync();
        }

        if (_isDragging)
        {
            // Update visual position
            _associatedView.TranslationX = e.TotalX;
            _associatedView.TranslationY = e.TotalY;

            // Check for reorder
            CheckForReorder(e.TotalX);
        }
    }

    private async void HandleDragCompleted()
    {
        if (_associatedView == null || !_isDragging)
            return;

        _isDragging = false;

        // Animate back to position
        await AnimateDragEndAsync();

        // Reset translation
        _associatedView.TranslationX = 0;
        _associatedView.TranslationY = 0;
    }

    private async Task AnimateDragStartAsync()
    {
        if (_associatedView == null)
            return;

        // Scale up and reduce opacity for drag visual
        await Task.WhenAll(
            _associatedView.ScaleToAsync(1.05, 150, Easing.CubicOut),
            _associatedView.FadeToAsync(0.7, 150, Easing.CubicOut)
        );
    }

    private async Task AnimateDragEndAsync()
    {
        if (_associatedView == null)
            return;

        // Restore normal appearance
        await Task.WhenAll(
            _associatedView.ScaleToAsync(1.0, 200, Easing.CubicOut),
            _associatedView.FadeToAsync(1.0, 200, Easing.CubicOut),
            _associatedView.TranslateToAsync(0, 0, 200, Easing.CubicOut)
        );
    }

    private void CheckForReorder(double dragX)
    {
        if (_viewModel == null || _draggedTab == null || _associatedView == null)
            return;

        // Calculate which tab position we're over based on drag distance
        // Each tab is approximately 180px wide (average of min/max)
        const double tabWidth = 180;
        var offsetTabs = (int)Math.Round(dragX / tabWidth);

        if (offsetTabs == 0)
            return;

        // Get current index
        var currentIndex = _viewModel.Tabs.IndexOf(_draggedTab);
        if (currentIndex < 0)
            return;

        // Calculate new index
        var newIndex = currentIndex + offsetTabs;
        newIndex = Math.Clamp(newIndex, 0, _viewModel.Tabs.Count - 1);

        if (newIndex != currentIndex)
        {
            // Perform reorder
            _viewModel.Tabs.Move(currentIndex, newIndex);
            
            // Persist the new order via TabService
            var tabIds = _viewModel.Tabs.Select(t => t.Id).ToList();
            // This will be called via the MainViewModel's reorder command
            _viewModel.ReorderTabsCommand?.Execute(tabIds);
        }
    }

    private MainViewModel? FindMainViewModel(Element element)
    {
        var current = element;
        while (current != null)
        {
            if (current.BindingContext is MainViewModel vm)
                return vm;
            current = current.Parent;
        }
        return null;
    }
}
