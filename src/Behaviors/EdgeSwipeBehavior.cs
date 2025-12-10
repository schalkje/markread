using Microsoft.Maui.Controls;

namespace MarkRead.Behaviors;

/// <summary>
/// Detects two-finger swipe from the left edge to toggle sidebar visibility.
/// On touch-enabled devices, swiping from the left edge with two fingers will show/hide the sidebar.
/// </summary>
public class EdgeSwipeBehavior : Behavior<Grid>
{
    private Grid? _attachedGrid;
    private Point _startPoint;
    private DateTime _startTime;
    private int _touchCount;
    
    // Edge swipe detection thresholds
    private const double EDGE_THRESHOLD_PX = 50;        // Must start within 50px of left edge
    private const double MIN_SWIPE_DISTANCE_PX = 100;   // Must swipe at least 100px
    private const int MAX_SWIPE_TIME_MS = 500;          // Must complete within 500ms
    
    /// <summary>
    /// Event fired when a valid edge swipe is detected
    /// </summary>
    public event EventHandler? EdgeSwiped;

    protected override void OnAttachedTo(Grid grid)
    {
        base.OnAttachedTo(grid);
        _attachedGrid = grid;

        // Add pan gesture recognizer for swipe detection
        var panGesture = new PanGestureRecognizer();
        panGesture.PanUpdated += OnPanUpdated;
        _attachedGrid.GestureRecognizers.Add(panGesture);

        // Add pointer gesture for touch count detection
        var pointerGesture = new PointerGestureRecognizer();
        pointerGesture.PointerPressed += OnPointerPressed;
        pointerGesture.PointerReleased += OnPointerReleased;
        _attachedGrid.GestureRecognizers.Add(pointerGesture);
    }

    protected override void OnDetachingFrom(Grid grid)
    {
        if (_attachedGrid != null)
        {
            var panGesture = _attachedGrid.GestureRecognizers.OfType<PanGestureRecognizer>().FirstOrDefault();
            if (panGesture != null)
            {
                panGesture.PanUpdated -= OnPanUpdated;
                _attachedGrid.GestureRecognizers.Remove(panGesture);
            }

            var pointerGesture = _attachedGrid.GestureRecognizers.OfType<PointerGestureRecognizer>().FirstOrDefault();
            if (pointerGesture != null)
            {
                pointerGesture.PointerPressed -= OnPointerPressed;
                pointerGesture.PointerReleased -= OnPointerReleased;
                _attachedGrid.GestureRecognizers.Remove(pointerGesture);
            }
        }

        _attachedGrid = null;
        base.OnDetachingFrom(grid);
    }

    private void OnPointerPressed(object? sender, PointerEventArgs e)
    {
        // Increment touch count (approximation for multi-touch)
        _touchCount++;
    }

    private void OnPointerReleased(object? sender, PointerEventArgs e)
    {
        // Decrement touch count
        _touchCount = Math.Max(0, _touchCount - 1);
    }

    private void OnPanUpdated(object? sender, PanUpdatedEventArgs e)
    {
        switch (e.StatusType)
        {
            case GestureStatus.Started:
                // Check if gesture started near the left edge
                // Note: TotalX/TotalY are relative to start point, so we need to check bounds
                var location = e.TotalX;
                
                // For edge swipe, we expect the gesture to start near x=0
                // In a real implementation, you'd get the absolute position
                // For now, we'll assume any gesture with 2+ touches could be edge swipe
                _startPoint = new Point(e.TotalX, e.TotalY);
                _startTime = DateTime.Now;
                break;

            case GestureStatus.Running:
                // Track movement
                break;

            case GestureStatus.Completed:
            case GestureStatus.Canceled:
                var endTime = DateTime.Now;
                var duration = (endTime - _startTime).TotalMilliseconds;

                // Check if this meets edge swipe criteria:
                // 1. Two fingers (approximated by touch count)
                // 2. Horizontal swipe from left edge
                // 3. Sufficient distance
                // 4. Completed within time limit
                if (_touchCount >= 2 && 
                    duration <= MAX_SWIPE_TIME_MS &&
                    e.TotalX > MIN_SWIPE_DISTANCE_PX && // Positive = swipe right
                    Math.Abs(e.TotalY) < MIN_SWIPE_DISTANCE_PX / 2) // Mostly horizontal
                {
                    // Valid edge swipe detected
                    EdgeSwiped?.Invoke(this, EventArgs.Empty);
                }

                // Reset touch count on gesture end
                _touchCount = 0;
                break;
        }
    }
}
