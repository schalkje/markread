# Testing Guide

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Developer](../) → Testing

Comprehensive guide to testing MarkRead.

## Test Structure

```
tests/
├── unit/                    # Fast, isolated tests
│   ├── LinkResolverTests.cs
│   ├── SettingsServiceTests.cs
│   └── ThemeManagerTests.cs
└── integration/            # Full-stack tests
    ├── StartupSmokeTests.cs
    ├── NavigationTests.cs
    └── TabsAndSearchTests.cs
```

## Unit Testing

### Test Framework

MarkRead uses **MSTest** for unit testing.

### Basic Test Structure

```csharp
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace MarkRead.UnitTests
{
    [TestClass]
    public class LinkResolverTests
    {
        private LinkResolver _resolver;
        
        [TestInitialize]
        public void Setup()
        {
            _resolver = new LinkResolver(@"C:\docs");
        }
        
        [TestMethod]
        public void ResolveLink_WithRelativePath_ReturnsAbsolutePath()
        {
            // Arrange
            var link = "./file.md";
            var basePath = @"C:\docs\folder";
            
            // Act
            var result = _resolver.ResolveLink(link, basePath);
            
            // Assert
            Assert.AreEqual(@"C:\docs\folder\file.md", result);
        }
        
        [TestCleanup]
        public void Cleanup()
        {
            _resolver = null;
        }
    }
}
```

### Testing Patterns

#### Arrange-Act-Assert (AAA)

```csharp
[TestMethod]
public void ParseMarkdown_WithCodeBlock_RendersWithSyntaxHighlighting()
{
    // Arrange
    var service = new MarkdownService();
    var markdown = "```csharp\nvar x = 1;\n```";
    
    // Act
    var html = service.ParseMarkdown(markdown);
    
    // Assert
    Assert.IsTrue(html.Contains("language-csharp"));
    Assert.IsTrue(html.Contains("var x = 1;"));
}
```

#### Test Data

```csharp
[DataTestMethod]
[DataRow("./file.md", @"C:\docs\file.md")]
[DataRow("../file.md", @"C:\file.md")]
[DataRow("folder/file.md", @"C:\docs\folder\file.md")]
public void ResolveLink_VariousPaths_ReturnsCorrectPath(
    string input, 
    string expected)
{
    var result = _resolver.ResolveLink(input, @"C:\docs");
    Assert.AreEqual(expected, result);
}
```

#### Mocking Dependencies

```csharp
[TestMethod]
public void LoadFile_WhenFileNotFound_LogsError()
{
    // Arrange
    var mockLogger = new Mock<ILogger<FileService>>();
    var service = new FileService(mockLogger.Object);
    
    // Act
    Assert.ThrowsException<FileNotFoundException>(
        () => service.LoadFile("nonexistent.md")
    );
    
    // Assert
    mockLogger.Verify(
        x => x.LogError(
            It.IsAny<Exception>(), 
            It.IsAny<string>()
        ),
        Times.Once
    );
}
```

## Integration Testing

### Testing Application Startup

```csharp
[TestClass]
public class StartupSmokeTests
{
    [TestMethod]
    public void Application_StartsWithoutErrors()
    {
        // Arrange & Act
        var app = new App();
        app.InitializeComponent();
        
        // Assert
        Assert.IsNotNull(app.MainWindow);
    }
    
    [TestMethod]
    public void Services_AreRegistered()
    {
        var app = new App();
        app.InitializeComponent();
        
        // Verify key services
        var navigation = ServiceLocator.Get<INavigationService>();
        var markdown = ServiceLocator.Get<IMarkdownService>();
        var tabs = ServiceLocator.Get<ITabService>();
        
        Assert.IsNotNull(navigation);
        Assert.IsNotNull(markdown);
        Assert.IsNotNull(tabs);
    }
}
```

### Testing Navigation

```csharp
[TestClass]
public class NavigationTests
{
    private NavigationService _navigation;
    
    [TestInitialize]
    public void Setup()
    {
        var linkResolver = new LinkResolver(@"C:\docs");
        var history = new HistoryService();
        _navigation = new NavigationService(linkResolver, history);
    }
    
    [TestMethod]
    public void Navigate_ToMarkdownFile_LoadsContent()
    {
        // Arrange
        var testFile = CreateTempMarkdownFile();
        
        // Act
        _navigation.Navigate(testFile);
        
        // Assert
        Assert.IsTrue(_navigation.CanGoBack);
        
        // Cleanup
        File.Delete(testFile);
    }
}
```

## Test Best Practices

### ✅ Do

```csharp
// Test one thing
[TestMethod]
public void TabService_CreateTab_AddsTabToCollection()
{
    var service = new TabService();
    var tab = service.CreateTab("file.md");
    Assert.AreEqual(1, service.Tabs.Count);
}

// Use descriptive names
[TestMethod]
public void HistoryService_GoBack_WhenStackEmpty_ReturnsFalse()
{
    // Test implementation
}

// Clean up resources
[TestCleanup]
public void Cleanup()
{
    _testFiles.ForEach(File.Delete);
}
```

### ❌ Don't

```csharp
// Test multiple things
[TestMethod]
public void TestEverything()
{
    // Tests tabs, navigation, search, themes...
}

// Use non-descriptive names
[TestMethod]
public void Test1()
{
    // What does this test?
}

// Leave test files
// No cleanup = disk pollution
```

## Code Coverage

### Running with Coverage

```bash
dotnet test --collect:"XPlat Code Coverage"
```

### Viewing Coverage Report

```bash
# Install report generator
dotnet tool install -g dotnet-reportgenerator-globaltool

# Generate HTML report
reportgenerator \
  -reports:**/coverage.cobertura.xml \
  -targetdir:coverage \
  -reporttypes:Html

# Open report
start coverage/index.html
```

### Coverage Goals

- **Services**: 80%+ coverage
- **Critical paths**: 95%+ coverage
- **UI code**: 50%+ coverage (harder to test)

## Testing Checklist

Before merging:

- [ ] All tests pass
- [ ] New code has tests
- [ ] Coverage meets targets
- [ ] Integration tests included for features
- [ ] Edge cases tested
- [ ] Error scenarios tested

## Common Testing Scenarios

### File System Operations

```csharp
[TestMethod]
public void FileService_LoadMarkdown_ReturnsContent()
{
    // Create temp file
    var tempFile = Path.GetTempFileName();
    File.WriteAllText(tempFile, "# Test");
    
    try
    {
        var service = new FileService();
        var content = service.LoadFile(tempFile);
        Assert.AreEqual("# Test", content);
    }
    finally
    {
        File.Delete(tempFile);
    }
}
```

### Async Operations

```csharp
[TestMethod]
public async Task MarkdownService_ParseAsync_ReturnsHtml()
{
    var service = new MarkdownService();
    var result = await service.ParseMarkdownAsync("# Test");
    Assert.IsTrue(result.Contains("<h1>Test</h1>"));
}
```

### Event Handling

```csharp
[TestMethod]
public void TabService_TabClosed_RaisesEvent()
{
    var service = new TabService();
    var eventRaised = false;
    
    service.TabClosed += (s, e) => eventRaised = true;
    
    service.CreateTab("test.md");
    service.CloseTab(service.Tabs[0].Id);
    
    Assert.IsTrue(eventRaised);
}
```

## See Also

- [Coding Standards](coding-standards.md)
- [Getting Started](getting-started.md)
- [Build Process](build-process.md)
