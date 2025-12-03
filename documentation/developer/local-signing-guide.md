# Local MSI Signing Guide for Developers

This guide covers how to sign MSI installers locally during development using self-signed certificates.

## Quick Start

```powershell
# 1. Build the MSI
dotnet build markread.sln -c Release

# 2. Sign the MSI (auto-detects certificate and MSI)
.\scripts\sign-local.ps1

# 3. Install and test
Start-Process "installer\bin\Release\en-us\MarkRead.msi"
```

## Prerequisites

1. **Certificate Available**: You need a code signing certificate in your local store or as a PFX file.
   
   **Create one if needed:**
   ```powershell
   .\scripts\create-certificate.ps1 -SubjectName "CN=YourName Dev"
   ```

2. **MSI Built**: Build the solution to generate the MSI installer.
   ```powershell
   dotnet build markread.sln -c Release
   ```

3. **Scripts Available**: Ensure signing scripts exist in `scripts/` directory:
   - `sign-local.ps1` (main wrapper)
   - `sign-msi.ps1` (core signing logic)
   - `verify-signature.ps1` (verification)
   - `validate-certificate.ps1` (validation)

## Basic Workflow

### 1. Auto-Detection (Recommended)

Let the script find everything automatically:

```powershell
.\scripts\sign-local.ps1
```

**What happens:**
- Searches for latest MSI in `installer/bin/Debug/` and `installer/bin/Release/`
- Finds code signing certificates in your certificate stores
- Prompts you to select a certificate if multiple found
- Signs the MSI with SHA256 algorithm
- Timestamps the signature (for long-term validity)
- Verifies the signature
- Displays results and next steps

### 2. Specify MSI Path

Sign a specific MSI file:

```powershell
# Specific file
.\scripts\sign-local.ps1 -MsiPath "C:\builds\MarkRead-1.0.0.msi"

# Pattern matching (picks latest)
.\scripts\sign-local.ps1 -MsiPath "installer\bin\Release\*.msi"
```

### 3. Use PFX File

Sign with a specific PFX certificate file:

```powershell
# Prompts for password
.\scripts\sign-local.ps1 -CertificatePath "mycert.pfx"

# With password (secure)
$password = Read-Host "Certificate Password" -AsSecureString
.\scripts\sign-local.ps1 -CertificatePath "mycert.pfx" -Password $password
```

### 4. Use Specific Certificate by Thumbprint

Skip certificate selection by specifying thumbprint:

```powershell
# Find your certificate thumbprint
Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Format-Table Subject, Thumbprint, NotAfter

# Sign with specific certificate
.\scripts\sign-local.ps1 -Thumbprint "ABC123DEF456..."
```

## Certificate Selection

When multiple certificates are found, the script displays an interactive menu:

```
Found 3 code signing certificates:

[1] CN=Development Certificate
     Issuer: CN=Development Certificate
     Thumbprint: ABC123...
     Expires: 2026-01-15
     Location: CurrentUser\My

[2] CN=Company Code Signing
     Issuer: CN=DigiCert...
     Thumbprint: DEF456...
     Expires: 2025-12-31
     Location: LocalMachine\My

[3] CN=Test Certificate
     Issuer: CN=Test Certificate
     Thumbprint: GHI789...
     Expires: 2024-06-01
     Location: CurrentUser\My

Select certificate [1-3]: _
```

**Selection criteria:**
- Only shows certificates with:
  - Code Signing Enhanced Key Usage (EKU)
  - Valid (not expired)
  - Private key available
- Sorted by expiration date (earliest first)
- Shows location (CurrentUser or LocalMachine store)

## Advanced Options

### Custom Timestamp Server

```powershell
.\scripts\sign-local.ps1 -TimestampServer "http://timestamp.sectigo.com"
```

**Why timestamp?**
- Allows signature to remain valid after certificate expires
- Provides proof of "when" the code was signed
- Required for long-term trust

### Skip Validation

Not recommended, but available for testing:

```powershell
.\scripts\sign-local.ps1 -SkipValidation
```

Skips:
- Certificate expiration check
- EKU validation
- Private key availability check

## Verification

After signing, the script automatically verifies the signature:

```
=== Verifying Signature ===
✓ File is signed
  Status: Valid
  Signer: CN=Development Certificate
  Timestamp: 2024-01-15 10:30:00
  Algorithm: sha256RSA
```

**Signature statuses:**
- **Valid**: Correctly signed, certificate trusted
- **NotTrusted**: Signed but certificate not in Trusted Root (expected for self-signed)
- **NotSigned**: Signature missing
- **HashMismatch**: File modified after signing
- **UnknownError**: Signature verification failed

### Manual Verification

Verify any MSI independently:

```powershell
.\scripts\verify-signature.ps1 -FilePath "installer\bin\Release\en-us\MarkRead.msi"
```

## Troubleshooting

### No Certificate Found

**Error:**
```
No valid code signing certificates found in certificate stores
To create a certificate, run: .\scripts\create-certificate.ps1
```

**Solution:**
```powershell
# Create self-signed certificate
.\scripts\create-certificate.ps1 -SubjectName "CN=Dev Cert"

# Or import existing PFX
$password = Read-Host "PFX Password" -AsSecureString
Import-PfxCertificate -FilePath "cert.pfx" -CertStoreLocation Cert:\CurrentUser\My -Password $password
```

### No MSI File Found

**Error:**
```
No MSI files found matching pattern: installer\bin\**\*.msi
```

**Solution:**
```powershell
# Build the project
dotnet build markread.sln -c Release

# Or specify full path
.\scripts\sign-local.ps1 -MsiPath "C:\path\to\installer.msi"
```

### Certificate Password Incorrect

**Error:**
```
Failed to load certificate: The specified network password is not correct
```

**Solution:**
- Double-check password
- Try without `-Password` parameter to re-enter interactively
- Verify PFX file is not corrupted: `certutil -dump cert.pfx`

### Certificate Expired

**Error:**
```
Certificate expired on 2024-01-01
```

**Solution:**
```powershell
# Create new certificate with longer validity
.\scripts\create-certificate.ps1 -SubjectName "CN=New Dev Cert" -ValidityYears 2

# Or use different certificate
.\scripts\sign-local.ps1 -Thumbprint "different-cert-thumbprint"
```

### SignTool Not Found

**Error:**
```
signtool.exe not found. Install Windows SDK.
```

**Solution:**
1. Install Windows SDK: https://developer.microsoft.com/windows/downloads/windows-sdk/
2. Or install Visual Studio with "Windows application development" workload
3. Verify: `where.exe signtool.exe`

### Permission Denied

**Error:**
```
Access to the path 'C:\Program Files\...' is denied
```

**Solution:**
- Run PowerShell as Administrator
- Or move MSI to user-writable location before signing
- Check file is not in use (close installers/explorers)

## Best Practices

### Development Workflow

1. **One Certificate Per Developer**: Each developer creates their own self-signed cert
   ```powershell
   .\scripts\create-certificate.ps1 -SubjectName "CN=John Developer"
   ```

2. **Keep Certificates in Store**: Easier than managing PFX files
   ```powershell
   # Export for backup only
   .\scripts\export-certificate.ps1 -Thumbprint "ABC..." -OutputDir "backup"
   ```

3. **Sign Debug Builds Optionally**: Only sign when testing installer behavior
   ```powershell
   # Debug build
   dotnet build markread.sln -c Debug
   .\scripts\sign-local.ps1 -MsiPath "installer\bin\Debug\*.msi"
   ```

4. **Always Sign Release Builds**: Ensure Release builds are signed before distribution
   ```powershell
   # Release build
   dotnet build markread.sln -c Release
   .\scripts\sign-local.ps1
   ```

### Security Recommendations

1. **Protect Private Keys**: Never commit PFX files to source control
2. **Use Strong Passwords**: If exporting to PFX, use 16+ character passwords
3. **Rotate Certificates**: Create new certificates before old ones expire
4. **Document Thumbprints**: Keep record of which certificates are in use

### CI/CD Integration

Local signing is for development. For automated builds, use GitHub Actions:

```yaml
# .github/workflows/build-and-sign.yml
- Store CERT_PFX (Base64) and CERT_PASSWORD in GitHub Secrets
- Workflow decodes, signs, and verifies automatically
- Only signed MSIs uploaded as artifacts
```

See [MSI Setup Guide](./msi-setup.md#cicd-pipeline) for CI/CD details.

## Testing Signed MSI

### 1. Verify Signature

Right-click MSI → Properties → Digital Signatures tab:
- Should show your certificate in the list
- Status: "This digital signature is OK" (or "The digital signature is OK")

### 2. Install Certificate (First Time)

For self-signed certificates, install to Trusted Root:

```powershell
# Export public certificate
.\scripts\export-certificate.ps1 -Thumbprint "ABC..." -OutputDir "."

# Install to Trusted Root (requires admin)
Import-Certificate -FilePath "certificate.cer" -CertStoreLocation Cert:\LocalMachine\Root
```

Or double-click MSI → "Unknown publisher" warning → Install certificate

### 3. Run Installer

```powershell
# Start installer
Start-Process "installer\bin\Release\en-us\MarkRead.msi"
```

Should install without warnings (after certificate trusted).

### 4. Verify Application

```powershell
# Check installed app signature
Get-AuthenticodeSignature "C:\Program Files\MarkRead\MarkRead.App.exe"
```

## Next Steps

- **CI/CD Signing**: [MSI Setup Guide](./msi-setup.md#code-signing)
- **User Certificate Installation**: See [User Installation Guide](../user-guide/installation.md)
- **Certificate Management**: [Certificate Management Guide](./certificate-management.md)
- **Release Process**: [Release Process Guide](./release-process.md)

## Related Scripts

- `create-certificate.ps1`: Create new self-signed code signing certificates
- `export-certificate.ps1`: Export certificates to PFX/CER formats
- `validate-certificate.ps1`: Validate certificate properties
- `sign-msi.ps1`: Core signing logic (called by sign-local.ps1)
- `verify-signature.ps1`: Verify digital signatures

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section above
2. Review [MSI Setup Guide](./msi-setup.md)
3. Open GitHub issue with error details and logs
