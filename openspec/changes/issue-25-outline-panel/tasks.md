# Tasks

## 1. Heading ids and outline model
- [x] 1.1 `src/shared/utils/outline.ts`: slugify, registry, markdown-it plugin, tree builder, filter
- [x] 1.2 `src/shared/utils/scrollspy.ts`: `resolveActiveIndex`
- [x] 1.3 `markdown-renderer.ts`: use the plugin, export `renderMarkdownDocument`
- [x] 1.4 `src/renderer/utils/heading-dom.ts`: `syncHeadingIds`
- [x] 1.5 Unit tests: ids/dedupe/stripping, relative nesting, depth limit, filter, scrollspy rules

## 2. State and persistence
- [x] 2.1 `entities.ts`: `outlinePosition`, `outlineMaxDepth`, `UIState.showOutline/outlineWidth/outlineFollow`
- [x] 2.2 Defaults in renderer settings store, main settings-manager, ui-state-manager
- [x] 2.3 `stores/outline.ts` with persistence and per-tab collapse state
- [x] 2.4 `stores/tabs.ts`: `pushScrollHistoryEntry` (seeds the pre-jump position for tabs without history)

## 3. Viewer integration
- [x] 3.1 `MarkdownViewer`: render with headings, sync ids, publish active buffer + headings, clear on unmount
- [x] 3.2 Fix in-document anchor clicks (`CSS.escape`, scroll setting)

## 4. Outline panel UI
- [x] 4.1 `hooks/useScrollSpy.ts`
- [x] 4.2 `components/outline/OutlinePanel.tsx` + `.css` (header, filter, tree, empty state, resize, a11y, keys)
- [x] 4.3 `AppLayout`: right panel + stacked left section, divider, event listeners, init
- [x] 4.4 `AppearancePanel`: Outline position + depth controls

## 5. Commands, shortcuts, menu
- [x] 5.1 `command-service`: relabel/rebind `view.toggleTOC`, `navigation.goToHeading`; add position/follow commands
- [x] 5.2 `keyboard-handler`: `registerOutlineShortcuts`, `altKey:false` on Ctrl+O bindings
- [x] 5.3 `TitleBarLeft` View menu entries

## 6. Cleanup and docs
- [x] 6.1 Delete `TableOfContents.tsx/.css`, `SplitView.tsx/.css`
- [x] 6.2 Update `headings.md`, `keyboard-shortcuts.md`, `settings.md`

## 7. Verification and evidence
- [x] 7.1 `npm run type-check`, `npm run lint`, `npm test`
- [x] 7.2 `tests/e2e/issue-25-evidence.spec.ts` before/after screenshots in `docs/evidence/issue-25/`
