# Release Process Guide

This guide explains how to create releases for MarkRead using the tag-based GitHub Actions workflow.

## Quick Start: Automated Release ⭐ RECOMMENDED

The easiest way to create a release is using the automated script:

```powershell
.\scripts\release.ps1
```

**Benefits:**
- Interactive prompts guide you through the process
- Smart version suggestions (patch/minor/major)
- Automatic CHANGELOG.md updates
- Validates everything before pushing
- Opens monitoring page automatically

See [scripts/README.md](../../scripts/README.md) for full documentation.

---

## Manual Release Process

For advanced users or when you need more control, you can perform the release manually:

## Overview

MarkRead uses a **tag-triggered release workflow**:

1. Version is managed in `Directory.Build.props` (single source of truth)
2. When ready to release, create and push a git tag (e.g., `v0.2.0`)
3. GitHub Actions automatically builds, packages, and publishes the release
4. The workflow validates that the tag version matches `Directory.Build.props`

**Key Principle:** The version in `Directory.Build.props` is the source of truth. Tags trigger releases but don't modify the version.

## Release Types

### Standard Release
```
v1.0.0, v1.2.3, v2.0.0
```
Creates a regular release

### Pre-release
```
v0.1.0-alpha.1, v1.0.0-beta.2, v1.0.0-rc.1
```
Creates a pre-release (marked as "Pre-release" on GitHub)

## Complete Release Process

### Step 1: Prepare the Release (10 minutes)

#### 1.1 Update Version in Directory.Build.props

```xml
<!-- Directory.Build.props -->
<Version>0.2.0</Version>
<AssemblyVersion>0.2.0.0</AssemblyVersion>
<FileVersion>0.2.0.0</FileVersion>
```

#### 1.2 Update CHANGELOG.md

Follow [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [0.2.0] - 2025-11-08

### Added
- New feature: Global search across all markdown files
- Keyboard shortcut: Ctrl+Shift+F for global search

### Changed
- Improved rendering performance for large documents
- Updated Markdig to v0.35.0

### Fixed
- Fixed crash when opening files with special characters
- Corrected link resolution for relative paths

### Security
- Updated WebView2 runtime to address CVE-2024-XXXXX
```

#### 1.3 Test Locally

```powershell
# Clean build
dotnet clean

# Build release version
dotnet build --configuration Release

# Test the application
.\src\bin\Release\net8.0-windows\MarkRead.exe .\documentation

# Verify version
(Get-Item "src\bin\Release\net8.0-windows\MarkRead.exe").VersionInfo.FileVersion
# Should show: 0.2.0.0

# Build and test MSI (optional but recommended)
dotnet build installer\MarkRead.Installer.wixproj --configuration Release
msiexec /i "installer\bin\Release\MarkRead-0.2.0-x64.msi"
```

#### 1.4 Commit Changes

```powershell
git add Directory.Build.props CHANGELOG.md
git commit -m "Release v0.2.0"
git push origin main
```

### Step 2: Create and Push Tag (2 minutes)

#### 2.1 Create Annotated Tag

```powershell
# Standard release
git tag -a v0.2.0 -m "Release version 0.2.0"

# Pre-release example
git tag -a v0.2.0-beta.1 -m "Beta release 0.2.0-beta.1"
```

**Important:** Use annotated tags (`-a`) not lightweight tags for proper release metadata.

#### 2.2 Push Tag

```powershell
# Push the tag (this triggers the release workflow)
git push origin v0.2.0

# Or push all tags
git push origin --tags
```

### Step 3: Monitor GitHub Actions (10-15 minutes)

#### 3.1 Watch Workflow

1. Go to: https://github.com/schalkje/markread/actions
2. Find the "Release" workflow run
3. Monitor progress

#### 3.2 Workflow Steps

The workflow will:
1. ✅ Extract version from tag (e.g., `v0.2.0` → `0.2.0`)
2. ✅ **Validate tag matches `Directory.Build.props`** (fails if mismatch)
3. ✅ Build the application
4. ✅ Build the MSI installer
5. ✅ Calculate SHA256 checksum
6. ✅ Generate release notes
7. ✅ Create GitHub Release with MSI attached

#### 3.3 If Workflow Fails

**Version Mismatch Error:**
```
❌ Version mismatch!
Git tag: v0.2.0
Directory.Build.props: 0.1.0
```

**Solution:**
```powershell
# Delete the tag
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0

# Update Directory.Build.props to 0.2.0
# Commit and tag again
git add Directory.Build.props
git commit -m "Update version to 0.2.0"
git push origin main
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin v0.2.0
```

### Step 4: Verify Release (5 minutes)

#### 4.1 Check GitHub Release

1. Go to: https://github.com/schalkje/markread/releases
2. Verify the new release appears
3. Check attached files:
   - ✅ `MarkRead-0.2.0-x64.msi`
   - ✅ `SHA256SUMS.txt`
4. Review release notes

#### 4.2 Test Downloaded MSI

```powershell
# Download MSI from GitHub Release
$msiUrl = "https://github.com/schalkje/markread/releases/download/v0.2.0/MarkRead-0.2.0-x64.msi"
Invoke-WebRequest -Uri $msiUrl -OutFile "MarkRead-0.2.0-x64.msi"

# Verify checksum
$hash = (Get-FileHash -Path "MarkRead-0.2.0-x64.msi" -Algorithm SHA256).Hash
Write-Host "SHA256: $hash"
# Compare with SHA256SUMS.txt from release

# Test installation (on clean VM recommended)
msiexec /i "MarkRead-0.2.0-x64.msi"

# Launch and verify
& "C:\Program Files\MarkRead\MarkRead.exe"
```

### Step 5: Announce Release (Optional)

- Update project README if needed
- Announce on social media/forums
- Notify users via mailing list
- Post in relevant communities

## Best Practices

### ✅ DO

- **Update `Directory.Build.props` first**, then tag
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Write detailed CHANGELOG entries
- Test locally before tagging
- Use annotated tags with messages
- Test the released MSI on clean system
- Keep release notes informative

### ❌ DON'T

- Don't modify version in individual project files
- Don't create tags before updating `Directory.Build.props`
- Don't skip testing before release
- Don't use lightweight tags (missing metadata)
- Don't release without CHANGELOG updates
- Don't force-push over existing tags

## Quick Reference: Release Workflow

```powershell
# 1. Update version and changelog
# Edit: Directory.Build.props, CHANGELOG.md

# 2. Test locally
dotnet build --configuration Release
.\src\bin\Release\net8.0-windows\MarkRead.exe .\documentation

# 3. Commit
git add Directory.Build.props CHANGELOG.md
git commit -m "Release v0.2.0"
git push origin main

# 4. Tag and push
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin v0.2.0

# 5. Monitor
# Visit: https://github.com/schalkje/markread/actions

# 6. Verify
# Visit: https://github.com/schalkje/markread/releases
```

## Version Validation Script

Create this helper script to validate before tagging:

```powershell
# validate-release.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$TagVersion
)

# Remove 'v' prefix if present
$version = $TagVersion -replace '^v', ''

# Read version from Directory.Build.props
[xml]$props = Get-Content "Directory.Build.props"
$propsVersion = $props.Project.PropertyGroup.Version

Write-Host "Tag version: $version"
Write-Host "Directory.Build.props: $propsVersion"

if ($version -ne $propsVersion) {
    Write-Error "❌ Version mismatch! Update Directory.Build.props to $version"
    exit 1
}

# Check if CHANGELOG mentions version
if (-not (Get-Content CHANGELOG.md | Select-String "## \[$version\]")) {
    Write-Warning "⚠️ CHANGELOG.md doesn't mention version $version"
}

# Check if tag already exists
$existingTag = git tag -l "v$version"
if ($existingTag) {
    Write-Error "❌ Tag v$version already exists!"
    exit 1
}

Write-Host "✅ Ready to create tag v$version"
Write-Host ""
Write-Host "Run: git tag -a v$version -m 'Release version $version'"
Write-Host "Then: git push origin v$version"
```

Usage:
```powershell
.\validate-release.ps1 -TagVersion "v0.2.0"
```

## Hotfix Release Process

For urgent bug fixes:

1. Create hotfix branch from tag
```powershell
git checkout -b hotfix/0.1.1 v0.1.0
```

2. Fix the bug and commit
```powershell
# Make fixes
git commit -m "Fix critical bug in link resolution"
```

3. Update version in `Directory.Build.props` to `0.1.1`
4. Update CHANGELOG.md
5. Merge to main
6. Tag as `v0.1.1`

## Rollback/Delete Release

If you need to remove a release:

```powershell
# Delete local tag
git tag -d v0.2.0

# Delete remote tag
git push origin :refs/tags/v0.2.0

# Manually delete GitHub Release
# Go to: https://github.com/schalkje/markread/releases
# Find release, click "Delete"
```

## Automated Version Bump (Future Enhancement)

Consider using tools like:
- [semantic-release](https://github.com/semantic-release/semantic-release)
- [GitVersion](https://gitversion.net/)
- [standard-version](https://github.com/conventional-changelog/standard-version)

These can automatically:
- Determine version bumps from commit messages
- Update CHANGELOG
- Create tags
- Trigger releases

## FAQ

**Q: Can I create releases without tags?**
A: No, the workflow is triggered only by tags matching `v*.*.*`

**Q: What if I forget to update `Directory.Build.props`?**
A: The workflow will fail with a version mismatch error. Delete the tag, update the file, and retry.

**Q: Can I manually trigger a release?**
A: Not with the current workflow. You must create a tag. Consider adding `workflow_dispatch` if needed.

**Q: How do I create beta/alpha releases?**
A: Tag with pre-release suffix: `v1.0.0-beta.1`. GitHub automatically marks as pre-release.

**Q: Can I edit a release after publishing?**
A: Yes, go to the release on GitHub and click "Edit". You can update notes or add/remove files.

**Q: Do I need to build the MSI locally?**
A: No, GitHub Actions builds it. Local testing is optional but recommended.

## Troubleshooting

### Problem: Workflow doesn't trigger

**Cause:** Tag doesn't match pattern `v*.*.*`

**Solution:** Use correct tag format:
```powershell
# ✅ Correct
git tag -a v0.2.0 -m "Release"

# ❌ Wrong
git tag -a release-0.2.0 -m "Release"
git tag -a 0.2.0 -m "Release"
```

### Problem: MSI has wrong version

**Cause:** `Directory.Build.props` not updated

**Solution:** Always update `Directory.Build.props` before tagging

### Problem: Release notes incomplete

**Cause:** CHANGELOG.md not updated

**Solution:** Always update CHANGELOG.md before release

## Related Documentation

- [Version Management Guide](version-management.md) - How versioning works
- [MSI Setup Guide](msi-setup.md) - Building MSI locally
- [Code Signing Setup](signpath-setup.md) - SignPath.io integration (full guide)
- [Code Signing Quick Start](signpath-quickstart.md) - SignPath.io setup (quick reference)
- [Version Update Checklist](VERSION-UPDATE-CHECKLIST.md) - Quick reference
- [GitHub Actions Workflow](../../.github/workflows/release.yml) - Workflow definition

## Code Signing

MarkRead releases are automatically code-signed using [SignPath.io](https://signpath.io)'s free Foundation Edition for open-source projects.

**Status:** 
- 🔒 **Enabled:** Releases are digitally signed (reduces Windows warnings)
- ⏳ **Pending:** Application submitted, awaiting approval
- ⚠️ **Disabled:** Using unsigned installers

### Benefits of Code Signing

- ✅ **Trust:** Shows verified publisher instead of "Unknown Publisher"
- ✅ **Security:** Prevents tampering after release
- ✅ **SmartScreen:** Fewer Windows Defender warnings over time
- ✅ **Professional:** Demonstrates commitment to security

### Setup

If code signing is not yet configured, see:
- **[SignPath.io Quick Start](signpath-quickstart.md)** - 20 minute setup guide
- **[SignPath.io Setup Guide](signpath-setup.md)** - Complete documentation

### During Release

The GitHub Actions workflow automatically:
1. Builds unsigned MSI
2. Submits to SignPath.io for signing
3. Waits for signed MSI
4. Publishes signed MSI to release

**No manual steps required!** Signing happens automatically when you push a tag.

### Verification

After release, verify the MSI is signed:

```powershell
# Download MSI from GitHub Release
Get-AuthenticodeSignature .\MarkRead-1.0.0-x64.msi

# Should show:
# Status: Valid
# SignerCertificate: CN=SignPath Foundation
```

### Troubleshooting Signing

If a release fails at the signing step:

1. **Check GitHub Actions logs** for error messages
2. **Check SignPath.io dashboard** for request status
3. **Verify GitHub secrets/variables** are configured:
   - `SIGNPATH_API_TOKEN` (secret)
   - `SIGNPATH_ENABLED=true` (variable)
   - `SIGNPATH_ORGANIZATION_ID` (variable)
   - `SIGNPATH_PROJECT_SLUG=markread` (variable)
   - `SIGNPATH_SIGNING_POLICY=release-signing` (variable)

4. **Temporarily disable signing** if blocking a release:
   ```
   Set GitHub Variable: SIGNPATH_ENABLED = false
   ```
   Re-push the tag to trigger a new release with unsigned MSI.

See [signpath-setup.md](signpath-setup.md) for detailed troubleshooting.

---

**Questions?** Create an issue at https://github.com/schalkje/markread/issues
