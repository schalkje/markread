# Version Management Guide

## Overview

MarkRead uses a centralized version management system via `Directory.Build.props` at the repository root. This ensures all projects (App, Installer) use the same version number.

## How It Works

### Single Source of Truth

The version is defined once in **`Directory.Build.props`**:

```xml
<PropertyGroup>
  <Version>0.1.0</Version>
  <AssemblyVersion>0.1.0.0</AssemblyVersion>
  <FileVersion>0.1.0.0</FileVersion>
</PropertyGroup>
```

MSBuild automatically imports `Directory.Build.props` into all `.csproj` and `.wixproj` files in subdirectories.

### Version Propagation

1. **Application (`src/MarkRead.csproj`)**: Inherits `Version`, `AssemblyVersion`, and `FileVersion`
2. **Installer (`installer/MarkRead.Installer.wixproj`)**: Inherits `Version` for output filename
3. **MSI Package (`installer/Package.wxs`)**: Binds to the executable's FileVersion at build time using `!(bind.FileVersion.MarkRead.exe)`

## Updating the Version

### Step 1: Edit Directory.Build.props

Update the version in ONE place only:

```xml
<Version>1.0.0</Version>              <!-- Semantic version -->
<AssemblyVersion>1.0.0.0</AssemblyVersion>  <!-- Assembly version -->
<FileVersion>1.0.0.0</FileVersion>    <!-- File version -->
```

### Step 2: Update CHANGELOG.md

Document the changes:

```markdown
## [1.0.0] - 2025-11-08

### Added
- New feature X
- Enhancement Y

### Fixed
- Bug Z
```

### Step 3: Commit and Tag

```powershell
# Commit the version change
git add Directory.Build.props CHANGELOG.md
git commit -m "Bump version to 1.0.0"

# Create annotated tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push commits and tags
git push origin main
git push origin v1.0.0
```

### Step 4: Build and Verify

```powershell
# Build the solution
dotnet build --configuration Release

# Verify the MSI filename includes correct version
Get-ChildItem installer\bin\Release\*.msi
# Expected: MarkRead-1.0.0-x64.msi

# Verify the exe version
(Get-Item src\bin\Release\net8.0-windows\MarkRead.exe).VersionInfo.FileVersion
# Expected: 1.0.0.0
```

## Version Numbering Strategy

MarkRead follows [Semantic Versioning 2.0.0](https://semver.org/):

**Format:** `MAJOR.MINOR.PATCH`

- **MAJOR**: Incompatible API/behavior changes (e.g., 1.0.0 → 2.0.0)
- **MINOR**: New features, backwards-compatible (e.g., 1.0.0 → 1.1.0)
- **PATCH**: Bug fixes, backwards-compatible (e.g., 1.0.0 → 1.0.1)

### Pre-release Versions

For alpha/beta releases, append a pre-release identifier:

```xml
<Version>1.0.0-alpha.1</Version>
<Version>1.0.0-beta.2</Version>
<Version>1.0.0-rc.1</Version>
```

**Note:** MSI version binding (`!(bind.FileVersion.MarkRead.exe)`) only uses numeric parts (1.0.0.0), ignoring pre-release suffixes.

## Automated Version Validation

### Pre-commit Check (Future Enhancement)

Create a git pre-commit hook to verify version consistency:

```powershell
# .git/hooks/pre-commit
$props = [xml](Get-Content Directory.Build.props)
$version = $props.Project.PropertyGroup.Version

# Check if CHANGELOG.md mentions the version
if (-not (Get-Content CHANGELOG.md | Select-String $version)) {
    Write-Error "CHANGELOG.md doesn't mention version $version"
    exit 1
}
```

### CI/CD Validation

The GitHub Actions workflow validates:
- Version format (semantic versioning)
- Tag matches version in `Directory.Build.props`
- All projects inherit the correct version

## Troubleshooting

### Version Mismatch After Build

**Problem:** MSI has wrong version number

**Solution:**
1. Clean the solution: `dotnet clean`
2. Rebuild: `dotnet build --configuration Release`
3. Verify `Directory.Build.props` exists at repository root

### MSI Won't Install Over Old Version

**Problem:** "Another version is already installed"

**Solution:**
1. Uninstall the old version first
2. Or increment the MAJOR or MINOR version for MSI upgrade to work
3. The `<MajorUpgrade>` element in `Package.wxs` handles automatic upgrades

### Directory.Build.props Not Applied

**Problem:** Projects don't inherit version

**Causes:**
- File not at repository root (must be above all projects)
- Invalid XML syntax
- Property defined in project overrides imported value

**Solution:**
1. Ensure `Directory.Build.props` is at `c:\repo\markread\Directory.Build.props`
2. Remove `<Version>` from individual project files
3. Validate XML syntax

## Related Files

- **`Directory.Build.props`** - Central version definition
- **`src/MarkRead.csproj`** - Application project (inherits version)
- **`installer/MarkRead.Installer.wixproj`** - Installer project (inherits version)
- **`installer/Package.wxs`** - WiX package definition (binds to exe version)
- **`CHANGELOG.md`** - Version history and release notes

## Benefits of This Approach

✅ **Single source of truth** - Version defined once  
✅ **Automatic propagation** - All projects stay in sync  
✅ **Reduced errors** - No manual updates in multiple files  
✅ **Git-tag friendly** - Version matches git tags  
✅ **CI/CD ready** - Easy to automate version bumps  

## Additional Properties in Directory.Build.props

Beyond version, `Directory.Build.props` also centralizes:

- **Product name** (`<Product>MarkRead</Product>`)
- **Company** (`<Company>schalken.net</Company>`)
- **Copyright** (`<Copyright>Copyright © 2025 schalken.net</Copyright>`)
- **Authors** (`<Authors>schalkje</Authors>`)
- **Repository info** (`<RepositoryUrl>`, `<RepositoryType>`)
- **License** (`<PackageLicenseExpression>MIT</PackageLicenseExpression>`)

All projects inherit these automatically, ensuring consistency across the solution.

## References

- [MSBuild Directory.Build.props documentation](https://learn.microsoft.com/en-us/visualstudio/msbuild/customize-by-directory)
- [Semantic Versioning Specification](https://semver.org/)
- [WiX Bind Variable Reference](https://wixtoolset.org/docs/tools/bind/)

---

**Next Steps:**
1. Test the build to verify version propagation works
2. Create a release following the version update process
3. Consider automating version bumps in CI/CD pipeline
