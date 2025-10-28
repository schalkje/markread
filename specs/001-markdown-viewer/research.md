# Research – MarkRead Viewer MVP

## Decisions and Rationale


### CLI Startup Behavior

- Decision: First argument optional; if file → set root to file’s parent, open file; if folder → set root to that folder
- Rationale: Predictable link resolution and scoped navigation per project folder
- Alternatives: Use CWD as root (inconsistent), always prompt (slower path for power users)

### First Launch (no argument, no root)

- Decision: Prompt folder picker; if cancel, show start screen with “Open Folder” action
- Rationale: Keeps control with user, avoids guessing wrong root
- Alternatives: Default Documents (may be noisy); default CWD (surprising)

### Rendering Stack

- Decision: WPF + WebView2 with bundled front-end assets (highlight.js, mermaid) and a sanitized renderer; consider Markdig for markdown preprocessing
- Rationale: Windows-only target, fast startup, small footprint, offline friendly
- Alternatives: Electron (heavier), Tauri (Rust toolchain overhead)

### Security – Sanitization

- Decision: Sanitize HTML; disable scripts and dangerous attributes; external links use rel="noopener noreferrer"
- Rationale: Prevent script injection and unsafe content execution
- Alternatives: Allow raw HTML (rejected due to risk)

## Open Questions (None)

All high-impact ambiguities resolved during clarify.
