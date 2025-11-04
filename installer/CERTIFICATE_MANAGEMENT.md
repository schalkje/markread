# Certificate Management for MSIX Packages

## Should Certificates Be Checked Into Git?

**NO! Never commit certificates to version control!**

### Why Not?

1. **Security Risk**: Even test certificates can be misused
2. **Certificate Rotation**: Certificates expire and need rotation
3. **Different Environments**: Dev, test, and production should use different certificates
4. **Compliance**: Many security policies prohibit this

### What's Protected in This Repo

The `.gitignore` excludes:
```
*.pfx          # Private keys (CRITICAL - never commit!)
*.cer          # Public certificates
*_TemporaryKey.*
certificate-info.txt
```

## Certificate Types

### Test/Development Certificate (Self-Signed)

**Purpose**: Local testing and development only

**Creation**:
```powershell
.\create-test-certificate.ps1
```

**Characteristics**:
- ✅ Free and instant
- ✅ Good for local testing
- ✅ No password needed (uses empty password)
- ❌ Requires manual installation on each machine
- ❌ Shows security warnings to users
- ❌ Not trusted by default
- ❌ **NEVER use for distribution!**

**Installation Required**:
- Must be installed to `LocalMachine\Root` (Trusted Root Certification Authorities)
- Use `.\install-certificate.ps1` (requires admin)

### Production Certificate (From Trusted CA)

**Purpose**: Public distribution and production releases

**Where to Get One**:
1. **DigiCert** - Industry standard, $400-500/year
2. **Sectigo (formerly Comodo)** - More affordable, $200-300/year
3. **GlobalSign** - Good reputation, $300-400/year
4. **Azure Code Signing** - Cloud-based, pay-as-you-go

**Characteristics**:
- ✅ Trusted by Windows automatically
- ✅ No security warnings for users
- ✅ No manual certificate installation needed
- ✅ Professional appearance
- ❌ Costs money
- ❌ Requires company verification

## Best Practices

### For Development

1. **Never commit certificates** to Git
2. **Use test certificates** with empty passwords locally
3. **Each developer creates their own** test certificate
4. **Don't share certificates** between developers
5. **Document the process** (see `create-test-certificate.ps1`)

### For CI/CD

1. **Store certificates in secure secrets**:
   - GitHub Secrets
   - Azure Key Vault
   - AWS Secrets Manager
   
2. **Use certificate thumbprints** in code, not the actual certificate

3. **Example GitHub Actions**:
```yaml
- name: Import Certificate
  env:
    CERTIFICATE_BASE64: ${{ secrets.CERTIFICATE_BASE64 }}
  run: |
    $certBytes = [Convert]::FromBase64String($env:CERTIFICATE_BASE64)
    [IO.File]::WriteAllBytes("cert.pfx", $certBytes)
    Import-PfxCertificate -FilePath cert.pfx -CertStoreLocation Cert:\CurrentUser\My -Password (ConvertTo-SecureString -String "" -Force -AsPlainText)
```

### For Production

1. **Purchase a code signing certificate** from a trusted CA
2. **Store the certificate securely**:
   - Hardware Security Module (HSM) - most secure
   - Azure Key Vault - cloud-based
   - Encrypted file storage - minimum requirement
   
3. **Use certificate pinning** if possible
4. **Rotate certificates** before expiration
5. **Maintain certificate inventory**

## Certificate Storage

### ❌ NEVER Store Here:
- Git repositories
- Public cloud storage
- Unencrypted network shares
- Email
- Chat applications
- Developer workstations (without encryption)

### ✅ Store Here:
- Azure Key Vault
- AWS Secrets Manager
- HashiCorp Vault
- Password manager (1Password, LastPass, etc.)
- Hardware Security Module (HSM)
- Encrypted USB drive (backup only)

## Team Workflow

### Setup for New Developer

1. Clone the repository (no certificates included)
2. Run `.\create-test-certificate.ps1` to create personal test cert
3. Run `.\install-certificate.ps1` (as admin) to install it
4. Build and sign packages locally
5. Certificates remain on local machine only

### Release Process

1. **Build**: CI/CD builds unsigned package
2. **Sign**: Separate signing step using production certificate from Key Vault
3. **Verify**: Check signature is valid
4. **Publish**: Upload signed package to distribution channel

## FAQ

### Q: Why not just use Developer Mode?

**A**: Developer Mode allows unsigned packages but:
- Requires each user to enable it manually
- Security risk for end users
- Unprofessional
- Not suitable for enterprise deployment

### Q: Can I use the same certificate for multiple apps?

**A**: Yes, but:
- ✅ Saves money
- ❌ If compromised, affects all apps
- ❌ Can't revoke for just one app
- **Recommendation**: Use different certificates for different apps/teams

### Q: How long do certificates last?

**A**: 
- **Test certificates**: 2 years (as created by our script)
- **Production certificates**: 1-3 years typically
- Set reminders 60 days before expiration for renewal

### Q: What if my certificate expires?

**A**:
- Packages signed with expired cert still work
- Users who already trust it can still install
- New users will see security warnings
- **Action**: Renew before expiration, re-sign, and release update

### Q: What about timestamping?

**A**: Always use timestamp servers when signing:
```powershell
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /f cert.pfx package.msix
```

This allows packages to remain valid after certificate expires.

## Current Setup

This project uses:
- **Development**: Self-signed test certificates (not in Git)
- **Password**: Empty (no password protection)
- **Storage**: Local machine only, excluded from Git
- **Installation**: Manual, via `install-certificate.ps1`

**Next Step for Production**: Obtain a real code signing certificate from a trusted CA.

## Resources

- [Microsoft: App package signing](https://docs.microsoft.com/windows/msix/package/sign-app-package-using-signtool)
- [Code Signing Best Practices](https://docs.digicert.com/en/software-trust-manager/best-practices/code-signing-best-practices.html)
- [NIST Guidelines for Code Signing](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.01262018.pdf)
