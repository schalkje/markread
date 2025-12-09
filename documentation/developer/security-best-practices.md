# Code Signing Security Best Practices

Security guidelines for managing self-signed certificates and code signing operations in MarkRead development.

## Overview

This document outlines security best practices for:
- **Certificate Creation** - Secure generation and storage
- **Private Key Management** - Protecting signing keys
- **CI/CD Security** - Securing GitHub Actions workflows
- **Secret Storage** - Managing passwords and credentials
- **Distribution** - Safely distributing signed installers

## Certificate Security

### Creation

**✅ DO:**
- Create certificates with sufficient key length (2048-bit RSA minimum)
- Use SHA256 or better for signing algorithms
- Set appropriate validity periods (1-2 years for self-signed)
- Store in protected certificate stores (CurrentUser\My or LocalMachine\My)
- Use descriptive, identifiable subject names

**❌ DON'T:**
- Use weak algorithms (MD5, SHA1)
- Create certificates with excessive validity (>2 years for self-signed)
- Store certificates in unprotected file locations
- Reuse expired certificates

**Example:**
```powershell
# Good: Secure certificate creation
.\scripts\create-certificate.ps1 -SubjectName "CN=MarkRead Developer 2025" -ValidityYears 2

# Bad: Weak or excessive settings (don't do this)
# - Validity >2 years makes rotation harder
# - No descriptive name makes management difficult
```

### Storage

**Certificate Store (Recommended):**
- ✅ Protected by Windows security
- ✅ Automatic access control
- ✅ Integration with Windows APIs
- ✅ No file-based exposure

```powershell
# View certificates in store
Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert
```

**PFX Files (Use Carefully):**
- ⚠ Requires strong password protection
- ⚠ Must be stored securely (encrypted drive, secure vault)
- ⚠ Higher risk of exposure if file is compromised
- ❌ Never commit to source control
- ❌ Never share via email or chat

**Where to store PFX:**
- ✅ Password manager with file attachment
- ✅ Encrypted external drive (offline backup)
- ✅ Secure cloud storage with encryption (e.g., encrypted 1Password vault)
- ❌ Desktop, Documents, Downloads folders
- ❌ Network shares without encryption
- ❌ Git repository (even in `.gitignore`)

### Passwords

**PFX Password Requirements:**
- Minimum 16 characters
- Mix of uppercase, lowercase, numbers, symbols
- No dictionary words
- Unique (not reused from other services)

**Generate strong passwords:**
```powershell
# Generate secure random password
Add-Type -AssemblyName System.Web
$password = [System.Web.Security.Membership]::GeneratePassword(20, 5)
$securePassword = ConvertTo-SecureString $password -AsPlainText -Force
Write-Host "Generated password: $password"
Write-Host "Store this in password manager immediately!"
```

**Storage:**
- ✅ Use password manager (1Password, Bitwarden, LastPass)
- ✅ Document which certificate each password unlocks
- ✅ Share with team via secure password manager
- ❌ Don't write on paper
- ❌ Don't store in plaintext files
- ❌ Don't include in emails or chat

## Private Key Protection

### Access Control

**Limit access:**
- Only developers who need to sign locally should have certificates
- Only CI/CD system should have production signing certificate
- Use separate certificates for dev/test/prod if possible

**Windows Store Protection:**
```powershell
# CurrentUser\My - Only accessible to current user
# LocalMachine\My - Accessible to all users (requires admin to import)

# Check certificate ACLs (advanced)
$cert = Get-Item Cert:\CurrentUser\My\THUMBPRINT
$key = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
# Key stored in: C:\Users\<user>\AppData\Roaming\Microsoft\Crypto\RSA\
```

### Marking Keys as Non-Exportable

For production certificates (if upgrading to commercial CA):
```powershell
# Import PFX as non-exportable (one-way, cannot export again)
Import-PfxCertificate -FilePath cert.pfx -CertStoreLocation Cert:\CurrentUser\My -Password $pwd -Exportable:$false
```

**Note**: Our self-signed certificates remain exportable for backup/distribution purposes.

### Private Key Backup

**When to backup:**
- Immediately after certificate creation
- Before certificate expiration
- Before system reinstall or migration

**Backup procedure:**
```powershell
# 1. Export to PFX with strong password
.\scripts\export-certificate.ps1 -Thumbprint "ABC..." -OutputDir "backup-2025"

# 2. Store PFX in secure location (encrypted vault)
# 3. Document password in password manager
# 4. Test restore to verify backup works
```

**Test restore:**
```powershell
# Import from backup to verify integrity
$pwd = Read-Host "Backup Password" -AsSecureString
Import-PfxCertificate -FilePath backup-2025\certificate.pfx -CertStoreLocation Cert:\CurrentUser\My -Password $pwd
```

## GitHub Actions Security

### Secrets Management

**Setting up secrets:**
```powershell
# 1. Export certificate to PFX
.\scripts\export-certificate.ps1 -Thumbprint "ABC..." -OutputDir "temp"

# 2. Convert to Base64 (single line, no whitespace)
$pfxBytes = [System.IO.File]::ReadAllBytes("temp\certificate.pfx")
$base64 = [System.Convert]::ToBase64String($pfxBytes)
$base64 | Set-Clipboard

# 3. Add to GitHub Secrets (never commit)
# GitHub Settings → Secrets → Actions → New repository secret
# Name: CERT_PFX
# Value: <paste from clipboard>

# 4. Securely delete temp files
Remove-Item "temp\certificate.pfx" -Force
Remove-Item "temp" -Recurse -Force
```

**Secrets checklist:**
- ✅ Use GitHub encrypted secrets (never environment variables in workflow file)
- ✅ Limit secret access (Settings → Actions → Repository permissions)
- ✅ Use organization secrets for multi-repo sharing
- ✅ Rotate secrets before certificate expiration
- ❌ Never log secret values (even masked)
- ❌ Never echo or print secrets for debugging
- ❌ Never commit secrets to source control

### Workflow Security

**Secure workflow practices:**
```yaml
# .github/workflows/build-and-sign.yml

# ✅ Good: Reference secrets securely
- name: Decode Certificate
  run: |
    $pfxBase64 = "${{ secrets.CERT_PFX }}"
    $pfxBytes = [Convert]::FromBase64String($pfxBase64)
    [IO.File]::WriteAllBytes("cert.pfx", $pfxBytes)

# ✅ Good: Clean up sensitive files
- name: Cleanup
  if: always()
  run: |
    if (Test-Path "cert.pfx") { Remove-Item "cert.pfx" -Force }

# ❌ Bad: Logging secret values (don't do this)
# - name: Debug
#   run: Write-Host "Password: ${{ secrets.CERT_PASSWORD }}"

# ❌ Bad: Storing secrets in files committed to repo
# - name: Bad Practice
#   run: |
#     "${{ secrets.CERT_PASSWORD }}" | Out-File password.txt
#     git add password.txt  # NEVER DO THIS
```

**Workflow permissions:**
```yaml
# Limit workflow permissions (principle of least privilege)
permissions:
  contents: read        # Read repository contents
  actions: read         # Read workflow runs
  # attestations: write # Optional: for build provenance
```

### Artifact Security

**Signed artifacts:**
- ✅ Upload only signed MSIs as artifacts
- ✅ Verify signature before upload
- ✅ Use short retention periods (30-90 days)
- ✅ Include checksums (SHA256) with artifacts

**Unsigned artifacts:**
- ❌ Don't upload unsigned MSIs from PRs (potential tampering)
- ✅ Use separate workflow for PR validation (build but don't sign)
- ✅ Only sign on protected branches (main, release/*)

**Example:**
```yaml
# Conditional signing
- name: Sign MSI
  if: github.event_name != 'pull_request'  # Don't sign PRs
  run: |
    .\scripts\sign-msi.ps1 -MsiPath ${{ env.MSI_PATH }} -CertificatePath cert.pfx -Password ${{ secrets.CERT_PASSWORD }}
```

## Source Control Security

### .gitignore Rules

Ensure these patterns are in `.gitignore`:
```gitignore
# Certificate files (CRITICAL - never commit)
*.pfx
*.p12
*.pem
*.key

# Certificate exports
**/certificates/
**/certs/

# Password files
*password*.txt
*secret*.txt
.env
.env.local

# Temporary files from signing
signtool.log
cert-temp.pfx
```

### Git History Scanning

**Check for accidentally committed secrets:**
```powershell
# Scan commit history for certificate files
git log --all --full-history -- "*.pfx"

# Search for password patterns
git log --all -S "password" --source --all

# If secrets found in history, use tools like:
# - git-filter-repo
# - BFG Repo-Cleaner
# Contact GitHub Support to purge forks
```

### Pre-commit Hooks

**Prevent accidental commits:**
```powershell
# .git/hooks/pre-commit (create if not exists)
#!/bin/sh

# Check for PFX files
if git diff --cached --name-only | grep -E '\.(pfx|p12|pem|key)$'; then
    echo "Error: Attempting to commit certificate files!"
    echo "Remove these files and try again."
    exit 1
fi

# Check for password patterns
if git diff --cached --name-only | grep -iE 'password|secret'; then
    echo "Warning: Files with 'password' or 'secret' in name detected."
    echo "Verify these do not contain sensitive data."
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
```

## Distribution Security

### Public Certificate Distribution

**CER file (public key only):**
- ✅ Safe to distribute publicly
- ✅ Include in GitHub releases
- ✅ Can be hosted on website
- ✅ No password protection needed

**What users receive:**
```
markread-cert.cer  - Public certificate (safe to distribute)
README.txt         - Installation instructions
```

**What users NEVER receive:**
```
certificate.pfx    - Private certificate (NEVER distribute)
password.txt       - Certificate password (NEVER distribute)
```

### MSI Signature Verification

**Before releasing:**
```powershell
# Verify MSI signature
.\scripts\verify-signature.ps1 -FilePath "installer.msi"

# Check signature details
Get-AuthenticodeSignature "installer.msi" | Format-List *

# Verify timestamp (for long-term validity)
# Should show timestamp server and timestamp date
```

**Users can verify:**
```powershell
# Right-click MSI → Properties → Digital Signatures
# Should show:
# - Signer: Your certificate subject name
# - Timestamp: Date/time of signing
# - Algorithm: sha256RSA
```

## Incident Response

### Compromised Certificate

If private key or PFX file is compromised:

1. **Immediate actions:**
   - Remove certificate from all certificate stores
   - Revoke GitHub Secrets (CERT_PFX, CERT_PASSWORD)
   - Create new certificate with different subject name
   - Document incident date and scope

2. **Assessment:**
   - Identify what was accessed (file timestamps, logs)
   - Determine how compromise occurred
   - List all signed artifacts with compromised certificate

3. **Recovery:**
   - Create new certificate: `.\scripts\create-certificate.ps1 -SubjectName "CN=MarkRead 2025 Renewed"`
   - Update GitHub Secrets with new certificate
   - Re-sign all recent releases
   - Notify users: "Security update - please re-import certificate"

4. **Prevention:**
   - Fix vulnerability that led to compromise
   - Implement additional access controls
   - Review and update security practices

### Exposed GitHub Secrets

If GitHub Secrets are exposed (workflow logs, screenshot, etc.):

1. **Immediate:**
   - Revoke exposed secrets in GitHub Settings
   - Create new certificate
   - Update secrets with new values

2. **Verify impact:**
   - Check GitHub Actions logs for unauthorized runs
   - Review recent releases for unauthorized signatures
   - Check for unexpected workflow runs

3. **Remediation:**
   - Follow certificate rotation process
   - Update workflow to prevent future exposure
   - Add logging/monitoring for secret usage

## Monitoring and Auditing

### Certificate Expiration Monitoring

**Manual checks:**
```powershell
# Check certificate expiration
.\scripts\validate-certificate.ps1 -Thumbprint "ABC..."

# List all certificates with expiration dates
Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | 
    Select-Object Subject, Thumbprint, NotAfter | 
    Sort-Object NotAfter | 
    Format-Table -AutoSize
```

**Automated checks:**
- Add expiration check to CI/CD pipeline
- Create calendar reminders for renewal (30 days before expiration)
- Use GitHub Issues to track certificate renewal tasks

### Signing Operation Logs

**Local signing:**
```powershell
# sign-msi.ps1 outputs detailed logs
# Review logs for:
# - Successful signatures
# - Failed attempts
# - Certificate used (thumbprint)
# - Timestamp server response
```

**CI/CD signing:**
- GitHub Actions logs show all signing operations
- Review workflow runs: Actions → build-and-sign → Recent runs
- Check for failed signatures or validation errors

### Security Reviews

**Quarterly review checklist:**
- [ ] All certificates valid and not expiring soon
- [ ] GitHub Secrets up to date and not expired
- [ ] No PFX files in source control or commit history
- [ ] .gitignore rules comprehensive
- [ ] Team members have appropriate certificate access
- [ ] Backup certificates stored securely and tested
- [ ] Documentation up to date with current practices

## Team Security Training

### Developer Onboarding

When adding new developers:
1. Review this security document
2. Create individual dev certificates (not shared)
3. Set up secure password manager
4. Configure .gitignore and pre-commit hooks
5. Test signing workflow in isolated environment

### Security Awareness

**Key principles:**
- Private keys are like passwords - never share or expose
- GitHub Secrets are for automation only - never access manually
- Certificates expire - plan renewals in advance
- Backups must be as secure as originals
- When in doubt, ask before committing or sharing

## Tools and Resources

### PowerShell Cmdlets

```powershell
# Certificate management
Get-ChildItem Cert:\
Get-Certificate
New-SelfSignedCertificate
Export-Certificate
Export-PfxCertificate
Import-Certificate
Import-PfxCertificate
Remove-Item Cert:\

# Signature verification
Get-AuthenticodeSignature
Set-AuthenticodeSignature
Test-Certificate
```

### External Tools

- **certutil.exe**: Windows certificate utility
- **signtool.exe**: Windows code signing tool (Windows SDK)
- **git-secrets**: Prevent committing secrets
- **BFG Repo-Cleaner**: Remove secrets from git history
- **GitHub Secret Scanning**: Automatic secret detection (Pro/Enterprise)

### Documentation References

- [Microsoft Code Signing Best Practices](https://docs.microsoft.com/windows/win32/seccrypto/cryptography-best-practices)
- [NIST Key Management Guidelines](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [GitHub Actions Security](https://docs.github.com/actions/security-guides)

## Summary Checklist

**Certificate Creation:**
- [ ] Strong algorithm (RSA 2048+, SHA256)
- [ ] Appropriate validity (1-2 years)
- [ ] Stored in protected certificate store
- [ ] Backed up securely with password manager

**Private Key Protection:**
- [ ] Never committed to source control
- [ ] Strong PFX password (16+ characters)
- [ ] Stored in encrypted location
- [ ] Access limited to necessary users

**CI/CD Security:**
- [ ] Secrets stored in GitHub Secrets (not files)
- [ ] Certificate cleaned up after use
- [ ] No secret logging in workflows
- [ ] Signing only on protected branches

**Distribution:**
- [ ] Only public CER distributed to users
- [ ] MSI signatures verified before release
- [ ] Users instructed to verify signatures
- [ ] Certificate import instructions clear

**Monitoring:**
- [ ] Certificate expiration tracked
- [ ] Signing operations logged
- [ ] Regular security reviews scheduled
- [ ] Incident response plan documented

---

**Security is a continuous process, not a one-time setup. Review and update these practices regularly.**
