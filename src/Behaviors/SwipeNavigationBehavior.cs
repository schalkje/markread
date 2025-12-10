using Microsoft.Maui.Controls;

namespace MarkRead.Behaviors;

/// <summary>
/// Behavior for swipe gestures on touch devices
/// </summary>
public class SwipeNavigationBehavior : Behavior<View>
{
    // Swipe detection thresholds
    private const double MinSwipeDistance = 100;
    private const double MaxSwipeTime = 500; // milliseconds
    private const double MinSwipeVelocity = 0.5; // pixels per millisecond
    
    private DateTime _swipeStartTime;
    private Point _swipeStartPoint;
    
    /// <summary>
    /// Event raised when a left swipe is detected
    /// </summary>
    public event EventHandler? SwipedLeft;
    
    /// <summary>
    /// Event raised when a right swipe is detected
    /// </summary>
    public event EventHandler? SwipedRight;
    
    /// <summary>
    /// Event raised when an up swipe is detected
    /// </summary>
    public event EventHandler? SwipedUp;
    
    /// <summary>
    /// Event raised when a down swipe is detected
    /// </summary>
    public event EventHandler? SwipedDown;

    protected override void OnAttachedTo(View bindable)
    {
        base.OnAttachedTo(bindable);
        
        var panGesture = new PanGestureRecognizer();
        panGesture.PanUpdated += OnPanUpdated;
        bindable.GestureRecognizers.Add(panGesture);
    }

    protected override void OnDetachingFrom(View bindable)
    {
        base.OnDetachingFrom(bindable);
        
        var panGesture = bindable.GestureRecognizers.FirstOrDefault(g => g is PanGestureRecognizer);
        if (panGesture != null)
        {
            ((PanGestureRecognizer)panGesture).PanUpdated -= OnPanUpdated;
            bindable.GestureRecognizers.Remove(panGesture);
        }
    }

    private void OnPanUpdated(object? sender, PanUpdatedEventArgs e)
    {
        switch (e.StatusType)
        {
            case GestureStatus.Started:
                _swipeStartTime = DateTime.UtcNow;
                _swipeStartPoint = new Point(e.TotalX, e.TotalY);
                break;

            case GestureStatus.Completed:
                var swipeEndTime = DateTime.UtcNow;
                var swipeDuration = (swipeEndTime - _swipeStartTime).TotalMilliseconds;
                
                if (swipeDuration > MaxSwipeTime)
                    return; // Too slow to be a swipe
                
                var deltaX = e.TotalX - _swipeStartPoint.X;
                var deltaY = e.TotalY - _swipeStartPoint.Y;
                
                var distance = Math.Sqrt(deltaX * deltaX + deltaY * deltaY);
                if (distance < MinSwipeDistance)
                    return; // Distance too short
                
                var velocity = distance / swipeDuration;
                if (velocity < MinSwipeVelocity)
                    return; // Too slow
                
                // Determine swipe direction (favor horizontal or vertical)
                if (Math.Abs(deltaX) > Math.Abs(deltaY))
                {
                    // Horizontal swipe
                    if (deltaX > 0)
                        SwipedRight?.Invoke(sender, EventArgs.Empty);
                    else
                        SwipedLeft?.Invoke(sender, EventArgs.Empty);
                }
                else
                {
                    // Vertical swipe
                    if (deltaY > 0)
                        SwipedDown?.Invoke(sender, EventArgs.Empty);
                    else
                        SwipedUp?.Invoke(sender, EventArgs.Empty);
                }
                break;
        }
    }
}
