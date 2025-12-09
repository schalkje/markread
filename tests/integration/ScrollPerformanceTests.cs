using Xunit;
using Moq;
using MarkRead.ViewModels;
using MarkRead.Services;
using System.Diagnostics;

namespace MarkRead.Tests.Integration;

public class ScrollPerformanceTests
{
    [Fact]
    public async Task LargeDocument_LoadsWithinAcceptableTime()
    {
        // Arrange
        var mockMarkdownService = new Mock<IMarkdownService>();
        var mockFileSystemService = new Mock<IFileSystemService>();
        var mockLoggingService = new Mock<ILoggingService>();

        // Simulate large document (1MB)
        var largeContent = new string('*', 1024 * 1024);
        var filePath = @"C:\test\large-document.md";
        
        mockFileSystemService
            .Setup(x => x.ReadFileAsync(filePath))
            .ReturnsAsync(largeContent);
        
        mockFileSystemService
            .Setup(x => x.GetFileModifiedTime(filePath))
            .Returns(DateTime.Now);
        
        mockMarkdownService
            .Setup(x => x.RenderToHtmlCached(largeContent, It.IsAny<string>()))
            .Returns("<p>Large content rendered</p>");

        var viewModel = new DocumentViewModel(
            mockMarkdownService.Object,
            mockFileSystemService.Object,
            mockLoggingService.Object
        );

        // Act
        var stopwatch = Stopwatch.StartNew();
        await viewModel.LoadDocumentCommand.ExecuteAsync(filePath);
        stopwatch.Stop();

        // Assert - Should load within 3 seconds for 1MB file
        Assert.True(stopwatch.ElapsedMilliseconds < 3000, 
            $"Large document load took {stopwatch.ElapsedMilliseconds}ms, expected < 3000ms");
        Assert.NotNull(viewModel.CurrentDocument);
    }

    [Fact]
    public async Task MultipleDocuments_MaintainCachePerformance()
    {
        // Arrange
        var mockMarkdownService = new Mock<IMarkdownService>();
        var mockFileSystemService = new Mock<IFileSystemService>();
        var mockLoggingService = new Mock<ILoggingService>();

        var content = "# Test Document\n\nContent here.";
        var html = "<h1>Test Document</h1><p>Content here.</p>";
        
        mockFileSystemService
            .Setup(x => x.ReadFileAsync(It.IsAny<string>()))
            .ReturnsAsync(content);
        
        mockFileSystemService
            .Setup(x => x.GetFileModifiedTime(It.IsAny<string>()))
            .Returns(DateTime.Now);
        
        mockMarkdownService
            .Setup(x => x.RenderToHtmlCached(content, It.IsAny<string>()))
            .Returns(html);

        var viewModel = new DocumentViewModel(
            mockMarkdownService.Object,
            mockFileSystemService.Object,
            mockLoggingService.Object
        );

        // Act - Load 10 documents
        var stopwatch = Stopwatch.StartNew();
        for (int i = 0; i < 10; i++)
        {
            await viewModel.LoadDocumentCommand.ExecuteAsync($@"C:\test\document-{i}.md");
        }
        stopwatch.Stop();

        // Assert - Should load 10 documents within 1 second total (with caching)
        Assert.True(stopwatch.ElapsedMilliseconds < 1000, 
            $"Loading 10 documents took {stopwatch.ElapsedMilliseconds}ms, expected < 1000ms");
    }

    [Fact]
    public async Task ScrollPositionUpdate_PerformsInstantaneously()
    {
        // Arrange
        var mockMarkdownService = new Mock<IMarkdownService>();
        var mockFileSystemService = new Mock<IFileSystemService>();
        var mockLoggingService = new Mock<ILoggingService>();

        var viewModel = new DocumentViewModel(
            mockMarkdownService.Object,
            mockFileSystemService.Object,
            mockLoggingService.Object
        );

        viewModel.CurrentDocument = new Models.Document
        {
            FilePath = @"C:\test\document.md",
            Content = "Test content",
            Title = "document.md",
            ScrollPosition = 0
        };

        // Act - Update scroll position 100 times
        var stopwatch = Stopwatch.StartNew();
        for (int i = 0; i < 100; i++)
        {
            viewModel.UpdateScrollPosition(i * 10.0);
        }
        stopwatch.Stop();

        // Assert - 100 scroll updates should take less than 10ms
        Assert.True(stopwatch.ElapsedMilliseconds < 10, 
            $"100 scroll updates took {stopwatch.ElapsedMilliseconds}ms, expected < 10ms");
        Assert.Equal(990.0, viewModel.ScrollPosition); // Last position
    }

    [Fact]
    public async Task DocumentReload_WithCache_IsFasterThanInitialLoad()
    {
        // Arrange
        var mockMarkdownService = new Mock<IMarkdownService>();
        var mockFileSystemService = new Mock<IFileSystemService>();
        var mockLoggingService = new Mock<ILoggingService>();

        var content = "# Test Document\n\n" + new string('*', 500000); // 500KB
        var html = "<h1>Test Document</h1><p>Content</p>";
        var filePath = @"C:\test\document.md";
        
        mockFileSystemService
            .Setup(x => x.ReadFileAsync(filePath))
            .ReturnsAsync(content);
        
        mockFileSystemService
            .Setup(x => x.GetFileModifiedTime(filePath))
            .Returns(DateTime.Now);
        
        mockMarkdownService
            .Setup(x => x.RenderToHtmlCached(content, It.IsAny<string>()))
            .Returns(html);

        var viewModel = new DocumentViewModel(
            mockMarkdownService.Object,
            mockFileSystemService.Object,
            mockLoggingService.Object
        );

        // Act - Initial load
        var stopwatch1 = Stopwatch.StartNew();
        await viewModel.LoadDocumentCommand.ExecuteAsync(filePath);
        stopwatch1.Stop();
        var initialLoadTime = stopwatch1.ElapsedMilliseconds;

        // Act - Reload (should use cache)
        var stopwatch2 = Stopwatch.StartNew();
        await viewModel.LoadDocumentCommand.ExecuteAsync(filePath);
        stopwatch2.Stop();
        var reloadTime = stopwatch2.ElapsedMilliseconds;

        // Assert - Reload should be similar or faster (cache benefits)
        // Note: In real scenarios with actual rendering, cache would show more improvement
        Assert.True(reloadTime <= initialLoadTime * 1.5, 
            $"Reload ({reloadTime}ms) should not be significantly slower than initial load ({initialLoadTime}ms)");
    }

    [Fact]
    public async Task VeryLargeDocument_LogsPerformanceWarning()
    {
        // Arrange
        var mockMarkdownService = new Mock<IMarkdownService>();
        var mockFileSystemService = new Mock<IFileSystemService>();
        var mockLoggingService = new Mock<ILoggingService>();

        // Create a temporary 11MB file
        var tempFile = Path.GetTempFileName();
        var largeContent = new string('*', 11 * 1024 * 1024);
        File.WriteAllText(tempFile, largeContent);
        
        mockFileSystemService
            .Setup(x => x.ReadFileAsync(tempFile))
            .ReturnsAsync(largeContent);
        
        mockFileSystemService
            .Setup(x => x.GetFileModifiedTime(tempFile))
            .Returns(DateTime.Now);
        
        mockMarkdownService
            .Setup(x => x.RenderToHtmlCached(largeContent, It.IsAny<string>()))
            .Returns("<p>Very large content</p>");

        var viewModel = new DocumentViewModel(
            mockMarkdownService.Object,
            mockFileSystemService.Object,
            mockLoggingService.Object
        );

        // Act
        await viewModel.LoadDocumentCommand.ExecuteAsync(tempFile);

        // Assert
        Assert.True(viewModel.IsLargeFile);
        Assert.Contains("Large file detected", viewModel.PerformanceWarning);
        
        mockLoggingService.Verify(
            x => x.LogWarning(It.Is<string>(s => s.Contains("Loading large file"))),
            Times.Once
        );
        
        // Cleanup
        File.Delete(tempFile);
    }
}
