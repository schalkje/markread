using Xunit;
using Moq;
using MarkRead.Services;

namespace MarkRead.Tests.Unit.Services;

public class NavigationServiceTests
{
    private readonly Mock<ILoggingService> _mockLoggingService;
    private readonly NavigationService _navigationService;

    public NavigationServiceTests()
    {
        _mockLoggingService = new Mock<ILoggingService>();
        _navigationService = new NavigationService(_mockLoggingService.Object);
    }

    [Fact]
    public void Navigate_NewPath_AddsToHistory()
    {
        // Arrange
        var tabId = "tab1";
        var path = @"C:\TestFolder\file.md";

        // Act
        _navigationService.Navigate(tabId, path);

        // Assert
        Assert.Equal(path, _navigationService.GetCurrentPath(tabId));
        Assert.False(_navigationService.CanGoBack(tabId));
        Assert.False(_navigationService.CanGoForward(tabId));
    }

    [Fact]
    public void Navigate_MultiplePaths_MaintainsBackStack()
    {
        // Arrange
        var tabId = "tab1";
        var path1 = @"C:\TestFolder\file1.md";
        var path2 = @"C:\TestFolder\file2.md";

        // Act
        _navigationService.Navigate(tabId, path1);
        _navigationService.Navigate(tabId, path2);

        // Assert
        Assert.Equal(path2, _navigationService.GetCurrentPath(tabId));
        Assert.True(_navigationService.CanGoBack(tabId));
        Assert.False(_navigationService.CanGoForward(tabId));
    }

    [Fact]
    public void GoBack_WithHistory_NavigatesBack()
    {
        // Arrange
        var tabId = "tab1";
        var path1 = @"C:\TestFolder\file1.md";
        var path2 = @"C:\TestFolder\file2.md";
        _navigationService.Navigate(tabId, path1);
        _navigationService.Navigate(tabId, path2);

        // Act
        var result = _navigationService.GoBack(tabId);

        // Assert
        Assert.True(result);
        Assert.Equal(path1, _navigationService.GetCurrentPath(tabId));
        Assert.False(_navigationService.CanGoBack(tabId));
        Assert.True(_navigationService.CanGoForward(tabId));
    }

    [Fact]
    public void GoForward_WithForwardStack_NavigatesForward()
    {
        // Arrange
        var tabId = "tab1";
        var path1 = @"C:\TestFolder\file1.md";
        var path2 = @"C:\TestFolder\file2.md";
        _navigationService.Navigate(tabId, path1);
        _navigationService.Navigate(tabId, path2);
        _navigationService.GoBack(tabId);

        // Act
        var result = _navigationService.GoForward(tabId);

        // Assert
        Assert.True(result);
        Assert.Equal(path2, _navigationService.GetCurrentPath(tabId));
        Assert.True(_navigationService.CanGoBack(tabId));
        Assert.False(_navigationService.CanGoForward(tabId));
    }

    [Fact]
    public void Navigate_AfterGoingBack_ClearsForwardStack()
    {
        // Arrange
        var tabId = "tab1";
        var path1 = @"C:\TestFolder\file1.md";
        var path2 = @"C:\TestFolder\file2.md";
        var path3 = @"C:\TestFolder\file3.md";
        _navigationService.Navigate(tabId, path1);
        _navigationService.Navigate(tabId, path2);
        _navigationService.GoBack(tabId);

        // Act
        _navigationService.Navigate(tabId, path3);

        // Assert
        Assert.Equal(path3, _navigationService.GetCurrentPath(tabId));
        Assert.True(_navigationService.CanGoBack(tabId));
        Assert.False(_navigationService.CanGoForward(tabId));
    }

    [Fact]
    public void ClearHistory_RemovesAllHistory()
    {
        // Arrange
        var tabId = "tab1";
        _navigationService.Navigate(tabId, @"C:\file1.md");
        _navigationService.Navigate(tabId, @"C:\file2.md");

        // Act
        _navigationService.ClearHistory(tabId);

        // Assert
        Assert.Null(_navigationService.GetCurrentPath(tabId));
        Assert.False(_navigationService.CanGoBack(tabId));
        Assert.False(_navigationService.CanGoForward(tabId));
    }

    [Fact]
    public void RemoveTab_RemovesTabHistory()
    {
        // Arrange
        var tabId = "tab1";
        _navigationService.Navigate(tabId, @"C:\file1.md");

        // Act
        _navigationService.RemoveTab(tabId);

        // Assert
        Assert.Null(_navigationService.GetCurrentPath(tabId));
    }

    [Fact]
    public void MultipleTabs_MaintainSeparateHistories()
    {
        // Arrange
        var tab1 = "tab1";
        var tab2 = "tab2";
        var path1 = @"C:\file1.md";
        var path2 = @"C:\file2.md";

        // Act
        _navigationService.Navigate(tab1, path1);
        _navigationService.Navigate(tab2, path2);

        // Assert
        Assert.Equal(path1, _navigationService.GetCurrentPath(tab1));
        Assert.Equal(path2, _navigationService.GetCurrentPath(tab2));
    }
}
