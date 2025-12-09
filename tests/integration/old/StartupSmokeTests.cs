using Xunit;
using System;
using System.IO;
using MarkRead.App.Services;

namespace MarkRead.IntegrationTests;

/// <summary>
/// User Story 1 integration smoke tests:
/// Open folder and render README with images, checklists, code highlighting, and mermaid
/// </summary>
public class StartupSmokeTests : IDisposable
{
    private readonly string _testFolder;
    private readonly string _readmePath;

    public StartupSmokeTests()
    {
        // Create temporary test folder with README.md
        _testFolder = Path.Combine(Path.GetTempPath(), "MarkReadTest_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_testFolder);
        
        _readmePath = Path.Combine(_testFolder, "README.md");
        File.WriteAllText(_readmePath, @"# Test Document

## Features

- [x] Completed task
- [ ] Pending task

## Code Example

```python
def hello():
    print(""Hello, world!"")
```

## Diagram

```mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
```

![Test Image](./test.png)

[Internal Link](./docs/guide.md)
[External Link](https://example.com)
");
        
        // Create test image
        var testImagePath = Path.Combine(_testFolder, "test.png");
        // Create a minimal 1x1 PNG
        var pngBytes = new byte[] { 
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
            0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
            0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        };
        File.WriteAllBytes(testImagePath, pngBytes);
        
        // Create docs subfolder
        var docsFolder = Path.Combine(_testFolder, "docs");
        Directory.CreateDirectory(docsFolder);
        File.WriteAllText(Path.Combine(docsFolder, "guide.md"), "# Guide\n\nTest guide content.");
    }

    public void Dispose()
    {
        // Clean up test folder
        if (Directory.Exists(_testFolder))
        {
            try
            {
                Directory.Delete(_testFolder, recursive: true);
            }
            catch
            {
                // Best effort cleanup
            }
        }
    }

    [Fact]
    public void FolderService_CanCreateRoot()
    {
        // Arrange
        var folderService = new FolderService();

        // Act
        var root = folderService.CreateRoot(_testFolder);

        // Assert
        Assert.NotNull(root);
        Assert.Equal(_testFolder, root.Path);
        Assert.Equal(Path.GetFileName(_testFolder), root.DisplayName);
    }

    [Fact]
    public void FolderService_FindsDefaultDocument()
    {
        // Arrange
        var folderService = new FolderService();
        var root = folderService.CreateRoot(_testFolder);

        // Act
        var readme = folderService.ResolveDefaultDocument(root);

        // Assert
        Assert.NotNull(readme);
        Assert.Contains("README", readme.Value.FullPath, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void MarkdownService_RendersMarkdown()
    {
        // Arrange
        var markdownService = new MarkdownService();
        var content = File.ReadAllText(_readmePath);

        // Act
        var html = markdownService.RenderToHtml(content);

        // Assert
        Assert.NotNull(html);
        Assert.Contains("<h1", html);
        Assert.Contains("Test Document", html);
        Assert.Contains("<li", html); // Checklist items
        Assert.Contains("<code", html); // Code blocks
    }

    [Fact]
    public void HtmlSanitizerService_SanitizesHtml()
    {
        // Arrange
        var sanitizer = new HtmlSanitizerService();
        var dangerousHtml = @"<h1>Title</h1><script>alert('xss')</script><img src='x' onerror='alert(1)'>";

        // Act
        var safe = sanitizer.Sanitize(dangerousHtml);

        // Assert
        Assert.NotNull(safe);
        Assert.Contains("<h1>Title</h1>", safe);
        Assert.DoesNotContain("<script>", safe);
        Assert.DoesNotContain("onerror", safe);
    }

    [Fact]
    public void LinkResolver_ResolvesRelativePaths()
    {
        // Arrange
        var folderService = new FolderService();
        var root = folderService.CreateRoot(_testFolder);
        var linkResolver = new LinkResolver(folderService);

        // Act
        var result = linkResolver.Resolve("./docs/guide.md", root, _readmePath);

        // Assert
        Assert.False(result.IsBlocked);
        Assert.NotNull(result.LocalPath);
        Assert.True(File.Exists(result.LocalPath), "Resolved link should point to existing file");
        Assert.Contains("docs", result.LocalPath);
        Assert.Contains("guide.md", result.LocalPath);
    }

    [Fact]
    public void LinkResolver_BlocksExternalPaths()
    {
        // Arrange
        var folderService = new FolderService();
        var root = folderService.CreateRoot(_testFolder);
        var linkResolver = new LinkResolver(folderService);

        // Act
        var result = linkResolver.Resolve("../../outside.md", root, _readmePath);

        // Assert
        Assert.True(result.IsBlocked);
        Assert.Contains("outside", result.Message ?? "", StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void HistoryService_TracksNavigation()
    {
        // Arrange
        var historyService = new HistoryService();
        var tabId = Guid.NewGuid();
        var history = historyService.GetOrCreate(tabId);
        var doc1 = Path.Combine(_testFolder, "README.md");
        var doc2 = Path.Combine(_testFolder, "docs", "guide.md");

        // Act
        history.Push(new NavigationEntry(doc1, null));
        history.Push(new NavigationEntry(doc2, null));

        // Assert
        Assert.True(history.CanGoBack);
        Assert.False(history.CanGoForward);
        Assert.Equal(doc2, history.Current?.DocumentPath);

        var back = history.GoBack();
        Assert.Equal(doc1, back?.DocumentPath);
        Assert.True(history.CanGoForward);
    }
}
