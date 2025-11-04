# MarkRead MSIX Package

This directory contains the Windows Application Packaging (WAP) project for building the MarkRead MSIX package.

## Prerequisites

### For SDK-based Build (Recommended)

1. **.NET 8 SDK** - for building the application
2. **Windows 10 SDK (10.0.19041.0 or later)** - for MSIX packaging tools

Install Windows SDK via:
```powershell
# Option 1: Using winget
winget install Microsoft.WindowsSDK.10.0.22621

# Option 2: Visual Studio Installer
# Modify installation > Individual Components > 
# SDKs, libraries, and frameworks > Windows 10 SDK

# Option 3: Standalone installer
# Download from: https://developer.microsoft.com/windows/downloads/windows-sdk/
```

### For WAP Project Build

1. **.NET 8 SDK** - for building the application
2. **Visual Studio 2019 or later** - with the following workloads:
   - .NET desktop development
   - Universal Windows Platform development

## Building the Package Locally

### Method 1: Windows SDK Build Script (Recommended)

**Requirements:** Only .NET 8 SDK and Windows 10 SDK (no Visual Studio workloads needed)

```powershell
.\build-msix-sdk.ps1 -Version "1.0.0.0"
```

This method uses `makeappx.exe` from the Windows SDK directly, avoiding the need for Visual Studio's Universal Windows Platform workload.

### Method 2: WAP Project Build Script

**Requirements:** Visual Studio with Universal Windows Platform development workload

```powershell
.\build-installer.ps1 -Version "1.0.0.0"
```

**Note:** This requires the `Microsoft.DesktopBridge` MSBuild SDK which comes with the UWP workload in Visual Studio.

### Common Options

Both scripts support:
- `-Version` - Package version (must be in format X.Y.Z.W)
- `-Configuration` - Build configuration (Release or Debug)
- `-Platform` - Target platform (x64 or x86)

### Manual Build

```powershell
# Find MSBuild
$msbuild = & "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -latest -requires Microsoft.Component.MSBuild -find MSBuild\**\Bin\MSBuild.exe | Select-Object -First 1

# Build the MSIX
& $msbuild MarkRead.Package.wapproj /p:Configuration=Release /p:Platform=x64 /p:AppxPackageDir="..\AppPackages\" /p:AppxBundle=Never /p:UapAppxPackageBuildMode=SideloadOnly /p:AppxPackageSigningEnabled=false
```

## Package Features

The MSIX package provides:

- **Modern Windows 10/11 installer** with Store-like experience
- **File associations** for .md and .markdown files
- **Clean installation/uninstallation** via Windows Settings
- **Automatic updates** when newer versions are installed
- **Isolated app data** in user's local AppData
- **Security and integrity** through package validation

## Package Images

The package requires several image assets for tiles and icons:

- `Square44x44Logo.png` (44x44) - App list icon
- `Square150x150Logo.png` (150x150) - Start menu medium tile
- `Wide310x150Logo.png` (310x150) - Start menu wide tile
- `StoreLogo.png` (50x50) - Store logo (if publishing)
- `SplashScreen.png` (620x300) - App splash screen

### Generate Placeholder Images

If you don't have custom images yet:

```powershell
cd Images
.\generate-placeholder-images.ps1
```

This creates placeholder images with "MR" branding. Replace these with your actual app branding.

## Configuration

### Package Identity

Edit `Package.appxmanifest` to customize:

- **Identity/Publisher** - Must match your certificate CN (for signed packages)
- **DisplayName** - App name shown to users
- **Description** - App description
- **File associations** - Supported file extensions

### Version Number

Version must be in format `X.Y.Z.W` (e.g., `1.0.0.0`). The build script updates this automatically.

## GitHub Actions

The MSIX package is automatically built by the GitHub Actions workflow when you push a version tag (e.g., `v1.0.0`). Both the portable ZIP and MSIX package will be attached to the GitHub release.

## Testing the Package

### Enable Developer Mode

For unsigned packages, enable Developer Mode:
1. Open Windows Settings
2. Go to Update & Security > For developers
3. Enable Developer Mode

### Install the Package

1. Navigate to the `AppPackages` folder
2. Find the `.msix` file
3. Right-click and select "Install"
4. Or double-click to launch the installer

### Verify Installation

- Check Start menu for MarkRead tile
- Verify file associations work (.md files)
- Test launching and basic functionality
- Check Add/Remove Programs entry

### Uninstall

- Right-click the Start menu tile > Uninstall
- Or use Settings > Apps > Apps & features

## Code Signing (Production)

For production releases, you should sign the MSIX package:

### Create a Certificate

```powershell
# Generate a self-signed certificate (for testing)
New-SelfSignedCertificate -Type Custom -Subject "CN=YourPublisher" -KeyUsage DigitalSignature -FriendlyName "MarkRead Signing Certificate" -CertStoreLocation "Cert:\CurrentUser\My" -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")
```

### Update the Build

Enable signing in the build:
```powershell
msbuild MarkRead.Package.wapproj /p:AppxPackageSigningEnabled=true /p:PackageCertificateKeyFile=YourCertificate.pfx /p:PackageCertificatePassword=YourPassword
```

### For GitHub Actions

Add certificate as secrets:
1. Export PFX as Base64
2. Add to GitHub Secrets as `BASE64_ENCODED_PFX`
3. Add password as `PFX_PASSWORD`
4. Update workflow to use these secrets

## Troubleshooting

### Windows SDK Not Found (SDK Build)

If `build-msix-sdk.ps1` fails with "Windows SDK not found":

```powershell
# Quick install via winget
winget install Microsoft.WindowsSDK.10.0.22621
```

Or install via Visual Studio Installer:
1. Open Visual Studio Installer
2. Modify your VS installation
3. Individual Components tab
4. Search for "Windows 10 SDK"
5. Check the latest version (10.0.22621 or newer)
6. Click Modify to install

### MSBuild Not Found (WAP Build)

Install Visual Studio with required workloads, or use the SDK build method instead.

### Package Validation Errors

Check `Package.appxmanifest` for:
- Valid version format (X.Y.Z.W)
- Valid publisher format (CN=...)
- All referenced images exist

### App Won't Install

- Enable Developer Mode for unsigned packages
- Check Windows Event Viewer for detailed errors
- Verify target OS version compatibility

### File Associations Not Working

- Reinstall the package
- Check `Package.appxmanifest` has correct file extension declarations
- Restart Windows Explorer
