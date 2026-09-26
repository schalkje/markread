# Design

## 1. Paths with spaces

- `src/shared/utils/link-paths.ts` — `decodeLinkPath` (decodeURIComponent with raw fallback), `encodeLinkDestination` (encodeURIComponent plus `!'()*`), `toMdFileUrl` (escapes `#` and `?`).
- `src/main/services/path-resolver.ts` — `resolveLinkPath(basePath, href)`: tries the decoded candidate first, then the raw one if the decoded path does not exist. Directory → README.md or listing, unchanged. The `file:resolvePath` IPC handler becomes a thin wrapper.
- `src/shared/utils/directory-listing.ts` — `generateDirectoryListingMarkdown`, used by `MarkdownViewer` in place of the inline string building. Destinations are encoded; labels have `[`/`]` escaped.

## 2. Export-only exclusions

- Type `ExclusionPattern` (`id`, `pattern`, `isEnabled`, `description?`) in `src/shared/types/export.ts`; `ExportSettings.exportExclusions: ExclusionPattern[]` (default `[]`).
- `src/shared/utils/export-exclusions.ts` — case-insensitive glob matching, `createExportExclusionFilter({ browsingExclusions, exportExclusions })` returning `isFolderExcluded` / `isFileExcluded`. Folder check = browsing list (existing semantics) OR export list; file check = export list only.
- `src/main/services/export/markdown-file-collector.ts` — the folder walk and repository-tree flatten extracted from `FolderExportService`, both taking the filter. Excluded entries are never collected, so TOC, page count and progress totals are unaffected.
- `FolderExportOptions` gains `browsingExclusions?` and `exportExclusions?`. The folder IPC handler passes the app's `behavior.folderExclusionPatterns`; the service defaults `exportExclusions` from `ExportSettings`. Single-file export does not consult either list.
- `ExportSettingsStore` merges stored settings over defaults so older stores get `exportExclusions: []`. The update Zod schema accepts the array.
- UI: "Exclude from export" section in `ExportPanel.tsx` reusing the `folder-exclusion__*` styles: add, presets (`CLAUDE.md`, `COPILOT.md`, `AGENTS.md`), toggle, remove, clear.

## 3. Blank page after navigation

Root cause (reproduced with the Playwright evidence spec and the renderer console): the duplicate-render guard in `MarkdownViewer` keyed on buffer, file path and modification timestamp only. Opening a file renders once while `content` is still empty (AppLayout has not loaded it yet); that render completes with an empty buffer, the crossfade swaps to it, and when the real content arrives (`isLoading` true→false) the re-run is skipped as a "duplicate". Both buffers stay empty.

Fix, three layers:
- the guard key now includes `content` (string comparison is by value, so identical text is still deduplicated);
- a render cancelled before it marked the buffer ready clears the guard in the effect cleanup, so the re-run renders again;
- a safety timeout (4 s) forces the buffer swap when `preparedBufferReady` never arrives, so the viewer can never stay hidden.

## 4. Single-file export (verify only)

Code path: File menu / `Ctrl+Shift+E` / file-tree context menu → `menu:export-pdf` or `export-file-to-pdf` → `useExport.exportFile` → `export:pdf:singleFile` → `FolderExportService.exportSingleFileToPdf` which always emits a cover page (title, base path, folder, date, optional git info). Verified by code inspection; runtime check requires a save dialog.

## 5. Open Folder

- Main: `export:reveal-in-folder` handler validates `{ filePath }`, checks existence, calls `shell.showItemInFolder`.
- Preload: `exportApi.revealExportedFile(filePath)`.
- Renderer: `useExport.revealExportedFile`, `ExportProgressDialog` prop `onOpenFolder` rendered only when `status === 'completed'`; `AppLayout` passes it only when a destination exists.
