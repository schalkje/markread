# Quickstart Guide: Implementing Zoom and Pan Controls

**Feature**: 004-zoom-pan  
**Date**: 2025-11-21  
**Estimated Time**: 4-6 hours

## Overview

This guide provides step-by-step instructions for implementing zoom and pan controls in MarkRead. Follow these steps in order to build the feature incrementally with working checkpoints.

## Prerequisites

- MarkRead development environment set up
- .NET 8 SDK installed
- Basic understanding of WPF and WebView2
- Read `research.md` and `data-model.md` for context

## Implementation Phases

### Phase 1: Data Model (30 minutes)

**Goal**: Add zoom/pan properties to TabItem and settings

**Steps**:

1. **Extend AppSettings** (`src/Services/SettingsService.cs`):
   ```csharp
   public class AppSettings
   {
       // ... existing properties
       
       public double DefaultZoomPercent { get; set; } = 100.0;
       
       public void Validate()
       {
           // ... existing validation
           
           DefaultZoomPercent = Math.Clamp(DefaultZoomPercent, 10.0, 1000.0);
       }
   }
   ```

2. **Add ZoomPanState to TabItem** (`src/UI/Tabs/TabItem.cs`):
   ```csharp
   public class TabItem : INotifyPropertyChanged
   {
       // ... existing properties
       
       private double _zoomPercent;
       private double _panOffsetX;
       private double _panOffsetY;
       
       public double ZoomPercent
       {
           get => _zoomPercent;
           set
           {
               _zoomPercent = Math.Clamp(value, 10.0, 1000.0);
               OnPropertyChanged();
           }
       }
       
       public double PanOffsetX
       {
           get => _panOffsetX;
           set
           {
               _panOffsetX = value;
               OnPropertyChanged();
           }
       }
       
       public double PanOffsetY
       {
           get => _panOffsetY;
           set
           {
               _panOffsetY = value;
               OnPropertyChanged();
           }
       }
       
       public TabItem(AppSettings settings)
       {
           // Initialize with default from settings
           _zoomPercent = settings.DefaultZoomPercent;
           _panOffsetX = 0.0;
           _panOffsetY = 0.0;
       }
       
       public void ResetZoomPan()
       {
           ZoomPercent = 100.0;
           PanOffsetX = 0.0;
           PanOffsetY = 0.0;
       }
   }
   ```

**Checkpoint**: Compile and run. Verify no errors. TabItem now has zoom/pan state.

---

### Phase 2: JavaScript Controller (1 hour)

**Goal**: Create JavaScript module to handle zoom/pan transforms

**Steps**:

1. **Create zoom-pan.js** (`src/Rendering/assets/zoom-pan.js`):
   ```javascript
   class ZoomPanController {
       constructor() {
           this.zoomPercent = 100.0;
           this.panX = 0.0;
           this.panY = 0.0;
           this.contentElement = null;
           
           // Initialize when DOM ready
           if (document.readyState === 'loading') {
               document.addEventListener('DOMContentLoaded', () => this.initialize());
           } else {
               this.initialize();
           }
       }
       
       initialize() {
           this.contentElement = document.getElementById('content');
           if (!this.contentElement) {
               console.error('Content element not found');
               return;
           }
           
           // Set up message listener
           window.chrome.webview.addEventListener('message', (event) => {
               this.handleMessage(event);
           });
           
           // Apply initial transform
           this.applyTransform();
       }
       
       handleMessage(event) {
           if (!event.data || typeof event.data !== 'object') {
               console.error('Invalid message:', event.data);
               return;
           }
           
           const command = event.data;
           switch (command.action) {
               case 'zoom':
                   this.zoom(command.delta, command.cursorX, command.cursorY);
                   break;
               case 'reset':
                   this.reset();
                   break;
               case 'restore':
                   this.restore(command.zoom, command.panX, command.panY);
                   break;
               case 'pan':
                   this.pan(command.deltaX, command.deltaY);
                   break;
               default:
                   console.warn('Unknown action:', command.action);
           }
       }
       
       zoom(delta, cursorX, cursorY) {
           // Calculate new zoom
           const newZoom = Math.max(10, Math.min(1000, this.zoomPercent + delta));
           
           if (newZoom === this.zoomPercent) {
               return; // Already at limit
           }
           
           // TODO: Adjust pan offset to keep cursor position fixed
           // For now, just zoom from center
           
           this.zoomPercent = newZoom;
           this.applyTransform();
           this.sendStateUpdate();
       }
       
       reset() {
           this.zoomPercent = 100.0;
           this.panX = 0.0;
           this.panY = 0.0;
           this.applyTransform();
           this.sendStateUpdate();
       }
       
       restore(zoom, panX, panY) {
           this.zoomPercent = zoom;
           this.panX = panX;
           this.panY = panY;
           this.applyTransform();
           // No state update needed (restoring saved state)
       }
       
       pan(deltaX, deltaY) {
           // Update pan offsets
           this.panX += deltaX;
           this.panY += deltaY;
           
           // TODO: Clamp to boundaries
           
           this.applyTransform();
           this.sendStateUpdate();
       }
       
       applyTransform() {
           if (!this.contentElement) return;
           
           const scale = this.zoomPercent / 100.0;
           this.contentElement.style.transform = 
               `matrix(${scale}, 0, 0, ${scale}, ${this.panX}, ${this.panY})`;
       }
       
       sendStateUpdate() {
           window.chrome.webview.postMessage({
               type: 'zoomPanState',
               zoom: this.zoomPercent,
               panX: this.panX,
               panY: this.panY
           });
       }
   }
   
   // Create global instance
   window.zoomPanController = new ZoomPanController();
   ```

2. **Include in HTML template** (update `src/Rendering/template/template.html`):
   ```html
   <head>
       <!-- ... existing scripts -->
       <script src="assets/zoom-pan.js"></script>
   </head>
   <body>
       <div id="content" class="markdown-body">
           <!-- Markdown content rendered here -->
       </div>
   </body>
   ```

**Checkpoint**: Load a markdown file. Open browser dev tools (F12 in WebView2). Type `window.zoomPanController` in console. Should see the controller object.

---

### Phase 3: WPF Event Handlers (1.5 hours)

**Goal**: Capture keyboard and mouse events, send commands to JavaScript

**Steps**:

1. **Add event handlers to WebViewHost or MainWindow** (`src/Rendering/WebViewHost.cs` or `src/MainWindow.xaml.cs`):
   ```csharp
   using System.Text.Json;
   using System.Windows.Input;
   
   public partial class MainWindow : Window
   {
       private Point? _panStartPoint = null;
       private bool _isPanning = false;
       
       public MainWindow()
       {
           InitializeComponent();
           
           // Subscribe to events
           webView.PreviewMouseWheel += OnPreviewMouseWheel;
           webView.PreviewMouseDown += OnPreviewMouseDown;
           webView.PreviewMouseMove += OnPreviewMouseMove;
           webView.PreviewMouseUp += OnPreviewMouseUp;
           webView.PreviewKeyDown += OnPreviewKeyDown;
       }
       
       private async void OnPreviewMouseWheel(object sender, MouseWheelEventArgs e)
       {
           if (Keyboard.Modifiers == ModifierKeys.Control)
           {
               e.Handled = true;
               
               var position = e.GetPosition(webView);
               var delta = e.Delta > 0 ? 10 : -10;
               
               await SendZoomCommandAsync(delta, position.X, position.Y);
           }
       }
       
       private void OnPreviewMouseDown(object sender, MouseButtonEventArgs e)
       {
           if (e.MiddleButton == MouseButtonState.Pressed)
           {
               _panStartPoint = e.GetPosition(webView);
               _isPanning = true;
               webView.CaptureMouse();
               e.Handled = true;
           }
       }
       
       private async void OnPreviewMouseMove(object sender, MouseEventArgs e)
       {
           if (_isPanning && _panStartPoint.HasValue)
           {
               var currentPoint = e.GetPosition(webView);
               var deltaX = currentPoint.X - _panStartPoint.Value.X;
               var deltaY = currentPoint.Y - _panStartPoint.Value.Y;
               
               _panStartPoint = currentPoint;
               
               await SendPanCommandAsync(deltaX, deltaY);
           }
       }
       
       private void OnPreviewMouseUp(object sender, MouseButtonEventArgs e)
       {
           if (e.MiddleButton == MouseButtonState.Released && _isPanning)
           {
               _isPanning = false;
               _panStartPoint = null;
               webView.ReleaseMouseCapture();
               e.Handled = true;
           }
       }
       
       private async void OnPreviewKeyDown(object sender, KeyEventArgs e)
       {
           if (Keyboard.Modifiers == ModifierKeys.Control)
           {
               switch (e.Key)
               {
                   case Key.OemPlus:
                   case Key.Add:
                       e.Handled = true;
                       await ZoomInAsync();
                       break;
                   case Key.OemMinus:
                   case Key.Subtract:
                       e.Handled = true;
                       await ZoomOutAsync();
                       break;
                   case Key.D0:
                   case Key.NumPad0:
                       e.Handled = true;
                       await ResetZoomAsync();
                       break;
               }
           }
       }
       
       private async Task SendZoomCommandAsync(int delta, double cursorX, double cursorY)
       {
           if (webView?.CoreWebView2 == null) return;
           
           var command = new { action = "zoom", delta, cursorX, cursorY };
           var json = JsonSerializer.Serialize(command);
           await webView.CoreWebView2.PostWebMessageAsJson(json);
       }
       
       private async Task SendPanCommandAsync(double deltaX, double deltaY)
       {
           if (webView?.CoreWebView2 == null) return;
           
           var command = new { action = "pan", deltaX, deltaY };
           var json = JsonSerializer.Serialize(command);
           await webView.CoreWebView2.PostWebMessageAsJson(json);
       }
       
       private async Task ZoomInAsync()
       {
           var center = new Point(webView.ActualWidth / 2, webView.ActualHeight / 2);
           await SendZoomCommandAsync(10, center.X, center.Y);
       }
       
       private async Task ZoomOutAsync()
       {
           var center = new Point(webView.ActualWidth / 2, webView.ActualHeight / 2);
           await SendZoomCommandAsync(-10, center.X, center.Y);
       }
       
       private async Task ResetZoomAsync()
       {
           if (webView?.CoreWebView2 == null) return;
           
           var command = new { action = "reset" };
           var json = JsonSerializer.Serialize(command);
           await webView.CoreWebView2.PostWebMessageAsJson(json);
       }
   }
   ```

2. **Add WebMessage handler for responses**:
   ```csharp
   public MainWindow()
   {
       InitializeComponent();
       
       // ... existing initialization
       
       webView.CoreWebView2InitializationCompleted += (s, e) =>
       {
           if (e.IsSuccess)
           {
               webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
           }
       };
   }
   
   private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
   {
       try
       {
           var json = e.WebMessageAsJson;
           var message = JsonSerializer.Deserialize<ZoomPanResponse>(json);
           
           if (message?.Type == "zoomPanState")
           {
               // Update active tab's state
               var activeTab = GetActiveTabItem();
               if (activeTab != null)
               {
                   activeTab.ZoomPercent = message.Zoom;
                   activeTab.PanOffsetX = message.PanX;
                   activeTab.PanOffsetY = message.PanY;
               }
           }
       }
       catch (JsonException ex)
       {
           Console.WriteLine($"Failed to parse web message: {ex.Message}");
       }
   }
   
   // Helper classes
   private class ZoomPanResponse
   {
       public string Type { get; set; }
       public double Zoom { get; set; }
       public double PanX { get; set; }
       public double PanY { get; set; }
   }
   ```

**Checkpoint**: Run application. Test CTRL+scroll (zoom in/out), CTRL+/- (zoom), CTRL+0 (reset), middle mouse drag (pan). Should see transforms applied in browser.

---

### Phase 4: Menu Integration (30 minutes)

**Goal**: Add zoom commands to Edit menu

**Steps**:

1. **Update MainWindow.xaml**:
   ```xml
   <Menu>
       <MenuItem Header="_Edit">
           <!-- ... existing items -->
           <Separator />
           <MenuItem Header="Zoom _In" 
                     InputGestureText="Ctrl++" 
                     Click="ZoomIn_Click" />
           <MenuItem Header="Zoom _Out" 
                     InputGestureText="Ctrl+-" 
                     Click="ZoomOut_Click" />
           <MenuItem Header="_Reset Zoom" 
                     InputGestureText="Ctrl+0" 
                     Click="ResetZoom_Click" />
       </MenuItem>
   </Menu>
   ```

2. **Add click handlers** (`MainWindow.xaml.cs`):
   ```csharp
   private async void ZoomIn_Click(object sender, RoutedEventArgs e)
   {
       await ZoomInAsync();
   }
   
   private async void ZoomOut_Click(object sender, RoutedEventArgs e)
   {
       await ZoomOutAsync();
   }
   
   private async void ResetZoom_Click(object sender, RoutedEventArgs e)
   {
       await ResetZoomAsync();
   }
   ```

**Checkpoint**: Run application. Open Edit menu. Click "Zoom In" → should zoom. Verify keyboard shortcuts shown in menu.

---

### Phase 5: Per-Tab State Persistence (45 minutes)

**Goal**: Restore zoom/pan state when switching tabs

**Steps**:

1. **Hook tab activation event** (in TabsView or TabService):
   ```csharp
   private void TabControl_SelectionChanged(object sender, SelectionChangedEventArgs e)
   {
       if (e.AddedItems.Count > 0)
       {
           var tab = e.AddedItems[0] as TabItem;
           if (tab != null)
           {
               RestoreTabZoomPanAsync(tab).ConfigureAwait(false);
           }
       }
   }
   
   private async Task RestoreTabZoomPanAsync(TabItem tab)
   {
       if (webView?.CoreWebView2 == null) return;
       
       var command = new 
       { 
           action = "restore", 
           zoom = tab.ZoomPercent, 
           panX = tab.PanOffsetX, 
           panY = tab.PanOffsetY 
       };
       
       var json = JsonSerializer.Serialize(command);
       await webView.CoreWebView2.PostWebMessageAsJson(json);
   }
   ```

2. **Initialize new tabs with default zoom**:
   ```csharp
   private TabItem CreateNewTab(string filePath)
   {
       var settings = _settingsService.Load();
       var tab = new TabItem(Guid.NewGuid(), Path.GetFileName(filePath), filePath)
       {
           // Initialize zoom from settings (or add to constructor)
       };
       
       return tab;
   }
   ```

**Checkpoint**: Open multiple tabs. Zoom each to different levels. Switch between tabs. Verify each maintains its zoom level.

---

### Phase 6: Settings UI (30 minutes)

**Goal**: Allow user to configure default zoom in settings

**Steps**:

1. **Add to settings UI** (`src/UI/Settings/SettingsWindow.xaml` or similar):
   ```xml
   <StackPanel>
       <!-- ... existing settings -->
       
       <GroupBox Header="Zoom Settings" Margin="0,10,0,0">
           <StackPanel Margin="10">
               <TextBlock Text="Default Zoom Level:" />
               <StackPanel Orientation="Horizontal" Margin="0,5,0,0">
                   <Slider x:Name="ZoomSlider" 
                           Minimum="10" 
                           Maximum="200" 
                           Width="200" 
                           Value="{Binding DefaultZoomPercent}" />
                   <TextBlock Text="{Binding ElementName=ZoomSlider, Path=Value, StringFormat={}{0:F0}%}" 
                              Margin="10,0,0,0" />
               </StackPanel>
               <TextBlock Text="Applies to newly opened tabs" 
                          FontStyle="Italic" 
                          FontSize="10" 
                          Margin="0,5,0,0" />
           </StackPanel>
       </GroupBox>
   </StackPanel>
   ```

2. **Bind to settings model** (update Settings ViewModel or use existing pattern)

**Checkpoint**: Open settings. Change default zoom. Open new tab. Verify new tab uses new default zoom.

---

### Phase 7: Polish and Edge Cases (1 hour)

**Goal**: Handle edge cases and improve UX

**Tasks**:

1. **Improve zoom center calculation** in `zoom-pan.js`:
   ```javascript
   zoom(delta, cursorX, cursorY) {
       const oldZoom = this.zoomPercent;
       const newZoom = Math.max(10, Math.min(1000, this.zoomPercent + delta));
       
       if (newZoom === oldZoom) {
           return; // Already at limit
       }
       
       // Calculate point under cursor before zoom
       const oldScale = oldZoom / 100.0;
       const newScale = newZoom / 100.0;
       
       // Adjust pan to keep cursor position fixed
       // Point in document coordinates: (cursorX - panX) / oldScale
       // After zoom: (cursorX - newPanX) / newScale should equal same point
       // Solve: newPanX = cursorX - ((cursorX - panX) * newScale / oldScale)
       
       this.panX = cursorX - ((cursorX - this.panX) * newScale / oldScale);
       this.panY = cursorY - ((cursorY - this.panY) * newScale / oldScale);
       
       this.zoomPercent = newZoom;
       this.applyTransform();
       this.sendStateUpdate();
   }
   ```

2. **Add pan boundary clamping** in `zoom-pan.js`:
   ```javascript
   pan(deltaX, deltaY) {
       this.panX += deltaX;
       this.panY += deltaY;
       
       this.clampPanBoundaries();
       
       this.applyTransform();
       this.sendStateUpdate();
   }
   
   clampPanBoundaries() {
       if (!this.contentElement) return;
       
       const scale = this.zoomPercent / 100.0;
       const contentRect = this.contentElement.getBoundingClientRect();
       const viewportWidth = window.innerWidth;
       const viewportHeight = window.innerHeight;
       
       const scaledWidth = contentRect.width * scale;
       const scaledHeight = contentRect.height * scale;
       
       const maxPanX = Math.max(0, scaledWidth - viewportWidth);
       const maxPanY = Math.max(0, scaledHeight - viewportHeight);
       
       this.panX = Math.max(0, Math.min(this.panX, maxPanX));
       this.panY = Math.max(0, Math.min(this.panY, maxPanY));
   }
   ```

3. **Reset pan when zoom returns to 100%**:
   ```javascript
   zoom(delta, cursorX, cursorY) {
       // ... existing code
       
       // Reset pan if at default zoom
       if (this.zoomPercent === 100.0) {
           this.panX = 0.0;
           this.panY = 0.0;
       }
       
       this.applyTransform();
       this.sendStateUpdate();
   }
   ```

4. **Add debouncing for rapid zoom events** (C#):
   ```csharp
   private System.Timers.Timer _zoomDebounceTimer;
   private (int delta, double x, double y)? _pendingZoom;
   
   private void OnPreviewMouseWheel(object sender, MouseWheelEventArgs e)
   {
       if (Keyboard.Modifiers == ModifierKeys.Control)
       {
           e.Handled = true;
           
           var position = e.GetPosition(webView);
           var delta = e.Delta > 0 ? 10 : -10;
           
           _pendingZoom = (delta, position.X, position.Y);
           
           if (_zoomDebounceTimer == null)
           {
               _zoomDebounceTimer = new System.Timers.Timer(100);
               _zoomDebounceTimer.Elapsed += async (s, args) =>
               {
                   _zoomDebounceTimer.Stop();
                   if (_pendingZoom.HasValue)
                   {
                       var zoom = _pendingZoom.Value;
                       await Dispatcher.InvokeAsync(() => 
                           SendZoomCommandAsync(zoom.delta, zoom.x, zoom.y));
                       _pendingZoom = null;
                   }
               };
           }
           
           _zoomDebounceTimer.Stop();
           _zoomDebounceTimer.Start();
       }
   }
   ```

**Checkpoint**: Test all edge cases:
- Zoom at min/max limits
- Pan at document boundaries
- Rapid scroll wheel (no jank)
- Window resize while zoomed
- Switch tabs while panning

---

### Phase 8: Testing (1 hour)

**Goal**: Write tests for core functionality

**Steps**:

1. **Unit tests** (`tests/unit/TabItemTests.cs`):
   ```csharp
   [TestClass]
   public class TabItemTests
   {
       [TestMethod]
       public void ZoomPercent_ClampsToMinimum()
       {
           var tab = new TabItem(Guid.NewGuid(), "Test");
           tab.ZoomPercent = 5.0;
           Assert.AreEqual(10.0, tab.ZoomPercent);
       }
       
       [TestMethod]
       public void ZoomPercent_ClampsToMaximum()
       {
           var tab = new TabItem(Guid.NewGuid(), "Test");
           tab.ZoomPercent = 1500.0;
           Assert.AreEqual(1000.0, tab.ZoomPercent);
       }
       
       [TestMethod]
       public void ResetZoomPan_ResetsToDefaults()
       {
           var tab = new TabItem(Guid.NewGuid(), "Test");
           tab.ZoomPercent = 150.0;
           tab.PanOffsetX = 50.0;
           tab.PanOffsetY = 30.0;
           
           tab.ResetZoomPan();
           
           Assert.AreEqual(100.0, tab.ZoomPercent);
           Assert.AreEqual(0.0, tab.PanOffsetX);
           Assert.AreEqual(0.0, tab.PanOffsetY);
       }
   }
   ```

2. **Integration test** (`tests/integration/ZoomPanIntegrationTests.cs`):
   ```csharp
   [TestClass]
   public class ZoomPanIntegrationTests
   {
       [TestMethod]
       public async Task ZoomCommand_UpdatesZoomLevel()
       {
           // Requires WebView2 automation
           // Use Selenium or similar for full integration tests
       }
   }
   ```

**Checkpoint**: Run tests. All should pass.

---

## Testing Checklist

Manual testing checklist before declaring feature complete:

- [ ] CTRL+scroll up zooms in
- [ ] CTRL+scroll down zooms out
- [ ] CTRL++ zooms in (keyboard)
- [ ] CTRL+- zooms out (keyboard)
- [ ] CTRL+0 resets zoom
- [ ] Edit menu "Zoom In" works
- [ ] Edit menu "Zoom Out" works
- [ ] Edit menu "Reset Zoom" works
- [ ] Middle mouse drag pans zoomed document
- [ ] Pan stops at document boundaries
- [ ] Cannot pan when zoom is 100%
- [ ] Zoom centers on mouse cursor (CTRL+scroll)
- [ ] Zoom centers on viewport center (CTRL+/-)
- [ ] Zoom clamped to 10% minimum
- [ ] Zoom clamped to 1000% maximum
- [ ] Each tab maintains independent zoom level
- [ ] Switching tabs restores correct zoom/pan
- [ ] New tabs use default zoom from settings
- [ ] Settings UI allows changing default zoom
- [ ] Window resize doesn't break zoom/pan
- [ ] No visual lag during zoom/pan operations
- [ ] Works with large markdown files (10MB+)
- [ ] Works with multiple tabs open (5+)

---

## Common Issues and Solutions

### Issue: WebView2 not receiving messages

**Solution**: Check that CoreWebView2 is initialized before sending messages. Add null check:
```csharp
if (webView?.CoreWebView2 == null)
{
    Console.WriteLine("WebView2 not ready");
    return;
}
```

### Issue: Zoom not centering on cursor

**Solution**: Verify coordinate transform math in `zoom()` function. Log cursor position and calculated pan offsets:
```javascript
console.log(`Cursor: (${cursorX}, ${cursorY}), Pan: (${this.panX}, ${this.panY})`);
```

### Issue: Pan boundaries incorrect

**Solution**: Check that `getBoundingClientRect()` is called on correct element and scale factor applied:
```javascript
const rect = this.contentElement.getBoundingClientRect();
console.log(`Content size: ${rect.width} x ${rect.height}, Scale: ${scale}`);
```

### Issue: Middle mouse button opens browser gestures

**Solution**: Ensure `e.Handled = true` in MouseDown handler to prevent default behavior.

### Issue: Rapid zoom causes performance issues

**Solution**: Implement debouncing (see Phase 7) to batch rapid scroll events.

---

## Next Steps

After completing this quickstart:

1. Review `tasks.md` (generated by `/speckit.tasks` command) for remaining work items
2. Consider adding smooth zoom animation with CSS transitions
3. Profile performance with very large documents
4. Consider adding zoom level indicator in status bar
5. Test with accessibility tools (screen readers)

---

## Estimated Time Breakdown

| Phase | Task | Time |
|-------|------|------|
| 1 | Data Model | 30 min |
| 2 | JavaScript Controller | 1 hour |
| 3 | WPF Event Handlers | 1.5 hours |
| 4 | Menu Integration | 30 min |
| 5 | Per-Tab State | 45 min |
| 6 | Settings UI | 30 min |
| 7 | Polish & Edge Cases | 1 hour |
| 8 | Testing | 1 hour |
| **Total** | | **6 hours 15 min** |

Add 30-60 minutes for debugging and refinement.

---

## References

- `research.md` - Technical decisions and best practices
- `data-model.md` - Data structures and state management
- `contracts/webview-api.md` - API contract specifications
- `spec.md` - Original feature specification
