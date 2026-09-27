# Tasks

## 1. Shared helpers
- [x] 1.1 `src/shared/utils/link-fragments.ts`: `splitHrefFragment`, `isSameFilePath`, `matchHeadingId`
- [x] 1.2 `src/renderer/utils/heading-dom.ts`: case-insensitive `findHeadingElement`, `headingScrollTop`, `waitForStableHeight`
- [x] 1.3 Unit tests for the split, same-page detection and heading lookup

## 2. Types and stores
- [x] 2.1 `entities.ts`: `Tab.pendingFragment`
- [x] 2.2 `stores/tabs.ts`: `openFileInNewTab(filePath, folderId, fragment)` activates an existing tab; `openFileInNewWindow(..., fragment)`
- [x] 2.3 `stores/tabs.ts`: `setPendingFragment(tabId, fragment)`

## 3. Viewer
- [x] 3.1 Split href, same-page jump, fragment forwarding (current tab / new tab / new window)
- [x] 3.2 Reset the preparing buffer to 0/0 for fresh navigations
- [x] 3.3 Apply the pending fragment after render, re-align once on stable height

## 4. AppLayout
- [x] 4.1 Reset `scrollPosition`/`scrollLeft` on every in-tab navigation
- [x] 4.2 Forward the fragment in `handleLinkClick`, new-tab and new-window handlers; clear it when applied
- [x] 4.3 Pull/receive `window:initialState` and open the file (with fragment)

## 5. Main / preload
- [x] 5.1 `window:createNew` accepts `fragment`; store pending initial state; `window:getInitialState`
- [x] 5.2 Preload typings and bridge

## 6. Outline panel
- [x] 6.1 Reuse `headingScrollTop`

## 7. Verification and evidence
- [x] 7.1 `npm run type-check`, `npm run lint`, `npm test`
- [x] 7.2 `tests/e2e/issue-29-evidence.spec.ts` before/after screenshots in `docs/evidence/issue-29/`
