# Application Command Contracts

These user-facing actions are modeled as commands with inputs/outputs. This is not a network API; it documents stable app behaviors for testing and automation.

## Commands

### app.openFolder

- Input: { path: string }
- Output: { rootSet: boolean, error?: string }
- Errors: path missing, inaccessible path

### app.openFile

- Input: { file: string }
- Output: { opened: boolean, error?: string }
- Behavior: Sets root to parent directory if root not set or file outside current root

### tab.new

- Input: {}
- Output: { tabId: string }

### tab.close

- Input: { tabId: string }
- Output: { closed: boolean }

### nav.back

- Input: { tabId: string }
- Output: { ok: boolean }

### nav.forward

- Input: { tabId: string }
- Output: { ok: boolean }

### find.open

- Input: { query?: string }
- Output: { active: boolean }

### theme.set

- Input: { mode: "system"|"dark"|"light" }
- Output: { applied: boolean }

### settings.save

- Input: { autoReload?: boolean, showFileTree?: boolean, startFile?: "readme"|"last-session" }
- Output: { saved: boolean }

## Notes

- All commands are synchronous from the user perspective; long operations show a non-blocking loading indicator.
- Errors are shown as friendly messages and recorded in logs for diagnostics.
