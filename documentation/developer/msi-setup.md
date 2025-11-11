# MSI Installer Setup Guide

This guide will walk you through building and testing the MSI installer for MarkRead.

## Prerequisites

### 1. Install WiX Toolset v4

WiX is required to build MSI installers.

```powershell
# Install WiX as a global .NET tool
dotnet tool install --global wix --version 4.0.5

# Verify installation
wix --version
```

### 2. Create Required Assets

Before building, you need these asset files in the `assets/` directory:

- ✅ **License.rtf** - Already created
- ⚠️ **icon.ico** - Application icon (needs creation)
- ⚠️ **icon.png** - Package icon (needs creation)
- ⚠️ **installer-banner.bmp** - Installer banner (optional, can be removed)
- ⚠️ **installer-dialog.bmp** - Installer dialog image (optional, can be removed)

**Quick Start Option:** For testing without creating all assets:

1. Open `src/Installer/Package.wxs`
2. Comment out or remove the WixVariable lines for banner and dialog images:

```xml
<!-- Comment out these lines for testing -->
<!--
<WixVariable Id="WixUIBannerBmp" Value="..\..\assets\installer-banner.bmp" />
<WixVariable Id="WixUIDialogBmp" Value="..\..\assets\installer-dialog.bmp" />
-->
```

3. Create a simple icon:
   - Download a free markdown icon PNG
   - Convert to .ico format using https://www.icoconverter.com/
   - Save as `assets/icon.ico` and `assets/icon.png`

## Building the Installer

### Option 1: Build via Visual Studio

1. Open `markread.sln` in Visual Studio 2022
2. Set build configuration to **Release**
3. Right-click the **MarkRead.Installer** project
4. Select **Build**

The MSI will be created in: `src/Installer/bin/Release/MarkRead-{version}-x64.msi`

### Option 2: Build via Command Line

```powershell
# From repository root
cd c:\repo\markread

# Restore dependencies
dotnet restore

# Build the application
dotnet build src\App\MarkRead.App.csproj --configuration Release

# Build the installer
dotnet build src\Installer\MarkRead.Installer.wixproj --configuration Release
```

### Option 3: Build Everything

```powershell
# Build entire solution including installer
dotnet build --configuration Release
```

## Testing the Installer

### Local Testing

1. **Locate the MSI:**
   ```powershell
   Get-ChildItem -Path "src\Installer\bin\Release" -Filter "*.msi" -Recurse
   ```

2. **Install on your machine:**
   ```powershell
   # Right-click MSI and select "Install"
   # Or run from PowerShell:
   msiexec /i "src\Installer\bin\Release\MarkRead-0.1.0-x64.msi"
   ```

3. **Verify installation:**
   - Check Start Menu for MarkRead shortcut
   - Check Desktop for shortcut
   - Check `C:\Program Files\MarkRead\` for files
   - Try opening a `.md` file (should offer MarkRead as option)

4. **Test the application:**
   ```powershell
   & "C:\Program Files\MarkRead\MarkRead.App.exe" "C:\path\to\markdown\folder"
   ```

5. **Uninstall:**
   - Settings > Apps > MarkRead > Uninstall
   - Or: Control Panel > Programs > Uninstall a Program

### Virtual Machine Testing (Recommended)

Test on a clean Windows installation:

1. Create Windows 10/11 VM
2. Copy MSI to VM
3. Install and verify
4. Check for missing dependencies
5. Uninstall and verify cleanup

## Troubleshooting

### Build Errors

**Error: Cannot find file 'icon.ico'**
- Create the icon file in `assets/icon.ico`
- Or update the path in `MarkRead.App.csproj`

**Error: Cannot find file 'License.rtf'**
- Should already exist at `assets/License.rtf`
- Verify file exists and path is correct in `Package.wxs`

**Error: WiX toolset not found**
- Install WiX: `dotnet tool install --global wix --version 4.0.5`
- Restart terminal after installation

**Error: Invalid UpgradeCode**
- UpgradeCode must be a valid GUID
- Current: `8E5A9C7B-3D2E-4F1A-9B6D-1C8E5A7F9D3B`
- Don't change this once released (used for upgrades)

### Installation Errors

**Error: Another version is already installed**
- Uninstall the existing version first
- Or increment the version number

**Error: Installation failed with error code 1603**
- Check Windows Event Viewer > Application log
- Common causes: File in use, insufficient permissions
- Try closing any running instances of MarkRead

**Application doesn't start after install**
- Verify all files copied to `C:\Program Files\MarkRead\`
- Check `Rendering/assets/` and `Rendering/template/` folders exist
- Verify WebView2 runtime is installed

### Runtime Errors

**Missing WebView2 Runtime**
- Should auto-install via WebView2 package
- Manual download: https://developer.microsoft.com/microsoft-edge/webview2/

**Application won't open .md files**
- Check file associations in Windows Settings
- Re-run installer with "Repair" option

## Creating a Release

### 1. Update Version

MarkRead uses centralized version management via `Directory.Build.props`.

```powershell
# Update version in ONE place only:
# Edit: Directory.Build.props (at repository root)

# Change the <Version> property:
# <Version>0.1.0</Version>  →  <Version>0.2.0</Version>

# This automatically updates:
# - Application assembly version
# - MSI installer version
# - Output filename (MarkRead-{version}-x64.msi)

# Version format: Major.Minor.Patch (e.g., 0.1.0, 1.0.0, 1.2.3)
```

**See `documentation/developer/version-management.md` for detailed version management guide.**

### 2. Update CHANGELOG.md

Document changes in `CHANGELOG.md` following the existing format.

### 3. Commit Changes

```powershell
git add .
git commit -m "Release v0.1.0"
git push origin main
```

### 4. Create Git Tag

```powershell
# Create annotated tag
git tag -a v0.1.0 -m "Release version 0.1.0"

# Push tag to trigger GitHub Actions
git push origin v0.1.0
```

### 5. Monitor GitHub Actions

1. Go to https://github.com/schalkje/markread/actions
2. Watch the Release workflow
3. Verify successful build
4. Check GitHub Releases for created release

### 6. Test Released MSI

1. Download MSI from GitHub Releases
2. Verify SHA256 checksum
3. Test installation on clean system
4. Verify all functionality works

## Signing the Installer (Production)

For production releases, code signing is highly recommended to avoid "Unknown Publisher" warnings.

MarkRead uses [SignPath.io](https://signpath.io)'s free Foundation Edition for open-source projects.

### ✅ Recommended: SignPath.io (Free for Open Source)

**See the complete setup guide:** [SignPath.io Setup Guide](./signpath-setup.md)

**Benefits:**
- ✅ Free for open-source projects
- ✅ Extended Validation (EV) certificate
- ✅ Integrated with GitHub Actions
- ✅ Automatic signing on release

**Quick Start:**
1. Apply at [SignPath.io Foundation Edition](https://about.signpath.io/product/editions)
2. Configure GitHub secrets (see setup guide)
3. Push a release tag - signing happens automatically!

The GitHub Actions workflow (`.github/workflows/release.yml`) handles signing automatically when configured.

### Alternative: Commercial Certificate

If you need your company name on the certificate:

1. **Purchase code signing certificate** ($100-400/year)
   - Certum, Sectigo, DigiCert, SSL.com, etc.
2. **Install certificate** to build machine
3. **Sign manually** or integrate with CI/CD:

```powershell
# Sign MSI after building
signtool sign /a /t http://timestamp.digicert.com /fd SHA256 `
  "installer\bin\Release\MarkRead-1.0.0-x64.msi"

# Verify signature
signtool verify /pa /v "installer\bin\Release\MarkRead-1.0.0-x64.msi"
```

### ⚠️ Development Only: Self-Signed Certificate

**Not recommended for distribution** - only for local testing:

```powershell
# Create test certificate
New-SelfSignedCertificate -Type CodeSigningCert `
  -Subject "CN=MarkRead Test" `
  -CertStoreLocation Cert:\CurrentUser\My

# Sign MSI (after building)
Set-AuthenticodeSignature -FilePath "installer\bin\Release\MarkRead-1.0.0-x64.msi" `
  -Certificate (Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert)[0] `
  -TimestampServer http://timestamp.digicert.com
```

⚠️ Self-signed certificates are not trusted by Windows and provide no security benefit for users.

## Verification Commands

```powershell
# Check if MSI is signed
Get-AuthenticodeSignature .\MarkRead-1.0.0-x64.msi

# Detailed verification
signtool verify /pa /v .\MarkRead-1.0.0-x64.msi

# View certificate details
Get-AuthenticodeSignature .\MarkRead-1.0.0-x64.msi | 
  Select-Object -ExpandProperty SignerCertificate | 
  Format-List
```

## Advanced: Custom Actions

If you need to run code during installation (not currently needed):

1. Create a Custom Action project (C# Library)
2. Reference from WiX project
3. Call during install/uninstall

Example uses:
- Check for prerequisites
- Perform cleanup
- Configure settings

## MSI Properties

Current installer properties:

- **Install Location:** `C:\Program Files\MarkRead`
- **Shortcuts:** Desktop + Start Menu
- **File Associations:** .md, .markdown
- **Uninstall:** Via Windows Settings/Control Panel
- **Upgrade:** Major upgrade (removes old version)
- **Per-Machine Install:** Requires admin rights

To change install location or make per-user:
- Edit `Package.wxs`
- Change `ProgramFiles64Folder` to `LocalAppDataFolder`
- Remove `PerMachine` settings

## Resources

- [WiX Documentation](https://wixtoolset.org/docs/)
- [WiX Tutorial](https://www.firegiant.com/wix/tutorial/)
- [MSI Installer Best Practices](https://docs.microsoft.com/windows/win32/msi/)

## Next Steps

After successful MSI creation:

1. ✅ Test installer thoroughly
2. ✅ Create first release (v0.1.0-alpha)
3. ⬜ Gather feedback
4. ⬜ Create production release (v1.0.0)
5. ⬜ Consider code signing
6. ⬜ Add to winget (after MSI is stable)

---

**Questions or issues?** Create an issue at https://github.com/schalkje/markread/issues
