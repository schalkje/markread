using Microsoft.Maui.Controls;

namespace MarkRead.Behaviors;

/// <summary>
/// Behavior for pinch-to-zoom gesture on touch devices
/// </summary>
public class PinchZoomBehavior : Behavior<View>
{
    private double _startScale = 1;
    private double _currentScale = 1;
    private double _xOffset = 0;
    private double _yOffset = 0;
    
    // Zoom limits
    private const double MinScale = 0.5;
    private const double MaxScale = 3.0;
    
    // Natural inertia for smooth zoom
    private const uint AnimationDuration = 250;

    protected override void OnAttachedTo(View bindable)
    {
        base.OnAttachedTo(bindable);
        
        var pinchGesture = new PinchGestureRecognizer();
        pinchGesture.PinchUpdated += OnPinchUpdated;
        bindable.GestureRecognizers.Add(pinchGesture);
    }

    protected override void OnDetachingFrom(View bindable)
    {
        base.OnDetachingFrom(bindable);
        
        var pinchGesture = bindable.GestureRecognizers.FirstOrDefault(g => g is PinchGestureRecognizer);
        if (pinchGesture != null)
        {
            ((PinchGestureRecognizer)pinchGesture).PinchUpdated -= OnPinchUpdated;
            bindable.GestureRecognizers.Remove(pinchGesture);
        }
    }

    private void OnPinchUpdated(object? sender, PinchGestureUpdatedEventArgs e)
    {
        if (sender is not View view)
            return;

        switch (e.Status)
        {
            case GestureStatus.Started:
                _startScale = _currentScale;
                view.AnchorX = 0;
                view.AnchorY = 0;
                break;

            case GestureStatus.Running:
                // Calculate new scale with limits
                _currentScale = Math.Clamp(_startScale * e.Scale, MinScale, MaxScale);
                
                // Calculate offset to zoom towards pinch center
                var renderedX = view.X + _xOffset;
                var deltaX = renderedX / view.Width;
                var deltaWidth = view.Width / (_currentScale * view.Scale);
                var originX = (e.ScaleOrigin.X - deltaX) * deltaWidth;

                var renderedY = view.Y + _yOffset;
                var deltaY = renderedY / view.Height;
                var deltaHeight = view.Height / (_currentScale * view.Scale);
                var originY = (e.ScaleOrigin.Y - deltaY) * deltaHeight;

                // Smooth scaling with natural feel
                var targetX = _xOffset - originX * view.Width;
                var targetY = _yOffset - originY * view.Height;
                
                view.TranslationX = targetX;
                view.TranslationY = targetY;
                view.Scale = _currentScale;
                break;

            case GestureStatus.Completed:
                // Smooth spring-back animation if zoomed out too far
                if (_currentScale < MinScale)
                {
                    view.ScaleTo(MinScale, AnimationDuration, Easing.SpringOut);
                    _currentScale = MinScale;
                }
                else if (_currentScale > MaxScale)
                {
                    view.ScaleTo(MaxScale, AnimationDuration, Easing.SpringOut);
                    _currentScale = MaxScale;
                }
                
                // Store final offset
                _xOffset = view.TranslationX;
                _yOffset = view.TranslationY;
                break;
        }
    }

    /// <summary>
    /// Reset zoom to default
    /// </summary>
    public void ResetZoom(View view)
    {
        view.TranslateTo(0, 0, AnimationDuration, Easing.CubicOut);
        view.ScaleTo(1, AnimationDuration, Easing.CubicOut);
        _currentScale = 1;
        _startScale = 1;
        _xOffset = 0;
        _yOffset = 0;
    }

    /// <summary>
    /// Get current zoom level
    /// </summary>
    public double CurrentScale => _currentScale;
}
