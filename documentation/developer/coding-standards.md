# Coding Standards

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Developer](../) → Coding Standards

Coding conventions and style guidelines for MarkRead development.

## General Principles

- **Readability**: Code is read more than written
- **Consistency**: Follow existing patterns
- **Simplicity**: Simple solutions over clever ones
- **Testing**: Write testable code
- **Documentation**: Document non-obvious decisions

## C# Style

### Naming Conventions

```csharp
// PascalCase for classes, methods, properties
public class MarkdownService { }
public void ParseMarkdown() { }
public string Title { get; set; }

// camelCase for parameters, local variables
public void SetContent(string filePath)
{
    var content = File.ReadAllText(filePath);
}

// _camelCase for private fields
private readonly ILogger _logger;
private string _currentPath;

// UPPER_CASE for constants
public const int MAX_TABS = 50;
private const string DEFAULT_THEME = "dark";

// IPascalCase for interfaces
public interface INavigationService { }
```

### Code Organization

```csharp
// 1. Using statements (sorted)
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

// 2. Namespace
namespace MarkRead.Services
{
    // 3. Class documentation
    /// <summary>
    /// Service for parsing and rendering Markdown content.
    /// </summary>
    public class MarkdownService : IMarkdownService
    {
        // 4. Constants
        private const int MAX_CONTENT_SIZE = 10_000_000;
        
        // 5. Fields
        private readonly ILogger<MarkdownService> _logger;
        private readonly MarkdownPipeline _pipeline;
        
        // 6. Constructor
        public MarkdownService(ILogger<MarkdownService> logger)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _pipeline = new MarkdownPipelineBuilder()
                .UseAdvancedExtensions()
                .Build();
        }
        
        // 7. Properties
        public bool IsInitialized { get; private set; }
        
        // 8. Public methods
        public string ParseMarkdown(string content)
        {
            if (string.IsNullOrEmpty(content))
                return string.Empty;
                
            return Markdown.ToHtml(content, _pipeline);
        }
        
        // 9. Private methods
        private void ValidateContent(string content)
        {
            // Implementation
        }
    }
}
```

### Modern C# Features

**Use modern features when appropriate:**

```csharp
// Primary constructors (C# 12)
public class ThemeManager(ISettingsService settings)
{
    private readonly ISettingsService _settings = settings;
}

// Record types
public record TabInfo(string Title, string FilePath, bool IsPinned);

// Pattern matching
public string GetStatusMessage(Status status) => status switch
{
    Status.Loading => "Loading...",
    Status.Ready => "Ready",
    Status.Error => "Error occurred",
    _ => "Unknown"
};

// Null-coalescing assignment
_cache ??= new Dictionary<string, string>();

// Range and index
var last = items[^1];
var firstThree = items[..3];
```

## XAML Style

### Layout Structure

```xml
<Window x:Class="MarkRead.App.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="MarkRead" 
        Width="1200" 
        Height="800">
    
    <Grid>
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto" />
            <RowDefinition Height="*" />
        </Grid.RowDefinitions>
        
        <!-- Header -->
        <Border Grid.Row="0" 
                Background="{DynamicResource HeaderBackground}">
            <TextBlock Text="MarkRead" 
                       Style="{StaticResource HeaderStyle}" />
        </Border>
        
        <!-- Content -->
        <Grid Grid.Row="1">
            <!-- Content here -->
        </Grid>
    </Grid>
</Window>
```

### Naming

- Use PascalCase for element names
- Descriptive names: `SearchButton` not `Button1`
- Suffix with type: `TitleTextBlock`, `OpenMenuItem`

## Comments and Documentation

### XML Documentation

```csharp
/// <summary>
/// Parses markdown content and converts it to HTML.
/// </summary>
/// <param name="content">The markdown content to parse.</param>
/// <param name="options">Optional rendering options.</param>
/// <returns>HTML string representation of the markdown.</returns>
/// <exception cref="ArgumentNullException">
/// Thrown when <paramref name="content"/> is null.
/// </exception>
public string ParseMarkdown(string content, RenderOptions options = null)
{
    // Implementation
}
```

### Inline Comments

```csharp
// Good: Explain WHY, not WHAT
// Normalize paths to handle both forward and backward slashes
var normalizedPath = path.Replace('\\', '/');

// Bad: States the obvious
// Set the title to the value
Title = value;
```

### TODO Comments

```csharp
// TODO: Add support for custom extensions
// HACK: Temporary workaround for WebView2 bug - remove when fixed
// FIXME: This doesn't handle edge case X
// NOTE: Keep in sync with ThemeManager.cs
```

## Error Handling

### Use Specific Exceptions

```csharp
// Good
if (string.IsNullOrEmpty(filePath))
    throw new ArgumentNullException(nameof(filePath));
    
if (!File.Exists(filePath))
    throw new FileNotFoundException("Markdown file not found", filePath);

// Bad
throw new Exception("File not found");
```

### Catch Specific Exceptions

```csharp
try
{
    var content = await File.ReadAllTextAsync(filePath);
    return ParseMarkdown(content);
}
catch (FileNotFoundException ex)
{
    _logger.LogError(ex, "File not found: {FilePath}", filePath);
    throw;
}
catch (UnauthorizedAccessException ex)
{
    _logger.LogError(ex, "Access denied: {FilePath}", filePath);
    throw;
}
```

## Testing

### Test Naming

```csharp
[TestClass]
public class LinkResolverTests
{
    // Pattern: MethodName_Scenario_ExpectedBehavior
    [TestMethod]
    public void ResolveLink_WithRelativePath_ReturnsAbsolutePath()
    {
        // Arrange
        var resolver = new LinkResolver(@"C:\docs");
        
        // Act
        var result = resolver.ResolveLink("./file.md", @"C:\docs\folder");
        
        // Assert
        Assert.AreEqual(@"C:\docs\folder\file.md", result);
    }
}
```

## Code Review Checklist

Before submitting PR:

- [ ] Code follows naming conventions
- [ ] XML documentation for public APIs
- [ ] Unit tests for new functionality
- [ ] No hardcoded paths or values
- [ ] Error handling in place
- [ ] Logging added where appropriate
- [ ] No commented-out code
- [ ] EditorConfig rules followed

## See Also

- [Contributing Guide](contributing.md)
- [Testing Guide](testing.md)
- [Architecture Overview](architecture/overview.md)
