# Flowcharts

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Diagrams](./) → Flowcharts

Flowcharts visualize processes, decisions, and workflows using Mermaid.

## Basic Flowchart

````markdown
```mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
```
````

```mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
```

## Flow Directions

- `TD` or `TB` - Top to bottom
- `BT` - Bottom to top
- `LR` - Left to right
- `RL` - Right to left

```mermaid
graph LR
    A[Start] --> B[Process] --> C[End]
```

## Node Shapes

```mermaid
graph TD
    A[Rectangle]
    B(Rounded)
    C([Stadium])
    D[[Subroutine]]
    E[(Database)]
    F((Circle))
    G>Flag]
    H{Diamond}
    I{{Hexagon}}
```

## Real-World Example

````markdown
```mermaid
graph TD
    Start[User Opens Folder] --> Check{README.md exists?}
    Check -->|Yes| Display[Display README]
    Check -->|No| FolderView[Show Folder View]
    Display --> Sidebar[Open Sidebar]
    FolderView --> Sidebar
    Sidebar --> UserAction{User Action}
    UserAction -->|Click Link| Navigate[Navigate to File]
    UserAction -->|Search| SearchPanel[Open Search]
    UserAction -->|New Tab| NewTab[Create New Tab]
    Navigate --> Render[Render Markdown]
    Render --> UserAction
```
````

```mermaid
graph TD
    Start[User Opens Folder] --> Check{README.md exists?}
    Check -->|Yes| Display[Display README]
    Check -->|No| FolderView[Show Folder View]
    Display --> Sidebar[Open Sidebar]
    FolderView --> Sidebar
    Sidebar --> UserAction{User Action}
    UserAction -->|Click Link| Navigate[Navigate to File]
    UserAction -->|Search| SearchPanel[Open Search]
    UserAction -->|New Tab| NewTab[Create New Tab]
    Navigate --> Render[Render Markdown]
    Render --> UserAction
```

## See Also

- [Sequence Diagrams](sequence-diagrams.md)
- [Class Diagrams](class-diagrams.md)
- [Mermaid Overview](mermaid-overview.md)
