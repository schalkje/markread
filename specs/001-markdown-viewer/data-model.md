# Data Model – MarkRead Viewer MVP

## Entities

### FolderRoot

- id: absolute path (string)
- properties:
  - path: absolute path (string)
  - displayName: folder name (string)
  - lastOpenedAt: timestamp

### Document

- id: absolute file path (string)
- properties:
  - path: absolute path (string)
  - relativeToRoot: relative path from FolderRoot (string)
  - title: inferred from h1 or filename (string)
  - encoding: utf-8|other (string)
  - modifiedTime: timestamp
  - sizeBytes: number
- relationships:
  - belongsTo: FolderRoot

### Tab

- id: UUID
- properties:
  - documentPath: absolute file path (string)
  - history: list of locations (file path + optional anchor)
  - currentIndex: number
  - searchQuery: string|null
  - matchesCount: number

### Settings

- id: singleton
- properties:
  - theme: system|dark|light
  - startFile: readme|last-session
  - autoReload: boolean
  - showFileTree: boolean
  - lastSession: optional list of open documents and active tab index

## Validation Rules

- FolderRoot.path must exist and be accessible.
- Document.path must exist and be under FolderRoot.path.
- Tab.history entries must resolve to files within FolderRoot.
- Settings.theme must be one of system|dark|light.

## State Transitions

- Tab: open → navigate (push history) → back/forward (move index) → close
- Settings: load defaults → apply overrides → persist on change

