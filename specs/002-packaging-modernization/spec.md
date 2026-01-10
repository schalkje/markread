# Feature Specification: Packaging & Distribution Modernization

**Feature Branch**: `002-packaging-modernization`
**Created**: 2026-01-10
**Status**: Draft
**Input**: User description: "Modernize MarkRead packaging and distribution from legacy WPF/WiX to Electron-native infrastructure"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clean Legacy Artifacts (Priority: P1)

As a developer, I want to remove all legacy WPF packaging artifacts from the codebase so that the repository is clean, maintainable, and only contains relevant Electron packaging infrastructure.

**Why this priority**: This is foundational work that must happen first before modernizing the packaging. Keeping legacy artifacts creates confusion, bloats the repository, and may interfere with new packaging workflows. This is a prerequisite for all other packaging improvements.

**Independent Test**: Can be fully tested by verifying that the installer/ directory and all WiX-related files are deleted, .gitignore is updated to remove .NET entries, and the repository is cleaned of ~6.5MB of obsolete artifacts. Delivers immediate value by reducing repository size and eliminating confusion.

**Acceptance Scenarios**:

1. **Given** the repository contains legacy WPF artifacts, **When** cleanup is executed, **Then** the installer/ directory (including MarkRead.Installer.wixproj, Package.wxs, and all build artifacts totaling ~6.5MB) is completely removed
2. **Given** .gitignore contains .NET-specific entries, **When** cleanup is executed, **Then** .gitignore is updated to remove WPF/.NET entries while preserving Electron entries
3. **Given** scripts/sign-msi.ps1 exists for MSI signing, **When** cleanup is executed, **Then** the MSI-specific signing script is removed as it's no longer applicable
4. **Given** v0.4.1 MSI installer exists, **When** cleanup is executed, **Then** the legacy MSI is archived to GitHub Releases for historical reference

---

### User Story 2 - Functional CI/CD Pipelines (Priority: P1)

As a developer, I want functional CI/CD pipelines that build and test Electron installers so that releases are automated, reliable, and follow Electron best practices.

**Why this priority**: Currently, the CI/CD pipelines reference non-existent .NET SDK and WiX installations, making them completely non-functional for Electron builds. This blocks the entire release process and is critical infrastructure that must work before any releases can happen.

**Independent Test**: Can be fully tested by creating a test tag (e.g., v0.5.1-beta.1), verifying the GitHub Actions workflow successfully builds an unsigned Electron .exe, runs tests, performs type checking, and produces build artifacts. Delivers immediate value by restoring the ability to create releases.

**Acceptance Scenarios**:

1. **Given** a code push to main or develop branch, **When** CI workflow triggers, **Then** the workflow installs Node.js dependencies, runs tests, performs type checking, runs linting, builds the Electron application, and packages an unsigned .exe for smoke testing
2. **Given** a new version tag is pushed (e.g., v0.5.1), **When** release workflow triggers, **Then** the workflow builds a signed Electron installer, verifies the digital signature, generates build metadata, creates a GitHub release, and uploads the installer as a release asset
3. **Given** version mismatch between package.json and git tag, **When** release workflow runs, **Then** the workflow fails with a clear error message indicating the version discrepancy
4. **Given** tests fail during CI/release workflow, **When** the failure occurs, **Then** the workflow stops and does not proceed to packaging or release

---

### User Story 3 - Code Signed Installers (Priority: P2)

As a user downloading MarkRead, I want digitally signed installers so that I can trust the application is authentic and Windows SmartScreen does not block the installation.

**Why this priority**: Code signing directly impacts user trust and installation success rates. Without it, Windows SmartScreen warns users, creating friction and reducing adoption. However, this can be implemented after basic CI/CD is functional, as unsigned builds work for testing.

**Independent Test**: Can be fully tested by running a packaged installer through Windows SmartScreen and signtool verification, confirming zero warnings and valid certificate chain. Delivers value by enabling smooth installation experience for end users.

**Acceptance Scenarios**:

1. **Given** a build is packaged with code signing configured, **When** the installer is created, **Then** the .exe is digitally signed with SHA256 using a valid certificate from the Windows Certificate Store or PFX file
2. **Given** a signed installer is run on Windows, **When** a user executes the .exe, **Then** Windows SmartScreen does not display warnings and shows the verified publisher name
3. **Given** certificate credentials are missing or invalid, **When** the signing script runs, **Then** it fails with a clear error message indicating the certificate issue
4. **Given** a signed installer, **When** signature verification is performed, **Then** signtool verify confirms the signature is valid with a trusted certificate chain and timestamp

---

### User Story 4 - Auto-Update Functionality (Priority: P2)

As a user of MarkRead, I want automatic update notifications and seamless update installation so that I always have the latest features and security fixes without manual downloads.

**Why this priority**: Auto-updates significantly improve user experience and ensure users stay current with security patches. This is high value but can be implemented after core packaging works, as users can manually download new versions initially.

**Independent Test**: Can be fully tested by running MarkRead v0.5.0, publishing v0.5.1 to GitHub Releases, and verifying the app detects the update, downloads it in the background, and prompts the user to restart and install. Delivers major value by reducing user friction for staying current.

**Acceptance Scenarios**:

1. **Given** MarkRead is running in production mode, **When** the app starts, **Then** it checks for updates from GitHub Releases after a 5-second delay and every 4 hours thereafter
2. **Given** a new version is available on GitHub Releases, **When** update check runs, **Then** the app displays a notification to the user showing the new version number and release notes with options to download now or dismiss
3. **Given** user chooses to download an update, **When** download starts, **Then** the app displays download progress (percent, transferred bytes, total bytes) and allows the user to continue working
4. **Given** update download completes, **When** download finishes, **Then** the app displays a notification offering to restart and install immediately or install on next quit, and preserves the downloaded update for next launch
5. **Given** MarkRead is running in development mode, **When** update check runs, **Then** the check is skipped with a log message indicating development mode

---

### User Story 5 - Enhanced electron-builder Configuration (Priority: P2)

As a developer, I want a comprehensive electron-builder configuration that follows best practices so that installers are optimized, secure, and ready for cross-platform distribution.

**Why this priority**: The current electron-builder.yml is basic and missing critical features like compression, file associations, NSIS customization, and auto-update endpoints. Enhancing it improves installer quality but isn't blocking for initial releases.

**Independent Test**: Can be fully tested by running `npm run package`, verifying the output includes NSIS installer with correct settings, portable .exe variant, ASAR packaging, maximum compression, file associations configured, and latest.yml for auto-updates. Delivers value through professional-quality installers.

**Acceptance Scenarios**:

1. **Given** electron-builder.yml is configured with maximum compression, **When** packaging runs, **Then** the installer uses LZMA compression and is under 100MB in size
2. **Given** NSIS configuration specifies non-one-click installer, **When** user runs the installer, **Then** they can choose the installation directory, see license agreement, and choose desktop/start menu shortcuts
3. **Given** file associations are configured for .md and .markdown, **When** installer completes, **Then** Windows registry entries associate these extensions with MarkRead and show custom icons
4. **Given** publish configuration targets GitHub, **When** packaging runs with GH_TOKEN, **Then** latest.yml is generated with correct release URLs for auto-update discovery
5. **Given** ASAR packaging is enabled, **When** the app is packaged, **Then** source code is bundled into app.asar for basic protection while still allowing Electron to load resources efficiently

---

### User Story 6 - Modernized Release Scripts (Priority: P3)

As a developer creating a release, I want modernized PowerShell release scripts that work with Electron's package.json versioning so that the release process is streamlined and error-free.

**Why this priority**: The current release.ps1 references non-existent Directory.Build.props from the .NET era. While problematic, developers can manually handle releases initially, making this lower priority than core packaging infrastructure.

**Independent Test**: Can be fully tested by running `.\scripts\release.ps1 -NewVersion "0.5.1" -DryRun`, verifying it reads package.json version, updates version correctly, prompts for CHANGELOG.md edits, runs tests/lint/build, creates git commit and tag, and provides clear instructions for pushing. Delivers value through release automation.

**Acceptance Scenarios**:

1. **Given** a developer runs the release script with a new version, **When** script executes, **Then** it validates the version format (semver), updates package.json version, prompts to edit CHANGELOG.md, runs tests and linting, builds the application, creates a git commit and tag, and provides push commands
2. **Given** tests fail during release script execution, **When** failure occurs, **Then** the script aborts with a clear error message and does not create commits or tags
3. **Given** release script is run in dry-run mode, **When** script executes, **Then** it performs all validation and displays what would happen without making any actual file changes, git commits, or pushes
4. **Given** the same version already exists in CHANGELOG.md, **When** release script runs, **Then** it warns the developer and allows them to decide whether to continue

---

### User Story 7 - File Associations & Context Menu (Priority: P3)

As a user, I want .md and .markdown files to be associated with MarkRead with "Open with MarkRead" in the context menu so that I can easily open markdown files with a double-click or right-click.

**Why this priority**: File associations enhance user experience but are not critical for the app to function. Users can still manually open files from within the app initially, making this a nice-to-have feature for a later phase.

**Independent Test**: Can be fully tested by installing MarkRead, right-clicking a .md file to verify "Open with MarkRead" appears in the context menu, and double-clicking a .md file to verify it opens in MarkRead. Delivers value through improved workflow integration.

**Acceptance Scenarios**:

1. **Given** MarkRead installer completes, **When** installation finishes, **Then** Windows registry entries are created associating .md and .markdown extensions with MarkRead and adding "Open with MarkRead" to the file context menu
2. **Given** a .md file exists on the system, **When** user double-clicks it, **Then** MarkRead launches and opens the file
3. **Given** a markdown file is right-clicked, **When** context menu appears, **Then** "Open with MarkRead" option is visible with the MarkRead icon
4. **Given** MarkRead is uninstalled, **When** uninstallation completes, **Then** all registry entries for file associations and context menu items are removed cleanly

---

### Edge Cases

- What happens when electron-builder encounters a corrupted icon.ico file during packaging?
- How does the system handle code signing when the certificate has expired?
- What occurs if GitHub Releases API is unavailable during auto-update check?
- How does the installer behave when a newer version is already installed?
- What happens if npm run build fails partway through due to out-of-memory errors?
- How does auto-update handle network interruption during download?
- What occurs when the user lacks sufficient disk space for update download?
- How does the system handle concurrent installations on the same machine?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST remove all legacy WPF packaging artifacts including the installer/ directory (~6.5MB), WiX project files, and MSI-specific signing scripts
- **FR-002**: System MUST update .gitignore to remove .NET-specific entries while preserving Electron-specific ignore patterns
- **FR-003**: CI workflow MUST install Node.js 20 dependencies, run tests, perform TypeScript type checking, run ESLint, build the Electron application, and package an unsigned installer for smoke testing
- **FR-004**: Release workflow MUST verify package.json version matches the git tag version before proceeding with packaging
- **FR-005**: Release workflow MUST build Electron application, sign the installer with a valid code signing certificate using SHA256 algorithm, verify the digital signature, generate build metadata JSON, and create a GitHub Release with the signed installer
- **FR-006**: electron-builder.yml MUST be configured with maximum LZMA compression, ASAR packaging enabled, file associations for .md and .markdown extensions, NSIS installer targeting Windows x64, portable .exe variant, and publish configuration for GitHub Releases auto-updates
- **FR-007**: NSIS installer MUST support custom installation directory selection, create desktop and start menu shortcuts, display license agreement, install per-user by default with optional elevation, and preserve user data on uninstallation
- **FR-008**: Code signing script (scripts/electron-sign.ps1) MUST locate signtool.exe from Windows SDK, sign .exe files with certificate from environment variables (PFX file or certificate store thumbprint), use SHA256 hash algorithm, include timestamp from DigiCert timestamp server, and verify signature after signing
- **FR-009**: Auto-update functionality MUST check for updates 5 seconds after app launch and every 4 hours, query GitHub Releases for latest version, download updates in the background with progress reporting, display notifications for available/downloaded updates, allow users to install immediately or defer, and skip update checks in development mode
- **FR-010**: Release script (scripts/release.ps1) MUST read/update package.json version, validate semver format, prompt for CHANGELOG.md editing, run tests and linting with failure handling, create git commit and tag, and provide clear push instructions
- **FR-011**: File associations MUST create Windows registry entries for .md and .markdown extensions, add "Open with MarkRead" to context menu with MarkRead icon, enable double-click to open files in MarkRead, and cleanly remove all registry entries on uninstallation
- **FR-012**: Build metadata JSON MUST include version, build date, commit SHA, Node.js version, npm version, and Electron version
- **FR-013**: System MUST preserve existing code signing infrastructure (certificate secrets in GitHub Actions, PFX files, certificate store integration) while adapting scripts from MSI to Electron .exe signing

### Key Entities

- **Installer Package**: Represents the distributable Windows installer (.exe) created by electron-builder with NSIS, including embedded application files, installation scripts, code signing certificate, and metadata. Relates to Release Artifact and Code Signing Certificate.

- **Release Artifact**: Represents files published to GitHub Releases for each version, including the signed installer .exe, installer .exe.blockmap for delta updates, latest.yml manifest for auto-update discovery, and build-metadata.json. Relates to Installer Package and Version.

- **Version**: Represents a specific semantic version (e.g., 0.5.1) tracked in package.json, git tags, GitHub Releases, and update manifests. Relates to Release Artifact and Update Manifest.

- **Code Signing Certificate**: Represents the digital certificate used to sign installers, stored as PFX file or in Windows Certificate Store, with password/thumbprint credentials in environment variables or GitHub Secrets. Relates to Installer Package.

- **Update Manifest**: Represents the latest.yml file generated by electron-builder and published to GitHub Releases, containing version information, release date, download URLs, and SHA512 checksums for auto-update discovery. Relates to Version and Release Artifact.

- **CI/CD Workflow**: Represents GitHub Actions workflows (ci.yml for continuous integration, release.yml for releases) that build, test, package, sign, and publish installers. Relates to Installer Package and Release Artifact.

- **Build Configuration**: Represents electron-builder.yml configuration file defining packaging settings including compression, file inclusions/exclusions, NSIS installer options, file associations, code signing script, and publish targets. Relates to Installer Package.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All legacy WPF packaging artifacts (~6.5MB) are removed from the repository within one development cycle
- **SC-002**: CI/CD pipelines successfully build and test Electron installers with 100% success rate for valid commits
- **SC-003**: Windows installer package size is under 100MB with maximum compression enabled
- **SC-004**: Installer installation time is under 30 seconds on standard Windows hardware
- **SC-005**: Code signed installers pass Windows SmartScreen verification with 0% warning rate when run by users
- **SC-006**: Auto-update success rate exceeds 95% for users with network connectivity
- **SC-007**: GitHub Actions build time from push to published release is under 10 minutes
- **SC-008**: Release process from version tag to published GitHub Release is under 15 minutes
- **SC-009**: Users can double-click .md files to open in MarkRead with 100% success rate after installation
- **SC-010**: File associations are cleanly removed on uninstallation with 0% registry orphan rate
- **SC-011**: Developers can create releases using the modernized release script with 100% success rate when tests pass
- **SC-012**: Auto-update notifications appear within 5 seconds of app launch when updates are available
