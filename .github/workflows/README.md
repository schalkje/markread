# GitHub Actions Workflows

This directory contains the CI/CD workflows for MarkRead.

## Active Workflows

### `ci.yml` - Continuous Integration
**Purpose**: Validate every code change  
**Triggers**: 
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual dispatch

**What it does**:
- ✅ Builds the application
- ✅ Runs tests (when available)
- ✅ Builds unsigned MSI installer
- ✅ Uploads MSI as artifact for testing
- ⏱️ Duration: ~5-8 minutes

**Artifacts**: 
- `markread-msi-unsigned-{sha}` - Unsigned MSI for testing (30 day retention)

---

### `release.yml` - Release and Sign
**Purpose**: Create official signed releases  
**Triggers**: 
- Push of version tags (e.g., `v0.3.0`)
- Manual dispatch with tag input

**What it does**:
- ✅ Builds the application
- ✅ Builds MSI installer
- 🔐 Signs MSI with code signing certificate
- ✅ Verifies signature
- 📦 Creates GitHub release
- 📤 Uploads signed MSI + public certificate
- ⏱️ Duration: ~7-10 minutes

**Artifacts**: 
- `markread-msi-signed` - Signed MSI (90 day retention)

**Requirements**: 
- GitHub Secrets: `CERT_PFX`, `CERT_PASSWORD`

---

## Archived Workflows

### `build-and-sign.yml.old`
- Previous combined workflow (replaced by `ci.yml` + `release.yml`)
- Kept for reference during transition

### `build.yml.old`
- Original basic build workflow
- Superseded by more comprehensive `ci.yml`

---

## Workflow Decision Tree

```
┌─────────────────────────────────────┐
│  Developer pushes code or creates PR │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────────────┐
        │  CI Workflow │  ← Always runs (fast validation)
        └──────────────┘
               │
               ├─► Build app
               ├─► Run tests
               ├─► Build unsigned MSI
               └─► Upload artifact
               
┌─────────────────────────────────────┐
│  Developer creates version tag       │
│  (e.g., v0.3.0)                     │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────────────────┐
        │ Release Workflow │  ← Only for official releases
        └──────────────────┘
               │
               ├─► Build app
               ├─► Build MSI
               ├─► Sign MSI 🔐
               ├─► Export certificate
               ├─► Create GitHub release
               └─► Upload signed files
```

---

## Usage Examples

### For Pull Requests
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push and create PR
git push origin feature/my-feature
# Create PR on GitHub → CI workflow runs automatically
```

### For Releases
```bash
# Ensure you're on main with latest changes
git checkout main
git pull

# Use the release script (recommended)
.\scripts\release.ps1

# Or manually:
# 1. Update version in Directory.Build.props
# 2. Update CHANGELOG.md
# 3. Commit and tag
git add Directory.Build.props CHANGELOG.md
git commit -m "Bump version to 0.3.0"
git tag -a v0.3.0 -m "Release v0.3.0"
git push && git push --tags

# Release workflow runs automatically on tag push
```

---

## Troubleshooting

### CI Workflow Fails
- Check build errors in workflow logs
- Ensure all dependencies are restored
- Verify WiX Toolset installation succeeds

### Release Workflow Fails
**Certificate Issues**:
- Verify `CERT_PFX` secret is set (base64-encoded)
- Verify `CERT_PASSWORD` secret is set
- Check certificate expiration date

**Signing Issues**:
- Check that signtool.exe is available (Windows SDK)
- Verify timestamp server is accessible

**Release Creation Issues**:
- Ensure tag follows `v*` pattern (e.g., `v0.3.0`)
- Check that `contents: write` permission is set
- Verify MSI file was built successfully

---

## Security Notes

- Certificate secrets are **never** exposed to PR workflows
- Only maintainers with repository write access can push tags
- Signed releases are created only on version tags
- Certificate file is cleaned up after each workflow run

---

## Migration Notes (December 2025)

**Changes made**:
- Split monolithic `build-and-sign.yml` into `ci.yml` and `release.yml`
- Archived old `build.yml` workflow
- Improved clarity with separation of concerns
- Faster CI workflow (no signing overhead)
- Added better documentation and release notes

**Benefits**:
- ✅ Faster PR validation (no signing steps)
- ✅ Clearer workflow purposes
- ✅ Easier to maintain independently
- ✅ Better security (secrets only in release workflow)
