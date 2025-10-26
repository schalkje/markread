using System;
using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace MarkRead.App.UI.Tabs;

public sealed class TabItem : INotifyPropertyChanged
{
    private bool _isActive;

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

    private void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
