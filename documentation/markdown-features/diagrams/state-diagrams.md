# State Diagrams

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Diagrams](./) → State Diagrams

State diagrams show state transitions in a system.

## Basic State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading : Open file
    Loading --> Rendering : Content loaded
    Rendering --> Ready : Render complete
    Ready --> [*]
```

## Document Lifecycle

```mermaid
stateDiagram-v2
    [*] --> NotLoaded
    
    NotLoaded --> Loading : User opens file
    Loading --> Loaded : File read success
    Loading --> Error : File read failed
    
    Loaded --> Rendering : Parse markdown
    Rendering --> Displayed : Render complete
    Rendering --> Error : Render failed
    
    Displayed --> Reloading : File changed
    Reloading --> Rendering : Content refreshed
    
    Error --> NotLoaded : User closes
    Displayed --> [*] : User closes
```

## Search States

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> Searching : User enters query
    Searching --> HasResults : Results found
    Searching --> NoResults : No matches
    Searching --> Error : Search failed
    
    HasResults --> Idle : Clear search
    NoResults --> Idle : Clear search
    Error --> Idle : Reset
    
    HasResults --> Searching : Modify query
    NoResults --> Searching : Modify query
```

## Theme State

```mermaid
stateDiagram-v2
    state "Theme Mode" as theme {
        [*] --> Auto
        Auto --> Light : System is light
        Auto --> Dark : System is dark
        Light --> Auto : Set to auto
        Dark --> Auto : Set to auto
        Light --> Dark : User switches
        Dark --> Light : User switches
    }
```

## Tab States

```mermaid
stateDiagram-v2
    [*] --> Inactive
    
    Inactive --> Active : User selects tab
    Active --> Inactive : User selects other tab
    
    state Active {
        [*] --> Viewing
        Viewing --> Searching : Open search
        Searching --> Viewing : Close search
    }
    
    Inactive --> [*] : User closes tab
    Active --> [*] : User closes tab
```

## File Watcher States

```mermaid
stateDiagram-v2
    [*] --> Stopped
    
    Stopped --> Watching : Start watching
    Watching --> Stopped : Stop watching
    
    state Watching {
        [*] --> Monitoring
        Monitoring --> FileChanged : Detect change
        FileChanged --> Debouncing : Start timer
        Debouncing --> Reloading : Timer expires
        Reloading --> Monitoring : Reload complete
    }
```

## Application Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Starting
    
    Starting --> InitializingServices : Load config
    InitializingServices --> InitializingUI : Services ready
    InitializingUI --> Ready : UI loaded
    
    state Ready {
        [*] --> Active
        Active --> Suspended : Minimize
        Suspended --> Active : Restore
    }
    
    Ready --> ShuttingDown : User quits
    ShuttingDown --> SavingState : Close tabs
    SavingState --> CleaningUp : State saved
    CleaningUp --> [*] : Cleanup complete
```

## Composite States

```mermaid
stateDiagram-v2
    [*] --> DocumentViewer
    
    state DocumentViewer {
        state "No Document" as NoDoc
        state "Document Loaded" as Loaded
        
        [*] --> NoDoc
        NoDoc --> Loaded : Open file
        
        state Loaded {
            [*] --> Reading
            Reading --> Navigating : Click link
            Navigating --> Reading : Navigation complete
        }
        
        Loaded --> NoDoc : Close file
    }
```

## Parallel States

```mermaid
stateDiagram-v2
    [*] --> Running
    
    state Running {
        state "UI Thread" as ui {
            [*] --> Responsive
            Responsive --> Rendering
            Rendering --> Responsive
        }
        
        state "File Watcher" as watcher {
            [*] --> Monitoring
            Monitoring --> Processing
            Processing --> Monitoring
        }
        
        --
        
        state "Background Tasks" as tasks {
            [*] --> Idle
            Idle --> Working
            Working --> Idle
        }
    }
```

## Choice States

```mermaid
stateDiagram-v2
    [*] --> CheckFile
    
    state CheckFile <<choice>>
    CheckFile --> Loading : File exists
    CheckFile --> Error : File not found
    
    Loading --> ValidateContent
    
    state ValidateContent <<choice>>
    ValidateContent --> Rendering : Valid markdown
    ValidateContent --> Error : Invalid format
    
    Rendering --> [*]
    Error --> [*]
```

## See Also

- [Flowcharts](flowcharts.md)
- [Sequence Diagrams](sequence-diagrams.md)
- [Class Diagrams](class-diagrams.md)
- [Mermaid Overview](mermaid-overview.md)
