using System;
using System.Diagnostics;

namespace MarkRead.Services
{
    /// <summary>
    /// Monitors application startup performance (T083).
    /// Tracks initialization time and identifies bottlenecks.
    /// </summary>
    public class StartupPerformanceMonitor
    {
        private static StartupPerformanceMonitor? _instance;
        private readonly Stopwatch _totalStartupTime;
        private readonly Stopwatch _currentPhaseTime;
        private string _currentPhase = "Not Started";
        private double _baselineStartupTimeMs = 2000; // 2 seconds baseline
        private readonly System.Collections.Generic.List<PhaseMetric> _phases;

        private StartupPerformanceMonitor()
        {
            _totalStartupTime = Stopwatch.StartNew();
            _currentPhaseTime = new Stopwatch();
            _phases = new System.Collections.Generic.List<PhaseMetric>();
        }

        /// <summary>
        /// Gets the singleton instance.
        /// </summary>
        public static StartupPerformanceMonitor Instance
        {
            get
            {
                _instance ??= new StartupPerformanceMonitor();
                return _instance;
            }
        }

        /// <summary>
        /// Starts timing a startup phase.
        /// </summary>
        public void StartPhase(string phaseName)
        {
            // End previous phase if running
            if (_currentPhaseTime.IsRunning)
            {
                EndPhase();
            }

            _currentPhase = phaseName;
            _currentPhaseTime.Restart();
        }

        /// <summary>
        /// Ends the current startup phase.
        /// </summary>
        public void EndPhase()
        {
            if (!_currentPhaseTime.IsRunning) return;

            _currentPhaseTime.Stop();
            _phases.Add(new PhaseMetric
            {
                Name = _currentPhase,
                DurationMs = _currentPhaseTime.ElapsedMilliseconds
            });
        }

        /// <summary>
        /// Completes startup monitoring and generates report.
        /// </summary>
        public string CompleteStartup()
        {
            if (_currentPhaseTime.IsRunning)
            {
                EndPhase();
            }

            _totalStartupTime.Stop();
            return GenerateReport();
        }

        /// <summary>
        /// Sets the baseline startup time for comparison (T083).
        /// </summary>
        public void SetBaseline(double baselineMs)
        {
            _baselineStartupTimeMs = baselineMs;
        }

        /// <summary>
        /// Gets the total elapsed startup time in milliseconds.
        /// </summary>
        public long TotalStartupTimeMs => _totalStartupTime.ElapsedMilliseconds;

        /// <summary>
        /// Checks if startup time is within acceptable range (<10% increase from baseline).
        /// </summary>
        public bool IsWithinTarget()
        {
            var maxAllowed = _baselineStartupTimeMs * 1.10; // 10% tolerance
            return TotalStartupTimeMs <= maxAllowed;
        }

        /// <summary>
        /// Generates a detailed startup performance report.
        /// </summary>
        private string GenerateReport()
        {
            var report = new System.Text.StringBuilder();
            report.AppendLine("Startup Performance Report:");
            report.AppendLine($"Total Startup Time: {TotalStartupTimeMs} ms");
            report.AppendLine($"Baseline: {_baselineStartupTimeMs} ms");
            report.AppendLine($"Target (110% of baseline): {_baselineStartupTimeMs * 1.10:F0} ms");
            
            var percentChange = ((TotalStartupTimeMs - _baselineStartupTimeMs) / _baselineStartupTimeMs) * 100;
            report.AppendLine($"Change from Baseline: {percentChange:+0.0;-0.0}%");
            
            var status = IsWithinTarget() ? "✓ PASS" : "✗ FAIL";
            report.AppendLine($"Status: {status}");
            report.AppendLine();
            report.AppendLine("Phase Breakdown:");

            foreach (var phase in _phases)
            {
                var percentage = (phase.DurationMs / (double)TotalStartupTimeMs) * 100;
                report.AppendLine($"  {phase.Name}: {phase.DurationMs} ms ({percentage:F1}%)");
            }

            // Identify bottlenecks (phases taking >20% of total time)
            report.AppendLine();
            report.AppendLine("Potential Bottlenecks:");
            var hasBottlenecks = false;
            
            foreach (var phase in _phases)
            {
                var percentage = (phase.DurationMs / (double)TotalStartupTimeMs) * 100;
                if (percentage > 20)
                {
                    report.AppendLine($"  ⚠ {phase.Name} ({percentage:F1}% of total)");
                    hasBottlenecks = true;
                }
            }

            if (!hasBottlenecks)
            {
                report.AppendLine("  None detected");
            }

            return report.ToString();
        }

        private class PhaseMetric
        {
            public string Name { get; set; } = string.Empty;
            public long DurationMs { get; set; }
        }
    }
}
