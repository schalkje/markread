using Xunit;
using Moq;
using MarkRead.Rendering;
using MarkRead.Services;
using MarkRead.Models;

namespace MarkRead.Tests.Integration;

public class RenderingTests
{
    [Fact]
    public async Task EndToEnd_MarkdownToHtml_RendersSuccessfully()
    {
        // Arrange - Create real services (integration test)
        var markdownService = new MarkdownService();
        var mockThemeService = new Mock<IThemeService>();
        var mockLoggingService = new Mock<ILoggingService>();
        
        mockThemeService
            .Setup(x => x.GetCurrentTheme())
            .Returns(new Theme
            {
                Type = ThemeType.Light,
                BackgroundColor = "#ffffff",
                TextColor = "#1f1f1f",
                SurfaceColor = "#f6f8fa",
                PrimaryColor = "#0969da",
                FontFamily = "Segoe UI",
                FontSize = 16,
                LineHeight = 1.6
            });

        var htmlTemplateService = new HtmlTemplateService(
            markdownService,
            mockThemeService.Object,
            mockLoggingService.Object
        );

        var markdown = @"# Test Document

This is a **test** document with:
- List item 1
- List item 2

## Code Example

```csharp
public void TestMethod()
{
    Console.WriteLine(""Hello World"");
}
```

[Link to Google](https://www.google.com)";

        // Act
        var html = await htmlTemplateService.RenderDocumentAsync(markdown, "Test Document");

        // Assert
        Assert.NotNull(html);
        Assert.NotEmpty(html);
        Assert.Contains("<!DOCTYPE html>", html);
        Assert.Contains("<h1>Test Document</h1>", html);
        Assert.Contains("<strong>test</strong>", html);
        Assert.Contains("<li>List item 1</li>", html);
        Assert.Contains("<h2>Code Example</h2>", html);
        Assert.Contains("https://www.google.com", html);
        Assert.Contains("class=\"light\"", html); // Theme applied
    }

    [Fact]
    public async Task Rendering_HandlesMarkdownWithDiagrams()
    {
        // Arrange
        var markdownService = new MarkdownService();
        var mockThemeService = new Mock<IThemeService>();
        var mockLoggingService = new Mock<ILoggingService>();
        
        mockThemeService
            .Setup(x => x.GetCurrentTheme())
            .Returns(new Theme { Type = ThemeType.Dark, BackgroundColor = "#0d1117", TextColor = "#e6edf3", SurfaceColor = "#161b22", PrimaryColor = "#539bf5", FontFamily = "Segoe UI", FontSize = 16, LineHeight = 1.6 });

        var htmlTemplateService = new HtmlTemplateService(
            markdownService,
            mockThemeService.Object,
            mockLoggingService.Object
        );

        var markdown = @"# Flowchart Example

```mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
```";

        // Act
        var html = await htmlTemplateService.RenderDocumentAsync(markdown, "Diagram Test");

        // Assert
        Assert.NotNull(html);
        Assert.Contains("<h1>Flowchart Example</h1>", html);
        Assert.Contains("mermaid", html); // Mermaid code block detected
    }

    [Fact]
    public async Task Rendering_HandlesErrorsGracefully()
    {
        // Arrange
        var mockMarkdownService = new Mock<IMarkdownService>();
        var mockThemeService = new Mock<IThemeService>();
        var mockLoggingService = new Mock<ILoggingService>();
        
        mockThemeService
            .Setup(x => x.GetCurrentTheme())
            .Returns(new Theme { Type = ThemeType.Light, BackgroundColor = "#ffffff", TextColor = "#1f1f1f", SurfaceColor = "#f6f8fa", PrimaryColor = "#0969da", FontFamily = "Segoe UI", FontSize = 16, LineHeight = 1.6 });

        mockMarkdownService
            .Setup(x => x.RenderToHtml(It.IsAny<string>()))
            .Throws(new Exception("Markdown parsing failed"));

        var htmlTemplateService = new HtmlTemplateService(
            mockMarkdownService.Object,
            mockThemeService.Object,
            mockLoggingService.Object
        );

        // Act
        var html = await htmlTemplateService.RenderDocumentAsync("# Test", "Error Test");

        // Assert - Should return error page instead of crashing
        Assert.NotNull(html);
        Assert.Contains("Rendering Error", html);
        Assert.Contains("Markdown parsing failed", html);
        
        mockLoggingService.Verify(
            x => x.LogError(It.IsAny<string>(), It.IsAny<Exception>()),
            Times.Once
        );
    }

    [Fact]
    public void Markdown_RendersAdvancedFeatures()
    {
        // Arrange
        var markdownService = new MarkdownService();
        
        var markdown = @"# Advanced Features Test

## Tables

| Name | Age |
|------|-----|
| John | 30  |
| Jane | 25  |

## Task Lists

- [x] Completed task
- [ ] Incomplete task

## Footnotes

Here is a footnote reference[^1].

[^1]: This is the footnote.

## Emojis

Hello :smile: :heart:";

        // Act
        var html = markdownService.RenderToHtml(markdown);

        // Assert
        Assert.Contains("<table>", html);
        Assert.Contains("<th>Name</th>", html);
        Assert.Contains("<td>John</td>", html);
        Assert.Contains("checkbox", html); // Task lists
        Assert.Contains("😄", html); // Emoji conversion
        Assert.Contains("❤️", html);
    }

    [Fact]
    public async Task ThemeInjection_PreventsWhiteFlash()
    {
        // Arrange
        var markdownService = new MarkdownService();
        var mockThemeService = new Mock<IThemeService>();
        var mockLoggingService = new Mock<ILoggingService>();
        
        var darkTheme = new Theme
        {
            Type = ThemeType.Dark,
            BackgroundColor = "#0d1117",
            TextColor = "#e6edf3",
            SurfaceColor = "#161b22",
            PrimaryColor = "#539bf5",
            FontFamily = "Segoe UI",
            FontSize = 16,
            LineHeight = 1.6
        };
        
        mockThemeService
            .Setup(x => x.GetCurrentTheme())
            .Returns(darkTheme);

        var htmlTemplateService = new HtmlTemplateService(
            markdownService,
            mockThemeService.Object,
            mockLoggingService.Object
        );

        // Act
        var html = await htmlTemplateService.RenderDocumentAsync("# Test", "Theme Test");

        // Assert - Inline styles should be present in head
        Assert.Contains("<style>", html);
        Assert.Contains("--background-color: #0d1117", html);
        Assert.Contains("--text-color: #e6edf3", html);
        Assert.Contains("background-color: #0d1117", html); // Direct body style
        Assert.Contains("color: #e6edf3", html);
    }
}
