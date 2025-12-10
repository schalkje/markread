# MSIX Packaging Quick Start

This guide explains how to build and sign MSIX packages for MarkRead using the new MAUI-based architecture.

## Prerequisites

- .NET 10 SDK
- Windows 10/11 (build 17763 or later)
- PowerShell 7+ (recommended)

## Quick Start

### 1. Build and Sign (One Command)

```powershell
# First time: Create certificate and build
.\scripts\build-msix.ps1 -CreateCertificate

# Subsequent builds: Use existing certificate
.\scripts\build-msix.ps1
```

### 2. Install Locally

```powershell
# Install the built MSIX package
.\scripts\install-msix.ps1
```

### 3. Run MarkRead

```powershell
# From Start Menu
# Search for "MarkRead"

# From command line
markread

# With a file
markread README.md

# With a folder
markread .
```

## Detailed Workflows

### Creating a Self-Signed Certificate

For development and testing, create a self-signed certificate:

```powershell
.\scripts\create-certificate.ps1 -SubjectName "CN=schalken.net" -ValidityYears 2
```

The certificate will be:
- Created in: `Cert:\CurrentUser\My`
- Valid for: 2 years
- Used for: Code signing MSIX packages

### Building MSIX Packages

#### Basic Build (x64, Release)

```powershell
.\scripts\build-msix.ps1
```

#### Custom Architecture

```powershell
# Build for ARM64
.\scripts\build-msix.ps1 -Architecture arm64

# Build for x86
.\scripts\build-msix.ps1 -Architecture x86
```

#### Debug Build

```powershell
.\scripts\build-msix.ps1 -Configuration Debug
```

#### Using Specific Certificate

```powershell
.\scripts\build-msix.ps1 -CertificateThumbprint "YOUR_THUMBPRINT_HERE"
```

### Installing MSIX Packages

#### Automatic Installation

```powershell
# Install latest build
.\scripts\install-msix.ps1

# Force reinstall
.\scripts\install-msix.ps1 -Force
```

#### Manual Installation

1. **Trust the certificate** (first time only):
   - Right-click the `.msix` file
   - Select **Properties** → **Digital Signatures** tab
   - Select the certificate → **Details** → **View Certificate**
   - Click **Install Certificate**
   - Choose **Local Machine** → **Next**
   - Select **Place all certificates in the following store** → **Browse**
   - Choose **Trusted People** → **OK**
   - Complete the wizard

2. **Install the package**:
   - Double-click the `.msix` file
   - Click **Install**

### Verifying the Installation

```powershell
# Check installed package
Get-AppxPackage -Name "com.schalken.markread"

# Verify signature
Get-AuthenticodeSignature "path\to\MarkRead.msix"
```

## Package Locations

After building, packages are located at:

```
src\bin\Release\net10.0-windows10.0.19041.0\win-{arch}\
```

Where `{arch}` is:
- `x64` - 64-bit Intel/AMD
- `arm64` - ARM64 (Surface Pro X, etc.)
- `x86` - 32-bit (legacy)

## GitHub Actions / CI/CD

### Setting Up Secrets

For automated builds, configure these GitHub Secrets:

1. **MSIX_CERT_PFX**: Base64-encoded certificate file
2. **MSIX_CERT_PASSWORD**: Certificate password

#### Creating Base64 Certificate

```powershell
# Export certificate to PFX
.\scripts\export-certificate.ps1 -Thumbprint "YOUR_THUMBPRINT" -Password "YOUR_PASSWORD"

# Convert to Base64
$pfxPath = "github-cert\MarkRead.pfx"
$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($pfxPath))
$base64 | Set-Clipboard
# Now paste into GitHub Secrets
```

### Triggering Releases

```bash
# Create and push a tag
git tag v0.1.0
git push origin v0.1.0

# Or use workflow_dispatch in GitHub Actions UI
```

The workflow will:
1. Build MSIX for x64 and arm64
2. Sign packages with your certificate
3. Create a GitHub Release
4. Upload MSIX files as release assets

## Differences from MSI

### MSIX Advantages

✅ **Modern**: Native Windows 10/11 packaging format  
✅ **Cleaner**: Isolated installation, easy uninstall  
✅ **Automatic Updates**: Built-in update mechanism  
✅ **Store-Ready**: Can be published to Microsoft Store  
✅ **MAUI Native**: Better suited for MAUI apps  
✅ **Command-Line Support**: Works with command-line arguments  
✅ **File Associations**: Automatic .md file handling  

### Considerations

⚠️ **Windows 10+**: Requires Windows 10 1809 or later  
⚠️ **Certificate Trust**: Self-signed certs require manual trust (first install)  
⚠️ **Store Requirement**: For production, use certificate from trusted CA or Microsoft Store

## Command-Line Arguments

MSIX packages support command-line arguments through the execution alias:

```powershell
# These all work with MSIX-installed MarkRead
markread
markread README.md
markread C:\MyDocs
markread --help
```

The execution alias (`markread.exe`) is automatically added to PATH during installation.

## Troubleshooting

### "Publisher not trusted" Error

**Solution**: Install the certificate to Trusted People store (see Manual Installation above)

### Package Won't Install

**Check**:
1. Certificate is properly signed
2. Certificate subject matches manifest Publisher
3. Windows version is 10.0.17763 or later

```powershell
# Verify signature
Get-AuthenticodeSignature "path\to\MarkRead.msix"
```

### Can't Find markread Command

**Solution**: Re-login or restart Windows to refresh PATH

### Multiple Versions Installed

```powershell
# List all versions
Get-AppxPackage -Name "com.schalken.markread"

# Remove specific version
Remove-AppxPackage -Package "com.schalken.markread_0.1.0.0_x64__8wekyb3d8bbwe"
```

## Production Deployment

For production releases:

1. **Use a trusted certificate**:
   - Purchase from a Certificate Authority (DigiCert, Sectigo, etc.)
   - Or use Microsoft Store signing

2. **Update manifest version**:
   - Edit `src\Platforms\Windows\Package.appxmanifest`
   - Update `Version` attribute in `<Identity>` element

3. **Build with production certificate**:
   ```powershell
   .\scripts\build-msix.ps1 -CertificateThumbprint "PRODUCTION_CERT_THUMBPRINT"
   ```

4. **Test installation on clean machine**:
   - VM or fresh Windows install
   - Verify no errors during installation
   - Test all command-line scenarios

## See Also

- [Certificate Management](certificate-management.md)
- [Release Process](release-process.md)
- [GitHub Actions Workflow](github-actions-workflow.md)
- [Version Management](version-management.md)
