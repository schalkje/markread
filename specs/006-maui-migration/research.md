# .NET MAUI 10 Migration Research for MarkRead

**Date:** December 9, 2025  
**Purpose:** Technical research for migrating MarkRead markdown viewer from WPF to .NET MAUI 10

---

## 1. MAUI WebView Best Practices

### Decision
Use **HybridWebView** for markdown HTML rendering with local file hosting and bidirectional JavaScript/C# interop.

### Rationale
- **HybridWebView** (new in .NET MAUI) is specifically designed for hosting arbitrary HTML/JS/CSS with two-way communication
- Supports both `EvaluateJavaScriptAsync` (simple evaluation) and `InvokeJavaScriptAsync` (structured method calls with parameters/return values)
- Local HTML files placed in `Resources/Raw/wwwroot` with MauiAsset build action
- Native platform WebView support: WebView2 (Windows), WKWebView (iOS/Mac), WebView (Android)
- JSON-based serialization for complex type passing between C# and JavaScript
- Built-in raw message passing via `SendRawMessage` for simple scenarios

### Implementation Patterns

**HTML Hosting:**
```csharp
// Place files in Resources/Raw/wwwroot/
// Default loads index.html from wwwroot
<HybridWebView x:Name="hybridWebView" 
               HybridRoot="wwwroot"
               DefaultFile="index.html" />
```

**JavaScript to C# Communication:**
```csharp
// C# method
public string ProcessMarkdown(string markdown) { ... }

// Set interop target
hybridWebView.SetInvokeJavaScriptTarget(this);

// JavaScript call
const result = await window.HybridWebView.InvokeDotNet('ProcessMarkdown', ['# Hello']);
```

**C# to JavaScript Communication:**
```csharp
// Define JSON serialization context
[JsonSourceGenerationOptions(WriteIndented = true)]
[JsonSerializable(typeof(Dictionary<string, string>))]
internal partial class HybridContext : JsonSerializerContext { }

// Invoke JavaScript with parameters and return value
var result = await hybridWebView.InvokeJavaScriptAsync<Dictionary<string, string>>(
    "updateContent",
    HybridContext.Default.DictionaryStringString,
    [markdown],
    [HybridContext.Default.String]);
```

### Performance Considerations
- Use `AddHybridWebViewDeveloperTools()` in DEBUG mode only
- Cache rendered HTML to avoid re-rendering
- Use JavaScript streaming for large content (Task<Stream> support)
- Platform differences: Windows (WebView2/Chromium), iOS/Mac (WKWebKit), Android (Chromium-based WebView)

### Alternatives Considered
- **Standard WebView**: Limited to `EvaluateJavaScriptAsync`, no structured interop, requires custom message passing protocol
- **BlazorWebView**: Overkill for static markdown rendering, requires Blazor runtime overhead
- **Custom renderer**: More complex, platform-specific code required

---

## 2. Testing Framework Recommendation

### Decision
Use **xUnit** for unit tests with **Device Runners** for UI testing on actual devices.

### Rationale
- **xUnit is officially recommended** by Microsoft for .NET MAUI apps
- Modern syntax with `[Fact]` and `[Theory]` attributes
- Better async/await support than NUnit
- Works seamlessly with .NET CLI (`dotnet test`) and Visual Studio Test Explorer
- Supports code coverage via `coverlet.collector`
- Device Runners provide on-device testing with visual runner shell and XHarness CLI integration

### Test Project Configuration
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <IsTestProject>true</IsTestProject>
  </PropertyGroup>
  
  <ItemGroup>
    <PackageReference Include="xunit" Version="2.9.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.8.2" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.12.0" />
    <PackageReference Include="coverlet.collector" Version="6.0.2" />
  </ItemGroup>
</Project>
```

### Unit Testing Approach
For **class library** testing:
```xml
<!-- Add net10.0 to MAUI class library -->
<TargetFrameworks>net10.0;net10.0-android;net10.0-ios;net10.0-maccatalyst</TargetFrameworks>
```

For **app project** testing:
```xml
<!-- Add net10.0 to MAUI app project -->
<TargetFrameworks>net10.0;net10.0-android;net10.0-ios;net10.0-maccatalyst</TargetFrameworks>
<!-- Prevent executable output for test framework -->
<OutputType Condition="'$(TargetFramework)' != 'net10.0'">Exe</OutputType>
```

### UI Testing
- **Device Runners**: Run tests on physical devices and emulators with visual feedback
- Integrates with XHarness for CI/CD automation
- View test results directly on device screen

### Test Structure
```csharp
public class MarkdownServiceTests
{
    [Fact]
    public void RenderMarkdown_ValidInput_ReturnsHtml()
    {
        // Arrange
        var service = new MarkdownService();
        var markdown = "# Hello";
        
        // Act
        var html = service.Render(markdown);
        
        // Assert
        Assert.Contains("<h1>", html);
    }
    
    [Theory]
    [InlineData("# H1", "h1")]
    [InlineData("## H2", "h2")]
    [InlineData("### H3", "h3")]
    public void RenderMarkdown_Headers_CorrectTags(string input, string expectedTag)
    {
        var service = new MarkdownService();
        var html = service.Render(input);
        Assert.Contains($"<{expectedTag}>", html);
    }
}
```

### Alternatives Considered
- **NUnit**: Similar feature set, but less modern syntax; equally well supported
- **MSTest**: Microsoft's framework but less popular in MAUI community; verbose attribute names
- **Appium**: For cross-platform UI automation but requires separate test infrastructure

---

## 3. MVVM Architecture Patterns

### Decision
Use **CommunityToolkit.Mvvm** (MVVM Toolkit) with source generators for ViewModel implementation.

### Rationale
- **Official Microsoft recommendation** for .NET MAUI MVVM
- Dramatically reduces boilerplate code via source generators
- `ObservableObject` base class handles `INotifyPropertyChanged`
- `[ObservableProperty]` attribute generates properties with change notification
- `[RelayCommand]` generates ICommand implementations automatically
- Works with dependency injection and modern .NET patterns
- Compile-time code generation for performance and reliability

### ViewModel Pattern

**Traditional approach (verbose):**
```csharp
public class MarkdownViewModel : INotifyPropertyChanged
{
    private string _markdown;
    public string Markdown
    {
        get => _markdown;
        set
        {
            if (_markdown != value)
            {
                _markdown = value;
                OnPropertyChanged(nameof(Markdown));
            }
        }
    }
    
    public event PropertyChangedEventHandler PropertyChanged;
    protected void OnPropertyChanged(string name) =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
```

**MVVM Toolkit approach (concise):**
```csharp
public partial class MarkdownViewModel : ObservableObject
{
    [ObservableProperty]
    private string markdown;
    
    [ObservableProperty]
    private string htmlContent;
    
    [RelayCommand]
    private async Task LoadFileAsync(string path)
    {
        Markdown = await File.ReadAllTextAsync(path);
        HtmlContent = await RenderMarkdown(Markdown);
    }
    
    [RelayCommand(CanExecute = nameof(CanSave))]
    private async Task SaveAsync()
    {
        // Save implementation
    }
    
    private bool CanSave() => !string.IsNullOrEmpty(Markdown);
}
```

### Data Binding Best Practices
- Use compiled bindings for performance: `{Binding Path, Mode=OneWay}`
- .NET MAUI marshals binding updates to UI thread automatically (no dispatcher needed)
- Prefer `ObservableCollection<T>` for collections that change
- Use `[NotifyPropertyChangedFor]` to cascade notifications:
  ```csharp
  [ObservableProperty]
  [NotifyPropertyChangedFor(nameof(CanSave))]
  private string markdown;
  ```

### Dependency Injection Integration
```csharp
// MauiProgram.cs
builder.Services.AddSingleton<IMarkdownService, MarkdownService>();
builder.Services.AddTransient<MainViewModel>();
builder.Services.AddTransient<MainPage>();

// Page constructor
public MainPage(MainViewModel viewModel)
{
    InitializeComponent();
    BindingContext = viewModel;
}
```

### Alternatives Considered
- **ReactiveUI**: Powerful but steeper learning curve; reactive programming paradigm
- **Prism Library**: Full-featured but heavier; includes navigation framework
- **Manual MVVM**: Too verbose, error-prone, maintenance burden

---

## 4. Performance Optimization

### Decision
Implement **60+ FPS animations** via hardware acceleration, **CollectionView virtualization** for lists, and proactive **memory management** patterns.

### Rationale
- MAUI uses native controls with hardware acceleration by default
- CollectionView provides automatic UI virtualization
- Profiling tools (dotnet-trace, PerfView) essential for identifying bottlenecks
- Platform-specific optimizations available when needed

### 60+ FPS Animation Techniques

**Use MAUI's built-in animations:**
```csharp
// Smooth fade animation
await view.FadeTo(0, 250, Easing.CubicOut);

// Translate animation
await view.TranslateTo(100, 0, 300, Easing.SpringOut);

// Rotation
await view.RotateTo(360, 500, Easing.CubicInOut);

// Community Toolkit animations
await view.FadeAsync(0, 250, Easing.CubicOut);
```

**Hardware acceleration enabled by default:**
- Windows: DirectX/Direct2D
- Android: Hardware-accelerated rendering
- iOS: Core Animation

### Virtualization for Large Lists

**CollectionView (preferred for large datasets):**
```csharp
<CollectionView ItemsSource="{Binding Files}"
                SelectionMode="Single">
    <CollectionView.ItemTemplate>
        <DataTemplate>
            <Grid Padding="10">
                <Label Text="{Binding Name}" />
            </Grid>
        </DataTemplate>
    </CollectionView.ItemTemplate>
</CollectionView>
```

**Key benefits:**
- Automatic UI virtualization (only visible items in memory)
- Flexible layouts (list, grid, horizontal, vertical)
- Better performance than ListView for large datasets
- Incremental data loading support via `RemainingItemsThresholdReached`

**ListView caching strategies (if needed):**
- `RecycleElement`: Recycles cells, best for most scenarios
- `RetainElement`: No recycling, use only for small lists with complex bindings

### Memory Management Best Practices

1. **Lazy initialization for expensive objects:**
   ```csharp
   private Lazy<MarkdownParser> _parser = new(() => new MarkdownParser());
   public MarkdownParser Parser => _parser.Value;
   ```

2. **Dispose pattern for resources:**
   ```csharp
   public class MarkdownService : IDisposable
   {
       private FileSystemWatcher _watcher;
       
       public void Dispose()
       {
           _watcher?.Dispose();
           GC.SuppressFinalize(this);
       }
   }
   ```

3. **Unsubscribe from events:**
   ```csharp
   protected override void OnDisappearing()
   {
       base.OnDisappearing();
       _watcher.Changed -= OnFileChanged;
   }
   ```

4. **Use WeakEventManager for cross-object events:**
   ```csharp
   WeakEventManager.AddEventHandler<FileSystemEventArgs>(
       _watcher, nameof(FileSystemWatcher.Changed), OnFileChanged);
   ```

### Profiling
- **dotnet-trace**: Cross-platform CPU profiling
- **PerfView**: Windows-specific, detailed analysis
- **Visual Studio Profiler**: Integrated debugging experience
- Profile Release builds, not Debug (interpreter disabled)

### Alternatives Considered
- **Manual virtualization**: Too complex, platform-specific
- **Third-party animation libraries**: Unnecessary, built-in animations sufficient
- **Object pooling**: Premature optimization for this use case

---

## 5. Fluent Design Integration

### Decision
Use **WinUI 3 controls** on Windows platform with conditional XAML and platform-specific styling.

### Rationale
- .NET MAUI on Windows uses WinUI 3 (Windows App SDK)
- WinUI 3 includes Fluent Design System controls by default
- Acrylic, reveal, shadows, and rounded corners available
- Platform-specific XAML allows Windows-specific styling without affecting other platforms

### Windows-Specific Fluent Controls

**Conditional styling in XAML:**
```xml
<ContentPage xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             xmlns:windows="clr-namespace:Microsoft.Maui.Controls.PlatformConfiguration.WindowsSpecific;assembly=Microsoft.Maui.Controls">
    
    <!-- Windows-specific properties -->
    <ContentPage.Resources>
        <OnPlatform x:Key="CardBackground" x:TypeArguments="Color">
            <On Platform="Windows" Value="{StaticResource SystemAltHighColor}" />
            <On Platform="iOS,Android" Value="White" />
        </OnPlatform>
    </ContentPage.Resources>
</ContentPage>
```

**Platform-specific file structure:**
```
Styles/
  Styles.xaml              # Cross-platform base styles
  Platforms/
    Windows/
      WinUIStyles.xaml     # Windows-specific Fluent styles
```

**Acrylic and reveal effects (Windows only):**
```csharp
#if WINDOWS
using Microsoft.UI.Xaml.Media;

var acrylic = new AcrylicBrush
{
    TintColor = Colors.White,
    TintOpacity = 0.8,
    FallbackColor = Colors.LightGray
};
#endif
```

### Fluent Design Principles
- **Light**: Use layers, depth, and shadows
- **Depth**: Parallax, z-index for hierarchy
- **Motion**: Smooth, purposeful animations
- **Material**: Acrylic, reveal, shadow
- **Scale**: Responsive design for all screen sizes

### Multi-Platform Considerations
- Use `OnPlatform` for platform-specific values
- Keep core design language consistent across platforms
- Use Material Design principles on Android
- Use Cupertino/iOS design on iOS/Mac Catalyst

### Alternatives Considered
- **Custom control library**: Too much effort, WinUI 3 sufficient
- **Avalonia UI**: Different framework, not needed
- **Third-party Fluent controls**: Unnecessary, built-in adequate

---

## 6. File System Watching

### Decision
Use **System.IO.FileSystemWatcher** with error handling and buffer management, wrapped in a service for cross-platform use.

### Rationale
- `FileSystemWatcher` is cross-platform (.NET Standard)
- Works on Windows, macOS, Linux, Android, iOS
- Supports monitoring files and directories for changes
- Event-driven architecture fits MVVM pattern well
- Platform-agnostic, already used in WPF version

### Implementation Pattern

```csharp
public class FileWatcherService : IDisposable
{
    private FileSystemWatcher _watcher;
    
    public event EventHandler<FileSystemEventArgs> FileChanged;
    
    public void WatchFolder(string path)
    {
        _watcher?.Dispose();
        
        _watcher = new FileSystemWatcher(path)
        {
            Filter = "*.md",
            NotifyFilter = NotifyFilters.FileName 
                         | NotifyFilters.LastWrite 
                         | NotifyFilters.Size,
            IncludeSubdirectories = true,
            InternalBufferSize = 65536 // Increase for high-activity folders
        };
        
        _watcher.Changed += OnChanged;
        _watcher.Created += OnChanged;
        _watcher.Deleted += OnChanged;
        _watcher.Renamed += OnRenamed;
        _watcher.Error += OnError;
        
        _watcher.EnableRaisingEvents = true;
    }
    
    private void OnChanged(object sender, FileSystemEventArgs e)
    {
        // Debounce rapid changes
        MainThread.BeginInvokeOnMainThread(() =>
        {
            FileChanged?.Invoke(this, e);
        });
    }
    
    private void OnError(object sender, ErrorEventArgs e)
    {
        // Log error, possibly recreate watcher
        Debug.WriteLine($"FileSystemWatcher error: {e.GetException()?.Message}");
    }
    
    public void Dispose()
    {
        _watcher?.Dispose();
    }
}
```

### Best Practices
1. **Increase buffer size** for high-activity directories: `InternalBufferSize = 65536`
2. **Handle Error event**: Buffer overflow, permissions, network issues
3. **Debounce rapid changes**: Use timer to batch multiple rapid events
4. **Marshal to UI thread**: Use `MainThread.BeginInvokeOnMainThread`
5. **Dispose properly**: Always call `Dispose()` when done

### Platform Considerations
- **Windows**: Native support, most reliable
- **macOS/iOS**: Uses FSEvents, generally reliable
- **Android**: May have limitations with external storage
- **Network paths**: Can be unreliable, consider polling fallback

### Debounce Pattern
```csharp
private Timer _debounceTimer;
private string _lastChangedPath;

private void OnChanged(object sender, FileSystemEventArgs e)
{
    _lastChangedPath = e.FullPath;
    
    _debounceTimer?.Dispose();
    _debounceTimer = new Timer(_ =>
    {
        MainThread.BeginInvokeOnMainThread(() =>
        {
            FileChanged?.Invoke(this, new FileSystemEventArgs(
                WatcherChangeTypes.Changed, 
                Path.GetDirectoryName(_lastChangedPath),
                Path.GetFileName(_lastChangedPath)));
        });
    }, null, 300, Timeout.Infinite);
}
```

### Alternatives Considered
- **Polling**: Less efficient, higher overhead, use only as fallback
- **Platform-specific APIs**: Unnecessary complexity for this use case
- **Third-party libraries**: FileSystemWatcher sufficient

---

## 7. Touch Gesture Support

### Decision
Use **MAUI gesture recognizers** (`TapGestureRecognizer`, `PanGestureRecognizer`, `PinchGestureRecognizer`, `SwipeGestureRecognizer`) for touch interactions.

### Rationale
- Built-in, cross-platform gesture support
- Works on touch, mouse, and pen input
- Simple declarative XAML syntax
- Event-based and command-based patterns supported
- Position tracking available via `GetPosition()` method

### Gesture Recognizers

**Tap Gesture (including double-tap, right-click):**
```xml
<Image Source="diagram.png">
    <Image.GestureRecognizers>
        <TapGestureRecognizer 
            Tapped="OnImageTapped"
            NumberOfTapsRequired="2"
            Buttons="Primary,Secondary" />
    </Image.GestureRecognizers>
</Image>
```

```csharp
void OnImageTapped(object sender, TappedEventArgs e)
{
    // Get tap position
    Point? position = e.GetPosition(null); // relative to window
    Point? imagePosition = e.GetPosition((View)sender); // relative to image
    
    // Check which button
    if (e.Buttons == ButtonsMask.Secondary)
    {
        // Right-click/secondary button
    }
}
```

**Pan Gesture (drag, scroll):**
```xml
<Frame>
    <Frame.GestureRecognizers>
        <PanGestureRecognizer PanUpdated="OnPanUpdated" />
    </Frame.GestureRecognizers>
</Frame>
```

```csharp
void OnPanUpdated(object sender, PanUpdatedEventArgs e)
{
    switch (e.StatusType)
    {
        case GestureStatus.Started:
            // Pan started
            break;
        case GestureStatus.Running:
            // Update position: e.TotalX, e.TotalY
            var newX = originalX + e.TotalX;
            var newY = originalY + e.TotalY;
            break;
        case GestureStatus.Completed:
            // Pan finished
            break;
    }
}
```

**Pinch Gesture (zoom):**
```xml
<Image Source="document.png">
    <Image.GestureRecognizers>
        <PinchGestureRecognizer PinchUpdated="OnPinchUpdated" />
    </Image.GestureRecognizers>
</Image>
```

```csharp
void OnPinchUpdated(object sender, PinchGestureUpdatedEventArgs e)
{
    if (e.Status == GestureStatus.Running)
    {
        var scale = currentScale * e.Scale;
        image.Scale = Math.Max(1, scale); // Clamp minimum scale
    }
}
```

**Swipe Gesture (navigation):**
```xml
<Frame>
    <Frame.GestureRecognizers>
        <SwipeGestureRecognizer 
            Direction="Left,Right"
            Swiped="OnSwiped" />
    </Frame.GestureRecognizers>
</Frame>
```

```csharp
void OnSwiped(object sender, SwipedEventArgs e)
{
    switch (e.Direction)
    {
        case SwipeDirection.Left:
            await Shell.Current.GoToAsync("//NextPage");
            break;
        case SwipeDirection.Right:
            await Shell.Current.GoToAsync("//PreviousPage");
            break;
    }
}
```

### Command-Based Pattern (MVVM)
```xml
<TapGestureRecognizer 
    Command="{Binding TapCommand}"
    CommandParameter="{Binding .}" />
```

```csharp
[RelayCommand]
private void Tap(object parameter)
{
    // Handle tap
}
```

### Multi-Gesture Support
Multiple gesture recognizers can coexist on same element:
```xml
<Image Source="image.png">
    <Image.GestureRecognizers>
        <TapGestureRecognizer NumberOfTapsRequired="2" Tapped="OnDoubleTap" />
        <TapGestureRecognizer NumberOfTapsRequired="1" Tapped="OnSingleTap" />
        <PinchGestureRecognizer PinchUpdated="OnPinch" />
    </Image.GestureRecognizers>
</Image>
```

### Alternatives Considered
- **Platform-specific touch handlers**: Too complex, not cross-platform
- **Third-party gesture libraries**: Built-in recognizers sufficient
- **Custom gesture detection**: Reinventing the wheel

---

## 8. Crash Recovery Implementation

### Decision
Implement **application lifecycle state persistence** using `Application.Properties` dictionary and `OnStop`/`OnStart` overrides, combined with JSON serialization for complex state.

### Rationale
- Built-in `Application.Properties` provides persistent key-value storage
- Lifecycle events (`OnStart`, `OnResume`, `OnSleep`, `OnStop`) provide hooks for state management
- Cross-platform, works on all MAUI platforms
- Automatic serialization for primitive types
- JSON serialization for complex objects (session data, view state)

### Implementation Pattern

**Session state model:**
```csharp
public class SessionState
{
    public string CurrentFilePath { get; set; }
    public List<string> OpenFiles { get; set; }
    public double ScrollPosition { get; set; }
    public string LastDirectory { get; set; }
    public DateTime LastSaved { get; set; }
}
```

**Save state on application lifecycle events:**
```csharp
public partial class App : Application
{
    const string SessionStateKey = "SessionState";
    
    protected override void OnStop()
    {
        base.OnStop();
        SaveSessionState();
    }
    
    protected override void OnStart()
    {
        base.OnStart();
        RestoreSessionState();
    }
    
    private void SaveSessionState()
    {
        try
        {
            var state = new SessionState
            {
                CurrentFilePath = CurrentFile,
                OpenFiles = OpenFiles.ToList(),
                ScrollPosition = ScrollPosition,
                LastDirectory = LastDirectory,
                LastSaved = DateTime.UtcNow
            };
            
            var json = JsonSerializer.Serialize(state);
            Properties[SessionStateKey] = json;
            SavePropertiesAsync(); // Async save to disk
        }
        catch (Exception ex)
        {
            // Log error, don't crash
            Debug.WriteLine($"Failed to save session: {ex.Message}");
        }
    }
    
    private void RestoreSessionState()
    {
        try
        {
            if (Properties.ContainsKey(SessionStateKey))
            {
                var json = Properties[SessionStateKey] as string;
                var state = JsonSerializer.Deserialize<SessionState>(json);
                
                // Restore state
                CurrentFile = state.CurrentFilePath;
                OpenFiles = state.OpenFiles;
                ScrollPosition = state.ScrollPosition;
                LastDirectory = state.LastDirectory;
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Failed to restore session: {ex.Message}");
            // Use defaults, don't crash
        }
    }
}
```

**Cross-platform lifecycle events:**
```csharp
protected override Window CreateWindow(IActivationState activationState)
{
    var window = base.CreateWindow(activationState);
    
    window.Created += (s, e) =>
    {
        // Window created
    };
    
    window.Activated += (s, e) =>
    {
        // Window activated/focused
    };
    
    window.Deactivated += (s, e) =>
    {
        // Window deactivated/lost focus
    };
    
    window.Stopped += (s, e) =>
    {
        // Window stopped (minimized, hidden)
        SaveSessionState();
    };
    
    window.Resumed += (s, e) =>
    {
        // Window resumed from stopped state
    };
    
    window.Destroying += (s, e) =>
    {
        // Window being destroyed
        SaveSessionState();
    };
    
    return window;
}
```

### Crash Detection
```csharp
protected override void OnStart()
{
    base.OnStart();
    
    // Check if previous session ended normally
    if (Properties.ContainsKey("UnexpectedShutdown"))
    {
        // Previous session crashed
        ShowCrashRecoveryDialog();
        Properties.Remove("UnexpectedShutdown");
    }
    else
    {
        Properties["UnexpectedShutdown"] = true;
    }
    
    RestoreSessionState();
}

protected override void OnStop()
{
    base.OnStop();
    
    // Normal shutdown
    Properties.Remove("UnexpectedShutdown");
    SaveSessionState();
}
```

### Platform-Specific Storage Locations
- **Windows**: `%LOCALAPPDATA%\Packages\<package-name>\LocalState`
- **Android**: `/data/data/<package-name>/files`
- **iOS**: `Library/Application Support`
- **Mac Catalyst**: `~/Library/Application Support/<bundle-id>`

### Alternatives Considered
- **Preferences API**: Limited to primitive types, not suitable for complex state
- **SQLite**: Overkill for simple session state
- **File-based storage**: More complex than Properties dictionary
- **Cloud sync**: Adds complexity, not needed for crash recovery

---

## 9. Local Logging

### Decision
Use **Microsoft.Extensions.Logging** with **Serilog** sinks for file and console output.

### Rationale
- `Microsoft.Extensions.Logging` is the standard .NET logging abstraction
- Serilog provides structured logging with rich formatting
- File sink persists logs for debugging
- Flexible configuration (log levels, filtering, formatting)
- Integrates with .NET MAUI dependency injection
- Minimal performance impact

### Setup

**Install packages:**
```xml
<PackageReference Include="Microsoft.Extensions.Logging" Version="9.0.0" />
<PackageReference Include="Serilog.Extensions.Logging" Version="8.0.0" />
<PackageReference Include="Serilog.Sinks.File" Version="6.0.0" />
<PackageReference Include="Serilog.Sinks.Debug" Version="3.0.0" />
```

**Configure in MauiProgram.cs:**
```csharp
using Serilog;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var logPath = Path.Combine(
            FileSystem.AppDataDirectory, 
            "logs", 
            "markread.log");
        
        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Debug()
            .WriteTo.File(
                logPath,
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 7,
                outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
#if DEBUG
            .WriteTo.Debug()
#endif
            .CreateLogger();
        
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
            });
        
        builder.Logging.AddSerilog(dispose: true);
        
        return builder.Build();
    }
}
```

**Usage in code:**
```csharp
public class MarkdownService
{
    private readonly ILogger<MarkdownService> _logger;
    
    public MarkdownService(ILogger<MarkdownService> logger)
    {
        _logger = logger;
    }
    
    public async Task<string> LoadFileAsync(string path)
    {
        _logger.LogInformation("Loading markdown file: {Path}", path);
        
        try
        {
            var content = await File.ReadAllTextAsync(path);
            _logger.LogDebug("File loaded successfully, length: {Length}", content.Length);
            return content;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load file: {Path}", path);
            throw;
        }
    }
}
```

### Log Levels
- `Trace`: Very detailed, verbose debugging
- `Debug`: Debugging information (DEBUG builds only)
- `Information`: General informational messages
- `Warning`: Warning messages
- `Error`: Error messages with exceptions
- `Critical`: Critical failures

### Structured Logging
```csharp
_logger.LogInformation(
    "File {FileName} rendered in {ElapsedMs}ms", 
    fileName, 
    stopwatch.ElapsedMilliseconds);

// Creates structured log entry:
// { 
//   "FileName": "readme.md", 
//   "ElapsedMs": 125,
//   "Message": "File readme.md rendered in 125ms"
// }
```

### Production Configuration
```csharp
#if RELEASE
.MinimumLevel.Information() // Less verbose in production
#else
.MinimumLevel.Debug()
#endif
```

### Alternatives Considered
- **NLog**: Similar capabilities, but Serilog more popular in .NET ecosystem
- **log4net**: Older, less modern API
- **Debug.WriteLine**: No persistence, debug-only
- **Console.WriteLine**: No formatting, not production-ready

---

## 10. Migration Strategy

### Decision
Use **incremental migration** approach with code reuse patterns and WPF compatibility shims.

### Rationale
- Lower risk than big bang rewrite
- Can ship working versions at each stage
- Easier to test and validate functionality
- Code can be shared between WPF and MAUI during transition
- Team can learn MAUI gradually

### Migration Phases

**Phase 1: Project Setup & Core Infrastructure (Week 1-2)**
- Create new .NET MAUI project structure
- Set up multi-targeting for shared code
- Implement dependency injection
- Configure logging and error handling
- Set up unit test projects (xUnit)

**Phase 2: Business Logic Migration (Week 3-4)**
- Extract business logic from WPF code-behind
- Move to .NET Standard 2.0 class library
- Refactor to MVVM pattern with CommunityToolkit.Mvvm
- Add unit tests for services
- Services to migrate:
  - MarkdownRenderingService
  - FileSystemService
  - HistoryService
  - SettingsService
  - LinkResolverService

**Phase 3: UI Layer - Views & ViewModels (Week 5-7)**
- Create MAUI views (XAML)
- Implement ViewModels with ObservableProperty
- Port existing WPF views one-by-one:
  - MainWindow → MainPage
  - TabView → TabbedPage / Custom Tab Control
  - Sidebar → Shell Flyout or CollectionView
  - Find Panel → SearchBar + ContentView
- Reuse ViewModel logic where possible

**Phase 4: WebView Integration (Week 8-9)**
- Implement HybridWebView for markdown rendering
- Migrate HTML templates and JavaScript
- Set up C#/JavaScript interop for:
  - Scroll position sync
  - Link navigation
  - Search highlighting
  - Theme switching
- Test on all platforms

**Phase 5: Platform-Specific Features (Week 10-11)**
- Windows: WinUI 3 styling, file associations
- macOS: Menu integration, file watching
- Platform-specific handlers where needed
- Native integration testing

**Phase 6: Polish & Testing (Week 12-14)**
- UI polish and animations
- Performance optimization
- Integration testing
- User acceptance testing
- Documentation updates

### Code Reuse Patterns

**Shared code structure:**
```
Solution/
  MarkRead.Core/              # .NET Standard 2.0 library
    Services/
      IMarkdownService.cs
      MarkdownService.cs
      FileSystemService.cs
    Models/
      MarkdownDocument.cs
      FileNode.cs
    
  MarkRead.WPF/               # WPF application (existing)
    Views/
    ViewModels/               # Can reference Core
    
  MarkRead.Maui/              # MAUI application (new)
    Views/
    ViewModels/               # Can reference Core
    Platforms/
```

**Multi-targeting approach:**
```xml
<!-- MarkRead.Shared.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFrameworks>net8.0-windows;net8.0;net8.0-android;net8.0-ios</TargetFrameworks>
  </PropertyGroup>
</Project>
```

**Conditional compilation for platform-specific code:**
```csharp
public class FileService
{
    public string GetApplicationDataPath()
    {
#if WINDOWS && !MAUI
        return Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
#elif MAUI
        return FileSystem.AppDataDirectory;
#else
        return Path.Combine(Environment.GetFolderPath(
            Environment.SpecialFolder.LocalApplicationData), "MarkRead");
#endif
    }
}
```

### Migration Checklist

**Before starting:**
- [ ] Document complete functional requirements from existing WPF app
- [ ] Capture all keyboard shortcuts and user interactions
- [ ] Document current settings and preferences structure
- [ ] Set up version control branch
- [ ] Rename src/ to src.old/ for reference
- [ ] Create comprehensive test plan based on functional requirements

**During migration:**
- [ ] Create new src/ directory with fresh MAUI project
- [ ] Implement MVVM ViewModels following best practices
- [ ] Create modern XAML views with Fluent Design
- [ ] Set up HybridWebView rendering from scratch
- [ ] Implement file system services (new code, src.old/ reference only)
- [ ] Add gesture support using MAUI patterns
- [ ] Implement file watching with proper debouncing
- [ ] Add comprehensive logging and error handling
- [ ] Create unit tests for all services and ViewModels
- [ ] Test on all target platforms
- [ ] Verify feature parity with src.old/ functional reference

**After migration:**
- [ ] Performance profiling and optimization
- [ ] UI/UX polish and animation tuning
- [ ] Update all documentation
- [ ] Archive src.old/ or remove after validation
- [ ] Update deployment pipeline for MAUI
- [ ] Create migration notes documenting improvements

### Risk Mitigation
1. **Feature parity**: Maintain feature checklist from src.old/, verify each feature works in new implementation
2. **Performance**: Profile early, optimize as needed, target 60+ FPS
3. **Platform differences**: Test on actual devices, not just emulators
4. **Breaking changes**: Use semantic versioning, maintain changelog
5. **Fresh code quality**: Follow all best practices from research, leverage modern C# patterns
6. **No legacy debt**: Resist temptation to copy-paste from src.old/; use only as functional reference

### Alternatives Considered
- **Incremental migration with code reuse**: Rejected - would bring legacy patterns and technical debt into new codebase
- **Parallel development (src/ and src-maui/)**: Rejected - maintenance burden of two active codebases
- **Avalonia UI**: Different framework, less Microsoft support
- **Electron/WebView approach**: Not native, larger app size
- **Flutter**: Different language (Dart), not .NET

---

## Summary & Recommendations

### Recommended Technology Stack

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **WebView** | HybridWebView | Best interop, designed for this scenario |
| **Testing** | xUnit + Device Runners | Official recommendation, modern syntax |
| **MVVM** | CommunityToolkit.Mvvm | Reduces boilerplate, source generators |
| **Performance** | CollectionView virtualization | Built-in, automatic, performant |
| **Design** | WinUI 3 (Windows) + platform defaults | Native look & feel per platform |
| **File Watching** | FileSystemWatcher | Cross-platform, reliable, proven |
| **Gestures** | MAUI Gesture Recognizers | Built-in, comprehensive, cross-platform |
| **Crash Recovery** | Application.Properties + Lifecycle | Built-in, simple, reliable |
| **Logging** | Microsoft.Extensions.Logging + Serilog | Industry standard, flexible |
| **Migration** | Complete rebuild (src.old/ reference only) | Clean architecture, best practices, no legacy debt |

### Key Architectural Decisions

1. **Fresh Implementation**: All code written new following MAUI best practices; src.old/ serves only as functional reference
2. **MVVM Throughout**: Use CommunityToolkit.Mvvm consistently with source generators
3. **Dependency Injection**: Use built-in DI container with proper service lifetimes
4. **Platform-Specific Code**: Use conditional compilation and OnPlatform sparingly
5. **Testing**: Comprehensive unit tests for services, Device Runners for UI

### Implementation Priority

**High Priority (MVP):**
- HybridWebView markdown rendering (fresh implementation)
- File system navigation with CollectionView
- Modern MVVM ViewModels with CommunityToolkit
- FileSystemWatcher integration with debouncing
- Application state persistence for crash recovery

**Medium Priority (Post-MVP):**
- Touch gesture support
- Performance optimizations (60+ FPS animations)
- Comprehensive logging with Serilog
- Fluent Design polish (Windows)

**Low Priority (Future):**
- Advanced animations and transitions
- Platform-specific features beyond Windows
- Accessibility improvements
- Internationalization

### Next Steps

1. **Rename & Document** (1 day): Move src/ to src.old/, document all features from WPF app
2. **Project Setup** (2 days): Create fresh MAUI project structure in src/ with proper DI setup
3. **Core Services** (1 week): Implement markdown, file system, settings services (new code)
4. **ViewModels & Views** (2 weeks): Create MVVM architecture with modern XAML views
5. **WebView Integration** (3 days): Implement HybridWebView with highlight.js and Mermaid.js 11.12.2
6. **Testing & Polish** (1 week): Unit tests, integration tests, performance tuning
7. **Validation** (3 days): Feature parity check against src.old/ requirements
8. **Deployment** (2 days): Update installer for MAUI, package, sign, publish

### Resources
- [Microsoft .NET MAUI Documentation](https://learn.microsoft.com/en-us/dotnet/maui/)
- [CommunityToolkit.Mvvm Documentation](https://learn.microsoft.com/en-us/dotnet/communitytoolkit/mvvm/)
- [.NET MAUI Samples](https://github.com/dotnet/maui-samples)
- [HybridWebView Sample](https://github.com/dotnet/maui-samples/tree/main/8.0/UserInterface/HybridWebView)

---

**Document Version:** 1.0  
**Last Updated:** December 9, 2025  
**Author:** GitHub Copilot (Claude Sonnet 4.5)
