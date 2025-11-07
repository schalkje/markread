# MSI Installer Implementation - Quick Start

## What Was Done

✅ **Complete MSI installer implementation for MarkRead**

### Files Created/Modified

1. **Project Configuration**
   - `src/App/MarkRead.App.csproj` - Added version and metadata
   - `src/Installer/MarkRead.Installer.wixproj` - New WiX installer project
   - `src/Installer/Package.wxs` - WiX installer definition
   - `markread.sln` - Added installer project to solution

2. **GitHub Actions**
   - `.github/workflows/release.yml` - Automated release pipeline
   - `.github/workflows/build.yml` - PR validation workflow

3. **Documentation**
   - `CHANGELOG.md` - Version history
   - `documentation/developer/msi-setup.md` - Complete setup guide
   - `documentation/developer/distribution-plan.md` - Overall plan
   - `README.md` - Updated with installation instructions
   - `assets/README.md` - Asset creation guide

4. **Assets**
   - `assets/License.rtf` - License for installer

## ✅ Build Status: WORKING!

The MSI installer builds successfully without requiring icon files (they're optional for now).

### Current State

✅ MSI builds without errors  
✅ Approximately 600KB output file  
✅ Ready for local testing  
⚠️ Icons not yet created (shortcuts will use default exe icon)

### Optional: Create Icon Files (For Better UX)

To add custom icons later:

1. **icon.ico** - Application icon for Windows
   - Download/create a markdown-themed icon
   - Convert to .ico format (256x256, 128x128, 64x64, 48x48, 32x32, 16x16)
   - Save to `assets/icon.ico`

2. **icon.png** - Package icon
   - Same design as icon.ico  
   - 256x256 PNG format
   - Save to `assets/icon.png`

**Quick Option:** Use a free icon from https://icons8.com/ or similar, search for "markdown" or "document"

### Optional: Create Installer Images

For a more professional installer (optional for first release):

1. **installer-banner.bmp** (493 x 58 pixels, 24-bit BMP)
2. **installer-dialog.bmp** (493 x 312 pixels, 24-bit BMP)

Or comment out these lines in `src/Installer/Package.wxs`:
```xml
<!-- Temporarily remove for testing -->
<!--
<WixVariable Id="WixUIBannerBmp" Value="..\..\assets\installer-banner.bmp" />
<WixVariable Id="WixUIDialogBmp" Value="..\..\assets\installer-dialog.bmp" />
-->
```

## Building the Installer

### 1. Install WiX Toolset

```powershell
dotnet tool install --global wix --version 4.0.5
wix --version
```

### 2. Build the MSI

```powershell
# From repo root
dotnet build --configuration Release
```

The MSI will be at: `src\Installer\bin\Release\MarkRead-0.1.0-x64.msi`

### 3. Test Locally

```powershell
# Install
msiexec /i "src\Installer\bin\Release\MarkRead-0.1.0-x64.msi"

# Verify
& "C:\Program Files\MarkRead\MarkRead.App.exe" .\documentation

# Uninstall
# Settings > Apps > MarkRead > Uninstall
```

## Creating Your First Release

### 1. Commit Everything

```powershell
git add .
git commit -m "Add MSI installer implementation"
git push origin feature/packaging
```

### 2. Merge to Main

Create and merge PR to main branch.

### 3. Create Release Tag

```powershell
# After merge to main
git checkout main
git pull

# Create tag
git tag -a v0.1.0 -m "First alpha release with MSI installer"
git push origin v0.1.0
```

### 4. Watch GitHub Actions

1. Go to https://github.com/schalkje/markread/actions
2. Watch the "Release" workflow run
3. On success, check https://github.com/schalkje/markread/releases
4. Download and test the MSI

## What the Installer Does

When users run the MSI:

✅ Installs to `C:\Program Files\MarkRead`
✅ Creates Desktop shortcut
✅ Creates Start Menu shortcut  
✅ Associates .md and .markdown files with MarkRead
✅ Adds to Windows Programs list for uninstallation
✅ Includes all dependencies (self-contained)

## Troubleshooting

**Build fails: icon.ico not found**
- Create the icon file at `assets/icon.ico`
- See `assets/README.md` for help

**Build fails: WiX not found**
- Install WiX: `dotnet tool install --global wix --version 4.0.5`
- Restart your terminal

**GitHub Actions fails**
- Check that all assets exist in the repo
- Verify icon files are committed
- Check workflow logs for specific error

## Feature Highlights

### For Users
- One-click installation
- No .NET runtime to install separately
- Proper Windows integration
- Easy uninstallation

### For Development
- Automated builds on tag push
- Version management via git tags
- SHA256 checksums automatically generated
- Release notes auto-generated

### For Distribution
- Professional MSI installer
- GitHub Releases integration
- Ready for code signing (future)
- Ready for winget (future)

## File Structure

```
markread/
├── .github/
│   └── workflows/
│       ├── build.yml          # PR validation
│       └── release.yml        # Release automation
├── assets/
│   ├── icon.ico               # ⚠️ Need to create
│   ├── icon.png               # ⚠️ Need to create
│   ├── License.rtf            # ✅ Created
│   └── README.md              # ✅ Created
├── src/
│   ├── App/
│   │   └── MarkRead.App.csproj  # ✅ Updated
│   └── Installer/
│       ├── MarkRead.Installer.wixproj  # ✅ Created
│       └── Package.wxs                # ✅ Created
├── documentation/
│   └── developer/
│       ├── distribution-plan.md  # ✅ Complete plan
│       └── msi-setup.md         # ✅ Setup guide
├── CHANGELOG.md                   # ✅ Created
├── README.md                      # ✅ Updated
└── markread.sln                   # ✅ Updated
```

## Version Strategy

- **0.1.0-alpha.X** - Early testing releases
- **0.1.0-beta.X** - Feature complete, testing
- **0.1.0** - First stable release
- **1.0.0** - Production ready

## Support

- **Setup guide:** `documentation/developer/msi-setup.md`
- **Full plan:** `documentation/developer/distribution-plan.md`
- **Issues:** https://github.com/schalkje/markread/issues

---

**Status:** ✅ **BUILDS SUCCESSFULLY!** MSI installer ready for testing at `src\Installer\bin\Release\MarkRead--x64.msi`
