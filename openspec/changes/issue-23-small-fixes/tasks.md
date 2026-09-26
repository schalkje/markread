# Tasks

## 1. Paths with spaces
- [x] 1.1 `link-paths.ts` helpers (decode / encode / mdfile URL)
- [x] 1.2 `path-resolver.ts` + `file:resolvePath` handler uses it
- [x] 1.3 `directory-listing.ts` generator + `MarkdownViewer` uses it
- [x] 1.4 `MarkdownViewer.resolveImagePaths` uses `toMdFileUrl`
- [x] 1.5 Unit tests: resolver and listing with spaces, `%`, `#`, non-ASCII

## 2. Export-only exclusions
- [x] 2.1 `ExclusionPattern` type, `ExportSettings.exportExclusions`, store defaults/merge
- [x] 2.2 `export-exclusions.ts` matcher + filter, unit tests
- [x] 2.3 `markdown-file-collector.ts` extracted with filter; `FolderExportService` delegates
- [x] 2.4 Folder IPC handler passes browsing exclusions; update-settings schema accepts the list
- [x] 2.5 "Exclude from export" section in `ExportPanel.tsx`
- [x] 2.6 Unit tests: folder walk and tree flatten honour exclusions

## 3. Blank page after navigation
- [x] 3.1 Reset duplicate-render guard on cancelled render
- [x] 3.2 Safety timeout forcing the buffer swap

## 4. Single-file export
- [x] 4.1 Verify all entry points route through `exportSingleFileToPdf` (code inspection)

## 5. Open Folder
- [x] 5.1 `export:reveal-in-folder` IPC handler
- [x] 5.2 Preload `revealExportedFile`
- [x] 5.3 `useExport.revealExportedFile`, dialog `onOpenFolder`, AppLayout wiring

## Verification
- [x] `npm run type-check`, `npm run lint`, `npm test`
