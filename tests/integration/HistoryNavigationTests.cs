using Xunit;
using System;
using System.IO;
using MarkRead.App.Services;

namespace MarkRead.IntegrationTests;

/// <summary>
/// User Story 2 integration tests:
/// Navigate relative links and anchors; use Back/Forward per tab
/// </summary>
public class HistoryNavigationTests : IDisposable
{
    private readonly string _testFolder;
    private readonly string _doc1Path;
    private readonly string _doc2Path;
    private readonly string _doc3Path;

    public HistoryNavigationTests()
    {
        // Create temporary test folder structure
        _testFolder = Path.Combine(Path.GetTempPath(), "MarkReadHistoryTest_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_testFolder);
        
        _doc1Path = Path.Combine(_testFolder, "README.md");
        _doc2Path = Path.Combine(_testFolder, "guide.md");
        _doc3Path = Path.Combine(_testFolder, "api.md");

        File.WriteAllText(_doc1Path, @"# Home

[Guide](./guide.md)
[API Reference](./api.md)
[External](https://example.com)
[Section 1](#section1)

## Section1
Content here
");

        File.WriteAllText(_doc2Path, @"# Guide

[Back to Home](./README.md)
[API](./api.md)
");

        File.WriteAllText(_doc3Path, @"# API Reference

[Home](./README.md)
[Guide](./guide.md)
");
    }

    public void Dispose()
    {
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
    public void LinkResolver_ResolvesInternalLinks()
    {
        // Arrange
        var folderService = new FolderService();
        var root = folderService.CreateRoot(_testFolder);
        var linkResolver = new LinkResolver(folderService);

        // Act
        var result = linkResolver.Resolve("./guide.md", root, _doc1Path);

        // Assert
        Assert.False(result.IsBlocked);
        Assert.False(result.IsExternal);
        Assert.NotNull(result.LocalPath);
        Assert.Contains("guide.md", result.LocalPath);
    }

    [Fact]
    public void LinkResolver_ResolvesAnchors()
    {
        // Arrange
        var folderService = new FolderService();
        var root = folderService.CreateRoot(_testFolder);
        var linkResolver = new LinkResolver(folderService);

        // Act
        var result = linkResolver.Resolve("#section1", root, _doc1Path);

        // Assert
        Assert.True(result.IsAnchor);
        Assert.Equal("section1", result.Anchor);
    }

    [Fact]
    public void LinkResolver_BlocksPathsOutsideRoot()
    {
        // Arrange
        var folderService = new FolderService();
        var root = folderService.CreateRoot(_testFolder);
        var linkResolver = new LinkResolver(folderService);

        // Act
        var result = linkResolver.Resolve("../../outside.md", root, _doc1Path);

        // Assert
        Assert.True(result.IsBlocked);
        Assert.Contains("outside", result.Message ?? "", StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void LinkResolver_IdentifiesExternalLinks()
    {
        // Arrange
        var folderService = new FolderService();
        var root = folderService.CreateRoot(_testFolder);
        var linkResolver = new LinkResolver(folderService);

        // Act
        var result = linkResolver.Resolve("https://example.com", root, _doc1Path);

        // Assert
        Assert.True(result.IsExternal);
        Assert.NotNull(result.ExternalUri);
        Assert.Equal("https://example.com/", result.ExternalUri.ToString());
    }

    [Fact]
    public void HistoryService_TracksBackForwardNavigation()
    {
        // Arrange
        var historyService = new HistoryService();
        var tabId = Guid.NewGuid();
        var history = historyService.GetOrCreate(tabId);

        // Act - Navigate forward through docs
        history.Push(new NavigationEntry(_doc1Path, null));
        history.Push(new NavigationEntry(_doc2Path, null));
        history.Push(new NavigationEntry(_doc3Path, null));

        // Assert initial state
        Assert.True(history.CanGoBack);
        Assert.False(history.CanGoForward);
        Assert.Equal(_doc3Path, history.Current?.DocumentPath);

        // Go back
        var back1 = history.GoBack();
        Assert.Equal(_doc2Path, back1?.DocumentPath);
        Assert.True(history.CanGoBack);
        Assert.True(history.CanGoForward);

        // Go back again
        var back2 = history.GoBack();
        Assert.Equal(_doc1Path, back2?.DocumentPath);
        Assert.False(history.CanGoBack);
        Assert.True(history.CanGoForward);

        // Go forward
        var forward1 = history.GoForward();
        Assert.Equal(_doc2Path, forward1?.DocumentPath);

        var forward2 = history.GoForward();
        Assert.Equal(_doc3Path, forward2?.DocumentPath);
        Assert.False(history.CanGoForward);
    }

    [Fact]
    public void HistoryService_TracksAnchors()
    {
        // Arrange
        var historyService = new HistoryService();
        var tabId = Guid.NewGuid();
        var history = historyService.GetOrCreate(tabId);

        // Act
        history.Push(new NavigationEntry(_doc1Path, null));
        history.Push(new NavigationEntry(_doc1Path, "section1"));
        history.Push(new NavigationEntry(_doc2Path, null));

        // Assert
        var back1 = history.GoBack();
        Assert.Equal("section1", back1?.Anchor);
        Assert.Equal(_doc1Path, back1?.DocumentPath);

        var back2 = history.GoBack();
        Assert.Null(back2?.Anchor);
        Assert.Equal(_doc1Path, back2?.DocumentPath);
    }

    [Fact]
    public void HistoryService_ClearsFutureOnNewNavigation()
    {
        // Arrange
        var historyService = new HistoryService();
        var tabId = Guid.NewGuid();
        var history = historyService.GetOrCreate(tabId);

        // Act
        history.Push(new NavigationEntry(_doc1Path, null));
        history.Push(new NavigationEntry(_doc2Path, null));
        history.Push(new NavigationEntry(_doc3Path, null));

        history.GoBack(); // Now at doc2, can go forward to doc3
        Assert.True(history.CanGoForward);

        history.Push(new NavigationEntry(_doc1Path, null)); // Navigate to new doc from doc2

        // Assert - forward history should be cleared
        Assert.False(history.CanGoForward);
        Assert.Equal(_doc1Path, history.Current?.DocumentPath);
    }
}
