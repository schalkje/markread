using Xunit;
using Moq;
using MarkRead.ViewModels;
using MarkRead.Services;
using MarkRead.Models;
using System.Collections.ObjectModel;

namespace MarkRead.Tests.Integration;

public class FileTreeNavigationTests
{
    private readonly Mock<IFileSystemService> _mockFileSystemService;
    private readonly Mock<ILoggingService> _mockLoggingService;
    private readonly NavigationService _navigationService;
    private readonly FileTreeViewModel _viewModel;

    public FileTreeNavigationTests()
    {
        _mockFileSystemService = new Mock<IFileSystemService>();
        _mockLoggingService = new Mock<ILoggingService>();
        _navigationService = new NavigationService(_mockLoggingService.Object);

        _viewModel = new FileTreeViewModel(
            _mockFileSystemService.Object,
            _mockLoggingService.Object,
            _navigationService
        );
    }

    [Fact]
    public async Task LoadFolder_OpenFile_UpdatesNavigation()
    {
        // Arrange
        var rootPath = @"C:\TestFolder";
        var filePath = @"C:\TestFolder\test.md";
        var tabId = "tab1";

        var rootNode = new FileTreeNode
        {
            Name = "TestFolder",
            Path = rootPath,
            Type = FileTreeNodeType.Directory,
            Level = 0,
            Children = new ObservableCollection<FileTreeNode>
            {
                new FileTreeNode
                {
                    Name = "test.md",
                    Path = filePath,
                    Type = FileTreeNodeType.File,
                    Level = 1
                }
            }
        };

        _mockFileSystemService
            .Setup(x => x.LoadDirectoryAsync(rootPath))
            .ReturnsAsync(rootNode);

        // Act
        await _viewModel.LoadFolderCommand.ExecuteAsync(rootPath);
        var fileNode = rootNode.Children[0];
        _viewModel.OpenFileCommand.Execute(fileNode);
        _navigationService.Navigate(tabId, filePath);

        // Assert
        Assert.NotEmpty(_viewModel.Nodes);
        Assert.Equal(fileNode, _viewModel.SelectedNode);
        Assert.Equal(filePath, _navigationService.GetCurrentPath(tabId));
    }

    [Fact]
    public async Task ExpandAndCollapseFolder_MaintainsTreeState()
    {
        // Arrange
        var rootPath = @"C:\TestFolder";
        var subfolderPath = @"C:\TestFolder\SubFolder";

        var rootNode = new FileTreeNode
        {
            Name = "TestFolder",
            Path = rootPath,
            Type = FileTreeNodeType.Directory,
            Level = 0,
            IsExpanded = false,
            Children = new ObservableCollection<FileTreeNode>
            {
                new FileTreeNode
                {
                    Name = "SubFolder",
                    Path = subfolderPath,
                    Type = FileTreeNodeType.Directory,
                    Level = 1,
                    IsExpanded = false
                }
            }
        };

        _mockFileSystemService
            .Setup(x => x.LoadDirectoryAsync(rootPath))
            .ReturnsAsync(rootNode);

        await _viewModel.LoadFolderCommand.ExecuteAsync(rootPath);
        var folderNode = rootNode.Children[0];

        // Act - Expand
        _viewModel.ToggleNodeExpansionCommand.Execute(folderNode);

        // Assert
        Assert.True(folderNode.IsExpanded);

        // Act - Collapse
        _viewModel.ToggleNodeExpansionCommand.Execute(folderNode);

        // Assert
        Assert.False(folderNode.IsExpanded);
    }

    [Fact]
    public async Task OpenMultipleFiles_MaintainsNavigationHistory()
    {
        // Arrange
        var rootPath = @"C:\TestFolder";
        var file1Path = @"C:\TestFolder\file1.md";
        var file2Path = @"C:\TestFolder\file2.md";
        var tabId = "tab1";

        var rootNode = new FileTreeNode
        {
            Name = "TestFolder",
            Path = rootPath,
            Type = FileTreeNodeType.Directory,
            Level = 0,
            Children = new ObservableCollection<FileTreeNode>
            {
                new FileTreeNode { Name = "file1.md", Path = file1Path, Type = FileTreeNodeType.File, Level = 1 },
                new FileTreeNode { Name = "file2.md", Path = file2Path, Type = FileTreeNodeType.File, Level = 1 }
            }
        };

        _mockFileSystemService
            .Setup(x => x.LoadDirectoryAsync(rootPath))
            .ReturnsAsync(rootNode);

        await _viewModel.LoadFolderCommand.ExecuteAsync(rootPath);

        // Act
        _navigationService.Navigate(tabId, file1Path);
        _navigationService.Navigate(tabId, file2Path);

        // Assert
        Assert.Equal(file2Path, _navigationService.GetCurrentPath(tabId));
        Assert.True(_navigationService.CanGoBack(tabId));
        Assert.False(_navigationService.CanGoForward(tabId));

        // Act - Go back
        _navigationService.GoBack(tabId);

        // Assert
        Assert.Equal(file1Path, _navigationService.GetCurrentPath(tabId));
        Assert.True(_navigationService.CanGoForward(tabId));
    }
}
