# Implementation Plan: Zoom and Pan Controls

**Branch**: `004-zoom-pan` | **Date**: 2025-11-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-zoom-pan/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add zoom and pan controls to the markdown viewer, allowing users to zoom in/out using mouse wheel (CTRL+scroll) and keyboard shortcuts (CTRL+/-, CTRL+0), and pan zoomed documents using middle mouse button drag. Each tab maintains independent zoom/pan state during the session. Implementation will extend the existing WebView2-based rendering system with JavaScript zoom/pan controls and WPF event handling.

## Technical Context

**Language/Version**: C# .NET 8 (net8.0-windows)  
**Primary Dependencies**: WPF, Microsoft.Web.WebView2 (1.0.2420.47), Markdig (0.34.0)  
**Storage**: Local application settings file (JSON/XML) for default zoom preference  
**Testing**: MSTest (unit and integration tests)  
**Target Platform**: Windows desktop (x64)
**Project Type**: Single WPF desktop application  
**Performance Goals**: 
- Zoom/pan operations complete without visual lag at 10%-1000% zoom levels
- Tab switching with zoom state restoration < 1 second
- Smooth zoom transitions (no janky animation)
- 60 fps during pan drag operations  
**Constraints**: 
- Must not interfere with existing text selection in WebView2
- Must work alongside existing touchpad/touchscreen pinch gestures
- Must maintain viewport coordinates correctly across window resize
- Session-only state (no disk persistence for zoom/pan)  
**Scale/Scope**: 
- Support for multiple tabs (tested up to 5+ tabs with different zoom levels)
- Zoom range: 10% to 1000% (100x range)
- Document size: must handle large markdown files without performance degradation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Code Quality (Principle I)
- ✅ **PASS**: Feature adds well-scoped functionality with clear separation of concerns
- ✅ **PASS**: Zoom/pan logic can be isolated in dedicated service/module
- ✅ **PASS**: Complex zoom center calculations warrant inline documentation
- ✅ **PASS**: Critical zoom/pan operations should have unit tests (boundary checks, coordinate transforms)

### User Experience Consistency (Principle II)
- ✅ **PASS**: Uses standard keyboard shortcuts (CTRL+/-, CTRL+0) consistent with other applications
- ✅ **PASS**: Edit menu integration follows existing pattern
- ✅ **PASS**: Zoom controls align with existing touchpad/touchscreen gesture support
- ✅ **PASS**: Clear boundaries at min/max zoom prevent confusing behavior

### Documentation Standard (Principle III)
- ✅ **PASS**: Feature spec clearly documents all user scenarios and acceptance criteria
- ✅ **PASS**: Technical decisions (zoom center points, pan boundaries) are well-defined
- ✅ **PASS**: Will document zoom coordinate transform calculations inline

### Performance Requirements (Principle IV)
- ✅ **PASS**: Explicit 60fps requirement for pan operations aligns with responsive UI goal
- ✅ **PASS**: Tab switching < 1 second meets responsiveness standard
- ✅ **PASS**: No long freezes expected (operations are UI event-driven)
- ⚠️ **ATTENTION**: Should profile zoom/pan performance with large documents to ensure no memory issues

**Overall Status**: ✅ PASS - No constitution violations. Feature aligns with all core principles.

---

**Post-Design Re-evaluation** (Phase 1 Complete):

All principles remain satisfied after design phase:
- **Code Quality**: Design maintains separation of concerns (JavaScript controller, C# event handlers, TabViewModel state)
- **UX Consistency**: Design preserves standard keyboard shortcuts and menu patterns
- **Documentation**: Research, data model, contracts, and quickstart provide comprehensive documentation
- **Performance**: Design includes debouncing, boundary clamping, and requestAnimationFrame for smooth operations

No constitution violations introduced during design. ✅

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
├── App/                  # WPF app shell, DI, theming, shortcuts
│   ├── App.xaml          # Application resources and startup
│   └── App.xaml.cs       # DI container, service registration
├── Rendering/            # WebView2 host, HTML template, assets
│   ├── WebViewHost.cs    # WebView2 control wrapper
│   ├── assets/           # CSS, JS libraries (highlight.js, mermaid)
│   │   └── zoom-pan.js   # NEW: JavaScript zoom/pan controller
│   └── template/         # HTML templates for markdown rendering
├── Services/             # File system, markdown pipeline, settings
│   ├── SettingsService.cs # Application settings (default zoom)
│   └── ZoomPanService.cs  # NEW: Zoom/pan state management
├── UI/                   # Views, ViewModels
│   ├── Views/
│   │   ├── TabControl/   # Multi-tab document view
│   │   │   └── TabViewModel.cs # NEW: Add zoom/pan state properties
│   │   └── MainWindow.xaml # NEW: Add Edit menu items
│   └── ViewModels/
└── Cli/                  # Entry parsing for folder/file startup

tests/
├── unit/                 # Service tests
│   ├── Services/
│   │   └── ZoomPanServiceTests.cs # NEW: Test zoom/pan logic
│   └── UI/
│       └── TabViewModelTests.cs # NEW: Test zoom/pan state
└── integration/          # Startup + render smoke tests
    └── ZoomPanIntegrationTests.cs # NEW: E2E zoom/pan scenarios
```

**Structure Decision**: Single WPF desktop application (Option 1). Zoom/pan functionality integrates into existing architecture:
- **JavaScript layer** (`zoom-pan.js`) handles WebView2 DOM manipulation and coordinate transforms
- **Service layer** (`ZoomPanService`) manages zoom/pan state per tab and settings persistence
- **UI layer** (`TabViewModel`) maintains zoom/pan state and coordinates between WPF events and WebView2
- **Settings** extended to include default zoom preference
