# Quick Version Update Checklist

## Option 1: Automated Script ⭐ RECOMMENDED

Use the automated release script for a streamlined process:

```powershell
# Interactive mode - prompts for everything
.\scripts\release.ps1

# Or specify version directly
.\scripts\release.ps1 -Version "0.2.0"

# Preview without making changes
.\scripts\release.ps1 -DryRun
```

**The script handles everything:**
- ✅ Version selection with smart suggestions
- ✅ Updates Directory.Build.props
- ✅ Interactive CHANGELOG.md entries
- ✅ Runs tests
- ✅ Commits and tags
- ✅ Pushes to GitHub
- ✅ Opens monitoring page

**Time:** 5-10 minutes (mostly interactive prompts)

See `scripts/README.md` for detailed documentation.

---

## Option 2: Manual Process

When releasing a new version of MarkRead manually, follow this checklist for a tag-triggered GitHub Actions release.

## Pre-Release Steps (15 minutes)

## Pre-Release Steps (15 minutes)

## 1. Update Version (2 minutes)

```powershell
# Edit Directory.Build.props at repository root
# Change ONLY the <Version> property:
<Version>0.2.0</Version>           # Update this
<AssemblyVersion>0.2.0.0</AssemblyVersion>  # Update this
<FileVersion>0.2.0.0</FileVersion>  # Update this
```

## 2. Update CHANGELOG.md (5 minutes)

Add release notes:
```markdown
## [0.2.0] - 2025-11-08

### Added
- Feature X

### Fixed
- Bug Y
```

## 3. Commit and Push (2 minutes)

```powershell
# Commit version and changelog updates
git add Directory.Build.props CHANGELOG.md
git commit -m "Release v0.2.0"
git push origin main
```

## Release Steps (2 minutes)

## 4. Create and Push Tag

```powershell
# Create annotated tag (triggers GitHub Actions release workflow)
git tag -a v0.2.0 -m "Release version 0.2.0"

# Push tag to GitHub (this starts the automated release)
git push origin v0.2.0
```

**Important:** The tag MUST match the version in `Directory.Build.props`. The GitHub Actions workflow validates this and will fail if there's a mismatch.

## Post-Release Verification (10-15 minutes)

## 5. Monitor GitHub Actions

```powershell
# Open in browser:
# https://github.com/schalkje/markread/actions

# Watch the "Release" workflow:
# - Extracts version from tag
# - Validates against Directory.Build.props
# - Builds application
# - Builds MSI installer
# - Creates GitHub Release
# - Uploads MSI and checksums
```

## 6. Verify Release

```powershell
# Check the release was created:
# https://github.com/schalkje/markread/releases

# Verify files are attached:
# - MarkRead-0.2.0-x64.msi
# - SHA256SUMS.txt

# Download and test MSI (optional but recommended)
# Test on clean VM or uninstall current version first
```

---

## What Changed from Manual Release?

### ✅ New Automated Workflow

1. **Tag triggers everything** - Push a tag, GitHub Actions does the rest
2. **Version validation** - Workflow ensures tag matches `Directory.Build.props`
3. **No manual file updates** - Version automatically inherited from `Directory.Build.props`
4. **Automatic checksums** - SHA256 calculated and included
5. **Consistent release notes** - Generated automatically

### 📝 Your Responsibilities

- Update `Directory.Build.props` before tagging
- Update `CHANGELOG.md` before tagging
- Create and push the version tag
- Monitor GitHub Actions for completion
- Test the released MSI

### 🤖 GitHub Actions Handles

- Building the application
- Building the MSI installer
- Calculating checksums
- Creating the GitHub Release
- Uploading artifacts
- Generating release notes

---

## Quick Commands

```powershell
# Complete release in 5 commands:
# 1. Edit Directory.Build.props and CHANGELOG.md

# 2. Test locally
dotnet build --configuration Release

# 2. Test locally
dotnet build --configuration Release

# 3. Commit
git add Directory.Build.props CHANGELOG.md
git commit -m "Release v0.2.0"
git push origin main

# 4. Tag (this triggers GitHub Actions!)
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin v0.2.0

# 5. Monitor: https://github.com/schalkje/markread/actions
```

## If Version Mismatch Error Occurs

```powershell
# GitHub Actions will fail with:
# ❌ Version mismatch! Git tag: v0.2.0, Directory.Build.props: 0.1.0

# Fix it:
# 1. Delete the tag
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0

# 2. Update Directory.Build.props to match (0.2.0)
# 3. Commit and retry
git add Directory.Build.props
git commit -m "Update version to 0.2.0"
git push origin main
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin v0.2.0
```

---

**Total Time:** ~20-30 minutes (including monitoring GitHub Actions)

## Validation Script

Save this as `validate-release.ps1` to check before tagging:

```powershell
param([string]$TagVersion)

$version = $TagVersion -replace '^v', ''
[xml]$props = Get-Content "Directory.Build.props"
$propsVersion = $props.Project.PropertyGroup.Version

if ($version -ne $propsVersion) {
    Write-Error "❌ Version mismatch! Update Directory.Build.props to $version"
    exit 1
}

if (-not (Get-Content CHANGELOG.md | Select-String "## \[$version\]")) {
    Write-Warning "⚠️ CHANGELOG.md doesn't mention version $version"
}

Write-Host "✅ Ready to tag v$version"
```

Usage: `.\validate-release.ps1 -TagVersion "v0.2.0"`

---

**See also:**
- `documentation/developer/release-process.md` - Detailed release guide
- `documentation/developer/version-management.md` - Version management details
- `documentation/developer/msi-setup.md` - MSI build instructions

## Common Mistakes to Avoid

❌ **DON'T** edit version in individual project files (src/MarkRead.csproj, installer/MarkRead.Installer.wixproj)
✅ **DO** edit only `Directory.Build.props`

❌ **DON'T** create the tag before updating `Directory.Build.props`
✅ **DO** update version first, commit, then tag

❌ **DON'T** forget to update `CHANGELOG.md`  
✅ **DO** document all changes before tagging

❌ **DON'T** use lightweight tags (`git tag v0.2.0`)
✅ **DO** use annotated tags (`git tag -a v0.2.0 -m "Release version 0.2.0"`)

❌ **DON'T** skip pushing the tag  
✅ **DO** push tags (`git push origin v0.2.0`) to trigger the release

## Version Numbering Guide

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes only
- **PRE-RELEASE** (1.0.0-alpha.1, 1.0.0-beta.1): Test versions

---

**Total Time:** ~30 minutes for a complete release

**See also:**
- `documentation/developer/version-management.md` - Detailed guide
- `documentation/developer/msi-setup.md` - MSI build instructions
