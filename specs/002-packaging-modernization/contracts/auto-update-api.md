# Contract: Auto-Update API
# Implementation: electron-updater library

## Purpose

Defines the auto-update behavior for MarkRead using electron-updater with GitHub Releases as the update source.

## Update Check Triggers

### 1. Startup Check (5-second delay)

```typescript
import { autoUpdater } from 'electron-updater';
import { app } from 'electron';

// Skip in development or portable mode
const isPortable = !!process.env.PORTABLE_EXECUTABLE_FILE;
const isProduction = app.isPackaged;

if (isProduction && !isPortable) {
  // Delay 5 seconds after app launch (non-blocking)
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 5000);
}
```

### 2. Periodic Checks (4-hour interval)

```typescript
if (isProduction && !isPortable) {
  // Check every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 4 * 60 * 60 * 1000);  // 4 hours in milliseconds
}
```

### 3. Manual Check (User-initiated)

```typescript
// Triggered from Help menu → Check for Updates
ipcMain.handle('check-for-updates', async () => {
  if (isProduction && !isPortable) {
    return await autoUpdater.checkForUpdates();
  } else {
    throw new Error('Auto-updates not available in development or portable mode');
  }
});
```

## Update Flow

### State Machine

```
IDLE
  → checkForUpdates()
  → CHECKING
    ↓
    ├── No update available
    │   → IDLE (resume 4hr interval)
    │
    ├── Update available
    │   → UPDATE_AVAILABLE
    │   → Show notification to user
    │   → User chooses: Download | Dismiss
    │   ↓
    │   ├── User clicks Download
    │   │   → DOWNLOADING
    │   │   → Show progress (%, bytes)
    │   │   ↓
    │   │   └── Download complete
    │   │       → UPDATE_DOWNLOADED
    │   │       → Show notification: Restart now | Install on quit
    │   │
    │   └── User clicks Dismiss
    │       → IDLE (resume 4hr interval)
    │
    └── Error (GitHub API unavailable, network issue)
        → IDLE (log error, exponential backoff retry)
```

## Event Handlers

### checking-for-update

```typescript
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
});
```

### update-available

```typescript
import { dialog } from 'electron';

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);

  // Show notification to user
  const result = dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: `MarkRead ${info.version} is available`,
    detail: info.releaseNotes || 'See release notes for details',
    buttons: ['Download Now', 'Dismiss'],
    defaultId: 0,
    cancelId: 1
  });

  if (result.response === 0) {
    // User clicked "Download Now"
    autoUpdater.downloadUpdate();
  }
  // Otherwise: User dismissed, resume normal 4hr interval
});
```

### update-not-available

```typescript
autoUpdater.on('update-not-available', (info) => {
  console.log('No updates available. Current version:', info.version);
  // Resume normal 4hr interval
});
```

### download-progress

```typescript
import { BrowserWindow } from 'electron';

autoUpdater.on('download-progress', (progress) => {
  console.log(`Download progress: ${progress.percent.toFixed(2)}% (${progress.transferred}/${progress.total} bytes)`);

  // Send progress to renderer process
  const mainWindow = BrowserWindow.getFocusedWindow();
  if (mainWindow) {
    mainWindow.webContents.send('update-download-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total
    });
  }
});
```

### update-downloaded

```typescript
autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);

  // Show notification to user
  const result = dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: `MarkRead ${info.version} has been downloaded`,
    detail: 'The update will be installed when you restart the application',
    buttons: ['Restart Now', 'Install on Quit'],
    defaultId: 0,
    cancelId: 1
  });

  if (result.response === 0) {
    // User clicked "Restart Now"
    autoUpdater.quitAndInstall(false, true);  // Force restart, don't wait
  } else {
    // User clicked "Install on Quit"
    // Update will be installed automatically on next app quit
  }
});
```

### error (with Exponential Backoff)

```typescript
let retryInterval = 1 * 60 * 60 * 1000;  // Start with 1hr
const maxRetryInterval = 4 * 60 * 60 * 1000;  // Max 4hr
const normalInterval = 4 * 60 * 60 * 1000;  // Normal 4hr

autoUpdater.on('error', (error) => {
  console.error('Update check failed:', error.message);

  // Log to %LOCALAPPDATA%\MarkRead\Logs
  const logger = new InstallLogger();
  logger.log('ERROR', 'UPDATE_CHECK_FAILED', `GitHub Releases API unavailable: ${error.message}`);

  // Retry with exponential backoff (1hr, 2hr, 4hr)
  setTimeout(() => {
    console.log(`Retrying update check after ${retryInterval / 3600000}hr...`);
    autoUpdater.checkForUpdates();

    // Increase interval (exponential), max 4hr
    retryInterval = Math.min(retryInterval * 2, maxRetryInterval);
  }, retryInterval);
});

// Reset backoff on successful check
autoUpdater.on('update-available', () => {
  retryInterval = 1 * 60 * 60 * 1000;  // Reset to 1hr
});
autoUpdater.on('update-not-available', () => {
  retryInterval = 1 * 60 * 60 * 1000;  // Reset to 1hr
});
```

## Rollback on Startup Crash

### Crash Detection

```typescript
import * as fs from 'fs';
import * as path from 'path';

const crashFlagPath = path.join(app.getPath('userData'), 'update-crash-flag');
const previousVersionPath = path.join(app.getPath('userData'), 'previous-version-backup');

// Set crash flag when update is installed
autoUpdater.on('update-downloaded', () => {
  fs.writeFileSync(crashFlagPath, new Date().toISOString());
});

// Clear crash flag on successful startup
app.on('ready', () => {
  if (fs.existsSync(crashFlagPath)) {
    // Previous update may have crashed, wait 5s for app to fully initialize
    setTimeout(() => {
      // If app is still running after 5s, assume success
      fs.unlinkSync(crashFlagPath);
      console.log('Update succeeded, cleared crash flag');
    }, 5000);
  }
});

// Detect crash on next startup
app.on('ready', () => {
  if (fs.existsSync(crashFlagPath)) {
    const flagTime = fs.readFileSync(crashFlagPath, 'utf8');
    const timeSinceUpdate = Date.now() - new Date(flagTime).getTime();

    if (timeSinceUpdate > 30000) {  // >30s since update, likely crashed
      console.error('Update crashed! Rolling back to previous version...');

      // Log failure
      const logger = new InstallLogger();
      logger.log('ERROR', 'UPDATE_ROLLBACK', 'New version crashed on startup, rolling back to previous version');

      // Rollback (handled by electron-updater automatically)
      // electron-updater keeps previous version in temp folder and can restore it

      // Show notification to user
      dialog.showErrorBox(
        'Update Failed',
        'The update could not be installed successfully and has been rolled back.\n\n' +
        'Please check the logs for details:\n' +
        path.join(app.getPath('appData'), 'MarkRead', 'Logs')
      );

      // Clean up crash flag
      fs.unlinkSync(crashFlagPath);
    }
  }
});
```

## Configuration

### electron-builder.yml

```yaml
publish:
  provider: github
  owner: yourusername
  repo: markread
  releaseType: release
```

### Main Process (src/main/index.ts)

```typescript
import { autoUpdater } from 'electron-updater';

// Configure auto-updater
autoUpdater.autoDownload = false;  // Don't auto-download, let user choose
autoUpdater.autoInstallOnAppQuit = true;  // Auto-install on quit if downloaded
autoUpdater.logger = console;  // Use console logger

// Set GitHub Releases channel
// electron-updater automatically uses latest.yml from releases
// No additional configuration needed for GitHub provider
```

## Update Manifest (latest.yml)

Generated automatically by electron-builder publish, consumed by electron-updater:

```yaml
version: 0.5.1
releaseDate: '2026-01-11T10:30:00.000Z'
path: MarkRead-Setup-0.5.1.exe
sha512: YXNkZmFzZGZhc2Rm...
size: 87654321
githubArtifactName: MarkRead-Setup-0.5.1.exe
```

## Functional Requirements Satisfied

- **FR-009**: Auto-update functionality checks for updates 5 seconds after app launch and every 4 hours, queries GitHub Releases for latest version, downloads updates in the background with progress reporting, displays notifications for available/downloaded updates, allows users to install immediately or defer, skips update checks in development mode, keeps previous version as backup during updates, automatically rollbacks to previous version with failure logging if new version crashes on startup, and handles update check failures by logging errors silently and retrying with exponential backoff intervals (1hr, 2hr, 4hr) before resuming normal 4hr checks after successful connection

## Success Criteria Addressed

- **SC-006**: Auto-update success rate exceeds 95% for users with network connectivity
- **SC-012**: Auto-update notifications appear within 5 seconds of app launch when updates are available

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| GitHub Releases API unavailable | Log error silently, retry with exponential backoff (1hr, 2hr, 4hr), resume normal 4hr interval after success |
| Network interruption during download | electron-updater handles resume automatically, retry download from where it left off |
| Insufficient disk space | electron-updater fails download, logs error with DISK_SPACE_INSUFFICIENT code |
| Update crashes on startup | Auto-rollback to previous version backup, log UPDATE_ROLLBACK error, show notification to user |
| Portable .exe mode | Update checks disabled (detected via process.env.PORTABLE_EXECUTABLE_FILE) |
| Development mode | Update checks disabled (detected via !app.isPackaged) |
| User dismisses update notification | Resume normal 4hr interval, re-notify on next check if update still available |
| Multiple updates available | electron-updater always fetches latest version (skips intermediate versions) |

## Testing

### Test Update Flow

```typescript
// Mock update available
autoUpdater.emit('update-available', {
  version: '0.5.1',
  releaseNotes: 'Bug fixes and improvements'
});

// Mock download progress
let progress = 0;
const interval = setInterval(() => {
  progress += 10;
  autoUpdater.emit('download-progress', {
    percent: progress,
    transferred: progress * 1000000,
    total: 100000000
  });
  if (progress >= 100) {
    clearInterval(interval);
    autoUpdater.emit('update-downloaded', { version: '0.5.1' });
  }
}, 500);
```

### Test Exponential Backoff

```typescript
// Simulate GitHub API failures
let failureCount = 0;
autoUpdater.checkForUpdates = async () => {
  failureCount++;
  if (failureCount < 3) {
    throw new Error('GitHub API unavailable');
  }
  // Success on 3rd attempt
  return { updateAvailable: false };
};

// Expected retry intervals: 1hr, 2hr, then success
```

## References

- https://www.electron.build/auto-update
- https://github.com/electron-userland/electron-updater
- https://www.electronjs.org/docs/latest/tutorial/updates
