# Class Diagrams

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Diagrams](./) → Class Diagrams

Class diagrams show object-oriented structure and relationships.

## Basic Class Diagram

```mermaid
classDiagram
    class Document {
        +string Title
        +string Content
        +DateTime CreatedAt
        +Load()
        +Save()
    }
```

## MarkRead Service Architecture

```mermaid
classDiagram
    class IMarkdownService {
        <<interface>>
        +ParseMarkdown(content) string
        +ParseMarkdownAsync(content) Task~string~
    }
    
    class MarkdownService {
        -ILogger logger
        -Pipeline pipeline
        +ParseMarkdown(content) string
        +ParseMarkdownAsync(content) Task~string~
    }
    
    class ILinkResolver {
        <<interface>>
        +ResolveLink(path, basePath) string
    }
    
    class LinkResolver {
        -string rootPath
        +ResolveLink(path, basePath) string
    }
    
    IMarkdownService <|.. MarkdownService : implements
    ILinkResolver <|.. LinkResolver : implements
    MarkdownService --> LinkResolver : uses
```

## Tab Management

```mermaid
classDiagram
    class TabService {
        -ObservableCollection~TabInfo~ tabs
        -int activeTabIndex
        +CreateTab(filePath) TabInfo
        +CloseTab(tabId) void
        +SwitchTab(index) void
        +PinTab(tabId) void
    }
    
    class TabInfo {
        +Guid Id
        +string Title
        +string FilePath
        +bool IsPinned
        +DateTime LastAccessed
    }
    
    class HistoryService {
        -Stack~string~ backStack
        -Stack~string~ forwardStack
        +CanGoBack() bool
        +CanGoForward() bool
        +GoBack() string
        +GoForward() string
        +Push(path) void
    }
    
    TabService "1" --> "*" TabInfo : manages
    TabInfo "1" --> "1" HistoryService : has
```

## Relationships

### Inheritance

```mermaid
classDiagram
    class BaseService {
        #ILogger logger
        +Initialize()
    }
    
    class MarkdownService {
        +ParseMarkdown()
    }
    
    class SearchService {
        +Search()
    }
    
    BaseService <|-- MarkdownService
    BaseService <|-- SearchService
```

### Composition

```mermaid
classDiagram
    class MainWindow {
        -TabView tabView
        -Sidebar sidebar
    }
    
    class TabView {
        -List~TabInfo~ tabs
    }
    
    class Sidebar {
        -TreeView fileTree
    }
    
    MainWindow *-- TabView : contains
    MainWindow *-- Sidebar : contains
```

### Aggregation

```mermaid
classDiagram
    class Workspace {
        -List~Document~ documents
    }
    
    class Document {
        +string Path
    }
    
    Workspace o-- Document : has
```

### Association

```mermaid
classDiagram
    class User {
    }
    
    class Document {
    }
    
    User --> Document : views
```

## Visibility Modifiers

```mermaid
classDiagram
    class Example {
        +public field
        -private field
        #protected field
        ~package field
        +publicMethod()
        -privateMethod()
        #protectedMethod()
        ~packageMethod()
    }
```

## Abstract Classes and Methods

```mermaid
classDiagram
    class AbstractRenderer {
        <<abstract>>
        +Render()*
        +Initialize()
    }
    
    class HtmlRenderer {
        +Render()
    }
    
    AbstractRenderer <|-- HtmlRenderer
```

## Generic Classes

```mermaid
classDiagram
    class Repository~T~ {
        -List~T~ items
        +Add(item T)
        +Get(id) T
        +GetAll() List~T~
    }
    
    class DocumentRepository {
    }
    
    Repository~T~ <|-- DocumentRepository
```

## Complete Example

```mermaid
classDiagram
    class INavigationService {
        <<interface>>
        +Navigate(path)*
        +CanNavigate(path)* bool
    }
    
    class NavigationService {
        -ILinkResolver linkResolver
        -IHistoryService history
        +Navigate(path)
        +CanNavigate(path) bool
        -ValidatePath(path) bool
    }
    
    class ILinkResolver {
        <<interface>>
        +ResolveLink(path)* string
    }
    
    class LinkResolver {
        -string basePath
        +ResolveLink(path) string
    }
    
    class IHistoryService {
        <<interface>>
        +Push(item)*
        +Pop()* string
    }
    
    class HistoryService {
        -Stack~string~ items
        +Push(item)
        +Pop() string
        +Clear()
    }
    
    INavigationService <|.. NavigationService
    ILinkResolver <|.. LinkResolver
    IHistoryService <|.. HistoryService
    NavigationService --> LinkResolver
    NavigationService --> HistoryService
```

## See Also

- [Sequence Diagrams](sequence-diagrams.md)
- [Flowcharts](flowcharts.md)
- [Architecture Overview](../../developer/architecture/overview.md)
