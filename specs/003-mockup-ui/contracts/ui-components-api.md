# UI Component API Contract

**Feature**: 003-mockup-ui  
**Date**: October 28, 2025

## Service Interface: ITabService

### Methods

#### `OpenTab(FileInfo file)`
**Purpose**: Open file in new tab  
**Parameters**:
- `file`: FileInfo object with file details
**Returns**: `Task<TabItem>` - Created tab instance  
**Behavior**:
- Creates new tab with enhanced styling
- Adds to tab collection with scroll management
- Fires TabOpened event

#### `CloseTab(string tabId)`
**Purpose**: Close specified tab  
**Parameters**:
- `tabId`: Unique tab identifier
**Returns**: `Task<bool>` - Close success status  
**Behavior**:
- Removes tab with close animation
- Updates active tab if needed
- Fires TabClosed event

#### `SwitchToTab(string tabId)`
**Purpose**: Activate specified tab  
**Parameters**:
- `tabId`: Target tab identifier
**Returns**: `Task<bool>` - Switch success status  
**Behavior**:
- Deactivates current tab
- Activates target tab with transition
- Updates UI state persistence

#### `GetTabScrollPosition()`
**Purpose**: Get current tab scroll offset  
**Returns**: `double` - Horizontal scroll position  
**Behavior**: Returns current scroll offset for restoration

#### `ScrollToTab(string tabId)`
**Purpose**: Scroll tab bar to show specific tab  
**Parameters**:
- `tabId`: Target tab identifier
**Returns**: `Task` - Completion task  
**Behavior**: Smooth scroll animation to ensure tab visibility

### Events

#### `TabOpened`
**Trigger**: New tab successfully created  
**Parameters**: `TabEventArgs(TabItem tab)`

#### `TabClosed`
**Trigger**: Tab removed from collection  
**Parameters**: `TabEventArgs(TabItem tab)`

#### `TabActivated`
**Trigger**: Tab becomes active  
**Parameters**: `TabEventArgs(TabItem tab)`

## Service Interface: ISidebarService

### Methods

#### `ToggleSidebar()`
**Purpose**: Toggle sidebar visibility  
**Returns**: `Task<bool>` - New visibility state  
**Behavior**:
- Animates sidebar collapse/expand
- Updates responsive layout
- Persists state change

#### `SetSidebarWidth(double width)`
**Purpose**: Adjust sidebar width  
**Parameters**:
- `width`: New width in pixels (200-500)
**Returns**: `Task<bool>` - Resize success status  
**Behavior**:
- Validates width constraints
- Updates layout with animation
- Persists new width setting

#### `RefreshFileTree()`
**Purpose**: Reload file tree content  
**Returns**: `Task` - Completion task  
**Behavior**: Updates file tree with enhanced styling

#### `SelectFile(string filePath)`
**Purpose**: Highlight file in tree  
**Parameters**:
- `filePath`: Target file path
**Returns**: `Task<bool>` - Selection success status  
**Behavior**:
- Expands parent folders as needed
- Highlights selected file
- Scrolls to ensure visibility

### Properties

#### `IsCollapsed`
**Type**: `bool`  
**Access**: Read-only  
**Behavior**: Current sidebar visibility state

#### `CurrentWidth`
**Type**: `double`  
**Access**: Read-only  
**Behavior**: Current sidebar width in pixels

## Service Interface: INavigationService

### Methods

#### `NavigateBack()`
**Purpose**: Navigate to previous file  
**Returns**: `Task<bool>` - Navigation success status  
**Behavior**:
- Updates navigation history
- Opens previous file
- Updates navigation button states

#### `NavigateForward()`
**Purpose**: Navigate to next file  
**Returns**: `Task<bool>` - Navigation success status  
**Behavior**:
- Updates navigation history
- Opens next file
- Updates navigation button states

#### `CanNavigateBack()`
**Purpose**: Check back navigation availability  
**Returns**: `bool` - Back navigation possible  

#### `CanNavigateForward()`
**Purpose**: Check forward navigation availability  
**Returns**: `bool` - Forward navigation possible

#### `ShowHistory()`
**Purpose**: Display navigation history menu  
**Returns**: `Task` - Completion task  
**Behavior**: Shows dropdown with recent file history

### Events

#### `NavigationStateChanged`
**Trigger**: Navigation history state changes  
**Parameters**: `NavigationEventArgs(bool canGoBack, bool canGoForward)`

## Service Interface: ISearchService

### Methods

#### `ShowInPageSearch()`
**Purpose**: Display in-page search bar  
**Returns**: `Task` - Completion task  
**Behavior**:
- Shows search bar with enhanced styling
- Focuses search input
- Prepares for search operations

#### `HideInPageSearch()`
**Purpose**: Hide in-page search bar  
**Returns**: `Task` - Completion task  
**Behavior**: Hides search bar with animation

#### `ShowGlobalSearch()`
**Purpose**: Display global search panel  
**Returns**: `Task` - Completion task  
**Behavior**:
- Opens search panel with enhanced design
- Focuses search input
- Initializes search scope

#### `HideGlobalSearch()`
**Purpose**: Hide global search panel  
**Returns**: `Task` - Completion task  
**Behavior**: Closes search panel with animation

### Properties

#### `InPageSearchVisible`
**Type**: `bool`  
**Access**: Read-only  
**Behavior**: Current in-page search visibility

#### `GlobalSearchVisible`
**Type**: `bool`  
**Access**: Read-only  
**Behavior**: Current global search visibility

## Component Events

### Global UI Events

#### `WindowResized`
**Trigger**: Application window size changes  
**Parameters**: `WindowSizeEventArgs(Size oldSize, Size newSize)`  
**Usage**: Responsive layout adjustments

#### `ResponsiveBreakpointChanged`
**Trigger**: UI crosses responsive breakpoint (768px)  
**Parameters**: `BreakpointEventArgs(BreakpointType breakpoint)`  
**Usage**: Sidebar auto-collapse behavior

## Error Handling

### Tab Management Errors
- **TabLimitExceeded**: Maximum tabs reached (implementation-defined limit)
- **TabNotFound**: Specified tab ID doesn't exist
- **FileAccessDenied**: Cannot open file in tab

### Sidebar Errors
- **SidebarWidthInvalid**: Width outside allowed range
- **FileTreeRefreshFailed**: Unable to reload file system
- **FileSelectionFailed**: Cannot highlight specified file

### Navigation Errors
- **NavigationHistoryCorrupted**: History state invalid
- **FileNavigationFailed**: Cannot navigate to file
- **HistoryDisplayFailed**: Cannot show history menu