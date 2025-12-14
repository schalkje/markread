# GitHub Actions Release Workflow Explained

This document explains how the MarkRead release workflow integrates with the centralized version management system.

## Workflow File Location

`.github/workflows/release.yml`

## Trigger

```yaml
on:
  push:
    tags:
      - 'v*.*.*'  # Triggers on tags like v0.1.0, v1.0.0, v2.1.3-beta
```

**Key Point:** The workflow ONLY runs when you push a version tag. Regular commits to `main` do NOT trigger releases.

## Workflow Steps Overview

### 1. Extract Version from Tag

```yaml
- name: Extract version from tag
  id: version
  shell: pwsh
  run: |
    $tag = "${{ github.ref_name }}"
    $version = $tag -replace '^v', ''
    echo "VERSION=$version" >> $env:GITHUB_OUTPUT
```

**What it does:**
- Gets the tag name (e.g., `v0.2.0`)
- Removes the `v` prefix → `0.2.0`
- Stores version for later steps

### 2. Validate Version ⭐ NEW

```yaml
- name: Validate version matches Directory.Build.props
  shell: pwsh
  run: |
    $tagVersion = "${{ steps.version.outputs.VERSION }}"
    
    [xml]$props = Get-Content "Directory.Build.props"
    $propsVersion = $props.Project.PropertyGroup.Version
    
    if ($tagVersion -ne $propsVersion) {
      Write-Error "❌ Version mismatch!"
      exit 1
    }
```

**What it does:**
- Reads version from `Directory.Build.props`
- Compares with tag version
- **FAILS the workflow if they don't match**

**This is the key safety check!**

### 3. Build Application

```yaml
- name: Build App
  run: dotnet build src\MarkRead.csproj --configuration Release --no-restore /maxcpucount:1
```

**What it does:**
- Builds the WPF application
- Version is **automatically inherited** from `Directory.Build.props`
- No manual version passing needed

### 4. Build MSI Installer

```yaml
- name: Build MSI installer
  run: dotnet build installer\MarkRead.Installer.wixproj --configuration Release --no-restore /maxcpucount:1
```

**What it does:**
- Builds the WiX installer
- Version is **automatically inherited** from `Directory.Build.props`
- Output filename: `MarkRead-{version}-x64.msi`

### 5. Create GitHub Release

```yaml
- name: Create GitHub Release
  uses: softprops/action-gh-release@v2
  with:
    files: |
      ${{ steps.locate_msi.outputs.MSI_PATH }}
      SHA256SUMS.txt
    body_path: release-notes.md
    prerelease: ${{ contains(github.ref_name, 'alpha') || contains(github.ref_name, 'beta') || contains(github.ref_name, 'rc') }}
```

**What it does:**
- Creates GitHub Release
- Uploads MSI and checksums
- Marks as pre-release if tag contains `alpha`, `beta`, or `rc`

## Version Flow Diagram

```
Developer Action:
┌─────────────────────────────────────┐
│ git tag -a v0.2.0 -m "Release"      │
│ git push origin v0.2.0              │
└────────────┬────────────────────────┘
             │
             │ Triggers GitHub Actions
             ▼
GitHub Actions:
┌─────────────────────────────────────┐
│ 1. Extract: v0.2.0 → 0.2.0          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 2. Read Directory.Build.props       │
│    <Version>0.2.0</Version>         │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 3. Validate: 0.2.0 == 0.2.0 ✓       │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 4. Build (inherits from props)      │
│    - MarkRead.exe → FileVersion     │
│      0.2.0.0                        │
│    - MSI → MarkRead-0.2.0-x64.msi   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 5. Create Release with MSI          │
└─────────────────────────────────────┘
```

## What Changed from Previous Workflow

### Before (Manual Version Update)

```yaml
❌ - name: Update version in projects
     run: |
       # Manually update MarkRead.csproj
       (Get-Content $appCsproj) -replace '<Version>[\d\.]+</Version>', "<Version>$version</Version>"
       
       # Manually update MarkRead.Installer.wixproj
       (Get-Content $installerProj) -replace '<Version>[\d\.]+</Version>', "<Version>$version</Version>"
```

**Problems:**
- Modifies source files during CI build
- Version in source code doesn't match released version
- Multiple places to update = error-prone

### After (Centralized Version)

```yaml
✅ - name: Validate version matches Directory.Build.props
     run: |
       [xml]$props = Get-Content "Directory.Build.props"
       if ($tagVersion -ne $propsVersion) { exit 1 }

✅ - name: Build App
     # Version inherited automatically
     run: dotnet build --configuration Release
```

**Benefits:**
- No source modification during build
- Version is always in sync
- Single validation step catches errors
- Source code represents exact release

## Version Validation Examples

### ✅ Success Case

```
Directory.Build.props: 0.2.0
Git tag:              v0.2.0
Result:               ✅ Build proceeds
```

### ❌ Failure Case 1: Forgot to Update

```
Directory.Build.props: 0.1.0  ← Old version
Git tag:              v0.2.0  ← New tag
Result:               ❌ Workflow fails

Error: Version mismatch!
       Git tag: v0.2.0
       Directory.Build.props: 0.1.0
       Please update Directory.Build.props
```

### ❌ Failure Case 2: Wrong Tag

```
Directory.Build.props: 0.2.0
Git tag:              v0.3.0  ← Wrong tag
Result:               ❌ Workflow fails

Error: Version mismatch!
       Git tag: v0.3.0
       Directory.Build.props: 0.2.0
       Please update Directory.Build.props
```

## Pre-Release Detection

The workflow automatically marks releases as "Pre-release" based on tag:

```yaml
prerelease: ${{ contains(github.ref_name, 'alpha') || contains(github.ref_name, 'beta') || contains(github.ref_name, 'rc') }}
```

**Examples:**
- `v0.2.0` → Regular release
- `v0.2.0-alpha.1` → Pre-release (marked)
- `v0.2.0-beta.1` → Pre-release (marked)
- `v0.2.0-rc.1` → Pre-release (marked)
- `v1.0.0-preview` → Regular release (no keyword match)

## Build Output

After successful workflow:

```
installer/bin/Release/
└── MarkRead-0.2.0-x64.msi

GitHub Release:
├── MarkRead-0.2.0-x64.msi      (Installer)
└── SHA256SUMS.txt              (Checksum)
```

## Monitoring the Workflow

### View Active Runs

https://github.com/schalkje/markread/actions

### Check Logs

1. Click on workflow run
2. Click on job: "build-and-release"
3. Expand steps to see output

### Key Steps to Watch

- ✅ "Validate version matches Directory.Build.props" - Must pass
- ✅ "Build App" - Application compilation
- ✅ "Build MSI installer" - Installer creation
- ✅ "Create GitHub Release" - Publishing

## Workflow Permissions

```yaml
permissions:
  contents: write  # Required for creating releases
```

The workflow needs write access to:
- Create GitHub Releases
- Upload release assets (MSI, checksums)

This is granted via `GITHUB_TOKEN` automatically.

## Debugging Failed Workflows

### If Validation Fails

```powershell
# 1. Delete the tag
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0

# 2. Fix Directory.Build.props
# Edit: <Version>0.2.0</Version>

# 3. Commit
git add Directory.Build.props
git commit -m "Update version to 0.2.0"
git push origin main

# 4. Re-tag
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin v0.2.0
```

### If Build Fails

Check logs for:
- Missing dependencies
- Compilation errors
- WiX toolset issues

Fix in code, delete tag, re-tag after fix.

### If Release Creation Fails

Usually permissions or network issues. Retry:

```powershell
# Re-run from GitHub Actions UI
# Or delete and re-push tag
```

## Future Enhancements

### 1. Manual Trigger (Optional)

Add manual workflow dispatch:

```yaml
on:
  push:
    tags:
      - 'v*.*.*'
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release'
        required: true
```

### 2. Automated Tests Before Release

```yaml
- name: Run Tests
  run: dotnet test --configuration Release
  
- name: Build MSI (only if tests pass)
  run: dotnet build installer/...
```

### 3. Code Signing

```yaml
- name: Sign MSI
  run: signtool sign /f cert.pfx /p ${{ secrets.CERT_PASSWORD }} installer.msi
```

### 4. Notification

```yaml
- name: Notify on Discord/Slack
  if: success()
  run: # Send notification
```

## Best Practices

### ✅ DO

- Always validate locally before pushing tag
- Use the validation script: `.\scripts\validate-release.ps1`
- Keep `Directory.Build.props` version up to date
- Use semantic versioning
- Tag with meaningful messages

### ❌ DON'T

- Don't push tags before updating `Directory.Build.props`
- Don't manually modify project files during CI
- Don't skip CHANGELOG updates
- Don't force-push over existing tags
- Don't create tags for every commit

## Related Documentation

- [Release Process Guide](release-process.md) - Complete release procedure
- [Version Management Guide](version-management.md) - How versioning works
- [Release Best Practices](release-best-practices.md) - Strategy and recommendations

## Quick Reference

```powershell
# Successful Release Flow
1. Edit Directory.Build.props → 0.2.0
2. Edit CHANGELOG.md
3. git commit -m "Release v0.2.0"
4. git push origin main
5. .\scripts\validate-release.ps1 -TagVersion "v0.2.0"
6. git tag -a v0.2.0 -m "Release version 0.2.0"
7. git push origin v0.2.0
8. Watch: https://github.com/schalkje/markread/actions
9. Verify: https://github.com/schalkje/markread/releases
```

---

**The key insight:** Version management and release automation work together to ensure consistency and reduce errors. The tag triggers the workflow, but `Directory.Build.props` is the source of truth.
