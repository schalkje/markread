# Implementation Plan: Packaging & Distribution Modernization

**Branch**: `002-packaging-modernization` | **Date**: 2026-01-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-packaging-modernization/spec.md`

**Note**: This plan is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Modernize MarkRead's packaging and distribution from legacy WPF/WiX infrastructure to Electron-native tooling using electron-builder with NSIS. This includes removing ~6.5MB of obsolete .NET artifacts, establishing functional CI/CD pipelines for automated releases, implementing code signing with certificate lifecycle management, providing auto-update functionality with rollback capabilities, and delivering both NSIS installer and portable .exe variants with comprehensive error logging and diagnostics.

## Technical Context

**Language/Version**: TypeScript 5.7 / Node.js 20+ with Electron 33.4.11+
**Primary Dependencies**: electron-builder (NSIS packaging), electron-updater (auto-updates), GitHub Actions (CI/CD), Windows SDK signtool (code signing)
**Storage**: File system (logs in %LOCALAPPDATA%\MarkRead\Logs, portable settings in local folder), GitHub Releases (distribution)
**Testing**: Jest/Vitest (unit tests), npm run lint (ESLint), npm run type-check (TypeScript), manual installer smoke testing
**Target Platform**: Windows x64 (per-user installation with optional elevation), desktop application
**Project Type**: Single Electron desktop application with main/renderer processes
**Performance Goals**: Installer <100MB with LZMA compression, installation <30s, build-to-release <10min, auto-update check <5s
**Constraints**: Windows SmartScreen compatible (code signing required), installer logging for diagnostics, previous version backup for rollback, exponential backoff for GitHub API failures
**Scale/Scope**: Single-user desktop application, ~7 user stories, 15 functional requirements, CI/CD automation for releases

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality ✅ PASS

- Clean, maintainable scripts for packaging (electron-sign.ps1, release.ps1)
- Tests for critical functionality (CI workflow validation, installer smoke tests)
- Linting/formatting via ESLint and TypeScript type checking in CI
- Complex decisions documented inline (certificate handling, exponential backoff logic)

**Rationale**: Packaging infrastructure is foundational; clean code ensures reliable releases.

### II. User Experience Consistency ✅ PASS

- Clear error messages (installer logs with error codes and file paths)
- Consistent terminology (NSIS installer vs portable .exe, auto-update vs manual download)
- Settings easy to find (portable .exe stores settings in local folder, installer uses %LOCALAPPDATA%)
- Auto-update rollback provides safety net for failed updates

**Rationale**: Users need clear feedback during installation failures and update issues.

### III. Documentation Standard ✅ PASS

- README updates to explain Electron packaging (vs legacy WiX)
- electron-builder.yml configuration well-documented
- Non-obvious design decisions documented (exponential backoff intervals, certificate expiration thresholds)
- Simple, up-to-date docs rather than comprehensive but stale

**Rationale**: Packaging changes are significant; documentation helps maintain context.

### IV. Performance Requirements ✅ PASS

- Application startup unchanged (packaging modernization doesn't affect app startup)
- UI responsiveness unchanged (packaging modernization doesn't affect runtime)
- Memory usage unchanged (packaging modernization doesn't affect runtime)
- CI/CD performance explicitly tracked (<10min build-to-release, SC-007)

**Rationale**: Packaging modernization improves distribution but shouldn't degrade runtime performance.

**Overall**: ✅ ALL GATES PASS - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/002-packaging-modernization/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (packaging tools research)
├── data-model.md        # Phase 1 output (build artifacts, release entities)
├── quickstart.md        # Phase 1 output (how to build/release)
├── contracts/           # Phase 1 output (CI/CD workflow contracts, electron-builder config)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created yet)
```

### Source Code (repository root)

```text
# Electron desktop application structure (existing)
src/
├── main/               # Electron main process
├── renderer/           # Electron renderer process (React)
├── preload/            # Electron preload scripts
└── shared/             # Shared utilities

# Packaging infrastructure (new/modified)
scripts/
├── electron-sign.ps1   # Code signing script (replaces sign-msi.ps1)
└── release.ps1         # Release automation (modernized for Electron)

assets/
├── icon.ico            # Application icon
├── icon.png            # Package icon
├── installer-banner.bmp
├── installer-dialog.bmp
└── License.rtf

.github/workflows/
├── ci.yml              # CI workflow (modernized for Electron)
└── release.yml         # Release workflow (modernized for Electron)

# Build configuration
electron-builder.yml    # Packaging configuration (replaces WiX)
package.json            # npm scripts for build/package/release

# Removed legacy artifacts
installer/              # [TO BE DELETED] WiX project files (~6.5MB)
```

**Structure Decision**: Single Electron desktop application with main/renderer processes. Packaging infrastructure lives in /scripts and /.github/workflows. electron-builder.yml replaces legacy WiX configuration. The installer/ directory containing WPF/WiX artifacts will be completely removed as part of this feature (FR-001).

## Complexity Tracking

> **No violations requiring justification** - All constitution gates pass.

## Phase 0: Research & Technology Choices

*See [research.md](research.md) for detailed findings*

### Research Tasks

1. **electron-builder best practices** - NSIS configuration, compression strategies, file associations, portable .exe setup
2. **Code signing for Electron** - SHA256 signing, timestamp servers, certificate expiration checks, Windows SDK signtool integration
3. **Auto-update patterns** - electron-updater library, GitHub Releases integration, rollback strategies, exponential backoff for API failures
4. **CI/CD for Electron apps** - GitHub Actions workflows, version validation, artifact generation, release automation
5. **NSIS installer customization** - Custom directories, license display, desktop/start menu shortcuts, per-user vs system installation
6. **Portable executable behavior** - No registry modifications, local settings storage, feature differences from installer
7. **Error logging and diagnostics** - Structured log formats, log file locations, user-facing error dialogs with error codes

### Key Decisions

**Decision 1: Use electron-builder with NSIS**
- **Rationale**: Electron-native tool, well-maintained, NSIS provides Windows-specific customization (vs Squirrel.Windows which is deprecated)
- **Alternatives**: Squirrel.Windows (deprecated), electron-winstaller (less flexible), custom MSI via WiX (legacy approach being replaced)

**Decision 2: Code signing with Windows SDK signtool**
- **Rationale**: Standard Microsoft tool, supports SHA256 and timestamping, integrates with Windows Certificate Store and PFX files
- **Alternatives**: osslsigncode (Linux-based, less reliable for Windows), SignTool GUI wrappers (not CI/CD friendly)

**Decision 3: Auto-updates via electron-updater + GitHub Releases**
- **Rationale**: Built-in Electron ecosystem tool, seamless GitHub integration, supports differential updates, handles version checks
- **Alternatives**: Manual update checks with custom code (more work, reinventing wheel), external update services (cost, complexity)

**Decision 4: Exponential backoff for GitHub API failures**
- **Rationale**: Prevents hammering API during outages, user-friendly (no annoying error notifications), standard pattern for API resilience
- **Intervals**: 1hr, 2hr, 4hr, then resume normal 4hr interval
- **Alternatives**: Fixed retry interval (less resilient), immediate user notification (annoying for transient failures), no retry (poor UX)

**Decision 5: Installer logging to %LOCALAPPDATA%\MarkRead\Logs**
- **Rationale**: Standard Windows location for app logs, survives uninstallation for diagnostics, accessible without admin rights
- **Format**: Structured logs with timestamps, error codes, diagnostic details
- **Alternatives**: Windows Event Viewer (harder for users to access), in-memory only (lost on crash), registry (wrong use case)

## Phase 1: Design & Contracts

*See [data-model.md](data-model.md) and [contracts/](contracts/) for detailed designs*

### Data Model

**Entity: Release Artifact**
- `version` (semver string) - e.g., "0.5.1"
- `buildDate` (ISO 8601 timestamp)
- `commitSHA` (git commit hash)
- `nodeVersion` (string)
- `npmVersion` (string)
- `electronVersion` (string)
- `installerPath` (file path) - MarkRead-Setup-0.5.1.exe
- `portablePath` (file path) - MarkRead-0.5.1-portable.exe
- `blockMapPath` (file path) - MarkRead-Setup-0.5.1.exe.blockmap
- `updateManifestPath` (file path) - latest.yml
- Relationships: Has one Code Signing Certificate, Published to GitHub Release

**Entity: Code Signing Certificate**
- `source` (enum: PFX_FILE | CERT_STORE)
- `thumbprint` (string, for CERT_STORE)
- `pfxPath` (string, for PFX_FILE)
- `password` (secure string, from env variable)
- `expirationDate` (date)
- `subjectName` (string)
- Validation: Must check expiration <30 days, must verify after signing

**Entity: Update Manifest (latest.yml)**
- `version` (semver string)
- `releaseDate` (ISO 8601 timestamp)
- `downloadUrl` (GitHub Releases URL)
- `sha512` (checksum for integrity)
- Generated by: electron-builder publish phase
- Consumed by: electron-updater in production mode

**Entity: Installation Log Entry**
- `timestamp` (ISO 8601)
- `level` (enum: INFO | WARN | ERROR)
- `errorCode` (string, e.g., "DISK_SPACE_INSUFFICIENT")
- `message` (string)
- `stackTrace` (optional string)
- Location: %LOCALAPPDATA%\MarkRead\Logs\install-{timestamp}.log

**Entity: Portable Settings**
- `location` (relative to .exe, e.g., "./portable-data/settings.json")
- `features` (disabled: auto-updates, file associations, registry writes)
- Behavior: All app state stored locally, no system modifications

### Contracts

**Contract 1: CI Workflow (ci.yml)**

```yaml
# Trigger: Push to main/develop branches
# Steps:
#   1. Checkout code
#   2. Setup Node.js 20
#   3. npm install
#   4. npm run type-check (FAIL on errors)
#   5. npm run lint (FAIL on errors)
#   6. npm test (FAIL on failures)
#   7. npm run build (FAIL on build errors)
#   8. npm run package (unsigned, smoke test only)
#   9. Upload artifacts for review
```

**Contract 2: Release Workflow (release.yml)**

```yaml
# Trigger: Push tag matching v*.*.*
# Prerequisites:
#   - Version in package.json matches tag
#   - Code signing certificate available (GitHub Secrets)
#   - All tests pass
# Steps:
#   1. Validate version match (FAIL if mismatch)
#   2. Run CI steps (type-check, lint, test, build)
#   3. Check certificate expiration (WARN if <30 days, FAIL if expired)
#   4. Sign installer with signtool
#   5. Verify signature (FAIL if invalid)
#   6. Generate build-metadata.json
#   7. Create GitHub Release
#   8. Upload signed installer, portable .exe, latest.yml, blockmap
```

**Contract 3: electron-builder Configuration (electron-builder.yml)**

```yaml
appId: com.markread.app
productName: MarkRead
directories:
  output: dist
  buildResources: assets

win:
  target:
    - target: nsis
      arch: x64
    - target: portable
      arch: x64
  icon: assets/icon.ico
  artifactName: ${productName}-${version}-${arch}.${ext}
  sign: scripts/electron-sign.ps1
  publisherName: MarkRead Project

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  perMachine: false  # Per-user by default
  createDesktopShortcut: true
  createStartMenuShortcut: true
  license: assets/License.rtf
  installerIcon: assets/icon.ico
  uninstallerIcon: assets/icon.ico
  installerHeader: assets/installer-banner.bmp
  installerSidebar: assets/installer-dialog.bmp
  deleteAppDataOnUninstall: false  # Preserve user data

portable:
  artifactName: ${productName}-${version}-portable.${ext}

compression: maximum  # LZMA

asar: true

fileAssociations:
  - ext: md
    name: Markdown File
    description: Markdown Document
    icon: assets/icon.ico
    role: Editor
  - ext: markdown
    name: Markdown File
    description: Markdown Document
    icon: assets/icon.ico
    role: Editor

publish:
  provider: github
  releaseType: release
```

**Contract 4: Code Signing Script (electron-sign.ps1)**

```powershell
# Input: $Path (file to sign)
# Environment Variables:
#   - CERT_THUMBPRINT (for certificate store)
#   - PFX_PATH + PFX_PASSWORD (for PFX file)
#   - TIMESTAMP_SERVER (default: http://timestamp.digicert.com)
# Steps:
#   1. Locate signtool.exe from Windows SDK
#   2. Load certificate (store or PFX)
#   3. Check expiration date (WARN if <30 days, FAIL if expired)
#   4. Sign with SHA256 and timestamp
#   5. Verify signature
#   6. Output success/failure
```

**Contract 5: Auto-Update API (electron-updater)**

```typescript
// Check for updates on startup (5s delay) and every 4hr
interface UpdateCheckResult {
  updateAvailable: boolean;
  version?: string;
  releaseNotes?: string;
  downloadUrl?: string;
}

// On failure: log error, retry with exponential backoff (1hr, 2hr, 4hr)
// On success: resume normal 4hr interval
// On crash after update: rollback to previous version backup
```

### Quickstart

*See [quickstart.md](quickstart.md) for step-by-step guide*

**Build Installer Locally:**
```bash
npm install
npm run type-check
npm run lint
npm test
npm run build
npm run package  # Outputs to dist/
```

**Create a Release:**
```bash
.\scripts\release.ps1 -NewVersion "0.5.1"
# Follow prompts to edit CHANGELOG.md
# Script runs tests, creates commit/tag, provides push instructions
git push origin main --tags
# GitHub Actions release workflow triggers automatically
```

**Test Portable .exe:**
```bash
# Find in dist/ after packaging
# Run directly, no installation
# Settings stored in ./portable-data/
```

## Phase 2: Task Breakdown

*Tasks will be generated by the `/speckit.tasks` command (not part of this plan)*

**Note**: The `/speckit.tasks` command will generate [tasks.md](tasks.md) with specific implementation tasks based on this plan and the feature specification.

---

## Summary

This plan modernizes MarkRead's packaging infrastructure from legacy WPF/WiX to Electron-native tooling. Key deliverables:

1. **Phase 0 (Research)**: Technology choices documented in [research.md](research.md)
2. **Phase 1 (Design)**: Data models, contracts, and quickstart guide
3. **Phase 2 (Implementation)**: Tasks generated by `/speckit.tasks` command

**Next Steps**: Review this plan, then run `/speckit.tasks` to generate the implementation task list.

**Estimated Effort**: 7 user stories, 15 functional requirements, ~10-15 implementation tasks (to be generated)

**Risk Mitigation**:
- Certificate expiration monitoring prevents release blockers
- Auto-update rollback prevents users being stuck with broken versions
- Exponential backoff prevents API hammering during GitHub outages
- Structured logging enables user self-service diagnostics
- Portable .exe provides no-install option for restricted environments
