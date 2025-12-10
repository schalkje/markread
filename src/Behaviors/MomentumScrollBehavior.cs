using Microsoft.Maui.Controls;

namespace MarkRead.Behaviors;

/// <summary>
/// Adds momentum scrolling (inertia) to ScrollView for natural touch feel.
/// On touch-enabled devices, flick gestures will cause the scroll to decelerate smoothly.
/// </summary>
public class MomentumScrollBehavior : Behavior<ScrollView>
{
    private ScrollView? _scrollView;
    private Point _startPoint;
    private DateTime _startTime;
    private double _velocity;
    private bool _isFlicking;
    private const double FRICTION = 0.95;
    private const double MIN_VELOCITY = 0.5;
    private const int FLICK_TIME_MS = 300;

    protected override void OnAttachedTo(ScrollView scrollView)
    {
        base.OnAttachedTo(scrollView);
        _scrollView = scrollView;

        // Add pan gesture for tracking velocity
        var panGesture = new PanGestureRecognizer();
        panGesture.PanUpdated += OnPanUpdated;
        _scrollView.GestureRecognizers.Add(panGesture);
    }

    protected override void OnDetachingFrom(ScrollView scrollView)
    {
        if (_scrollView != null)
        {
            // Remove gesture recognizer
            var panGesture = _scrollView.GestureRecognizers.OfType<PanGestureRecognizer>().FirstOrDefault();
            if (panGesture != null)
            {
                panGesture.PanUpdated -= OnPanUpdated;
                _scrollView.GestureRecognizers.Remove(panGesture);
            }
        }

        _scrollView = null;
        base.OnDetachingFrom(scrollView);
    }

    private void OnPanUpdated(object? sender, PanUpdatedEventArgs e)
    {
        if (_scrollView == null) return;

        switch (e.StatusType)
        {
            case GestureStatus.Started:
                _startPoint = new Point(e.TotalX, e.TotalY);
                _startTime = DateTime.Now;
                _isFlicking = false;
                break;

            case GestureStatus.Running:
                // ScrollView handles the actual scrolling
                // We just track for velocity calculation
                break;

            case GestureStatus.Completed:
            case GestureStatus.Canceled:
                var endTime = DateTime.Now;
                var duration = (endTime - _startTime).TotalMilliseconds;

                // Check if this was a flick gesture (fast movement)
                if (duration < FLICK_TIME_MS && duration > 0)
                {
                    var distance = Math.Abs(e.TotalY);
                    _velocity = distance / duration * 1000; // pixels per second

                    if (_velocity > MIN_VELOCITY)
                    {
                        _isFlicking = true;
                        var direction = e.TotalY < 0 ? 1 : -1; // Negative means swipe up, scroll down
                        StartMomentumScroll(direction);
                    }
                }
                break;
        }
    }

    private async void StartMomentumScroll(int direction)
    {
        if (_scrollView == null || !_isFlicking) return;

        double currentVelocity = _velocity;

        while (_isFlicking && currentVelocity > MIN_VELOCITY)
        {
            // Calculate scroll amount based on velocity
            var scrollAmount = currentVelocity / 60.0 * direction; // 60 FPS target

            // Get current scroll position
            var currentY = _scrollView.ScrollY;
            var newY = Math.Max(0, currentY + scrollAmount);

            // Check if we've hit the edge
            var contentHeight = (_scrollView.Content?.Height ?? 0);
            var scrollViewHeight = _scrollView.Height;
            var maxScroll = Math.Max(0, contentHeight - scrollViewHeight);

            if (newY >= maxScroll)
            {
                // Hit bottom edge - add bounce effect
                await _scrollView.ScrollToAsync(0, maxScroll, true);
                _isFlicking = false;
                break;
            }
            else if (newY <= 0)
            {
                // Hit top edge - add bounce effect
                await _scrollView.ScrollToAsync(0, 0, true);
                _isFlicking = false;
                break;
            }

            // Scroll to new position
            await _scrollView.ScrollToAsync(0, newY, false);

            // Apply friction
            currentVelocity *= FRICTION;

            // Wait for next frame (~16ms for 60 FPS)
            await Task.Delay(16);
        }

        _isFlicking = false;
    }

    /// <summary>
    /// Stops any ongoing momentum scrolling
    /// </summary>
    public void StopMomentum()
    {
        _isFlicking = false;
    }
}
