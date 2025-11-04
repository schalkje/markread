# Creating a Release

This guide explains how to create a new release of MarkRead with both portable and installer packages.

## Automated Release Process

The project uses GitHub Actions to automatically build and release packages when you create a version tag.

### Steps to Create a Release

1. **Ensure your code is ready:**
   ```powershell
   # Make sure everything builds locally
   dotnet build
   dotnet test  # if tests exist
   ```

2. **Update version information** (if needed):
   - Update any version numbers in documentation
   - Update CHANGELOG.md (if you maintain one)

3. **Commit and push changes:**
   ```powershell
   git add .
   git commit -m "Prepare for release v1.0.0"
   git push
   ```

4. **Create and push a version tag:**
   ```powershell
   # Create an annotated tag (recommended)
   git tag -a v1.0.0 -m "Release version 1.0.0"
   
   # Push the tag to GitHub
   git push origin v1.0.0
   ```

5. **Monitor the build:**
   - Go to your repository on GitHub
   - Click on "Actions" tab
   - Watch the "Build and Release" workflow execute
   - Build typically takes 3-5 minutes

6. **Release is created automatically:**
   - Once the workflow completes, a new release will be created
   - The release will include:
     - `MarkRead-v1.0.0-win-x64.zip` - Portable version
     - `MarkRead-v1.0.0-win-x64.msi` - Installer package
   - Release notes are auto-generated from commits

## Manual Release Process

If you need to build the installer locally (for testing or manual distribution):

### Build the MSIX Package

```powershell
# Navigate to the installer directory
cd installer

# Run the build script
.\build-installer.ps1 -Version "1.0.0.0"
```

This will:
1. Generate placeholder images if needed
2. Update the package manifest version
3. Build the application
4. Create an MSIX package
5. Output: `AppPackages\MarkRead.Package_[version]_x64_Test\` directory

### Build Options

```powershell
# Debug build
.\build-installer.ps1 -Version "1.0.0.0" -Configuration Debug

# Release build (default)
.\build-installer.ps1 -Version "1.0.0.0" -Configuration Release

# x86 platform
.\build-installer.ps1 -Version "1.0.0.0" -Platform x86
```

**Note:** MSIX version must be in format `X.Y.Z.W` (e.g., `1.0.0.0`)

## Version Tag Format

Use semantic versioning with a `v` prefix:
- `v1.0.0` - Major release
- `v1.1.0` - Minor release (new features)
- `v1.1.1` - Patch release (bug fixes)
- `v2.0.0-beta` - Pre-release

## Package Contents

### Portable ZIP Package
Contains:
- MarkRead.App.exe and all dependencies
- Rendering assets (highlight.js, mermaid, prism)
- Templates

Users can extract and run without installation.

### MSIX Package
Provides:
- Modern Windows 10/11 installation experience
- Start Menu tiles and shortcuts
- File associations for .md and .markdown files
- Apps & features entry in Windows Settings
- Automatic updates when newer version is installed
- Clean, complete uninstallation
- App sandboxing and security

## Troubleshooting

### Build Fails on GitHub Actions

1. Check the Actions log for specific errors
2. Common issues:
   - Missing dependencies in WiX file
   - Incorrect file paths
   - Build errors in the application

### Testing Before Release

```powershell
# Build the package locally first
cd installer
.\build-installer.ps1 -Version "1.0.0.0"

# Enable Developer Mode in Windows Settings (for unsigned packages)
# Navigate to AppPackages folder
# Right-click the .msix file and install
# Test the application
# Uninstall from Start menu or Windows Settings before creating the real release
```

### Deleting a Release

If you need to delete a bad release:
1. Go to GitHub > Releases
2. Delete the release
3. Delete the tag locally and remotely:
   ```powershell
   git tag -d v1.0.0
   git push origin :refs/tags/v1.0.0
   ```

## Important Notes

1. **MSIX version format** must be `X.Y.Z.W` (e.g., `1.0.0.0`), not semantic versioning
2. **Test the package** on a clean machine before releasing
3. **Version tags are immutable** - don't reuse version numbers
4. **Keep release notes** updated in your repository
5. **Package images** should be replaced with actual branding before release
6. **Enable Developer Mode** in Windows to install unsigned packages (for testing)

## First Release Setup

Before your very first release:

1. **Create custom package images:**
   - Replace placeholder images in `installer\Images\` with branded versions
   - Use proper sizes and transparency

2. **Update Package.appxmanifest:**
   - Set correct Publisher identity (must match certificate for signed packages)
   - Update DisplayName and Description
   - Verify file associations

3. **Consider code signing:**
   - For production releases, obtain a code signing certificate
   - Add certificate to GitHub Secrets for automated signing
   - Update the workflow to enable signing
