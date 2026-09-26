# Proposal: Small fixes — paths with spaces, export exclude list, blank page on navigation, Open Folder after export

**Issue:** [#23](https://github.com/schalkje/markread/issues/23)
**Branch:** `fix/23-paths-spaces-export-exclude-open-folder`

## Why

Five small, independent defects and gaps reported against v0.8.0:

1. Relative links and images whose path contains spaces (or `%`, `#`, non-ASCII) fail because the `file:resolvePath` handler never URL-decodes the href markdown-it emits, and the generated directory listing writes raw spaces into link destinations.
2. Files such as `CLAUDE.md` cannot be kept out of a PDF export while remaining visible in the viewer; folder export only honours a hard-coded folder list.
3. Navigating to a page intermittently leaves the viewer blank: a cancelled in-flight render is mistaken for a completed one by the duplicate-render guard, so both dual buffers stay hidden.
4. Single-file export with a cover page was reworked in v0.8.0 and only needs verification.
5. The export-complete dialog offers "Open File" but no way to reveal the PDF in the file manager.

## What changes

- **Link resolution**: decode hrefs before resolving, fall back to the raw value, and percent-encode generated directory-listing links. `mdfile://` image URLs escape `#`/`?`.
- **Export exclusions**: new `exportExclusions` list in export settings (case-insensitive globs on file/folder names), applied to local folder and repository exports as the union with the browsing exclusions. New "Exclude from export" section in the Export settings panel with presets.
- **Blank page**: reset the duplicate-render guard when a render is cancelled, and add a safety timeout that forces the buffer swap if the prepared buffer never reports ready.
- **Open Folder**: new `export:reveal-in-folder` IPC channel using `shell.showItemInFolder`, exposed through the preload export API, the `useExport` hook, and an "Open Folder" button on the completed export dialog.

## Out of scope

- Fragment (`file.md#heading`) handling in relative links.
- Changing the browsing exclusion semantics.
