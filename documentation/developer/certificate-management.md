# Certificate Management Guide

Complete guide to managing code signing certificates for MarkRead development and distribution.

## Overview

MarkRead uses self-signed X.509 certificates for code signing MSI installers. This guide covers the complete lifecycle:

- **Creation**: Generate new certificates
- **Export**: Save certificates for backup and distribution
- **Validation**: Verify certificate properties
- **Import**: Install certificates for trust
- **Renewal**: Replace expiring certificates
- **Rotation**: Update certificates in all environments

## Quick Reference

| Task | Command |
|------|---------|
| Create certificate | `.\scripts\create-certificate.ps1 -SubjectName "CN=Name"` |
| Export to PFX | `.\scripts\export-certificate.ps1 -Thumbprint "ABC..." -OutputDir "."` |
| Validate certificate | `.\scripts\validate-certificate.ps1 -Thumbprint "ABC..."` |
| Import for users | `.\scripts\import-certificate.ps1 -CertificatePath "cert.cer"` |
| Sign MSI locally | `.\scripts\sign-local.ps1` |
| Verify signature | `.\scripts\verify-signature.ps1 -FilePath "installer.msi"` |
| Check GitHub Secrets | GitHub Settings → Secrets → Actions |

## Certificate Creation

### Creating a New Certificate

```powershell
# Basic usage (default validity: 1 year)
.\scripts\create-certificate.ps1 -SubjectName "CN=MarkRead Developer"

# Extended validity (2 years)
.\scripts\create-certificate.ps1 -SubjectName "CN=MarkRead Developer" -ValidityYears 2

# Custom store location
.\scripts\create-certificate.ps1 -SubjectName "CN=MarkRead Dev" -StoreLocation "LocalMachine"
```

**Certificate properties:**
- **Type**: Self-signed X.509
- **Algorithm**: RSA 2048-bit
- **Hash**: SHA256
- **Key Usage**: Digital Signature
- **Enhanced Key Usage**: Code Signing (1.3.6.1.5.5.7.3.3)
- **Validity**: 1 year default (configurable up to 2 years)
- **Store**: CurrentUser\My (default)

### Certificate Subject Names

Use descriptive subject names to identify purpose:

**Development:**
```powershell
.\scripts\create-certificate.ps1 -SubjectName "CN=John Dev"
```

**Testing:**
```powershell
.\scripts\create-certificate.ps1 -SubjectName "CN=MarkRead Test"
```

**Production (if upgrading from self-signed):**
```powershell
.\scripts\create-certificate.ps1 -SubjectName "CN=MarkRead Production"
```

### Finding Created Certificates

```powershell
# View all code signing certificates
Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert

# View specific certificate details
Get-ChildItem Cert:\CurrentUser\My\ABC123... | Format-List *

# Filter by subject
Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -like "*MarkRead*" }
```

## Certificate Export

### Exporting for Backup

Export certificates to secure backup location:

```powershell
# Export both PFX (private) and CER (public)
.\scripts\export-certificate.ps1 -Thumbprint "ABC123..." -OutputDir "C:\Backup\Certs"

# Or by subject name
.\scripts\export-certificate.ps1 -SubjectName "MarkRead Developer" -OutputDir "C:\Backup\Certs"
```

**Generated files:**
- `certificate.pfx`: Private certificate with password protection (for signing)
- `certificate.cer`: Public certificate (for distribution to users)
- `README.txt`: Certificate information and instructions

### Exporting for GitHub Secrets

GitHub requires Base64-encoded PFX:

```powershell
# 1. Export to PFX
.\scripts\export-certificate.ps1 -Thumbprint "ABC..." -OutputDir "."

# 2. Convert to Base64 (PowerShell)
$pfxBytes = [System.IO.File]::ReadAllBytes("certificate.pfx")
$base64 = [System.Convert]::ToBase64String($pfxBytes)
$base64 | Set-Clipboard
Write-Host "Base64 encoded PFX copied to clipboard"

# 3. Add to GitHub Secrets (see GitHub Secrets section)
```

### Exporting for Distribution

For end users to trust your installer:

```powershell
# Export public certificate only
.\scripts\export-certificate.ps1 -Thumbprint "ABC..." -OutputDir "dist"

# Upload certificate.cer to GitHub release assets
```

Users import with:
```powershell
.\import-certificate.ps1 -CertificatePath "certificate.cer"
```

## Certificate Validation

### Validating Before Use

Always validate certificates before signing operations:

```powershell
# By thumbprint
.\scripts\validate-certificate.ps1 -Thumbprint "ABC123..."

# By file path
.\scripts\validate-certificate.ps1 -CertificatePath "certificate.pfx"
```

**Validation checks:**
- ✓ Certificate exists and is readable
- ✓ Not expired (with 30-day warning)
- ✓ Has Code Signing EKU (1.3.6.1.5.5.7.3.3)
- ✓ Private key is available
- ✓ Key is exportable (for PFX files)

### Automatic Validation

Validation is automatically performed by:
- `sign-local.ps1` before local signing
- `sign-msi.ps1` during CI/CD pipeline
- GitHub Actions workflow before signing step

### Manual Certificate Inspection

```powershell
# View certificate details
$cert = Get-Item Cert:\CurrentUser\My\ABC123...
$cert | Format-List *

# Check expiration
$cert.NotAfter
$daysUntilExpiry = ($cert.NotAfter - (Get-Date)).Days
Write-Host "Days until expiration: $daysUntilExpiry"

# Check Enhanced Key Usage
$cert.EnhancedKeyUsageList

# Check private key
$cert.HasPrivateKey
```

## Certificate Import (End Users)

### For End Users to Trust MSI

End users need the public certificate in their Trusted Root and Trusted Publishers stores.

**Automated (Recommended):**
```powershell
# Downloads from latest GitHub release and imports
.\scripts\import-certificate.ps1

# Or with local file
.\scripts\import-certificate.ps1 -CertificatePath "markread-cert.cer"
```

**Manual:**
1. Double-click `markread-cert.cer`
2. Click **Install Certificate**
3. Choose **Local Machine** (admin) or **Current User**
4. Select **Trusted Root Certification Authorities**
5. Click **Finish**
6. Repeat for **Trusted Publishers** store

**Check installation:**
```powershell
.\scripts\import-certificate.ps1 -CheckOnly
```

### Import Locations

**Local Machine** (requires admin):
- Trusts for all users on computer
- Location: `Cert:\LocalMachine\Root` and `Cert:\LocalMachine\TrustedPublisher`

**Current User** (no admin):
- Trusts only for current user
- Location: `Cert:\CurrentUser\Root` and `Cert:\CurrentUser\TrustedPublisher`

## GitHub Secrets Management

### Setting Up Secrets

1. Export certificate to PFX (see [Exporting for GitHub Secrets](#exporting-for-github-secrets))
2. Go to GitHub: **Settings** → **Secrets and variables** → **Actions**
3. Add secrets:

**CERT_PFX:**
```powershell
# Convert PFX to Base64 and copy to clipboard
$pfxBytes = [System.IO.File]::ReadAllBytes("certificate.pfx")
[System.Convert]::ToBase64String($pfxBytes) | Set-Clipboard
```
- Click **New repository secret**
- Name: `CERT_PFX`
- Value: Paste from clipboard
- Click **Add secret**

**CERT_PASSWORD:**
- Click **New repository secret**
- Name: `CERT_PASSWORD`
- Value: Enter certificate password
- Click **Add secret**

### Verifying Secrets

Check secrets are configured:
```powershell
# Secrets should appear in GitHub Settings → Secrets → Actions
# Values are encrypted and hidden (✓ indicates set)
```

In workflow, secrets are accessed as:
```yaml
${{ secrets.CERT_PFX }}
${{ secrets.CERT_PASSWORD }}
```

### Updating Secrets

When rotating certificates:
1. Create new certificate
2. Export to PFX with Base64 encoding
3. Update `CERT_PFX` secret (overwrite existing)
4. Update `CERT_PASSWORD` secret if password changed
5. Test workflow with new certificate

### Security Best Practices

- ✅ **Never commit PFX files** to source control
- ✅ Use strong passwords (16+ characters) for PFX encryption
- ✅ Rotate secrets when certificates expire
- ✅ Use organization-level secrets for multiple repos
- ✅ Limit access to secrets (Settings → Actions → Repository permissions)
- ❌ Don't log secret values in workflows
- ❌ Don't expose secrets in error messages

## Certificate Renewal

### When to Renew

Renew certificates before they expire:

```powershell
# Check expiration
.\scripts\validate-certificate.ps1 -Thumbprint "ABC..."

# List all certificates with expiration dates
Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | 
    Format-Table Subject, Thumbprint, NotAfter
```

**Renewal timeline:**
- 30 days before expiration: Warning appears in validation
- 14 days before: Plan renewal
- 7 days before: Execute renewal
- Never wait until expiration

### Renewal Process

1. **Create new certificate:**
   ```powershell
   .\scripts\create-certificate.ps1 -SubjectName "CN=MarkRead Developer 2025" -ValidityYears 2
   ```

2. **Export new certificate:**
   ```powershell
   # Get new thumbprint
   Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Format-Table Subject, Thumbprint
   
   # Export
   .\scripts\export-certificate.ps1 -Thumbprint "NEW_THUMBPRINT" -OutputDir "cert-2025"
   ```

3. **Update GitHub Secrets:**
   ```powershell
   # Convert new PFX to Base64
   $pfxBytes = [System.IO.File]::ReadAllBytes("cert-2025\certificate.pfx")
   [System.Convert]::ToBase64String($pfxBytes) | Set-Clipboard
   ```
   - Update `CERT_PFX` secret in GitHub
   - Update `CERT_PASSWORD` if password changed

4. **Test new certificate:**
   ```powershell
   # Local test
   .\scripts\sign-local.ps1 -Thumbprint "NEW_THUMBPRINT"
   
   # CI/CD test: Trigger GitHub Actions workflow
   ```

5. **Distribute new public certificate:**
   - Export CER file: `.\scripts\export-certificate.ps1 -Thumbprint "NEW_THUMBPRINT" -OutputDir "dist"`
   - Add `markread-cert.cer` to next GitHub release
   - Update documentation with renewal notice

6. **Notify users:**
   - Add release note: "Certificate renewed, re-import for trust"
   - Users run: `.\import-certificate.ps1 -Force`

7. **Remove old certificate (optional):**
   ```powershell
   # After all releases use new certificate
   Get-ChildItem Cert:\CurrentUser\My\OLD_THUMBPRINT | Remove-Item
   ```

## Certificate Rotation

### Forced Rotation (Security)

If certificate is compromised:

1. **Immediately revoke** (not applicable for self-signed, but create new)
2. **Create new certificate** with different subject
3. **Update all environments** (GitHub Secrets, local stores)
4. **Re-sign all released MSIs** with new certificate
5. **Notify users** to install new certificate

### Planned Rotation

Rotate certificates periodically (annually recommended):

1. Create new certificate 30 days before expiration
2. Test signing with new certificate
3. Update GitHub Secrets
4. Include new public certificate in next release
5. Deprecate old certificate after all users updated

## Troubleshooting

### Certificate Not Found

```powershell
# Search all stores
Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert
Get-ChildItem Cert:\LocalMachine\My -CodeSigningCert

# Search by subject
Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -like "*MarkRead*" }
```

### Private Key Not Available

**Cause**: Certificate imported without private key

**Solution**:
- Re-import PFX with correct password
- Ensure PFX was exported with private key
- Check PFX file: `certutil -dump certificate.pfx`

### Certificate Expired

**Solution**: Create new certificate and rotate (see [Renewal Process](#renewal-process))

### Cannot Export Certificate

**Cause**: Private key marked as non-exportable

**Solution**:
- Self-signed certificates created by `create-certificate.ps1` are always exportable
- For other certificates, may need to use original PFX or recreate

### GitHub Actions Signing Fails

**Check:**
1. Secrets exist: GitHub Settings → Secrets → Actions
2. Secret names exact: `CERT_PFX`, `CERT_PASSWORD`
3. Base64 encoding correct: Single line, no whitespace
4. Certificate not expired: Check expiration in PFX

**Debug:**
```yaml
# Add to workflow for diagnostics (don't commit)
- name: Debug Certificate
  run: |
    $pfxBase64 = "${{ secrets.CERT_PFX }}"
    $pfxBytes = [Convert]::FromBase64String($pfxBase64)
    $pfxPath = "temp-cert.pfx"
    [IO.File]::WriteAllBytes($pfxPath, $pfxBytes)
    $cert = New-Object Security.Cryptography.X509Certificates.X509Certificate2 $pfxPath, "${{ secrets.CERT_PASSWORD }}"
    Write-Host "Certificate: $($cert.Subject)"
    Write-Host "Expires: $($cert.NotAfter)"
```

## Best Practices Summary

### Development
- ✅ One certificate per developer (personal dev machines)
- ✅ Store in CurrentUser\My (no admin needed)
- ✅ Use descriptive subject names
- ✅ Validate before signing: `.\scripts\validate-certificate.ps1`

### CI/CD
- ✅ Separate certificate for automated builds
- ✅ Store in GitHub Secrets (never commit)
- ✅ Use strong password for PFX
- ✅ Rotate before expiration

### Distribution
- ✅ Include public CER in every GitHub release
- ✅ Provide import script: `.\import-certificate.ps1`
- ✅ Document certificate installation in user guide
- ✅ Notify users of certificate changes

### Security
- ✅ Strong passwords (16+ characters) for PFX files
- ✅ Never commit PFX to source control
- ✅ Rotate certificates annually
- ✅ Validate certificates before use
- ❌ Don't share private keys
- ❌ Don't use expired certificates
- ❌ Don't log sensitive certificate data

### Backup
- ✅ Export PFX to secure location
- ✅ Document passwords in password manager
- ✅ Keep public CER for distribution
- ✅ Test restore process

## Scripts Reference

| Script | Purpose | Key Parameters |
|--------|---------|----------------|
| `create-certificate.ps1` | Create new self-signed cert | `-SubjectName`, `-ValidityYears` |
| `export-certificate.ps1` | Export to PFX/CER | `-Thumbprint`, `-OutputDir` |
| `validate-certificate.ps1` | Validate cert properties | `-Thumbprint` or `-CertificatePath` |
| `import-certificate.ps1` | Install cert for trust | `-CertificatePath`, `-CheckOnly` |
| `sign-local.ps1` | Sign MSI locally | `-MsiPath`, `-Thumbprint` |
| `sign-msi.ps1` | Core signing logic | `-MsiPath`, `-CertificatePath` |
| `verify-signature.ps1` | Verify MSI signature | `-FilePath` |

## Related Documentation

- [MSI Setup Guide](./msi-setup.md) - Complete MSI build and signing guide
- [Local Signing Guide](./local-signing-guide.md) - Developer signing workflow
- [Release Process](./release-process.md) - Release checklist including signing
- [User Installation Guide](../user-guide/installation.md) - End user certificate install

## Additional Resources

- [Microsoft Code Signing Docs](https://docs.microsoft.com/windows/win32/seccrypto/cryptography-tools)
- [signtool.exe Reference](https://docs.microsoft.com/windows/win32/seccrypto/signtool)
- [X.509 Certificate Standard](https://tools.ietf.org/html/rfc5280)
- [GitHub Encrypted Secrets](https://docs.github.com/actions/security-guides/encrypted-secrets)
