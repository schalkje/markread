# Design: New page, go to top (issue #29)

## Href splitting (`src/shared/utils/link-fragments.ts`)

`splitHrefFragment(href)` returns `{ path, fragment }`: split on the first `#`, percent-decode the fragment
(fallback to raw on malformed sequences), empty fragment → `null`. `isSameFilePath(a, b)` compares absolute
paths with normalised separators, case-insensitively when either looks like a Windows path.
`matchHeadingId(ids, fragment)` picks the exact id or, failing that, the first case-insensitive match.

## Viewer click handler (`MarkdownViewer.tsx`)

1. Split the href. An empty path is a same-document anchor (handled with `findHeadingElement`, which now has
   the case-insensitive fallback).
2. External links unchanged.
3. Resolve only the path part. Directory results ignore the fragment. If the resolved file equals the current
   `filePath` → in-document jump (fragment → heading, no fragment → top) and return.
4. Otherwise dispatch with `{ filePath, fragment }`: `onFileLink(path, fragment)`, `open-file-in-new-tab`,
   `open-file-in-new-window`.

## Pending fragment

`Tab.pendingFragment?: string | null` is set by whichever navigation carries a fragment (link click, new tab,
new window). `MarkdownViewer` receives it as a prop. When the render into the preparing buffer completes and
the buffer holds the tab's file, the viewer:

- resets the buffer to `scrollTop = scrollLeft = 0` when no history restore is pending (this is also what
  fixes the stale-offset bug for the second buffer),
- scrolls the heading to the top (`headingScrollTop`, offset 12px, `behavior.scrollBehavior`), or warns and
  stays at the top when no heading matches,
- calls `onPendingFragmentApplied()` so `AppLayout` clears the tab field,
- re-aligns once when the height-stabilisation loop reports stable (shared `waitForStableHeight` helper,
  ~1s max), cancelled by the next navigation.

The scroll-restoration effect only acts on non-zero `scrollTop`/`scrollLeft` props. Because every fresh
navigation now writes 0 into the tab, it never fires for new pages; after the heading jump `onScrollChange`
records the real position, so Back/Forward restore the heading position.

## AppLayout

Every in-tab navigation (`handleLinkClick`, tree `onFileSelect`, search result click, directory listing)
writes `scrollPosition: 0, scrollLeft: 0` into the updated tab. `handleLinkClick` and the new-tab/new-window
handlers forward the fragment. `handleFileOpened` gains an optional fragment for the new-window path.

## New window

`window:createNew` accepts `fragment`. The main process stores the initial state per window id and both
pushes it on `did-finish-load` and serves it via a new `window:getInitialState` handle; the renderer pulls on
mount and de-duplicates, then opens the file with the fragment.

## Outline panel

Uses the shared `headingScrollTop` helper instead of its own arithmetic.

## Findings during verification (root causes fixed in the viewer / layout)

1. **Premature render pass.** On the commit that changes `filePath`, the navigation `useLayoutEffect`
   requests a transition via `setState`, but the render and scroll-restoration `useEffect`s of that same
   commit still see `preparingBuffer === null` and write the *new* page into the *visible* buffer. That
   buffer keeps the previous page's scroll offset (the original bug) and its scroll events corrupt the
   history entry of the new page. The viewer now sets `transitionRequestedRef` in the layout effect and
   both effects skip until `preparingBuffer` is set; the effects re-run on that state change.
2. **Mixed render after a tab store update.** A Zustand update renders synchronously, before React
   applies a batched `currentFile` change. For one render the viewer shows the old file with the new
   tab's `scrollPosition` (0) and `pendingFragment`. `AppLayout` now passes `scrollTop`, `scrollLeft` and
   `pendingFragment` only when `activeTab.filePath === currentFile`, and `handleLinkClick` no longer bumps
   `modificationTimestamp` for a different file (that forced a re-render of the old page).
3. **Scroll reporting.** Only the visible buffer reports to `onScrollChange` / the scrollbars; the buffer
   that is swapped in publishes its position once (after it rendered the current file), so the tab and
   its history entry mirror what is on screen after a restore, a fresh reset or a deep-link alignment.
4. **Alignment while hidden is instant.** A smooth scroll started on the hidden buffer is cut short by
   the crossfade, so the deep-link alignment (and the one-shot re-alignment, if it fires before the swap)
   uses `auto` while the buffer is hidden; the `behavior.scrollBehavior` setting applies once the buffer
   is on screen.
5. **Tab lookup by shown file.** `openFileInNewTab` looked an existing tab up by the id derived from
   the path, but in-tab navigation moves a tab away from that file. It now matches the tab that
   currently shows the file (same folder context), focuses it, and keeps ids unique when the derived
   id is already taken by a tab that navigated elsewhere.
