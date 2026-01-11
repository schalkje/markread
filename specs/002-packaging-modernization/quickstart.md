# Quickstart Guide: Packaging & Distribution

**Feature**: 002-packaging-modernization | **Date**: 2026-01-11

## Overview

This guide provides step-by-step instructions for building, packaging, and releasing MarkRead with the modernized Electron-native infrastructure.

---

## Prerequisites

### Required Software

1. **Node.js 20+**
   ```bash
   node --version  # Should show v20.x.x or higher
   ```

2. **npm 10+**
   ```bash
   npm --version  # Should show 10.x.x or higher
   ```

3. **Git**
   ```bash
   git --version
   ```

4. **Windows SDK** (for code signing)
   - Download from: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/
   - Required for: signtool.exe (code signing utility)
   - Installation path: `C:\Program Files (x86)\Windows Kits\10\`

### Optional (For Code Signing)

5. **Code Signing Certificate**
   - Option A: PFX file + password
   - Option B: Certificate installed in Windows Certificate Store
   - Development: Self-signed certificate (see "Creating a Development Certificate" below)

---

## Local Development Workflow

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/yourusername/markread.git
cd markread

# Or switch to packaging branch (if working on this feature)
git checkout 002-packaging-modernization

# Install dependencies
npm install
```

### 2. Development Build

```bash
# Type check
npm run type-check

# Lint code
npm run lint

# Run tests
npm test

# Build application
npm run build
```

### 3. Package Installer (Unsigned)

```bash
# Package both NSIS installer and portable .exe
npm run package

# Output location: dist/
# Files:
#   - MarkRead-Setup-0.5.1.exe (NSIS installer, unsigned)
#   - MarkRead-0.5.1-portable.exe (portable variant)
#   - MarkRead-Setup-0.5.1.exe.blockmap (for differential updates)
#   - latest.yml (update manifest)
```

### 4. Test Installer Locally

```bash
# Run the unsigned installer
.\dist\MarkRead-Setup-0.5.1.exe

# Or test portable .exe
.\dist\MarkRead-0.5.1-portable.exe
```

**Note**: Unsigned installers will show Windows SmartScreen warnings. This is expected for local builds.

---

## Code Signing (Local)

### Creating a Development Certificate

For development and testing, create a self-signed certificate:

```powershell
# Create self-signed certificate
$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject "CN=MarkRead Development" `
    -KeyUsage DigitalSignature `
    -FriendlyName "MarkRead Dev Cert" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3") `
    -NotAfter (Get-Date).AddYears(1)

# Export to PFX file (optional)
$pfxPassword = ConvertTo-SecureString -String "dev-password" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "dev-cert.pfx" -Password $pfxPassword

# Note the thumbprint
$cert.Thumbprint  # e.g., "A1B2C3D4E5F6..."
```

**Warning**: Self-signed certificates do NOT prevent Windows SmartScreen warnings. Use for development only.

### Signing with PFX File

```powershell
# Set environment variables
$env:PFX_PATH = "C:\path\to\dev-cert.pfx"
$env:PFX_PASSWORD = "dev-password"

# Run packaging with signing
npm run package

# Verify signature
.\scripts\electron-sign.ps1 -Path ".\dist\MarkRead-Setup-0.5.1.exe" -Verify
```

### Signing with Certificate Store

```powershell
# Set environment variable (thumbprint from previous step)
$env:CERT_THUMBPRINT = "A1B2C3D4E5F6..."

# Run packaging with signing
npm run package
```

---

## Creating a Release

### Option 1: Automated Release (Recommended)

Use the release script for a guided, automated process:

```powershell
# Run release script
.\scripts\release.ps1 -NewVersion "0.5.1"

# Script will:
# 1. Validate version format (semver)
# 2. Update package.json version
# 3. Prompt you to edit CHANGELOG.md (press Enter when done)
# 4. Run tests and linting
# 5. Build application
# 6. Create git commit and tag
# 7. Show push commands

# Follow the printed instructions:
git push origin main
git push origin v0.5.1

# GitHub Actions will:
# - Trigger release.yml workflow
# - Build and sign installer
# - Create GitHub Release
# - Upload artifacts
```

### Option 2: Manual Release

```bash
# 1. Update version in package.json
npm version 0.5.1 --no-git-tag-version

# 2. Update CHANGELOG.md
# ... manually edit CHANGELOG.md ...

# 3. Run validation
npm run type-check
npm run lint
npm test
npm run build

# 4. Commit and tag
git add package.json CHANGELOG.md
git commit -m "chore: Release v0.5.1"
git tag v0.5.1

# 5. Push
git push origin main
git push origin v0.5.1

# GitHub Actions handles the rest
```

---

## Testing the Release

### Test NSIS Installer

```bash
# Download from GitHub Releases
# https://github.com/yourusername/markread/releases/tag/v0.5.1

# Run installer
.\MarkRead-Setup-0.5.1.exe

# Verify:
# - Installation directory selection works
# - License agreement is displayed
# - Desktop and Start Menu shortcuts are created
# - App launches successfully
# - File associations (.md, .markdown) work
# - Context menu "Open with MarkRead" appears
```

### Test Portable .exe

```bash
# Download portable variant from GitHub Releases

# Copy to USB drive or test folder
# Run directly (no installation)
.\MarkRead-0.5.1-portable.exe

# Verify:
# - App launches without installation
# - Settings are stored in ./portable-data/
# - No registry modifications
# - No file associations
# - No auto-update checks
# - Full app functionality works
```

### Test Auto-Updates

```bash
# 1. Install MarkRead v0.5.0
# 2. Launch app
# 3. Wait 5 seconds (update check delay)
# 4. Publish v0.5.1 to GitHub Releases
# 5. Wait for notification: "Update available: v0.5.1"
# 6. Click "Download" and verify progress bar
# 7. Click "Install and Restart"
# 8. Verify app restarts with v0.5.1
```

### Test Auto-Update Rollback

```bash
# 1. Install MarkRead v0.5.0
# 2. Create a deliberately broken v0.5.1 (e.g., syntax error in main process)
# 3. Publish broken v0.5.1
# 4. Install update
# 5. App should crash on startup
# 6. Verify automatic rollback to v0.5.0
# 7. Check logs in %LOCALAPPDATA%\MarkRead\Logs for "UPDATE_ROLLBACK" error
```

---

## Troubleshooting

### Build Failures

**Problem**: `npm run build` fails with TypeScript errors

```bash
# Solution: Fix type errors reported
npm run type-check  # See detailed errors
```

**Problem**: `npm test` fails

```bash
# Solution: Fix failing tests
npm test -- --verbose  # See detailed test output
```

### Packaging Failures

**Problem**: electron-builder fails with "Cannot find icon.ico"

```bash
# Solution: Ensure assets exist
ls assets/icon.ico
ls assets/icon.png
ls assets/installer-banner.bmp
ls assets/installer-dialog.bmp
ls assets/License.rtf
```

**Problem**: Installer size exceeds 100MB

```bash
# Solution: Check compression settings
# electron-builder.yml should have: compression: maximum

# Check what's being packaged
npm run package -- --dir  # Outputs uncompressed to dist/win-unpacked
# Review dist/win-unpacked for unexpected large files
```

### Code Signing Failures

**Problem**: signtool.exe not found

```bash
# Solution: Install Windows SDK or set path
$env:PATH += ";C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64"
```

**Problem**: Certificate expired

```bash
# Solution: Update certificate
# For development: Create new self-signed cert (see "Creating a Development Certificate")
# For production: Contact CA for renewal, update GitHub Secrets
```

**Problem**: Signature verification fails

```bash
# Solution: Check certificate validity
.\scripts\electron-sign.ps1 -Path ".\dist\MarkRead-Setup-0.5.1.exe" -Verify
# Review error message for details
```

### Release Failures

**Problem**: GitHub Actions release workflow fails with "Version mismatch"

```bash
# Solution: Ensure package.json version matches git tag
# Tag: v0.5.1 → package.json: "version": "0.5.1" (no 'v' prefix in package.json)
```

**Problem**: GitHub Actions fails with "CERT_EXPIRED"

```bash
# Solution: Update code signing certificate in GitHub Secrets
# 1. Go to: Settings → Secrets and variables → Actions
# 2. Update PFX_PATH or CERT_THUMBPRINT
# 3. Update PFX_PASSWORD if using PFX file
```

### Auto-Update Failures

**Problem**: App doesn't check for updates

```bash
# Possible causes:
# 1. Running in development mode (update checks disabled)
#    Solution: Build packaged app with `npm run package` and test that

# 2. Portable .exe variant (auto-updates disabled)
#    Solution: Use NSIS installer version for auto-update testing

# 3. GitHub Releases API unavailable
#    Solution: Check logs in %LOCALAPPDATA%\MarkRead\Logs
#    Look for "UPDATE_CHECK_FAILED" error code
```

**Problem**: Update download fails with network error

```bash
# Solution: Check internet connection and GitHub status
# Verify latest.yml is accessible:
# https://github.com/yourusername/markread/releases/latest/download/latest.yml

# Check app logs in %LOCALAPPDATA%\MarkRead\Logs
# Should see exponential backoff retry (1hr, 2hr, 4hr)
```

---

## Logs and Diagnostics

### Installation Logs

**Location**: `%LOCALAPPDATA%\MarkRead\Logs\install-*.log`

```powershell
# View logs
explorer "$env:LOCALAPPDATA\MarkRead\Logs"

# Check latest log
Get-Content "$env:LOCALAPPDATA\MarkRead\Logs\install-*.log" | Select-Object -Last 20
```

### Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `DISK_SPACE_INSUFFICIENT` | Not enough disk space | Free up space and retry |
| `PERMISSION_DENIED` | Insufficient permissions | Run as admin or use per-user install |
| `CERT_EXPIRED` | Code signing certificate expired | Update certificate |
| `DOWNLOAD_FAILED` | Update download failed | Check internet connection |
| `UPDATE_ROLLBACK` | Update failed, rolled back | Check logs, report issue |
| `SIGNATURE_INVALID` | Signature verification failed | Re-download installer |

### Checking Certificate Expiration

```powershell
# Check PFX certificate
$cert = Get-PfxCertificate -FilePath "dev-cert.pfx"
$cert.NotAfter  # Expiration date

# Check certificate store
$cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Thumbprint -eq "A1B2C3D4E5F6..." }
$cert.NotAfter  # Expiration date

# Days until expiration
($cert.NotAfter - (Get-Date)).Days
```

---

## CI/CD Configuration

### GitHub Secrets

Required secrets for release workflow:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `PFX_PATH` | Path to PFX certificate file (Option A) | `C:\certs\markread.pfx` |
| `PFX_PASSWORD` | Password for PFX file (Option A) | `super-secret-password` |
| `CERT_THUMBPRINT` | Certificate thumbprint (Option B) | `A1B2C3D4E5F6...` |
| `GITHUB_TOKEN` | GitHub personal access token (auto-provided) | `ghp_...` |

**Note**: Use either PFX_PATH + PFX_PASSWORD (Option A) OR CERT_THUMBPRINT (Option B), not both.

### Workflow Triggers

**CI Workflow** (`ci.yml`):
- Triggers: Push to `main` or `develop` branches
- Actions: Type check, lint, test, build, package (unsigned)
- Duration: ~5-8 minutes

**Release Workflow** (`release.yml`):
- Triggers: Push tag matching `v*.*.*` (e.g., v0.5.1)
- Actions: All CI steps + sign + verify + publish
- Duration: ~8-10 minutes

---

## Quick Reference

### Common Commands

```bash
# Development
npm install                # Install dependencies
npm run dev                # Start dev server (if applicable)
npm run build              # Build application
npm run package            # Package installer (unsigned)

# Quality Checks
npm run type-check         # TypeScript type checking
npm run lint               # ESLint
npm test                   # Run tests
npm run lint:fix           # Auto-fix linting issues

# Release
.\scripts\release.ps1 -NewVersion "0.5.1"    # Automated release (Windows)
npm run publish            # electron-builder publish (CI/CD only)

# Verification
.\scripts\electron-sign.ps1 -Path "..." -Verify  # Verify signature
```

### File Locations

| File/Directory | Purpose |
|----------------|---------|
| `dist/` | Build output (installers, portable .exe) |
| `assets/` | Icons, installer images, license |
| `scripts/` | Build and release scripts |
| `.github/workflows/` | CI/CD workflows |
| `electron-builder.yml` | Packaging configuration |
| `%LOCALAPPDATA%\MarkRead\` | Installed app data |
| `%LOCALAPPDATA%\MarkRead\Logs\` | Installation/update logs |
| `./portable-data/` | Portable .exe settings (relative to .exe) |

### Key URLs

| Resource | URL |
|----------|-----|
| GitHub Releases | `https://github.com/yourusername/markread/releases` |
| latest.yml | `https://github.com/yourusername/markread/releases/latest/download/latest.yml` |
| Windows SDK Download | `https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/` |
| electron-builder Docs | `https://www.electron.build/` |
| electron-updater Docs | `https://www.electron.build/auto-update` |

---

## Next Steps

After completing local development and testing:

1. **Review**: Ensure all functional requirements (FR-001 through FR-015) are met
2. **Test**: Validate all user stories and acceptance scenarios
3. **Release**: Use automated release script or manual process
4. **Monitor**: Check GitHub Actions workflow status
5. **Verify**: Test downloaded installer from GitHub Releases
6. **Document**: Update user-facing documentation and README

**Need help?** Check the troubleshooting section or review the detailed [plan.md](plan.md) and [data-model.md](data-model.md) documentation.
