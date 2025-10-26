using System;
using System.IO;
using Xunit;
using MarkRead.App.Services;

namespace MarkRead.UnitTests;

/// <summary>
/// Tests for link resolution logic including root-absolute paths.
/// </summary>
public class LinkResolverTests
{
    private readonly FolderService _folderService;
    private readonly LinkResolver _linkResolver;
    private readonly string _tempRoot;
    private readonly FolderRoot _testRoot;

    public LinkResolverTests()
    {
        _folderService = new FolderService();
        _linkResolver = new LinkResolver(_folderService);
        
        // Create a temp directory structure for testing
        _tempRoot = Path.Combine(Path.GetTempPath(), $"markread_test_{Guid.NewGuid()}");
        Directory.CreateDirectory(_tempRoot);
        Directory.CreateDirectory(Path.Combine(_tempRoot, "docs"));
        Directory.CreateDirectory(Path.Combine(_tempRoot, "docs", "subfolder"));
        
        File.WriteAllText(Path.Combine(_tempRoot, "README.md"), "# Root README");
        File.WriteAllText(Path.Combine(_tempRoot, "docs", "guide.md"), "# Guide");
        File.WriteAllText(Path.Combine(_tempRoot, "docs", "subfolder", "details.md"), "# Details");
        
        _testRoot = _folderService.CreateRoot(_tempRoot);
    }

    [Fact]
    public void Resolve_RelativePath_ResolvesFromCurrentDocument()
    {
        // Arrange
        var currentDoc = Path.Combine(_tempRoot, "docs", "guide.md");
        var link = "subfolder/details.md";

        // Act
        var result = _linkResolver.Resolve(link, _testRoot, currentDoc);

        // Assert
        Assert.False(result.IsBlocked);
        Assert.False(result.IsExternal);
        Assert.False(result.IsAnchor);
        Assert.NotNull(result.LocalPath);
        Assert.Equal(Path.Combine(_tempRoot, "docs", "subfolder", "details.md"), result.LocalPath);
    }

    [Fact]
    public void Resolve_ParentRelativePath_ResolvesCorrectly()
    {
        // Arrange
        var currentDoc = Path.Combine(_tempRoot, "docs", "subfolder", "details.md");
        var link = "../guide.md";

        // Act
        var result = _linkResolver.Resolve(link, _testRoot, currentDoc);

        // Assert
        Assert.False(result.IsBlocked);
        Assert.NotNull(result.LocalPath);
        Assert.Equal(Path.Combine(_tempRoot, "docs", "guide.md"), result.LocalPath);
    }

    [Fact]
    public void Resolve_PathOutsideRoot_IsBlocked()
    {
        // Arrange
        var currentDoc = Path.Combine(_tempRoot, "README.md");
        var link = "../outside.md";

        // Act
        var result = _linkResolver.Resolve(link, _testRoot, currentDoc);

        // Assert
        Assert.True(result.IsBlocked);
        Assert.Contains("outside the active root", result.Message);
    }

    [Fact]
    public void Resolve_NonExistentFile_IsBlocked()
    {
        // Arrange
        var currentDoc = Path.Combine(_tempRoot, "README.md");
        var link = "nonexistent.md";

        // Act
        var result = _linkResolver.Resolve(link, _testRoot, currentDoc);

        // Assert
        Assert.True(result.IsBlocked);
        Assert.Contains("does not exist", result.Message);
    }

    [Fact]
    public void Resolve_AnchorOnly_ReturnsAnchor()
    {
        // Arrange
        var currentDoc = Path.Combine(_tempRoot, "README.md");
        var link = "#section";

        // Act
        var result = _linkResolver.Resolve(link, _testRoot, currentDoc);

        // Assert
        Assert.False(result.IsBlocked);
        Assert.True(result.IsAnchor);
        Assert.Equal("section", result.Anchor);
    }

    [Fact]
    public void Resolve_HttpUrl_IsExternal()
    {
        // Arrange
        var currentDoc = Path.Combine(_tempRoot, "README.md");
        var link = "https://example.com/page";

        // Act
        var result = _linkResolver.Resolve(link, _testRoot, currentDoc);

        // Assert
        Assert.True(result.IsExternal);
        Assert.False(result.IsBlocked);
        Assert.NotNull(result.ExternalUri);
        Assert.Equal("https://example.com/page", result.ExternalUri.ToString());
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_tempRoot))
            {
                Directory.Delete(_tempRoot, recursive: true);
            }
        }
        catch
        {
            // Best effort cleanup
        }
    }
}
