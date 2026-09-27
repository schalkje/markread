# Proposal: New page, go to top (issue #29)

GitHub issue: https://github.com/schalkje/markread/issues/29

## Why

Following a link to another page currently shows the new page at the scroll offset left over from the
previous one: `handleLinkClick` records a fresh history entry with `scrollPosition: 0` but never resets the
tab's own `scrollPosition`, so `MarkdownViewer` restores the old offset onto the new document. Cross-file
deep links (`page.md#heading`) do not work at all because the whole href, fragment included, is sent to
`file:resolvePath`, which stats a file literally named `page.md#heading`.

## What changes

- **Fresh navigations start at the top.** Every path that loads a page fresh into a tab (link click, tree,
  search result, directory listing, new tab, new window, home/recents/favorites) resets `scrollTop` and
  `scrollLeft` to 0. History restores and tab switches keep their own positions, exactly as today.
- **Cross-file deep links.** The href is split into path + fragment before resolution. The fragment travels
  with the navigation (current tab, Ctrl/Cmd+click new tab, Shift+click new window) and the target heading is
  aligned to the top of the viewport after the page renders, then re-aligned once when the content height
  stabilises. Same offset and scroll-behaviour setting as same-document anchors and the outline panel.
- **Same-page links** (`README.md#setup`, `./README.md` while on README) become in-document jumps with no
  reload and no history entry.
- **Fragment matching** is exact first, then case-insensitive; an empty fragment is ignored; a missing target
  logs a warning and leaves the page at the top.
- **New window initial state** is delivered reliably (pull on mount + push after load) and carries the
  fragment; the renderer previously had no listener for it.

## Out of scope

Same-document anchor history entries, non-heading anchors, slugifying fragments, continuous re-alignment,
external `http(s)://…#fragment` links.
