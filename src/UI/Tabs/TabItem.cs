using System;
using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace MarkRead.App.UI.Tabs;

public sealed class TabItem : INotifyPropertyChanged
{
    private bool _isActive;
    private double _zoomPercent = 100.0;
    private double _panOffsetX = 0.0;
    private double _panOffsetY = 0.0;

    public TabItem(Guid id, string title, string? documentPath = null)
    {
        Id = id;
        Title = title;
        DocumentPath = documentPath;
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public Guid Id { get; }
    
    public string Title { get; set; }
    
    public string? DocumentPath { get; set; }
    
    public string? SearchQuery { get; set; }
    
    public int SearchMatchCount { get; set; }

    /// <summary>
    /// The content control containing the WebView2 for this tab.
    /// </summary>
    public TabContentControl? Content { get; set; }

    public bool IsActive
    {
        get => _isActive;
        set
        {
            if (_isActive != value)
            {
                _isActive = value;
                OnPropertyChanged();
            }
        }
    }

    /// <summary>
    /// Current zoom level as percentage (default 100.0, range [10.0, 1000.0]).
    /// </summary>
    public double ZoomPercent
    {
        get => _zoomPercent;
        set
        {
            var clamped = Math.Clamp(value, 10.0, 1000.0);
            if (Math.Abs(_zoomPercent - clamped) > 0.01)
            {
                _zoomPercent = clamped;
                OnPropertyChanged();
            }
        }
    }

    /// <summary>
    /// Horizontal pan offset in pixels (default 0.0).
    /// </summary>
    public double PanOffsetX
    {
        get => _panOffsetX;
        set
        {
            if (Math.Abs(_panOffsetX - value) > 0.01)
            {
                _panOffsetX = value;
                OnPropertyChanged();
            }
        }
    }

    /// <summary>
    /// Vertical pan offset in pixels (default 0.0).
    /// </summary>
    public double PanOffsetY
    {
        get => _panOffsetY;
        set
        {
            if (Math.Abs(_panOffsetY - value) > 0.01)
            {
                _panOffsetY = value;
                OnPropertyChanged();
            }
        }
    }

    /// <summary>
    /// Resets zoom to 100% and pan offsets to (0, 0).
    /// </summary>
    public void ResetZoomPan()
    {
        ZoomPercent = 100.0;
        PanOffsetX = 0.0;
        PanOffsetY = 0.0;
    }

    private void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
