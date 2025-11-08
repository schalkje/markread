# Release Best Practices Summary

## The MarkRead Release Strategy

MarkRead uses a **tag-triggered, automated release workflow** that ensures consistency and reduces manual errors.

## Core Principles

### 1. Single Source of Truth
- **Version lives in `Directory.Build.props`** only
- All projects (App, Installer) inherit from this file
- No version duplication = no version mismatch

### 2. Git Tags Trigger Releases
- Push a version tag (e.g., `v0.2.0`)
- GitHub Actions automatically builds and publishes
- No manual building or uploading required

### 3. Validation Before Publishing
- GitHub Actions validates tag matches `Directory.Build.props`
- Workflow fails fast if there's a mismatch
- Prevents releasing with wrong version

## The Workflow

```
┌─────────────────────────────────────────────────────────┐
│ Developer                                               │
├─────────────────────────────────────────────────────────┤
│ 1. Update Directory.Build.props (0.1.0 → 0.2.0)        │
│ 2. Update CHANGELOG.md                                  │
│ 3. Commit and push to main                              │
│ 4. Create and push tag: v0.2.0                          │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ Tag push triggers workflow
                      ▼
┌─────────────────────────────────────────────────────────┐
│ GitHub Actions                                          │
├─────────────────────────────────────────────────────────┤
│ 1. Extract version from tag (v0.2.0 → 0.2.0)           │
│ 2. Validate: tag == Directory.Build.props ✓             │
│ 3. Build application (version inherited)                │
│ 4. Build MSI installer (version inherited)              │
│ 5. Calculate SHA256 checksum                            │
│ 6. Generate release notes                               │
│ 7. Create GitHub Release                                │
│ 8. Upload MSI + checksums                               │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ Release published
                      ▼
┌─────────────────────────────────────────────────────────┐
│ Users                                                   │
├─────────────────────────────────────────────────────────┤
│ - Download MarkRead-0.2.0-x64.msi from GitHub Releases │
│ - Verify SHA256 checksum                                │
│ - Install and enjoy new features                        │
└─────────────────────────────────────────────────────────┘
```

## Why This Approach?

### ✅ Advantages

1. **No version sync issues** - Single source of truth
2. **Automated** - Tag triggers everything
3. **Validated** - Workflow catches mismatches
4. **Repeatable** - Same process every time
5. **Fast** - ~15 minutes from tag to release
6. **Safe** - Validation prevents mistakes
7. **Auditable** - Git history shows exact release commits
8. **Consistent artifacts** - Built by CI, not locally

### ❌ What We Avoid

- ❌ Manually building MSI on developer machine
- ❌ Uploading files through GitHub UI
- ❌ Version mismatches between projects
- ❌ "Works on my machine" issues
- ❌ Forgetting to update version in multiple places
- ❌ Releasing with uncommitted changes

## Comparison with Alternatives

### Alternative 1: Manual Release
```
❌ Developer builds MSI locally
❌ Developer uploads to GitHub manually
❌ Inconsistent build environments
❌ Prone to human error
❌ Time-consuming (~30-45 min)
```

### Alternative 2: Build on Every Commit
```
❌ Creates too many artifacts
❌ Clutters releases page
❌ No clear "official" releases
❌ Wastes CI resources
❌ Confuses users
```

### Alternative 3: Manual Workflow Dispatch
```
⚠️  Requires clicking UI to start
⚠️  Still need to specify version manually
⚠️  Less tied to git history
⚠️  Easier to make mistakes
✅ Could be added as fallback option
```

### Our Approach: Tag-Triggered ✅
```
✅ Triggered by git tag (standard practice)
✅ Version comes from source code
✅ Automatic validation
✅ Ties release to exact commit
✅ Standard across most projects
✅ Easy to automate further
```

## When NOT to Create a Release

Don't create releases for:

- 🚫 Every commit to main
- 🚫 Work-in-progress features
- 🚫 Experimental changes
- 🚫 Documentation-only updates
- 🚫 Internal refactoring
- 🚫 Development versions

**Regular commits and pushes do NOT trigger releases** - only version tags do.

## When TO Create a Release

Create releases for:

- ✅ New features ready for users
- ✅ Important bug fixes
- ✅ Security updates
- ✅ Milestone completions
- ✅ Beta/alpha versions (tagged appropriately)
- ✅ Scheduled releases (e.g., monthly)

## Release Cadence Recommendations

### Option 1: Semantic Versioning Releases
- **Patch** (0.1.1): Bug fixes, released as needed
- **Minor** (0.2.0): New features, every 2-4 weeks
- **Major** (1.0.0): Breaking changes, when ready

### Option 2: Date-Based Releases
- Monthly releases: `v2025.11.0`, `v2025.12.0`
- Include date in version for clarity

### Option 3: Milestone-Based
- Release when specific features are complete
- Version based on significance

**Recommended for MarkRead:** Semantic versioning with releases every 2-4 weeks or when significant features/fixes are ready.

## Pre-Release Strategy

For testing before official release:

```powershell
# Alpha: Early testing, unstable
git tag -a v0.2.0-alpha.1 -m "Alpha release"

# Beta: Feature complete, testing for bugs
git tag -a v0.2.0-beta.1 -m "Beta release"

# Release Candidate: Final testing
git tag -a v0.2.0-rc.1 -m "Release candidate"

# Official: Stable release
git tag -a v0.2.0 -m "Official release"
```

Pre-release tags automatically mark releases as "Pre-release" on GitHub.

## Hotfix Process

For urgent bug fixes:

```powershell
# 1. Create hotfix branch from last release tag
git checkout -b hotfix/0.1.1 v0.1.0

# 2. Fix the bug, commit
git commit -am "Fix critical bug in link resolution"

# 3. Update Directory.Build.props to 0.1.1
# 4. Update CHANGELOG.md
# 5. Commit version changes
git commit -am "Bump to 0.1.1"

# 6. Merge to main
git checkout main
git merge hotfix/0.1.1

# 7. Tag and release
git tag -a v0.1.1 -m "Hotfix: Critical bug fix"
git push origin main v0.1.1

# 8. Delete hotfix branch
git branch -d hotfix/0.1.1
```

## Error Recovery

### If you tag with wrong version:

```powershell
# Delete tag locally and remotely
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0

# Fix Directory.Build.props
# Commit and tag again
git add Directory.Build.props
git commit -m "Fix version to 0.2.0"
git push origin main
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin v0.2.0
```

### If GitHub Actions fails:

1. Check workflow logs for error
2. Fix the issue in code
3. Delete the tag and re-tag after fix
4. Or create new patch version (0.2.1)

### If released MSI has bugs:

1. Create hotfix with incremented version
2. Release as new version (can't modify MSI after release)
3. Optionally mark old release as "Pre-release" or delete it

## Tools to Help

### Validation Script
```powershell
.\scripts\validate-release.ps1 -TagVersion "v0.2.0"
```
Checks everything before you create the tag.

### Future: Automated Version Bumping
```powershell
# Could create script to automate:
.\scripts\bump-version.ps1 -Type minor  # 0.1.0 → 0.2.0
.\scripts\bump-version.ps1 -Type patch  # 0.1.0 → 0.1.1
.\scripts\bump-version.ps1 -Type major  # 0.1.0 → 1.0.0
```

## Integration with Development Workflow

### Daily Development
```powershell
# Normal work - no releases created
git add .
git commit -m "Add search feature"
git push origin main
```

### When Feature is Ready
```powershell
# Decision: Ready to release?
# Yes → Follow release process
.\scripts\validate-release.ps1 -TagVersion "v0.2.0"
git tag -a v0.2.0 -m "Release with search feature"
git push origin v0.2.0
```

## Summary: Best Practice Recipe

1. ✅ **Version in `Directory.Build.props` only**
2. ✅ **Tag triggers automated release**
3. ✅ **Validation prevents mistakes**
4. ✅ **Release only when ready** (not every commit)
5. ✅ **Use semantic versioning**
6. ✅ **Test locally before tagging**
7. ✅ **Update CHANGELOG.md always**
8. ✅ **Use annotated tags with messages**

## Quick Commands Reference

```powershell
# Complete release process
# 1. Update version
code Directory.Build.props CHANGELOG.md

# 2. Test locally
dotnet build --configuration Release

# 3. Commit
git add Directory.Build.props CHANGELOG.md
git commit -m "Release v0.2.0"
git push origin main

# 4. Validate
.\scripts\validate-release.ps1 -TagVersion "v0.2.0"

# 5. Tag (triggers release!)
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin v0.2.0

# 6. Monitor
start https://github.com/schalkje/markread/actions
```

---

**This approach gives you:**
- 🎯 Predictable release process
- 🔒 Safety through validation
- ⚡ Speed through automation
- 📝 Clear audit trail
- 🎉 More time for development!
