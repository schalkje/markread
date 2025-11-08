# Scripts

Utility scripts for MarkRead development and release management.

## release.ps1 ⭐ RECOMMENDED

**Automated end-to-end release script** that handles the entire release process.

### Quick Start

```powershell
# Interactive mode (recommended for first-time users)
.\scripts\release.ps1

# Specify version directly
.\scripts\release.ps1 -Version "0.2.0"

# Preview what would happen (no changes made)
.\scripts\release.ps1 -DryRun
```

### What It Does

The script automates all release steps:

1. ✅ Reads current version from `Directory.Build.props`
2. ✅ Prompts for new version with smart suggestions (patch/minor/major)
3. ✅ Validates version format
4. ✅ Checks working directory is clean
5. ✅ Runs tests (optional)
6. ✅ Updates `Directory.Build.props` with new version
7. ✅ **Opens your editor** (VS Code, Notepad++, or Notepad) with CHANGELOG template
8. ✅ **Waits for you to save and close** the editor
9. ✅ Integrates your CHANGELOG changes automatically
10. ✅ Builds release version
11. ✅ Verifies built executable version
12. ✅ Commits changes
13. ✅ Creates annotated git tag
14. ✅ Pushes to remote (triggers GitHub Actions)
15. ✅ Opens GitHub Actions in browser

### Interactive Features

**Version Selection:**
```
Current version: 0.1.0

Suggestions:
  1) Patch: 0.1.1 (bug fixes)
  2) Minor: 0.2.0 (new features)
  3) Major: 1.0.0 (breaking changes)
  4) Custom version

Select version type (1-4, or Enter for patch): _
```

**Changelog Editor:**

The script opens a template file in your editor:

```markdown
# Release Notes for v0.2.0
# 
# Edit the sections below. Lines starting with # are comments and will be ignored.
# Delete sections you don't need. Save and close the editor to continue.

## [0.2.0] - 2025-11-08

### Added
- New global search feature
- Keyboard shortcut Ctrl+Shift+F

### Changed
- Improved rendering performance

### Fixed
- Fixed link resolution bug

### Security
- Updated WebView2 runtime
```

**Editor Support:**
- **VS Code** (preferred) - Uses `--wait` flag to block until closed
- **Notepad++** - Waits for window to close
- **Notepad** - Always available as fallback

### Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `-Version` | Version to release | `.\scripts\release.ps1 -Version "0.2.0"` |
| `-SkipValidation` | Skip pre-release checks | `.\scripts\release.ps1 -SkipValidation` |
| `-SkipTests` | Skip running tests | `.\scripts\release.ps1 -SkipTests` |
| `-DryRun` | Preview without changes | `.\scripts\release.ps1 -DryRun` |
| `-Editor` | Choose editor (code/notepad/notepad++/auto) | `.\scripts\release.ps1 -Editor notepad` |

### Example Output

```
═══════════════════════════════════════════════════════
  MarkRead Release Automation
═══════════════════════════════════════════════════════

▶ Reading current version from Directory.Build.props...
✅ Current version: 0.1.0

▶ Determining new version...

Current version: 0.1.0

Suggestions:
  1) Patch: 0.1.1 (bug fixes)
  2) Minor: 0.2.0 (new features)
  3) Major: 1.0.0 (breaking changes)
  4) Custom version

Select version type (1-4, or Enter for patch): 2
✅ New version: 0.2.0

▶ Running pre-release validation...
✅ Working directory is clean
✅ On branch: main
✅ Tag v0.2.0 doesn't exist

▶ Running tests...
✅ All tests passed

▶ Updating Directory.Build.props...
✅ Updated to version 0.2.0

▶ Updating CHANGELOG.md...

Opening editor for CHANGELOG entry...

  Template file: C:\Users\...\AppData\Local\Temp\tmp1234.md
  Instructions:
    1. Edit the release notes
    2. Remove empty sections
    3. Save and close the editor

ℹ️  Opening in VS Code... (waiting for you to close)
✅ Editor closed
✅ CHANGELOG.md updated

Added to CHANGELOG.md:
------------------------------------------------------------
## [0.2.0] - 2025-11-08

### Added
- New global search feature
- Keyboard shortcut Ctrl+Shift+F

### Fixed
- Fixed link resolution for relative paths
------------------------------------------------------------

▶ Building release version...
✅ Build completed successfully
✅ Verified executable version: 0.2.0.0

▶ Committing changes...
✅ Changes committed: Release v0.2.0

▶ Creating git tag...
✅ Tag created: v0.2.0

▶ Pushing to remote...
Ready to push:
  - Commit: Release v0.2.0
  - Tag: v0.2.0

This will trigger the GitHub Actions release workflow!

Push to remote? (Y/n): y
✅ Pushed commit to main
✅ Pushed tag: v0.2.0

═══════════════════════════════════════════════════════
  Release Triggered Successfully!
═══════════════════════════════════════════════════════

Version: 0.2.0
Tag: v0.2.0

Next Steps:
  1. Monitor GitHub Actions workflow:
     https://github.com/schalkje/markread/actions

  2. Wait for release to be created (~10-15 minutes)

  3. Verify release:
     https://github.com/schalkje/markread/releases/tag/v0.2.0

Open GitHub Actions in browser? (Y/n): y

✅ Release process completed! 🎉
```

### Safety Features

- ✅ Validates version format before starting
- ✅ Checks for uncommitted changes
- ✅ Verifies tag doesn't already exist
- ✅ Runs tests before committing
- ✅ Confirms before pushing to remote
- ✅ Dry-run mode to preview changes
- ✅ Validates built executable version

### Comparison: Manual vs Automated

**Manual Process (30-45 min):**
```powershell
# 1. Edit Directory.Build.props
code Directory.Build.props
# 2. Edit CHANGELOG.md
code CHANGELOG.md
# 3. Test build
dotnet build --configuration Release
# 4. Commit
git add .
git commit -m "Release v0.2.0"
# 5. Tag
git tag -a v0.2.0 -m "Release version 0.2.0"
# 6. Push
git push origin main
git push origin v0.2.0
# 7. Open browser
start https://github.com/schalkje/markread/actions
```

**Automated Process (5-10 min):**
```powershell
.\scripts\release.ps1
# Answer a few prompts, done!
```

### Tips

- **First time?** Use interactive mode: `.\scripts\release.ps1`
- **Quick patch?** Use: `.\scripts\release.ps1 -Version "0.1.1"`
- **Test first?** Use: `.\scripts\release.ps1 -DryRun`
- **CI/CD?** Can be adapted for automated releases

---

## test-changelog-editor.ps1

Test script to preview how the CHANGELOG editor workflow works.

### Usage

```powershell
.\scripts\test-changelog-editor.ps1
```

This will:
1. Create a temporary markdown file with the CHANGELOG template
2. Open it in your editor (VS Code, Notepad++, or Notepad)
3. Wait for you to edit and close
4. Show the processed output

Perfect for trying out the editor workflow without doing an actual release!

---

## validate-release.ps1

Validates that everything is ready before creating a release tag.

### Usage

```powershell
# Basic validation
.\scripts\validate-release.ps1 -TagVersion "v0.2.0"

# Skip working directory clean check
.\scripts\validate-release.ps1 -TagVersion "v0.2.0" -SkipClean
```

### What It Checks

- ✅ Version format is valid (semantic versioning)
- ✅ Tag version matches `Directory.Build.props`
- ✅ CHANGELOG.md mentions the version
- ✅ Tag doesn't already exist locally or remotely
- ✅ Working directory is clean (no uncommitted changes)
- ⚠️  Current branch is main/master (warning only)

### Example Output

```
🔍 Validating release for tag: v0.2.0

1️⃣  Checking version format...
✅ Version format is valid: 0.2.0

2️⃣  Checking Directory.Build.props...
   Tag version:         0.2.0
   Directory.Build.props: 0.2.0
✅ Version matches Directory.Build.props

3️⃣  Checking CHANGELOG.md...
✅ CHANGELOG.md mentions version 0.2.0

4️⃣  Checking if tag already exists...
✅ Tag v0.2.0 doesn't exist yet

5️⃣  Checking if working directory is clean...
✅ Working directory is clean

6️⃣  Checking current branch...
✅ On branch: main

═════════════════════════════════════════════════════════

✅ All checks passed! Ready to create release.

Next steps:

  1. Create annotated tag:
     git tag -a v0.2.0 -m "Release version 0.2.0"

  2. Push tag to trigger GitHub Actions release:
     git push origin v0.2.0

  3. Monitor workflow:
     https://github.com/schalkje/markread/actions

  4. Verify release:
     https://github.com/schalkje/markread/releases
```

### Integration with Release Workflow

Add this to your release checklist:

```powershell
# 1. Update version in Directory.Build.props and CHANGELOG.md
# 2. Commit changes
git add Directory.Build.props CHANGELOG.md
git commit -m "Release v0.2.0"
git push origin main

# 3. Validate before tagging
.\scripts\validate-release.ps1 -TagVersion "v0.2.0"

# 4. If validation passes, create and push tag
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin v0.2.0
```

## Future Scripts

Consider adding:

- `bump-version.ps1` - Automated version bumping
- `build-installer.ps1` - Local MSI build script
- `test-installer.ps1` - Automated installer testing
- `create-release.ps1` - Complete release automation

## Related Documentation

- [Release Process Guide](../documentation/developer/release-process.md)
- [Version Management Guide](../documentation/developer/version-management.md)
- [Version Update Checklist](../documentation/developer/VERSION-UPDATE-CHECKLIST.md)
