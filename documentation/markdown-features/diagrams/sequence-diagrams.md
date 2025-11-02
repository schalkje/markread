# Sequence Diagrams

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Diagrams](./) → Sequence Diagrams

Sequence diagrams show interactions between components over time.

## Basic Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant App
    participant FileSystem
    
    User->>App: Open file
    App->>FileSystem: Read file
    FileSystem-->>App: File content
    App-->>User: Display markdown
```

## Document Loading Flow

```mermaid
sequenceDiagram
    actor User
    participant MainWindow
    participant TabService
    participant MarkdownService
    participant WebView
    
    User->>MainWindow: Click Open
    MainWindow->>TabService: CreateTab(filePath)
    TabService->>MarkdownService: ParseMarkdown(content)
    MarkdownService-->>TabService: HTML output
    TabService->>WebView: LoadHtml(html)
    WebView-->>User: Rendered markdown
```

## Search Operation

```mermaid
sequenceDiagram
    participant UI
    participant SearchService
    participant FileSystem
    participant Results
    
    UI->>SearchService: Search("keyword")
    activate SearchService
    
    SearchService->>FileSystem: Get all .md files
    FileSystem-->>SearchService: File list
    
    loop For each file
        SearchService->>FileSystem: Read file
        FileSystem-->>SearchService: Content
        SearchService->>SearchService: Search content
    end
    
    SearchService-->>Results: Search results
    deactivate SearchService
    Results-->>UI: Display results
```

## Theme Switching

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant ThemeManager
    participant Settings
    participant WebView
    
    User->>UI: Select dark theme
    UI->>ThemeManager: SetTheme("dark")
    ThemeManager->>Settings: SaveTheme("dark")
    Settings-->>ThemeManager: Saved
    ThemeManager->>WebView: ApplyTheme("dark")
    ThemeManager->>UI: UpdateUI("dark")
    UI-->>User: Theme applied
```

## Error Handling

```mermaid
sequenceDiagram
    participant User
    participant App
    participant FileService
    participant ErrorHandler
    
    User->>App: Open file
    App->>FileService: ReadFile(path)
    
    alt File exists
        FileService-->>App: Content
        App-->>User: Display content
    else File not found
        FileService-->>ErrorHandler: FileNotFoundException
        ErrorHandler-->>User: Show error message
    else Access denied
        FileService-->>ErrorHandler: UnauthorizedAccessException
        ErrorHandler-->>User: Show permission error
    end
```

## Navigation History

```mermaid
sequenceDiagram
    participant User
    participant TabView
    participant HistoryService
    participant NavigationService
    
    User->>TabView: Click link
    TabView->>HistoryService: PushHistory(currentPage)
    HistoryService-->>TabView: Saved
    TabView->>NavigationService: Navigate(newPage)
    NavigationService-->>User: Show new page
    
    Note over User,NavigationService: Later...
    
    User->>TabView: Click Back
    TabView->>HistoryService: PopHistory()
    HistoryService-->>TabView: previousPage
    TabView->>NavigationService: Navigate(previousPage)
    NavigationService-->>User: Show previous page
```

## Syntax Elements

### Participants

```mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob
    actor U as User
```

### Message Types

```mermaid
sequenceDiagram
    A->>B: Solid arrow (request)
    A-->>B: Dashed arrow (response)
    A-)B: Async message
    A-xB: Lost message
```

### Activation/Deactivation

```mermaid
sequenceDiagram
    A->>B: Request
    activate B
    B-->>A: Response
    deactivate B
```

### Notes

```mermaid
sequenceDiagram
    A->>B: Message
    Note left of A: Note on left
    Note right of B: Note on right
    Note over A,B: Note spanning both
```

### Loops and Conditionals

```mermaid
sequenceDiagram
    A->>B: Start
    
    loop Every minute
        B->>B: Check status
    end
    
    alt Success
        B-->>A: OK
    else Failure
        B-->>A: Error
    end
```

## See Also

- [Flowcharts](flowcharts.md)
- [Class Diagrams](class-diagrams.md)
- [Mermaid Overview](mermaid-overview.md)
- [Architecture Overview](../../developer/architecture/overview.md)
