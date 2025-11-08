# Release Automation: Industry Best Practices

This document compares MarkRead's release automation with industry best practices from popular open-source projects.

## Our Approach: Automated Release Script

```powershell
.\scripts\release.ps1
```

**Key Features:**
- Interactive CLI prompts
- Version suggestions (semver-based)
- Automatic CHANGELOG updates
- Git operations automated
- Safety validations
- Dry-run mode

## Industry Comparisons

### 1. Node.js / npm Ecosystem

**Common Tools:**
- `npm version` - Built-in version bumping
- `standard-version` / `release-please` - Automated changelog
- `semantic-release` - Fully automated releases

**Example:**
```bash
npm version minor     # Bumps version, commits, tags
npm publish          # Publishes to npm
```

**MarkRead Equivalent:**
```powershell
.\scripts\release.ps1 -Version "0.2.0"
```

### 2. GitHub CLI (gh)

GitHub's official tool has release automation:

```bash
gh release create v1.0.0 \
  --title "Release 1.0.0" \
  --notes "Release notes" \
  dist/*.msi
```

**Pros:**
- Official GitHub integration
- Can upload assets directly

**Cons:**
- Manual version management
- No changelog integration
- Requires separate build step

**MarkRead Advantage:**
- Integrated workflow (version → changelog → build → release)
- No manual asset uploads (GitHub Actions handles it)

### 3. Go Releases (GoReleaser)

Popular tool in Go ecosystem:

```yaml
# .goreleaser.yml
builds:
  - env: [CGO_ENABLED=0]
archives:
  - format: tar.gz
release:
  github:
    owner: user
    name: repo
```

Then: `goreleaser release --clean`

**Similar to MarkRead:**
- Single command for release
- Automatic asset creation
- GitHub integration

**MarkRead Advantage:**
- Interactive prompts (more user-friendly)
- Integrated changelog management

### 4. Rust (cargo-release)

```bash
cargo release minor --execute
```

**Features:**
- Bumps version in Cargo.toml
- Creates git tag
- Pushes to GitHub
- Publishes to crates.io

**Very Similar to MarkRead's Script:**
- Single command
- Version bumping
- Git automation
- Tag-based releases

### 5. Python (bump2version / tbump)

```bash
# bump2version
bump2version minor

# tbump
tbump 0.2.0
```

**Features:**
- Updates version in multiple files
- Creates commit and tag
- Can run custom commands

**MarkRead is More Comprehensive:**
- Includes changelog management
- Runs tests
- Validates before proceeding

### 6. .NET (Nerdbank.GitVersioning)

Automatic version from git history:

```xml
<PackageReference Include="Nerdbank.GitVersioning" />
```

Versions derived from: commit count, branch name, tags

**Pros:**
- Fully automatic
- No manual version management

**Cons:**
- Complex setup
- Less control over version numbers
- Not suitable for semantic versioning

**MarkRead's Choice:**
- Explicit versioning (clearer for users)
- Follows semver intentionally

### 7. Conventional Commits + semantic-release

Fully automated releases based on commit messages:

```bash
# Commit format determines version bump
git commit -m "feat: new feature"      # → minor bump
git commit -m "fix: bug fix"          # → patch bump
git commit -m "feat!: breaking"       # → major bump
```

Then `semantic-release` automatically:
- Determines version
- Generates CHANGELOG
- Creates release

**Pros:**
- Zero manual steps
- Forces good commit discipline

**Cons:**
- Requires strict commit format
- Less control over timing
- Can release too frequently

**MarkRead's Choice:**
- Manual control over release timing
- Release when features are ready
- More flexibility

## Industry Best Practices Summary

### ✅ Best Practices MarkRead Follows

1. **Tag-Triggered Releases**
   - Used by: GitHub, GitLab, Azure DevOps, npm
   - ✅ MarkRead: Git tags trigger GitHub Actions

2. **Semantic Versioning**
   - Used by: npm, Rust, Go, Python, .NET
   - ✅ MarkRead: MAJOR.MINOR.PATCH with pre-release support

3. **Automated Builds**
   - Used by: All major projects
   - ✅ MarkRead: GitHub Actions builds and publishes

4. **Changelog Generation**
   - Used by: Node.js, Rust, Go
   - ✅ MarkRead: Interactive prompts + automation

5. **Version File as Source of Truth**
   - Used by: Go (go.mod), Rust (Cargo.toml), Node (package.json)
   - ✅ MarkRead: Directory.Build.props

6. **Pre-Release Support**
   - Used by: npm (alpha, beta, rc), Python, Rust
   - ✅ MarkRead: v1.0.0-beta.1 supported

7. **Safety Validations**
   - Used by: cargo-release, standard-version
   - ✅ MarkRead: Validates before committing/pushing

8. **Dry-Run Mode**
   - Used by: cargo-release, GoReleaser
   - ✅ MarkRead: `-DryRun` parameter

### ⚖️ Trade-offs

| Approach | Automation | Control | Complexity | MarkRead Choice |
|----------|-----------|---------|------------|-----------------|
| Fully Manual | Low | High | Low | ❌ Too tedious |
| Script-Based | Medium | High | Low | ✅ **Current** |
| Conventional Commits | High | Low | Medium | ❌ Too rigid |
| Tool-Generated Versions | High | Low | High | ❌ Too opaque |

**MarkRead's Balance:**
- Automates tedious steps (commits, tags, builds)
- Keeps control (when to release, version numbers)
- Simple to use (single command)
- Transparent (you see what's happening)

## Alternative Tools Considered

### Could Use Instead of Custom Script

#### 1. standard-version (Node.js)
```bash
npm install --save-dev standard-version
npx standard-version
```
**Verdict:** Requires Node.js ecosystem, overkill for .NET project

#### 2. GitVersion
Automatic versioning from git history
**Verdict:** Too automatic, less control

#### 3. GitHub CLI (gh)
```bash
gh release create v0.2.0
```
**Verdict:** Requires manual version management, no changelog integration

#### 4. PowerShell-based (Custom) ⭐
```powershell
.\scripts\release.ps1
```
**Verdict:** Perfect for .NET/Windows project, full control, simple

### Why Custom PowerShell Script?

1. ✅ **Native to .NET/Windows**: No external dependencies
2. ✅ **Interactive**: User-friendly for manual releases
3. ✅ **Integrated**: Works with existing workflow
4. ✅ **Flexible**: Easy to modify for specific needs
5. ✅ **Transparent**: Clear what's happening at each step
6. ✅ **Lightweight**: No tool installation required

## Recommendations for Other Projects

### For Node.js Projects
```bash
npm install standard-version
# Use: npx standard-version
```

### For Rust Projects
```bash
cargo install cargo-release
# Use: cargo release minor
```

### For Go Projects
```bash
brew install goreleaser
# Use: goreleaser release
```

### For Python Projects
```bash
pip install bump2version
# Use: bump2version minor
```

### For .NET Projects ⭐
```powershell
# Use MarkRead's approach!
# Create custom PowerShell script similar to ours
.\scripts\release.ps1
```

**Why?**
- PowerShell is native to Windows/.NET
- Great for interactive workflows
- Full control over MSI/installer process
- Integrates well with GitHub Actions

## Learning from Others

### From npm ecosystem:
- ✅ Adopted: Version bumping convenience
- ✅ Adopted: Changelog automation
- ❌ Skipped: Automatic releases (too frequent)

### From Rust cargo:
- ✅ Adopted: Single command releases
- ✅ Adopted: Dry-run mode
- ✅ Adopted: Pre-release validation

### From Go:
- ✅ Adopted: Tag-triggered CI/CD
- ✅ Adopted: Asset generation automation

### From GitHub:
- ✅ Adopted: GitHub Actions integration
- ✅ Adopted: Release asset management

## Conclusion

**MarkRead's release automation follows industry best practices while maintaining simplicity and control.**

### Our Approach is Similar To:
- `cargo release` (Rust)
- `npm version` (Node.js)
- `tbump` (Python)

### Advantages Over Alternatives:
- ✅ No external tool dependencies
- ✅ Interactive and user-friendly
- ✅ Integrated with our specific workflow
- ✅ Windows/.NET native

### Perfect For:
- ✅ .NET desktop applications
- ✅ Projects with manual release control
- ✅ Teams wanting clarity over automation
- ✅ Open-source projects on GitHub

---

## References

- [semantic-release](https://github.com/semantic-release/semantic-release)
- [standard-version](https://github.com/conventional-changelog/standard-version)
- [cargo-release](https://github.com/crate-ci/cargo-release)
- [GoReleaser](https://goreleaser.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

## Our Documentation

- [Release Script README](../../scripts/README.md)
- [Release Process Guide](release-process.md)
- [Version Update Checklist](VERSION-UPDATE-CHECKLIST.md)
