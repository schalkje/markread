# C# Syntax Highlighting

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Code](./) → C# Syntax

MarkRead provides rich syntax highlighting for C# code.

## Basic C# Example

```csharp
using System;

namespace MarkRead
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello, World!");
        }
    }
}
```

## Classes and Interfaces

```csharp
public interface IMarkdownRenderer
{
    string Render(string content);
    Task<string> RenderAsync(string content);
}

public class MarkdownService : IMarkdownRenderer
{
    private readonly ILogger<MarkdownService> _logger;
    
    public MarkdownService(ILogger<MarkdownService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }
    
    public string Render(string content)
    {
        _logger.LogInformation("Rendering markdown");
        return Markdown.ToHtml(content);
    }
    
    public async Task<string> RenderAsync(string content)
    {
        return await Task.Run(() => Render(content));
    }
}
```

## Properties and Records

```csharp
// Auto-properties
public class Document
{
    public string Title { get; set; }
    public string Content { get; set; }
    public DateTime CreatedAt { get; init; }
    public bool IsPublished { get; private set; }
    
    public void Publish()
    {
        IsPublished = true;
    }
}

// Record types (C# 9+)
public record TabInfo(string Title, string FilePath, bool IsPinned);

// Primary constructor (C# 12+)
public class ThemeManager(ISettingsService settings)
{
    private readonly ISettingsService _settings = settings;
}
```

## LINQ and Lambda Expressions

```csharp
var recentDocs = documents
    .Where(d => d.CreatedAt > DateTime.Now.AddDays(-7))
    .OrderByDescending(d => d.CreatedAt)
    .Select(d => new { d.Title, d.CreatedAt })
    .Take(10)
    .ToList();

// Method syntax
var count = items.Count(x => x.IsActive);

// Query syntax
var query = from doc in documents
            where doc.IsPublished
            orderby doc.Title
            select doc;
```

## Async/Await

```csharp
public async Task<List<Document>> LoadDocumentsAsync()
{
    try
    {
        var content = await File.ReadAllTextAsync(filePath);
        var documents = JsonSerializer.Deserialize<List<Document>>(content);
        return documents ?? new List<Document>();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Failed to load documents");
        throw;
    }
}

public async Task SaveAsync(Document document)
{
    await using var stream = File.OpenWrite(filePath);
    await JsonSerializer.SerializeAsync(stream, document);
}
```

## Pattern Matching

```csharp
// Switch expression
public string GetStatusMessage(Status status) => status switch
{
    Status.Loading => "Loading...",
    Status.Ready => "Ready",
    Status.Error => "An error occurred",
    _ => "Unknown status"
};

// Type pattern
public decimal CalculateArea(object shape) => shape switch
{
    Circle c => Math.PI * c.Radius * c.Radius,
    Rectangle r => r.Width * r.Height,
    Square s => s.Side * s.Side,
    _ => throw new ArgumentException("Unknown shape")
};

// Property pattern
public bool IsValidDocument(Document doc) => doc switch
{
    { Title.Length: > 0, Content.Length: > 0 } => true,
    _ => false
};
```

## Nullable Reference Types

```csharp
#nullable enable

public class DocumentService
{
    // Non-nullable
    private readonly string _basePath;
    
    // Nullable
    private string? _currentFile;
    
    public DocumentService(string basePath)
    {
        _basePath = basePath;
    }
    
    public string? GetCurrentFile()
    {
        return _currentFile;
    }
    
    public void SetCurrentFile(string? filePath)
    {
        _currentFile = filePath;
    }
}
```

## WPF Integration

```csharp
public partial class MainWindow : Window
{
    private readonly INavigationService _navigation;
    
    public MainWindow(INavigationService navigation)
    {
        InitializeComponent();
        _navigation = navigation;
        DataContext = new MainViewModel();
    }
    
    private async void OpenButton_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog
        {
            Filter = "Markdown files (*.md)|*.md|All files (*.*)|*.*"
        };
        
        if (dialog.ShowDialog() == true)
        {
            await LoadFileAsync(dialog.FileName);
        }
    }
}
```

## Highlighted Features

MarkRead highlights:
- **Keywords**: `class`, `interface`, `async`, `await`, `record`, etc.
- **Types**: `string`, `int`, `Task`, etc.
- **Modifiers**: `public`, `private`, `readonly`, etc.
- **LINQ**: `Where`, `Select`, `OrderBy`, etc.
- **Attributes**: `[Required]`, `[JsonProperty]`, etc.
- **Operators**: `=>`, `??`, `?.`, etc.

## See Also

- [Code Blocks](code-blocks.md)
- [Python Syntax](python-syntax.md)
- [JavaScript Syntax](javascript-syntax.md)
- [Architecture Overview](../../developer/architecture/overview.md)
