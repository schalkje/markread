# Research: Packaging & Distribution Modernization

**Feature**: 002-packaging-modernization | **Date**: 2026-01-11

## Overview

This document consolidates research findings for modernizing MarkRead's packaging from legacy WPF/WiX to Electron-native infrastructure.

## Research Area 1: electron-builder Best Practices

### Investigation

**Question**: What are the best practices for configuring electron-builder with NSIS for Windows desktop applications?

**Findings**:

1. **NSIS vs Squirrel.Windows**
   - NSIS: Actively maintained, Windows-native installer, highly customizable, supports per-user and per-machine installs
   - Squirrel.Windows: Deprecated, no longer recommended for new projects
   - **Decision**: Use NSIS target in electron-builder

2. **Compression Strategies**
   - LZMA compression (maximum): Best compression ratio, slower but acceptable for desktop apps
   - 7z: Good balance, faster than LZMA
   - Normal: Fastest, largest size
   - **Decision**: Use `compression: maximum` (LZMA) for <100MB target (SC-003)

3. **File Associations**
   - electron-builder supports `fileAssociations` config
   - Automatically creates registry entries for .md and .markdown extensions
   - Requires `icon` property for custom file icons
   - Context menu "Open with MarkRead" added automatically
   - **Decision**: Configure fileAssociations in electron-builder.yml (FR-011)

4. **Portable .exe Setup**
   - Target: `portable` in win configuration
   - Behavior: Self-contained, no installation, runs from any location
   - Settings: Use electron-store with `portable: true` to store data relative to .exe
   - Auto-updates: Disable in portable mode (check `process.env.PORTABLE_EXECUTABLE_FILE`)
   - **Decision**: Build both NSIS installer and portable .exe (FR-006)

5. **ASAR Packaging**
   - Bundles app source into app.asar archive
   - Provides basic code protection (not encryption)
   - Improves load performance (fewer file system calls)
   - **Decision**: Enable `asar: true` (FR-006)

**References**:
- https://www.electron.build/configuration/configuration
- https://www.electron.build/configuration/nsis
- https://www.electron.build/configuration/win

---

## Research Area 2: Code Signing for Electron

### Investigation

**Question**: How should we implement code signing for Electron installers to pass Windows SmartScreen verification?

**Findings**:

1. **SHA256 Signing Requirements**
   - Windows requires SHA256 for SmartScreen trust
   - SHA1 deprecated and no longer accepted
   - Must include timestamp to remain valid after certificate expiration
   - **Decision**: Use SHA256 with DigiCert timestamp server (FR-008)

2. **Windows SDK signtool Integration**
   - signtool.exe location: `C:\Program Files (x86)\Windows Kits\10\bin\<version>\x64\signtool.exe`
   - Find latest SDK version automatically in script
   - Command: `signtool sign /sha1 <thumbprint> /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 <file>`
   - **Decision**: Create electron-sign.ps1 wrapper script (FR-008)

3. **Certificate Sources**
   - **Option A**: Windows Certificate Store (thumbprint-based)
     - Pros: Secure, no password needed, CI/CD friendly
     - Cons: Requires certificate pre-installed on build machine
   - **Option B**: PFX File (password-protected)
     - Pros: Portable, easy to distribute via GitHub Secrets
     - Cons: Password management, less secure than cert store
   - **Decision**: Support both options, check environment variables to determine source (FR-008)

4. **Certificate Expiration Handling**
   - Expired certificate: Signing fails immediately
   - Near-expiration (<30 days): Warning, build succeeds
   - Check expiration using: `Get-PfxCertificate` (PowerShell) or cert store query
   - **Decision**: Check expiration at build time, WARN if <30 days, FAIL if expired (FR-008)

5. **Verification After Signing**
   - Command: `signtool verify /pa /v <file>`
   - Checks certificate chain, timestamp, and signature validity
   - **Decision**: Always verify after signing (FR-008)

6. **Self-Signed Certificates (Development)**
   - Create: `New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=MarkRead Dev"`
   - Export: `Export-PfxCertificate -Cert ... -FilePath dev-cert.pfx`
   - Warning: Self-signed certs don't prevent SmartScreen warnings
   - **Decision**: Use self-signed for development, real cert for releases (clarification from user)

**References**:
- https://docs.microsoft.com/en-us/windows/win32/seccrypto/signtool
- https://www.electron.build/code-signing
- https://knowledge.digicert.com/solution/SO912.html (timestamping)

---

## Research Area 3: Auto-Update Patterns

### Investigation

**Question**: What's the best approach for implementing auto-updates with rollback support for Electron apps?

**Findings**:

1. **electron-updater vs Alternatives**
   - **electron-updater**: Official Electron ecosystem tool, GitHub Releases integration, differential updates
   - **Squirrel**: Older, more complex, less maintained
   - **Custom solution**: Reinventing the wheel, not recommended
   - **Decision**: Use electron-updater with GitHub Releases (FR-009)

2. **Update Check Strategy**
   - Check on startup: Delay 5s to avoid blocking app launch
   - Periodic checks: Every 4 hours in production mode
   - Skip in development: Check `app.isPackaged` or `process.env.NODE_ENV`
   - **Decision**: 5s startup delay + 4hr periodic (FR-009)

3. **Rollback Mechanisms**
   - electron-updater automatically keeps previous version in temp folder
   - On crash: Detect failed startup (app doesn't send "ready" event after timeout)
   - Rollback: Restore previous version from backup, log failure
   - Notification: Inform user about rollback with error details
   - **Decision**: Implement automatic rollback on startup crash (FR-009)

4. **GitHub API Resilience**
   - **Problem**: GitHub API outages or rate limiting
   - **Solution**: Exponential backoff retry strategy
   - **Intervals**: 1hr, 2hr, 4hr, then resume normal 4hr interval
   - **Logging**: Silent failure, log to %LOCALAPPDATA%\MarkRead\Logs
   - **Decision**: Implement exponential backoff (1hr, 2hr, 4hr) (FR-009)

5. **Differential Updates**
   - electron-updater supports blockmap-based differential updates
   - Requires .blockmap files published alongside installers
   - Reduces download size for incremental updates
   - **Decision**: Enable differential updates via electron-builder publish config (FR-006)

6. **Update Manifest (latest.yml)**
   - Generated by electron-builder during publish
   - Contains version, release date, download URLs, SHA512 checksums
   - Consumed by electron-updater for version checks
   - **Decision**: Automatically generated, no manual maintenance (FR-006)

**Code Pattern**:
```typescript
import { autoUpdater } from 'electron-updater';

// Skip in development
if (app.isPackaged) {
  // Startup check after 5s delay
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 5000);

  // Periodic checks every 4hr
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 4 * 60 * 60 * 1000);
}

// Exponential backoff on error
let retryInterval = 1 * 60 * 60 * 1000; // 1hr
autoUpdater.on('error', (error) => {
  log.error('Update check failed:', error);
  setTimeout(() => {
    autoUpdater.checkForUpdates();
    retryInterval = Math.min(retryInterval * 2, 4 * 60 * 60 * 1000); // max 4hr
  }, retryInterval);
});

// Reset backoff on success
autoUpdater.on('update-available', () => {
  retryInterval = 1 * 60 * 60 * 1000; // reset to 1hr
});
```

**References**:
- https://www.electron.build/auto-update
- https://github.com/electron-userland/electron-updater
- https://www.electronjs.org/docs/latest/tutorial/updates

---

## Research Area 4: CI/CD for Electron Apps

### Investigation

**Question**: How should we structure GitHub Actions workflows for Electron app CI/CD?

**Findings**:

1. **Workflow Separation**
   - **CI Workflow** (ci.yml): Runs on every push to main/develop
     - Type checking, linting, tests, build validation
     - Packages unsigned installer for smoke testing
   - **Release Workflow** (release.yml): Runs on version tags (v*.*.*)
     - All CI steps + code signing + GitHub Release creation
   - **Decision**: Two workflows - CI for validation, Release for distribution (FR-003, FR-005)

2. **Version Validation**
   - Common issue: package.json version doesn't match git tag
   - Check: Extract tag version (v0.5.1 → 0.5.1), compare with package.json
   - Action: Fail build if mismatch detected
   - **Decision**: Add version validation step in release workflow (FR-004)

3. **Artifact Generation**
   - Build metadata JSON: version, build date, commit SHA, Node/npm/Electron versions
   - Upload artifacts: signed installer, portable .exe, latest.yml, blockmap
   - Retention: 90 days for CI artifacts, permanent for releases
   - **Decision**: Generate build-metadata.json, upload all artifacts to GitHub Releases (FR-005, FR-012)

4. **Release Automation**
   - Trigger: Push tag matching `v*.*.*`
   - GitHub Release: Create automatically with release notes from CHANGELOG.md
   - Assets: Attach installer, portable .exe, latest.yml, blockmap, build-metadata.json
   - **Decision**: Fully automated release creation (FR-005)

5. **Secret Management**
   - Code signing certificate: Store PFX file or thumbprint in GitHub Secrets
   - Password: Store in GitHub Secrets (PFX_PASSWORD)
   - Environment variables: Injected into build environment
   - **Decision**: Use GitHub Secrets for certificate credentials (FR-013)

6. **Build Performance**
   - Target: <10 minutes from push to published release (SC-007)
   - Optimize: Cache npm dependencies, parallel jobs where possible
   - Bottleneck: Code signing and installer compression (unavoidable)
   - **Decision**: Optimize with dependency caching (SC-007)

**Workflow Structure**:
```yaml
# ci.yml
name: CI
on:
  push:
    branches: [main, develop]
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - run: npm run package  # unsigned
      - uses: actions/upload-artifact@v4
        with:
          name: installer-unsigned
          path: dist/*.exe

# release.yml
name: Release
on:
  push:
    tags: ['v*.*.*']
jobs:
  release:
    runs-on: windows-latest
    steps:
      # ... similar CI steps ...
      - name: Validate version
        run: |
          $tag = "${{ github.ref_name }}" -replace '^v', ''
          $pkgVersion = (Get-Content package.json | ConvertFrom-Json).version
          if ($tag -ne $pkgVersion) {
            throw "Version mismatch: tag=$tag, package.json=$pkgVersion"
          }
      - name: Sign and publish
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PFX_PATH: ${{ secrets.PFX_PATH }}
          PFX_PASSWORD: ${{ secrets.PFX_PASSWORD }}
        run: npm run publish  # electron-builder publish
```

**References**:
- https://www.electron.build/configuration/publish
- https://docs.github.com/en/actions/publishing-packages/about-packaging-with-github-actions

---

## Research Area 5: NSIS Installer Customization

### Investigation

**Question**: How can we customize the NSIS installer for MarkRead's specific requirements?

**Findings**:

1. **Installation Directory Selection**
   - Default: `%LOCALAPPDATA%\Programs\MarkRead` (per-user)
   - Option: Allow user to change directory during installation
   - Config: `allowToChangeInstallationDirectory: true`
   - **Decision**: Allow custom installation directory (FR-007)

2. **Per-User vs System Installation**
   - Per-user (`perMachine: false`): No admin rights required, installs to %LOCALAPPDATA%
   - Per-machine (`perMachine: true`): Requires admin, installs to Program Files
   - Recommendation: Per-user default, optional elevation for system-wide
   - **Decision**: Per-user by default with optional elevation (FR-007)

3. **License Agreement Display**
   - Format: RTF file (assets/License.rtf)
   - Display: Shown during installation before directory selection
   - Required: User must accept to proceed
   - **Decision**: Display license from assets/License.rtf (FR-007, FR-014)

4. **Shortcuts Creation**
   - Desktop shortcut: `createDesktopShortcut: true`
   - Start menu shortcut: `createStartMenuShortcut: true`
   - User preference: Can be deselected during installation
   - **Decision**: Create both shortcuts by default (FR-007)

5. **Installer UI Customization**
   - Installer banner: 493x58px BMP (top of installer window)
   - Installer sidebar: 493x312px BMP (left side of installer window)
   - Icons: .ico format for installer/uninstaller
   - Config: `installerHeader`, `installerSidebar`, `installerIcon`
   - **Decision**: Use assets/installer-banner.bmp and assets/installer-dialog.bmp (FR-014)

6. **Uninstallation Behavior**
   - App data preservation: `deleteAppDataOnUninstall: false`
   - Registry cleanup: File associations and context menu entries removed
   - Logs: Optionally keep %LOCALAPPDATA%\MarkRead\Logs for diagnostics
   - **Decision**: Preserve user data, clean registry entries (FR-007)

7. **One-Click vs Custom Installer**
   - One-click: Silent installation, no user interaction, fast
   - Custom: User chooses directory, shortcuts, sees license
   - Recommendation: Custom installer for desktop apps (users expect control)
   - **Decision**: Custom installer (`oneClick: false`) (FR-007)

**electron-builder.yml Config**:
```yaml
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  perMachine: false  # Per-user by default
  allowElevation: true  # Prompt if system-wide requested
  createDesktopShortcut: true
  createStartMenuShortcut: true
  license: assets/License.rtf
  installerIcon: assets/icon.ico
  uninstallerIcon: assets/icon.ico
  installerHeader: assets/installer-banner.bmp
  installerSidebar: assets/installer-dialog.bmp
  deleteAppDataOnUninstall: false  # Preserve user data
```

**References**:
- https://www.electron.build/configuration/nsis
- https://nsis.sourceforge.io/Docs/

---

## Research Area 6: Portable Executable Behavior

### Investigation

**Question**: How should the portable .exe variant differ from the installed version?

**Findings**:

1. **No Installation Required**
   - Runs directly from any location (USB drive, network share, Downloads folder)
   - No registry modifications
   - No file associations
   - No start menu or desktop shortcuts
   - **Decision**: Completely self-contained, zero system modifications (FR-006)

2. **Settings Storage**
   - electron-store with `portable: true` option
   - Stores settings in `./portable-data/` relative to .exe location
   - Detectable via `process.env.PORTABLE_EXECUTABLE_FILE` (set by electron-builder)
   - **Decision**: Store settings in local portable folder (FR-006)

3. **Auto-Updates Disabled**
   - Portable apps can't auto-update (file in use, no write permissions)
   - Detect portable mode: `if (process.env.PORTABLE_EXECUTABLE_FILE)`
   - Skip update checks entirely in portable mode
   - **Decision**: Disable auto-updates in portable mode (FR-006)

4. **Feature Parity**
   - Core functionality: Identical to installed version
   - Disabled features: Auto-updates, file associations, context menu
   - Enabled features: All app functionality, local settings, file opening
   - **Decision**: Full feature parity except system integrations (FR-006)

5. **Use Cases**
   - USB drives for portable use
   - Shared computers without admin rights
   - Restricted environments (corporate, educational)
   - Testing before installation
   - **Decision**: Support all use cases above (clarification from user)

**Code Pattern**:
```typescript
// Detect portable mode
const isPortable = !!process.env.PORTABLE_EXECUTABLE_FILE;

// Configure electron-store
const store = new Store({
  name: 'config',
  cwd: isPortable ? path.join(app.getPath('exe'), '..', 'portable-data') : undefined
});

// Skip auto-updates in portable mode
if (!isPortable && app.isPackaged) {
  autoUpdater.checkForUpdates();
}
```

**References**:
- https://www.electron.build/configuration/nsis#portable
- https://github.com/sindresorhus/electron-store#options

---

## Research Area 7: Error Logging and Diagnostics

### Investigation

**Question**: How should we implement structured logging for installer failures and diagnostics?

**Findings**:

1. **Log File Location**
   - Windows standard: `%LOCALAPPDATA%\MarkRead\Logs\`
   - Survives uninstallation: Yes (useful for post-mortem diagnostics)
   - Accessible without admin rights: Yes
   - **Decision**: Use %LOCALAPPDATA%\MarkRead\Logs (FR-015)

2. **Structured Log Format**
   - Format: JSON or plain text with consistent structure
   - Fields: timestamp (ISO 8601), level (INFO/WARN/ERROR), errorCode, message, stackTrace
   - Filename: `install-{timestamp}.log` or `update-{timestamp}.log`
   - **Decision**: Structured format with timestamps and error codes (FR-015)

3. **User-Facing Error Dialogs**
   - Display: Modal dialog on installation failure
   - Content: Error code, brief message, log file path
   - Action: User can copy path, open log directory, report issue
   - **Decision**: Show error dialog with log path and error code (FR-015)

4. **Error Codes**
   - DISK_SPACE_INSUFFICIENT: Not enough disk space for installation
   - PERMISSION_DENIED: Insufficient permissions
   - CERT_EXPIRED: Code signing certificate expired
   - DOWNLOAD_FAILED: Update download failed (network issue)
   - UPDATE_ROLLBACK: Update failed, rolled back to previous version
   - **Decision**: Define standard error codes for common failures (FR-015)

5. **Logging in NSIS Installer**
   - NSIS script: Custom install script with logging
   - electron-builder limitation: Limited access to NSIS internals
   - Workaround: Log from app's main process after installation starts
   - **Decision**: Log from Electron app, not NSIS script (FR-015)

6. **Log Rotation**
   - Keep: Last 10 log files
   - Delete: Older logs automatically
   - Size limit: No individual file size limit (installers are fast)
   - **Decision**: Rotate logs, keep last 10 (not explicitly in FR, good practice)

**Code Pattern**:
```typescript
// Logger utility
import * as fs from 'fs';
import * as path from 'path';

class InstallLogger {
  private logPath: string;

  constructor() {
    const logsDir = path.join(app.getPath('appData'), 'MarkRead', 'Logs');
    fs.mkdirSync(logsDir, { recursive: true });
    this.logPath = path.join(logsDir, `install-${new Date().toISOString().replace(/:/g, '-')}.log`);
  }

  log(level: 'INFO' | 'WARN' | 'ERROR', errorCode: string, message: string, stackTrace?: string) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      errorCode,
      message,
      stackTrace
    };
    fs.appendFileSync(this.logPath, JSON.stringify(entry) + '\n');
  }

  showErrorDialog(errorCode: string, message: string) {
    dialog.showErrorBox(
      `Installation Error: ${errorCode}`,
      `${message}\n\nLog file: ${this.logPath}`
    );
  }
}
```

**References**:
- https://www.electronjs.org/docs/latest/api/app#appgetpathname
- https://nodejs.org/api/fs.html

---

## Summary of Key Decisions

| Decision | Tool/Pattern | Rationale |
|----------|-------------|-----------|
| NSIS packaging | electron-builder with NSIS target | Windows-native, actively maintained, customizable |
| Code signing | Windows SDK signtool with SHA256 | Standard Microsoft tool, SmartScreen compatible |
| Auto-updates | electron-updater + GitHub Releases | Electron ecosystem standard, differential updates |
| Update resilience | Exponential backoff (1hr, 2hr, 4hr) | Prevents API hammering, user-friendly |
| Rollback strategy | Automatic revert on startup crash | Safety net for failed updates |
| Portable .exe | electron-builder portable target | No-install option for restricted environments |
| Installer logging | %LOCALAPPDATA%\MarkRead\Logs | Standard location, survives uninstallation |
| Certificate lifecycle | Expiration check at build time | Prevents release blockers |
| CI/CD workflows | Separate CI and Release workflows | Clear separation of validation and distribution |
| Compression | LZMA (maximum) | <100MB target size |

## Next Steps

Proceed to Phase 1 (Design & Contracts) to:
1. Define data models for build artifacts and certificates
2. Create CI/CD workflow contracts
3. Design electron-builder.yml configuration
4. Write quickstart guide for local development
