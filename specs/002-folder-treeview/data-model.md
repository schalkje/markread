# Data Model: Folder Structure Treeview

**Feature**: 002-folder-treeview  
**Date**: October 28, 2025  
**Purpose**: Define data structures and relationships for treeview navigation

## Core Entities

### TreeNode

Represents a single node (folder or file) in the hierarchical tree structure.

**Properties**:

- `Name` (string): Display name of the file or folder (without full path)
- `FullPath` (string): Absolute file system path
- `Type` (NodeType enum): Either Folder or File
- `Parent` (TreeNode?): Reference to parent node (null for root)
- `Children` (ObservableCollection<TreeNode>): Child nodes (files and subfolders)
- `IsExpanded` (bool): Whether the folder node is currently expanded in the UI
- `IsSelected` (bool): Whether this node is currently selected
- `IsVisible` (bool): Whether this node passes current filter criteria (for type-ahead search)

**Business Rules**:

- Name must not be empty
- FullPath must be absolute and exist on file system (validated on creation)
- Type.Folder nodes may have children; Type.File nodes must have empty children collection
- Parent is null only for the root node
- IsExpanded is always false for File nodes
- Folders without markdown files (directly or in descendants) are excluded from tree

**State Transitions**:

- `Collapsed → Expanded`: User clicks expand button or presses right arrow
- `Expanded → Collapsed`: User clicks collapse button or presses left arrow/Escape
- `Unselected → Selected`: User clicks node or navigates with arrow keys
- `Visible → Hidden`: Type-ahead filter no longer matches node name
- `Hidden → Visible`: Type-ahead filter cleared or modified to match

### TreeViewSettings

Represents global and per-folder treeview preferences.

**Properties**:

- `DefaultVisible` (bool): Global preference for treeview visibility in new folders (default: true)
- `PerFolderSettings` (Dictionary<string, FolderTreeSettings>): Per-folder overrides keyed by folder path

**Business Rules**:

- DefaultVisible applies only to folders not in PerFolderSettings dictionary
- Folder paths in dictionary keys must be absolute and normalized (consistent casing on Windows)
- Settings persist across application restarts
- Invalid folder paths in dictionary are ignored (cleaned up on load)

**Persistence**:

- Serialized to JSON via System.Text.Json
- Stored in user's AppData folder (same location as other MarkRead settings)
- Loaded on application startup
- Saved immediately when changed (no batching to prevent data loss)

### FolderTreeSettings

Represents treeview settings for a specific folder.

**Properties**:

- `IsVisible` (bool): Whether treeview is visible for this folder
- `LastViewedFile` (string?): Full path to the last markdown file viewed in this folder (nullable)

**Business Rules**:

- IsVisible overrides global DefaultVisible setting when present
- LastViewedFile must be a markdown file within the folder if non-null
- If LastViewedFile no longer exists, it's ignored and removed from settings

**Lifecycle**:

- Created when user first toggles treeview visibility or views a file in a new folder
- Updated when user toggles visibility or navigates to a different file
- Persisted immediately via TreeViewSettings parent object
- Removed if folder no longer exists (cleanup on next app start)

## Supporting Types

### NodeType (Enum)

```csharp
public enum NodeType
{
    Folder,
    File
}
```

### TreeBuildProgress

Represents progress during async tree building.

**Properties**:

- `TotalFiles` (int): Total markdown files discovered so far
- `ProcessedFolders` (int): Number of folders scanned
- `CurrentPath` (string): Path currently being processed (for UI feedback)

## Relationships

```text
TreeNode (root)
  ├─ Children (0..*)
  │    ├─ TreeNode (folder)
  │    │    └─ Children (0..*)
  │    └─ TreeNode (file)
  └─ Parent (0..1)

TreeViewSettings
  └─ PerFolderSettings (0..*)
       └─ FolderTreeSettings
```

## Data Flow

### Tree Construction Flow

```text
1. User opens folder
2. TreeViewService.BuildTreeAsync(rootPath) called
3. Service recursively scans directories
   - For each directory:
     a. Check if has markdown files (recursive)
     b. If no, skip entirely (FR-012)
     c. If yes, create Folder TreeNode
     d. Get markdown files directly in folder → create File TreeNodes
     e. Get subdirectories → recurse
4. Sort all children: folders first, then alphabetical (FR-017)
5. Return root TreeNode
6. ViewModel binds to root.Children
7. UI renders TreeView with HierarchicalDataTemplate
```

### File Selection Flow

```text
1. User opens folder
2. TreeViewService.DetermineInitialFileAsync(folderPath) called
3. Check HistoryService for last viewed file (FR-018)
   - If exists and valid → return path
4. Check for README.md in root (FR-019)
   - If exists → return path
5. Get first markdown file alphabetically → return path
6. ViewModel triggers file opened event
7. Main window displays markdown content
```

### File System Change Flow

```text
1. FileSystemWatcher detects change (Created/Deleted/Renamed)
2. Event debounced for 500ms (batch rapid changes)
3. TreeViewService.HandleFileSystemChange(changeType, path) called
4. Determine affected TreeNode(s)
5. Update tree structure:
   - Created: Add new node in sorted position
   - Deleted: Remove node and parent folders if now empty
   - Renamed: Update node name, re-sort siblings
6. ViewModel raises PropertyChanged
7. UI updates TreeView
```

### Preference Persistence Flow

```text
1. User toggles treeview visibility
2. ViewModel updates IsVisible property
3. TreeViewService.SaveVisibilityPreference(folderPath, isVisible) called
4. Service updates TreeViewSettings.PerFolderSettings[folderPath]
5. SettingsService.Save(treeViewSettings) persists to JSON
```

## Validation Rules

### Path Validation

- All paths must be absolute
- Paths must be normalized (consistent separators, resolved relative segments)
- Paths must exist on file system when creating nodes
- Symbolic links followed at most once (prevent loops)

### Tree Integrity

- Every non-root node must have a parent
- Parent.Children must contain child reference (bidirectional consistency)
- No cycles in tree (parent chain must terminate at root)
- Maximum depth of 50 levels (prevents stack overflow from pathological structures)

### Settings Integrity

- Folder paths in PerFolderSettings must be valid directory paths
- LastViewedFile must be within its associated folder
- LastViewedFile must be a markdown file (*.md or *.markdown)
- Settings cleaned up on load to remove orphaned entries

## Performance Considerations

### Memory Footprint

- TreeNode objects are lightweight (< 200 bytes each)
- Estimated memory for 1000 files: ~200KB for tree structure
- ObservableCollection adds overhead but enables efficient UI binding
- Large trees (10k+ nodes) may benefit from lazy loading children on expand

### Query Optimization

- File system calls are async to prevent UI blocking
- Directory.EnumerateFiles used instead of GetFiles (lazy enumeration)
- Recursive scanning uses stack (not heap) for better cache locality
- Type-ahead search uses simple string.Contains (O(n) scan acceptable for typical tree sizes)

### Update Efficiency

- File system changes update only affected subtree (not full rebuild)
- Sort operations are stable (don't re-sort unchanged siblings)
- UI virtualization limits rendered nodes (only visible items in DOM)
- Debouncing prevents redundant updates during burst operations

## Example Data

### Sample TreeNode Structure

```json
{
  "Name": "documentation",
  "FullPath": "C:\\Projects\\MyApp\\documentation",
  "Type": "Folder",
  "Parent": null,
  "IsExpanded": false,
  "IsSelected": false,
  "IsVisible": true,
  "Children": [
    {
      "Name": "guides",
      "FullPath": "C:\\Projects\\MyApp\\documentation\\guides",
      "Type": "Folder",
      "IsExpanded": false,
      "Children": [
        {
          "Name": "getting-started.md",
          "FullPath": "C:\\Projects\\MyApp\\documentation\\guides\\getting-started.md",
          "Type": "File",
          "IsExpanded": false,
          "Children": []
        }
      ]
    },
    {
      "Name": "README.md",
      "FullPath": "C:\\Projects\\MyApp\\documentation\\README.md",
      "Type": "File",
      "IsExpanded": false,
      "Children": []
    }
  ]
}
```

### Sample TreeViewSettings

```json
{
  "DefaultVisible": true,
  "PerFolderSettings": {
    "C:\\Projects\\MyApp\\documentation": {
      "IsVisible": false,
      "LastViewedFile": "C:\\Projects\\MyApp\\documentation\\README.md"
    },
    "C:\\Projects\\OtherApp\\docs": {
      "IsVisible": true,
      "LastViewedFile": "C:\\Projects\\OtherApp\\docs\\guides\\installation.md"
    }
  }
}
```
