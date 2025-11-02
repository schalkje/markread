tasks# Quickstart: Mockup UI Implementation

**Feature**: 003-mockup-ui  
**Date**: October 28, 2025

## Overview

This guide provides a rapid implementation path for the mockup UI enhancement, focusing on high-impact visual improvements with minimal code changes.

## Implementation Priority

### Phase 1: Core Theme System (2-3 days)
**Impact**: High - Immediate visual transformation
**Risk**: Low - Self-contained changes

1. **Theme Infrastructure**
   - Create `ThemeManager.cs` with theme switching logic
   - Add theme settings persistence to `SettingsService.cs`
   - Create light/dark color scheme definitions

2. **WPF Theme Integration**
   - Update `App.xaml` with theme ResourceDictionaries
   - Modify `MainWindow.xaml` with themed control templates
   - Add theme toggle button to header

3. **WebView2 Theme Bridge**
   - Create CSS custom properties for theme variables
   - Add JavaScript theme injection functionality
   - Update markdown rendering styles

### Phase 2: Enhanced Layout (2-3 days)
**Impact**: High - Matches mockup structure
**Risk**: Medium - Layout changes affect existing components

1. **Header Redesign**
   - Implement unified navigation bar in `MainWindow.xaml`
   - Add window controls, navigation buttons, theme toggle
   - Update layout with proper spacing and typography

2. **Tab Enhancement**
   - Update `TabsView.xaml` with scrollable container
   - Add hover states and close button animations
   - Implement active tab indicators

3. **Sidebar Improvements**
   - Enhance `SidebarView.xaml` with improved file tree styling
   - Add folder/file icons and visual hierarchy
   - Implement responsive collapse behavior

### Phase 3: Polish & Performance (1-2 days)
**Impact**: Medium - Professional finishing touches
**Risk**: Low - Non-breaking enhancements

1. **Animation System**
   - Add smooth transitions for theme switching
   - Implement tab and sidebar animations
   - Add performance monitoring and complexity reduction

2. **Responsive Design**
   - Add media query handling for sidebar auto-collapse
   - Implement window resize responsiveness
   - Test and refine breakpoint behavior

## Quick Implementation Steps

### Step 1: Theme Foundation (30 minutes)

1. **Create Theme Enum**
```csharp
public enum ThemeType { Light, Dark, System }
```

2. **Add Theme Settings**
```csharp
public class ThemeSettings
{
    public ThemeType CurrentTheme { get; set; } = ThemeType.System;
    public bool FollowSystemTheme { get; set; } = true;
}
```

3. **Basic Theme Manager**
```csharp
public class ThemeManager : INotifyPropertyChanged
{
    public void ApplyTheme(ThemeType theme) { /* Implementation */ }
    public ThemeType GetCurrentTheme() { /* Implementation */ }
}
```

### Step 2: CSS Theme Variables (15 minutes)

Add to WebView2 content:
```css
:root {
  --bg-primary: #ffffff;
  --fg-primary: #000000;
  --accent-color: #0066cc;
  /* Additional theme variables */
}

[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --fg-primary: #ffffff;
  --accent-color: #66b3ff;
}
```

### Step 3: WPF Resource Integration (20 minutes)

Update `App.xaml`:
```xml
<Application.Resources>
    <ResourceDictionary>
        <ResourceDictionary.MergedDictionaries>
            <ResourceDictionary Source="Themes/LightTheme.xaml"/>
            <ResourceDictionary Source="Themes/DarkTheme.xaml"/>
        </ResourceDictionary.MergedDictionaries>
    </ResourceDictionary>
</Application.Resources>
```

## Testing Strategy

### Visual Validation
1. **Theme Switching**: Verify instant theme changes without flicker
2. **Mockup Comparison**: Side-by-side validation with Figma design
3. **Responsive Behavior**: Test sidebar collapse at 768px breakpoint
4. **Performance**: Measure theme switch time (<100ms target)

### Functional Testing
1. **Existing Features**: Verify no regression in file operations
2. **Settings Persistence**: Confirm theme preference saves correctly
3. **Error Handling**: Test theme fallback when settings corrupted
4. **Accessibility**: Verify color contrast ratios meet standards

## Common Issues & Solutions

### Issue: Theme Not Applying to WebView2
**Solution**: Ensure JavaScript bridge is established before theme injection

### Issue: WPF Controls Not Updating
**Solution**: Verify ResourceDictionary merge order and key naming

### Issue: Animation Performance
**Solution**: Use CSS `will-change` property and WPF `Timeline.DesiredFrameRate`

### Issue: Settings File Corruption
**Solution**: Implement automatic backup and restoration with factory defaults

## Integration Points

### Existing Code Modifications
- **Minimal Changes**: Preserve existing service interfaces
- **Backward Compatibility**: Maintain current configuration format
- **Error Handling**: Extend existing error management patterns

### Testing Integration
- **Unit Tests**: Theme manager logic and settings persistence
- **Integration Tests**: Visual theme application and UI state
- **Performance Tests**: Animation frame rates and theme switch timing

## Success Criteria Validation

- [ ] Visual design matches mockup with 95% accuracy
- [ ] Theme switching completes in <100ms
- [ ] No functionality regression detected
- [ ] Sidebar auto-collapses below 768px width
- [ ] All animations maintain 60fps performance
- [ ] Settings persist correctly across application restarts

## Next Steps After Quickstart

1. **Detailed Implementation**: Use `/speckit.tasks` for comprehensive task breakdown
2. **Advanced Features**: Enhanced animations and micro-interactions
3. **User Testing**: Gather feedback on visual improvements
4. **Performance Optimization**: Profile and optimize rendering performance