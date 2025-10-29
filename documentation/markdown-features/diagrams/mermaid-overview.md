# Mermaid Overview

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Markdown Features](../) → [Diagrams](./) → Mermaid Overview

Mermaid creates diagrams and visualizations using text-based syntax.

## What is Mermaid?

Mermaid is a diagram and chart generation tool that uses markdown-inspired syntax. It renders diagrams directly in MarkRead without external tools.

## Supported Diagram Types

### Flowcharts
Process flows and decision trees.

```mermaid
graph LR
    A[Input] --> B[Process]
    B --> C[Output]
```

[Learn more →](flowcharts.md)

### Sequence Diagrams
Interactions between objects over time.

```mermaid
sequenceDiagram
    User->>MarkRead: Open file
    MarkRead->>FileSystem: Read file
    FileSystem-->>MarkRead: File content
    MarkRead-->>User: Display rendered markdown
```

[Learn more →](sequence-diagrams.md)

### Class Diagrams
UML class structures and relationships.

```mermaid
classDiagram
    class Document {
        +string path
        +string content
        +render()
    }
    class Tab {
        +Document document
        +History history
        +open()
        +close()
    }
    Tab --> Document
```

[Learn more →](class-diagrams.md)

### State Diagrams
State machines and transitions.

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading: Open File
    Loading --> Rendering: File Loaded
    Rendering --> Displayed: Render Complete
    Displayed --> Idle: Close File
```

[Learn more →](state-diagrams.md)

### Gantt Charts
Project timelines and schedules.

```mermaid
gantt
    title MarkRead Development Roadmap
    dateFormat  YYYY-MM-DD
    section MVP
    Core Features      :2025-01-01, 30d
    Testing           :20d
    section Release
    Documentation     :2025-02-01, 15d
    Launch           :milestone, 2025-02-15, 0d
```

[Learn more →](gantt-charts.md)

### Pie Charts
Data proportions and percentages.

```mermaid
pie title Document Types in Project
    "Markdown" : 45
    "Code" : 30
    "Images" : 15
    "Other" : 10
```

[Learn more →](pie-charts.md)

## Basic Syntax

All Mermaid diagrams use fenced code blocks with `mermaid` language:

````markdown
```mermaid
graph TD
    A --> B
```
````

## Why Use Mermaid?

✅ **Version Control** - Diagrams are text, so they diff well in Git
✅ **No External Tools** - No need for Visio, Draw.io, etc.
✅ **Always Up-to-Date** - Edit diagrams as easily as text
✅ **Consistent Style** - Automatic professional styling
✅ **Fast** - Quick to create and modify

## Tips for Great Diagrams

1. **Keep it Simple** - Don't overcomplicate
2. **Use Meaningful Names** - Clear node labels
3. **Logical Flow** - Top-to-bottom or left-to-right
4. **Add Comments** - Explain complex diagrams
5. **Test Syntax** - Use [mermaid.live](https://mermaid.live) to validate

## See Also

- [Flowcharts](flowcharts.md)
- [Sequence Diagrams](sequence-diagrams.md)
- [Class Diagrams](class-diagrams.md)
- [State Diagrams](state-diagrams.md)
- [Gantt Charts](gantt-charts.md)
- [Pie Charts](pie-charts.md)
