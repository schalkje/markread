using System;
using System.Diagnostics;
using System.Windows.Media;

namespace MarkRead.Services
{
    /// <summary>
    /// Performance monitor for tracking animation frame rates and timing (T078).
    /// Ensures animations maintain 60fps target and identifies performance issues.
    /// </summary>
    public class AnimationPerformanceMonitor
    {
        private static AnimationPerformanceMonitor? _instance;
        private readonly Stopwatch _frameTimer;
        private int _frameCount;
        private long _totalFrameTime;
        private int _droppedFrames;
        private const double TARGET_FRAME_TIME_MS = 16.67; // 60fps = ~16.67ms per frame

        private AnimationPerformanceMonitor()
        {
            _frameTimer = new Stopwatch();
            
            // Hook into WPF rendering pipeline
            CompositionTarget.Rendering += OnRendering;
        }

        /// <summary>
        /// Gets the singleton instance of the performance monitor.
        /// </summary>
        public static AnimationPerformanceMonitor Instance
        {
            get
            {
                _instance ??= new AnimationPerformanceMonitor();
                return _instance;
            }
        }

        /// <summary>
        /// Gets whether performance monitoring is enabled.
        /// </summary>
        public bool IsMonitoring { get; private set; }

        /// <summary>
        /// Gets the current average frame time in milliseconds.
        /// </summary>
        public double AverageFrameTime
        {
            get
            {
                if (_frameCount == 0) return 0;
                return (double)_totalFrameTime / _frameCount;
            }
        }

        /// <summary>
        /// Gets the current average frames per second.
        /// </summary>
        public double AverageFps
        {
            get
            {
                var avgFrameTime = AverageFrameTime;
                return avgFrameTime > 0 ? 1000.0 / avgFrameTime : 0;
            }
        }

        /// <summary>
        /// Gets the number of dropped frames (frames exceeding target time).
        /// </summary>
        public int DroppedFrames => _droppedFrames;

        /// <summary>
        /// Gets the total number of frames measured.
        /// </summary>
        public int TotalFrames => _frameCount;

        /// <summary>
        /// Starts monitoring animation performance.
        /// </summary>
        public void StartMonitoring()
        {
            if (IsMonitoring) return;

            IsMonitoring = true;
            ResetMetrics();
            _frameTimer.Restart();
        }

        /// <summary>
        /// Stops monitoring animation performance.
        /// </summary>
        public void StopMonitoring()
        {
            if (!IsMonitoring) return;

            IsMonitoring = false;
            _frameTimer.Stop();
        }

        /// <summary>
        /// Resets all performance metrics.
        /// </summary>
        public void ResetMetrics()
        {
            _frameCount = 0;
            _totalFrameTime = 0;
            _droppedFrames = 0;
        }

        /// <summary>
        /// Gets a performance summary report.
        /// </summary>
        public string GetPerformanceReport()
        {
            if (_frameCount == 0)
            {
                return "No performance data available.";
            }

            var dropRate = (double)_droppedFrames / _frameCount * 100;
            var status = AverageFps >= 55 ? "✓ GOOD" : AverageFps >= 30 ? "⚠ FAIR" : "✗ POOR";

            return $@"Animation Performance Report:
  Status: {status}
  Average FPS: {AverageFps:F2}
  Average Frame Time: {AverageFrameTime:F2} ms
  Total Frames: {_frameCount}
  Dropped Frames: {_droppedFrames} ({dropRate:F1}%)
  Target: 60 fps ({TARGET_FRAME_TIME_MS:F2} ms/frame)";
        }

        private void OnRendering(object? sender, EventArgs e)
        {
            if (!IsMonitoring) return;

            var elapsed = _frameTimer.ElapsedMilliseconds;
            
            if (_frameCount > 0)
            {
                // Check if frame took longer than target
                if (elapsed > TARGET_FRAME_TIME_MS)
                {
                    _droppedFrames++;
                }
                
                _totalFrameTime += elapsed;
            }

            _frameCount++;
            _frameTimer.Restart();
        }

        /// <summary>
        /// Validates that an animation meets performance requirements.
        /// </summary>
        /// <param name="durationMs">Expected animation duration in milliseconds</param>
        /// <param name="tolerance">Acceptable tolerance for dropped frames (0.0-1.0)</param>
        /// <returns>True if animation meets requirements</returns>
        public bool ValidateAnimationPerformance(int durationMs, double tolerance = 0.05)
        {
            if (_frameCount == 0) return false;

            var expectedFrames = durationMs / TARGET_FRAME_TIME_MS;
            var dropRate = (double)_droppedFrames / _frameCount;
            
            return dropRate <= tolerance && AverageFps >= 55;
        }
    }
}
