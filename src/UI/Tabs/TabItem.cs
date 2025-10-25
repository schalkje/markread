using System;

namespace MarkRead.App.UI.Tabs;

public sealed class TabItem
{
    public TabItem(Guid id, string title, string? documentPath = null)
    {
        Id = id;
        Title = title;
        DocumentPath = documentPath;
    }

    public Guid Id { get; }
    
    public string Title { get; set; }
    
    public string? DocumentPath { get; set; }
    
    public string? SearchQuery { get; set; }
    
    public int SearchMatchCount { get; set; }
}
