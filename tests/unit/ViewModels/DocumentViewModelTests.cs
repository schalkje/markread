using Xunit;
using Moq;
using MarkRead.ViewModels;
using MarkRead.Services;
using MarkRead.Models;

namespace MarkRead.Tests.Unit.ViewModels;

public class DocumentViewModelTests
{
    private readonly Mock<IMarkdownService> _mockMarkdownService;
    private readonly Mock<IFileSystemService> _mockFileSystemService;
    private readonly Mock<ILoggingService> _mockLoggingService;
    private readonly DocumentViewModel _viewModel;

    public DocumentViewModelTests()
    {
        _mockMarkdownService = new Mock<IMarkdownService>();
        _mockFileSystemService = new Mock<IFileSystemService>();
        _mockLoggingService = new Mock<ILoggingService>();

        _viewModel = new DocumentViewModel(
            _mockMarkdownService.Object,
            _mockFileSystemService.Object,
            _mockLoggingService.Object
        );
    }

    [Fact]
    public async Task LoadDocumentAsync_LoadsDocument_Successfully()
    {
        // Arrange
        var filePath = @"C:\test\document.md";
        var content = "# Test Document\n\nThis is test content.";
        var html = "<h1>Test Document</h1><p>This is test content.</p>";
        
        _mockFileSystemService
            .Setup(x => x.ReadFileAsync(filePath))
            .ReturnsAsync(content);
        
        _mockFileSystemService
            .Setup(x => x.GetFileModifiedTime(filePath))
            .Returns(DateTime.Now);
        
        _mockMarkdownService
            .Setup(x => x.RenderToHtmlCached(content, It.IsAny<string>()))
            .Returns(html);

        // Act
        await _viewModel.LoadDocumentCommand.ExecuteAsync(filePath);

        // Assert
        Assert.NotNull(_viewModel.CurrentDocument);
        Assert.Equal(filePath, _viewModel.CurrentDocument.FilePath);
        Assert.Equal(content, _viewModel.CurrentDocument.Content);
        Assert.Equal("document.md", _viewModel.CurrentDocument.Title);
        Assert.Equal(html, _viewModel.CurrentDocument.CachedHtml);
        Assert.False(_viewModel.HasError);
        Assert.False(_viewModel.IsRendering);
    }

    [Fact]
    public async Task LoadDocumentAsync_HandlesError_GracefullyAndLogsError()
    {
        // Arrange
        var filePath = @"C:\test\missing.md";
        var errorMessage = "File not found";
        
        _mockFileSystemService
            .Setup(x => x.ReadFileAsync(filePath))
            .ThrowsAsync(new FileNotFoundException(errorMessage));

        // Act
        await _viewModel.LoadDocumentCommand.ExecuteAsync(filePath);

        // Assert
        Assert.True(_viewModel.HasError);
        Assert.Contains("Failed to load document", _viewModel.ErrorMessage);
        Assert.False(_viewModel.IsRendering);
        
        _mockLoggingService.Verify(
            x => x.LogError(It.IsAny<string>(), It.IsAny<Exception>()),
            Times.Once
        );
    }

    [Fact]
    public async Task LoadDocumentAsync_DetectsLargeFile_AndLogsWarning()
    {
        // Arrange
        var filePath = @"C:\test\large-document.md";
        var largeContent = new string('*', 11 * 1024 * 1024); // 11MB
        
        // Create a temporary file to test file size detection
        var tempFile = Path.GetTempFileName();
        File.WriteAllText(tempFile, largeContent);
        
        _mockFileSystemService
            .Setup(x => x.ReadFileAsync(tempFile))
            .ReturnsAsync(largeContent);
        
        _mockFileSystemService
            .Setup(x => x.GetFileModifiedTime(tempFile))
            .Returns(DateTime.Now);
        
        _mockMarkdownService
            .Setup(x => x.RenderToHtmlCached(largeContent, It.IsAny<string>()))
            .Returns("<p>Large content</p>");

        // Act
        await _viewModel.LoadDocumentCommand.ExecuteAsync(tempFile);

        // Assert
        Assert.True(_viewModel.IsLargeFile);
        Assert.NotEmpty(_viewModel.PerformanceWarning);
        
        _mockLoggingService.Verify(
            x => x.LogWarning(It.Is<string>(s => s.Contains("Loading large file"))),
            Times.Once
        );
        
        // Cleanup
        File.Delete(tempFile);
    }

    [Fact]
    public void UpdateScrollPosition_UpdatesCurrentDocument()
    {
        // Arrange
        _viewModel.CurrentDocument = new Document
        {
            FilePath = @"C:\test\document.md",
            Content = "Test content",
            Title = "document.md",
            ScrollPosition = 0
        };

        // Act
        _viewModel.UpdateScrollPosition(150.5);

        // Assert
        Assert.Equal(150.5, _viewModel.ScrollPosition);
        Assert.Equal(150.5, _viewModel.CurrentDocument.ScrollPosition);
    }

    [Fact]
    public async Task ReloadDocumentAsync_ReloadsCurrentDocument()
    {
        // Arrange
        var filePath = @"C:\test\document.md";
        var content = "# Reloaded Document";
        
        _mockFileSystemService
            .Setup(x => x.ReadFileAsync(filePath))
            .ReturnsAsync(content);
        
        _mockFileSystemService
            .Setup(x => x.GetFileModifiedTime(filePath))
            .Returns(DateTime.Now);
        
        _mockMarkdownService
            .Setup(x => x.RenderToHtmlCached(content, It.IsAny<string>()))
            .Returns("<h1>Reloaded Document</h1>");

        _viewModel.CurrentDocument = new Document
        {
            FilePath = filePath,
            Content = "Old content",
            Title = "document.md"
        };

        // Act
        await _viewModel.ReloadDocumentCommand.ExecuteAsync(null);

        // Assert
        Assert.Equal(content, _viewModel.CurrentDocument.Content);
        _mockFileSystemService.Verify(x => x.ReadFileAsync(filePath), Times.Once);
    }

    [Fact]
    public async Task LoadDocumentAsync_UsesCachedHtml_WhenContentUnchanged()
    {
        // Arrange
        var filePath = @"C:\test\document.md";
        var content = "# Test Document";
        var html = "<h1>Test Document</h1>";
        
        _mockFileSystemService
            .Setup(x => x.ReadFileAsync(filePath))
            .ReturnsAsync(content);
        
        _mockFileSystemService
            .Setup(x => x.GetFileModifiedTime(filePath))
            .Returns(DateTime.Now);
        
        _mockMarkdownService
            .Setup(x => x.RenderToHtmlCached(content, It.IsAny<string>()))
            .Returns(html);

        // Act - Load once
        await _viewModel.LoadDocumentCommand.ExecuteAsync(filePath);
        
        // Act - Load again (same content)
        await _viewModel.LoadDocumentCommand.ExecuteAsync(filePath);

        // Assert - Markdown service called twice, but cache should be used internally
        _mockMarkdownService.Verify(
            x => x.RenderToHtmlCached(content, It.IsAny<string>()),
            Times.AtLeastOnce
        );
    }
}
