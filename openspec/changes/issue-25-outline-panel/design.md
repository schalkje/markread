# Design: Outline side panel (issue #25)

## Heading ids and extraction

`src/shared/utils/outline.ts` (pure, unit-tested):

- `slugifyHeading(text)` - lowercase, trim, drop everything except letters, numbers, spaces, `-` and `_`
  (Unicode-aware), collapse whitespace to `-`. Empty result falls back to `section`.
- `createSlugRegistry()` - `claim(slug)` returns `slug`, `slug-1`, `slug-2`, ... and remembers used ids.
- `headingIdsPlugin(md)` - markdown-it core rule after `inline`: for every `heading_open`, derive plain text
  from the inline children (text + code text, soft/hard breaks as spaces, emoji kept, formatting dropped),
  set the `id` attribute and collect `{ id, level, text, index }` into `env.headings`.
- `buildOutlineTree(headings, maxDepth)` - filters headings deeper than `maxDepth`, then nests by *relative*
  level using a stack (an h3 directly under an h1 becomes its child at depth 1; a following h2 pops back to
  the h1 level).
- `filterOutlineTree(tree, query)` - case-insensitive substring match; matching nodes keep their ancestors.
- `syncHeadingIds(container)` (renderer, `utils/heading-dom.ts`) - after DOMPurify, walk the DOM
  headings: keep an existing id, otherwise assign one from the text via the registry seeded with every id
  already in the container. Returns the DOM-derived list the outline uses. This guards against DOMPurify's
  clobbering filter (it removes ids such as `title` or `location`) and raw-HTML headings.

`renderMarkdown` gains a sibling `renderMarkdownDocument(markdown): { html, headings }`.

## State

`stores/outline.ts` (zustand):

- document: `headings`, `scrollContainer` (active buffer element)
- ui: `showOutline`, `outlineWidth` (170-600), `followScroll`, `sidebarOutlineHeight`, `filter`,
  `activeHeadingId`, `collapsedByTab: Map<tabId, Set<headingId>>`, `focusFilterRequest` counter
- persistence: `initialize()` loads `showOutline` / `outlineWidth` / `outlineFollow` from `uiState.load()`;
  setters call `uiState.save({ uiState: { ... } })`.

Position and max depth are read from the settings store (`appearance.outlinePosition`, `outlineMaxDepth`).
The runtime "Move to left/right" action updates the setting and saves it, so the Appearance panel and the
panel menu never disagree.

## Viewer integration

`MarkdownViewer` renders with `renderMarkdownDocument`, calls `syncHeadingIds` on the target content element,
and bumps a `renderVersion` counter when a render completes. An effect on `[activeBuffer, renderVersion]`
reads the *active* buffer's headings and publishes `{ headings, scrollContainer }` to the outline store; the
unmount cleanup clears it (Home screen, diagram tabs). In-document `#anchor` clicks now resolve with
`CSS.escape` and honour the scroll-behaviour setting.

## Scrollspy

`useScrollSpy(container, headings, { enabled })`:

- rAF-throttled `scroll` listener + `ResizeObserver` on the container.
- activation line = `min(clientHeight * 0.3, 160)` px from the container top.
- active = last heading whose `getBoundingClientRect().top - containerTop <= line`; if the container is
  scrolled to the bottom (within 2 px) the last heading wins. Pure `resolveActiveIndex()` in
  `src/shared/utils/scrollspy.ts` is unit-tested.
- `lock(id)` marks an entry active immediately; the lock is released on `scrollend` (with a 1200 ms fallback).

## Navigation

`navigateToHeading(id)` in `OutlinePanel`: measure the heading, `container.scrollTo({ top, behavior })`
with a 12 px top offset, focus the heading with `preventScroll`, and push a same-file history entry
(`useTabsStore.pushScrollHistoryEntry`) so `Alt+Left` returns. The store listens for `navigate-to-history`
and scrolls the container when the entry is for the current file (covers a return to position 0, which
the viewer's own restore skips).

## Layout

- Right: `.app-layout__content` -> `.sidebar?` `.main-content` `.outline-panel--right` (width from store,
  resize handle on its left edge).
- Left: `.sidebar` becomes header / `.sidebar-content` (flex 1) / `.sidebar-outline-divider` /
  `.outline-panel--stacked` (height from store). Hidden with the sidebar.

Rows mirror `.file-tree-item` (13 px, 6 px 8 px padding, 2 px accent left border + weight 500 when active,
20 px indent per depth, 12 px chevron, ellipsis + `title`). Colours come from theme variables with the
`[data-theme="dark"]` and `prefers-contrast: high` override pattern used by `FileTree.css`.

## Commands, shortcuts, menu

- `command-service`: `view.toggleTOC` -> "Toggle Outline", `Ctrl+Alt+O`; `navigation.goToHeading` -> "Go to
  Heading" (`Ctrl+G`, focuses the filter); new `view.outlinePosition`, `view.outlineFollow`.
- `keyboard-handler`: `registerOutlineShortcuts({ onToggleOutline, onFocusOutlineFilter })` binds
  `Ctrl+Alt+O` and `Ctrl+G`. `file.open` / `file.openFolder` gain `altKey: false` so `Ctrl+Alt+O` cannot be
  swallowed by `Ctrl+O`.
- Events: `toggle-toc` (toggle), `outline:focus-filter`, `outline:toggle-position`, `outline:toggle-follow`.
- `TitleBarLeft` View menu: "Toggle Outline", "Move Outline to Left/Right".

## Cleanup

Delete `components/editor/TableOfContents.tsx/.css` and `components/editor/SplitView.tsx/.css` (no
consumers). `ZoomControls` and the panes store stay (they belong to the future split feature).
