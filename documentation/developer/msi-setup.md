# MSI Installer Setup and Code Signing Guide

This guide covers building MSI installers for MarkRead and setting up code signing with self-signed certificates.

## Quick Links

- [Building MSI Installers](#building-the-installer)
- [Code Signing Setup](#code-signing)
- [GitHub Actions CI/CD](#cicd-pipeline)
- [Local Development Signing](#local-signing)

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
dotnet build src\App\MarkRead.csproj --configuration Release

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
- Or update the path in `MarkRead.csproj`

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

---

## Code Signing

### Overview

MarkRead uses self-signed certificates for MSI code signing during development and testing. This eliminates "Unknown publisher" warnings after certificate trust.

### Creating a Code Signing Certificate

Use the `create-certificate.ps1` script to generate a new self-signed certificate:

```powershell
# Navigate to repository root
cd C:\repo\markread

# Create certificate
.\scripts\create-certificate.ps1 `
    -SubjectName "CN=MarkRead Developer" `
    -ValidityYears 2 `
    -Password "YourSecurePassword123" `
    -ExportPath "C:\Certs\markread-cert.pfx"
```

**Important:**
- Use a strong password
- Store password securely (password manager recommended)
- Minimum 1 year validity, recommended 2-3 years
- Certificate is stored in `Cert:\CurrentUser\My`

### Exporting Certificates

#### For Signing (PFX with Private Key)

```powershell
.\scripts\export-certificate.ps1 `
    -Thumbprint "YOUR_CERT_THUMBPRINT" `
    -Password "YourSecurePassword123" `
    -PfxPath "markread-signing.pfx"
```

**WARNING:** Never commit PFX files to source control!

#### For User Distribution (CER Public Key Only)

```powershell
.\scripts\export-certificate.ps1 `
    -Thumbprint "YOUR_CERT_THUMBPRINT" `
    -CerPath "markread-public.cer"
```

This CER file can be safely distributed and included in releases.

### Validating Certificates

Before signing, validate your certificate:

```powershell
# Validate from certificate store
.\scripts\validate-certificate.ps1 `
    -Thumbprint "YOUR_CERT_THUMBPRINT" `
    -CheckPrivateKey

# Validate PFX file
.\scripts\validate-certificate.ps1 `
    -PfxPath "markread-signing.pfx" `
    -Password "YourSecurePassword123"
```

Checks performed:
- ✓ Certificate not expired
- ✓ Code signing extended key usage
- ✓ Private key available
- ✓ Date validity
- ⚠ Expiration warnings (< 30 days)

### GitHub Secrets Setup

For automated CI/CD signing:

1. **Encode PFX to Base64:**
   ```powershell
   $pfxBytes = [System.IO.File]::ReadAllBytes("markread-signing.pfx")
   $pfxBase64 = [System.Convert]::ToBase64String($pfxBytes)
   $pfxBase64 | Set-Clipboard
   ```

2. **Add to GitHub:**
   - Go to Repository Settings → Secrets and variables → Actions
   - Add secret `CERT_PFX` with the Base64 content
   - Add secret `CERT_PASSWORD` with your password

3. **Verify:**
   - Both secrets should appear in the list
   - Values are encrypted and hidden

### Local Signing

The `sign-local.ps1` script provides an easy local development signing workflow.

#### Basic Usage

```powershell
# Auto-detect MSI and certificate, prompt for selection
.\scripts\sign-local.ps1

# Sign specific MSI pattern
.\scripts\sign-local.ps1 -MsiPath "installer\bin\Release\*.msi"

# Use specific PFX file
.\scripts\sign-local.ps1 -CertificatePath "mycert.pfx"

# Use certificate by thumbprint (no password needed)
.\scripts\sign-local.ps1 -Thumbprint "ABC123..."
```

#### How It Works

1. **MSI Detection**: Searches `installer/bin/**/*.msi` by default, picks latest by date
2. **Certificate Selection**: 
   - Searches CurrentUser\My and LocalMachine\My stores
   - Filters for code signing certificates with private keys
   - Prompts user to select if multiple found
3. **Validation**: Checks expiration, EKU, private key availability
4. **Signing**: Calls `sign-msi.ps1` with detected parameters
5. **Verification**: Runs `verify-signature.ps1` to confirm success
6. **Results**: Displays summary and next steps

#### Certificate Sources

The script supports multiple certificate sources:

**Certificate Store (Recommended):**
```powershell
# Auto-detect and select
.\scripts\sign-local.ps1

# Specific thumbprint
.\scripts\sign-local.ps1 -Thumbprint "ABC123..."
```

**PFX File:**
```powershell
# Prompts for password
.\scripts\sign-local.ps1 -CertificatePath "cert.pfx"

# With password parameter
$pwd = ConvertTo-SecureString "password" -AsPlainText -Force
.\scripts\sign-local.ps1 -CertificatePath "cert.pfx" -Password $pwd
```

#### Options

- `-MsiPath`: MSI file pattern (default: `installer\bin\**\*.msi`)
- `-CertificatePath`: Path to PFX file (optional)
- `-Password`: Certificate password as SecureString (optional)
- `-Thumbprint`: Certificate thumbprint from store (optional)
- `-TimestampServer`: Timestamp server URL (default: DigiCert)
- `-SkipValidation`: Skip certificate validation checks

#### Troubleshooting

**No certificates found:**
```powershell
# Create a new certificate
.\scripts\create-certificate.ps1 -SubjectName "CN=MyDev"
```

**No MSI found:**
```powershell
# Build the solution
dotnet build markread.sln -c Release
```

**Wrong password:**
- Re-enter password when prompted
- Or specify with `-Password` parameter

**Certificate selection:**
- Use `-Thumbprint` to skip selection prompt
- Find thumbprints: `Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert`

### CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/build-and-sign.yml`) automatically:

1. ✓ Builds the MSI
2. ✓ Decodes certificate from secrets
3. ✓ Signs the MSI
4. ✓ Verifies signature
5. ✓ Uploads signed artifact

**Failure Handling:**
- ✗ Fails if certificate expired
- ✗ Fails if signing fails
- ✓ Provides diagnostics without exposing secrets
- ✓ Only uploads signed artifacts

### Certificate Rotation

When certificate expires or needs renewal:

1. Generate new certificate:
   ```powershell
   .\scripts\create-certificate.ps1 -SubjectName "CN=MarkRead Developer" -Password "NewPassword"
   ```

2. Update GitHub Secrets:
   - Export and encode new PFX
   - Update `CERT_PFX` and `CERT_PASSWORD`

3. Update local development:
   - Export new PFX for local use

4. Notify users:
   - Export new CER for distribution
   - Include in next release
   - Update installation docs

### Troubleshooting

#### "Certificate Not Found"
- Verify thumbprint: `Get-ChildItem Cert:\CurrentUser\My`
- Check store location (CurrentUser vs LocalMachine)

#### "Private Key Not Found"
- Ensure `-KeyExportPolicy Exportable` was used
- Reimport PFX with exportable option
- Verify: `(Get-Item Cert:\CurrentUser\My\THUMBPRINT).HasPrivateKey`

#### "Unknown Publisher" Still Appears
- Verify signature exists: Right-click MSI → Properties → Digital Signatures
- Ensure users imported the public certificate
- See user installation guide for trust steps

#### GitHub Actions Signing Fails
- Check certificate not expired
- Verify secrets set correctly
- Review workflow logs
- Ensure signtool.exe available

### Best Practices

1. **Certificate Management:**
   - Use 2-3 year validity
   - Set renewal reminders (30 days before expiration)
   - Keep secure backup of PFX and password

2. **Security:**
   - Never commit PFX to source control
   - Use strong passwords
   - Limit access to certificate files
   - Rotate periodically

3. **Testing:**
   - Test signed MSI locally first
   - Verify signature after signing
   - Test on clean machine

4. **Distribution:**
   - Include CER file in releases
   - Provide clear instructions
   - Document expected UAC behavior

---

## Next Steps

After successful MSI creation and signing:

1. ✅ Test installer thoroughly
2. ✅ Test signed MSI installation
3. ✅ Create first release (v0.1.0-alpha)
4. ⬜ Gather feedback
5. ⬜ Create production release (v1.0.0)
5. ⬜ Consider code signing
6. ⬜ Add to winget (after MSI is stable)

---

**Questions or issues?** Create an issue at https://github.com/schalkje/markread/issues
