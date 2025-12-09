using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MarkRead.Models;

namespace MarkRead.ViewModels;

/// <summary>
/// ViewModel for individual tab
/// </summary>
public partial class TabViewModel : ObservableObject
{
    private readonly DocumentTab _tab;

    [ObservableProperty]
    private string _id;

    [ObservableProperty]
    private string _title;

    [ObservableProperty]
    private string _documentPath;

    [ObservableProperty]
    private bool _isActive;

    [ObservableProperty]
    private bool _isPinned;

    public TabViewModel(DocumentTab tab)
    {
        _tab = tab;
        _id = tab.Id;
        _title = tab.Title;
        _documentPath = tab.DocumentPath;
        _isActive = tab.IsActive;
        _isPinned = tab.IsPinned;
    }

    /// <summary>
    /// Updates the ViewModel from the underlying DocumentTab model
    /// </summary>
    public void Update()
    {
        Id = _tab.Id;
        Title = _tab.Title;
        DocumentPath = _tab.DocumentPath;
        IsActive = _tab.IsActive;
        IsPinned = _tab.IsPinned;
    }

    /// <summary>
    /// Gets the underlying DocumentTab model
    /// </summary>
    public DocumentTab GetModel() => _tab;
}
