# Implementation Plan: Export and Copy Features

**Branch**: `001-export-copy-features` | **Date**: 2026-01-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-export-copy-features/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement comprehensive export and copy functionality for MarkRead, including:
- PDF export for single documents and folders using Chromium's print-to-PDF API
- Mermaid diagram actions (copy as PNG/SVG, download, open in tab) with hover buttons
- Multi-format text copying (plain, markdown, rich text) with keyboard shortcuts
- Error handling with retry capability and detailed logging

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js (Electron 33.4.11)
**Primary Dependencies**: Electron, React 18.3, markdown-it, mermaid 11.12, Puppeteer/Playwright (for PDF), html2canvas/dom-to-image (for diagram capture)
**Storage**: Local filesystem for exports, electron-store for preferences
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Windows 10+ desktop application
**Project Type**: Electron desktop application (main/renderer/preload architecture)
**Performance Goals**: PDF export <5s for 50-page docs, diagram copy <1s, hover buttons appear <200ms
**Constraints**: Use Chromium print-to-PDF API, maintain consistency with existing WebView2 rendering, clipboard operations must work with Word/Teams
**Scale/Scope**: Single-user desktop app, document size up to 100MB rendered, folder exports up to 50 documents

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Code Quality
- ✅ Code will be maintainable with clear service boundaries (ExportService, ClipboardService, DiagramService)
- ✅ Tests planned for critical functionality (PDF generation, clipboard operations)
- ✅ TypeScript + ESLint already configured for consistency

### User Experience Consistency
- ✅ Error messages specified with clear guidance and retry options
- ✅ UI patterns consistent (hover buttons, keyboard shortcuts follow conventions)
- ✅ Settings integrated with existing electron-store

### Documentation Standard
- ✅ Quickstart guide planned for implementation
- ✅ Non-obvious decisions documented in research.md

### Performance Requirements
- ✅ Performance targets defined (5s export, 1s copy, 200ms hover)
- ✅ Progress indicators specified for long operations
- ✅ Memory constraints considered (100MB limit)

**Result**: ✅ PASS - No violations

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── main/                  # Electron main process
│   ├── services/
│   │   ├── export/
│   │   │   ├── PdfExportService.ts      # PDF generation using Chromium API
│   │   │   ├── FolderExportService.ts   # Batch export with TOC
│   │   │   └── ExportLogger.ts          # Export operation logging
│   │   └── ipc/
│   │       └── exportHandlers.ts        # IPC handlers for export commands
│   └── index.ts
│
├── renderer/              # React UI
│   ├── components/
│   │   ├── DiagramHoverButtons.tsx      # Mermaid diagram action buttons
│   │   ├── CopyFormatPicker.tsx         # Format selection dialog
│   │   ├── ExportProgressDialog.tsx     # Export progress UI
│   │   └── ErrorDialog.tsx              # Error handling UI
│   ├── services/
│   │   ├── ClipboardService.ts          # Multi-format clipboard operations
│   │   ├── DiagramCaptureService.ts     # PNG/SVG diagram capture
│   │   └── TextSelectionService.ts      # Text selection handling
│   ├── hooks/
│   │   ├── useExport.ts                 # Export operations hook
│   │   ├── useDiagramActions.ts         # Diagram hover actions hook
│   │   └── useCopyShortcuts.ts          # Keyboard shortcut handling
│   └── stores/
│       └── exportStore.ts               # Export state management (Zustand)
│
├── preload/
│   └── exportApi.ts       # Secure IPC bridge for export operations
│
└── shared/
    └── types/
        ├── export.ts      # Export-related type definitions
        └── clipboard.ts   # Clipboard format types

tests/
├── unit/
│   ├── services/
│   │   ├── PdfExportService.test.ts
│   │   ├── ClipboardService.test.ts
│   │   └── DiagramCaptureService.test.ts
│   └── components/
│       ├── DiagramHoverButtons.test.tsx
│       └── CopyFormatPicker.test.tsx
└── e2e/
    ├── pdf-export.spec.ts
    ├── diagram-actions.spec.ts
    └── text-copy.spec.ts
```

**Structure Decision**: Electron architecture with main/renderer/preload separation. Export operations requiring Node.js APIs (PDF generation, file system) live in main process. UI components and clipboard operations in renderer. Secure IPC bridge via preload script.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: No violations - this section is not applicable.

The implementation follows all constitution principles:
- Clean, maintainable code with clear service boundaries
- Consistent error handling and user feedback
- Reasonable documentation without over-engineering
- Performance targets defined and achievable


## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
