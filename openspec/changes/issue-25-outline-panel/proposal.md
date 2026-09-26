# Proposal: Outline side panel (issue #25)

GitHub issue: https://github.com/schalkje/markread/issues/25

## Why

Readers of long markdown documents have no way to see the document's structure or jump between sections
without scrolling. Every comparable reader (Obsidian, Typora, VS Code, MkDocs, Docusaurus) ships a docked
outline with scrollspy. MarkRead has an orphaned modal `TableOfContents` component, a registered but unwired
`view.toggleTOC` command, a `toggle-toc` window event nobody listens to, and documentation that promises an
"Outline view" and a `Ctrl+G` shortcut that do not exist. Headings also have no ids, so in-document
`#anchor` links are broken.

## What changes

- **Stable heading ids** assigned at render time by a markdown-it core rule (GitHub-style slugs, de-duplicated
  with numeric suffixes), synced onto the rendered DOM so the outline and in-document anchor links target
  exactly the rendered elements.
- **Outline panel** (`components/outline/OutlinePanel.tsx`): header (title, count, follow-scroll toggle,
  collapse/expand all, position menu, close), filter box, collapsible heading tree with relative nesting,
  empty state, resize handle. ARIA tree semantics and keyboard navigation.
- **Scrollspy** (`hooks/useScrollSpy.ts`) with an activation line, bottom-of-container rule, and click lock
  until the scroll ends. Measured with `getBoundingClientRect` so content zoom is respected.
- **Two positions**: right (dedicated panel after the content area, default) or left (stacked under the file
  tree inside the sidebar with a resizable divider). Switchable at runtime; default is a setting.
- **Settings**: `appearance.outlinePosition` (`left` | `right`) and `appearance.outlineMaxDepth` (1-6) with
  controls in the Appearance panel. **UI state**: `showOutline`, `outlineWidth`, `outlineFollow` persisted
  via the existing ui-state manager.
- **Commands / shortcuts / menu**: `view.toggleTOC` re-labelled "Toggle Outline" on `Ctrl+Alt+O` (free of
  the Copy-as-plain-text conflict), `Ctrl+G` focuses the outline filter, new `view.outlinePosition` and
  `view.outlineFollow` commands, View menu entries, and the `toggle-toc` event finally has a listener.
- **Cleanup**: remove the unused modal `TableOfContents` and the dead `SplitView` consumer; update
  `headings.md`, `keyboard-shortcuts.md` and `settings.md`.

## Out of scope

Editing from the outline, section numbering, sticky headings, breadcrumbs, rendering inline markdown in
labels, virtualised tree rendering, cross-file `file.md#fragment` links, the unrelated sidebar-width
setting bug, and the export TOC.
