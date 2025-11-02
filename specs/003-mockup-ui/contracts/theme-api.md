# Theme Management API Contract

**Feature**: 003-mockup-ui  
**Date**: October 28, 2025

## Service Interface: IThemeService

### Methods

#### `ApplyTheme(ThemeType theme)`
**Purpose**: Switch application theme  
**Parameters**:
- `theme`: enum (Light, Dark, System)
**Returns**: `Task<bool>` - Success status  
**Behavior**:
- Updates WPF ResourceDictionary for native controls
- Injects CSS custom properties into WebView2
- Persists selection to settings file
- Fires ThemeChanged event

#### `GetCurrentTheme()`
**Purpose**: Retrieve active theme  
**Returns**: `ThemeType` - Current theme enum  
**Behavior**: Returns cached theme value

#### `GetAvailableThemes()`
**Purpose**: List supported themes  
**Returns**: `IEnumerable<ThemeType>` - Available theme options  
**Behavior**: Returns static list of supported themes

#### `IsSystemThemeSupported()`
**Purpose**: Check OS theme detection capability  
**Returns**: `bool` - System theme support status  
**Behavior**: Checks Windows version and API availability

### Events

#### `ThemeChanged`
**Trigger**: When theme is successfully applied  
**Parameters**: `ThemeChangedEventArgs(ThemeType oldTheme, ThemeType newTheme)`  
**Usage**: UI components subscribe for theme update notifications

#### `ThemeLoadFailed`
**Trigger**: When theme application fails  
**Parameters**: `ThemeErrorEventArgs(ThemeType attempted, Exception error)`  
**Usage**: Error handling and fallback theme application

## Service Interface: IUIStateService

### Methods

#### `SaveUIState(UIState state)`
**Purpose**: Persist UI layout state  
**Parameters**:
- `state`: UIState object with layout properties
**Returns**: `Task<bool>` - Save success status  
**Behavior**: Serializes state to JSON settings file

#### `LoadUIState()`
**Purpose**: Restore UI layout state  
**Returns**: `Task<UIState>` - Restored state or defaults  
**Behavior**: Deserializes from settings file with fallback to defaults

#### `ResetToDefaults()`
**Purpose**: Clear saved state and return to defaults  
**Returns**: `Task<UIState>` - Default state object  
**Behavior**: Deletes settings file and returns factory defaults

### Properties

#### `CurrentState`
**Type**: `UIState`  
**Access**: Read/Write  
**Behavior**: In-memory state cache with automatic persistence on changes

## Service Interface: IAnimationService

### Methods

#### `CreateThemeTransition()`
**Purpose**: Generate theme switch animation  
**Returns**: `Storyboard` - WPF animation sequence  
**Behavior**: Creates appropriate animation based on settings

#### `CreateTabTransition(TabTransitionType type)`
**Purpose**: Generate tab management animations  
**Parameters**:
- `type`: enum (Open, Close, Switch, Scroll)
**Returns**: `Storyboard` - Tab animation sequence  
**Behavior**: Returns animation or empty storyboard if disabled

#### `SetPerformanceMode(PerformanceMode mode)`
**Purpose**: Adjust animation complexity  
**Parameters**:
- `mode`: enum (Full, Reduced, Disabled)
**Behavior**: Updates global animation settings

## Error Handling

### Theme Service Errors
- **ThemeNotSupported**: Requested theme unavailable
- **SettingsCorrupted**: Settings file unreadable, fallback to defaults
- **SystemThemeUnavailable**: OS theme detection failed

### UI State Errors  
- **StatePersistenceFailed**: Unable to save state to disk
- **StateRestoreFailed**: Unable to load saved state, use defaults
- **InvalidStateData**: Corrupted state data, reset to defaults

### Animation Errors
- **AnimationResourceNotFound**: Missing animation templates
- **PerformanceThresholdExceeded**: Automatic reduction to simpler animations

## Integration Points

### With Existing Services
- **SettingsService**: Enhanced with theme and UI state persistence
- **FileService**: No changes - existing file operations unchanged
- **MarkdownService**: Enhanced CSS injection for theme support

### With WPF Components
- **MainWindow**: Theme application and window state management
- **UserControls**: Theme change event subscription
- **ResourceDictionaries**: Dynamic theme resource switching

### With WebView2
- **JavaScript Bridge**: Theme property injection
- **CSS Integration**: Dynamic custom property updates
- **Content Rendering**: Theme-aware markdown styling