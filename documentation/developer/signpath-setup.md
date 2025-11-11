# SignPath.io Code Signing Setup

This guide explains how to set up free code signing for MarkRead using [SignPath.io](https://signpath.io), which offers free code signing for open-source projects.

## Overview

Code signing provides several benefits:
- ✅ **Trust:** Users see your verified identity instead of "Unknown Publisher"
- ✅ **Security:** Prevents tampering - signed files show warnings if modified
- ✅ **SmartScreen:** Reduces Windows SmartScreen warnings over time
- ✅ **Professional:** Shows commitment to security and quality

SignPath.io offers **free code signing for open-source projects** with their Foundation Edition.

## Prerequisites

- Open-source project on GitHub (✅ MarkRead qualifies)
- Public repository
- Active development and releases
- Valid contact information

## Setup Process

### 1. Apply for SignPath.io Free Open Source Plan

1. Go to [SignPath.io Foundation Edition](https://about.signpath.io/product/editions)
2. Click **"Apply for Foundation Edition"**
3. Fill out the application form:
   - **Project Name:** MarkRead
   - **Repository URL:** https://github.com/schalkje/markread
   - **License:** MIT
   - **Project Description:** Modern WPF Markdown viewer for Windows
   - **Contact Email:** Your email
   - **Expected Signing Frequency:** ~1-4 releases per month

4. Wait for approval (typically 1-3 business days)
5. You'll receive an email with:
   - Organization ID
   - Instructions to create a project
   - API token generation guide

### 2. Create SignPath.io Project

Once approved, log in to [SignPath.io](https://app.signpath.io):

1. **Create a new project:**
   - Name: `markread`
   - Description: `MarkRead MSI Installer Signing`

2. **Add artifact configuration:**
   ```xml
   <artifact-configuration xmlns="http://signpath.io/artifact-configuration/v1">
     <msi-file>
       <authenticode-sign/>
     </msi-file>
   </artifact-configuration>
   ```

3. **Create signing policy:**
   - Name: `release-signing`
   - Type: `Release Signing`
   - Artifact Configuration: Select the one created above
   - Certificate: Use the provided Open Source certificate

4. **Configure GitHub integration:**
   - Connect your GitHub account
   - Grant access to `schalkje/markread` repository
   - Enable build validation

### 3. Generate API Token

1. Go to **Settings > API Tokens**
2. Create new token:
   - Name: `GitHub Actions Release Signing`
   - Scope: `Submit signing requests`
   - Projects: Select `markread` project
3. **Copy the token immediately** (you won't see it again!)

### 4. Configure GitHub Repository

Add the following secrets and variables to your GitHub repository:

**Repository Secrets** (Settings > Secrets and variables > Actions > Secrets):

```
SIGNPATH_API_TOKEN
```
Value: The API token from step 3

**Repository Variables** (Settings > Secrets and variables > Actions > Variables):

```
SIGNPATH_ENABLED = true
SIGNPATH_ORGANIZATION_ID = your-org-id
SIGNPATH_PROJECT_SLUG = markread
SIGNPATH_SIGNING_POLICY = release-signing
```

To add these:

1. Go to your repository on GitHub
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret** for the API token
4. Click **Variables** tab > **New repository variable** for each variable

### 5. Test the Integration

Create a test release to verify signing works:

```powershell
# Create a test tag
git tag -a v0.1.0-test-signing -m "Test SignPath.io integration"
git push origin v0.1.0-test-signing
```

Watch the GitHub Actions workflow:
1. Go to **Actions** tab in your repository
2. Watch the release workflow
3. Verify the "Submit to SignPath.io for signing" step succeeds
4. Download the MSI and verify it's signed:

```powershell
# Check digital signature
Get-AuthenticodeSignature .\MarkRead-0.1.0-test-signing-x64.msi

# Should show:
# Status: Valid
# SignerCertificate: CN=SignPath Foundation
```

## Workflow Integration

The updated `.github/workflows/release.yml` workflow now:

1. ✅ Builds the unsigned MSI
2. ✅ Uploads it as a GitHub artifact
3. ✅ Submits to SignPath.io for signing (if enabled)
4. ✅ Waits for signing to complete
5. ✅ Downloads the signed MSI
6. ✅ Publishes the signed MSI to GitHub Releases

### Fallback Behavior

If SignPath is not configured (`SIGNPATH_ENABLED != true`):
- The workflow continues with the unsigned MSI
- A warning is shown in the workflow logs
- Release notes indicate the MSI is unsigned

This ensures releases can still be created while setting up signing.

## Verification

### Check if MSI is Signed

**Method 1: Windows Properties**
1. Right-click the MSI file
2. Select **Properties**
3. Go to **Digital Signatures** tab
4. Should show signature from "SignPath Foundation"

**Method 2: PowerShell**
```powershell
Get-AuthenticodeSignature .\MarkRead-1.0.0-x64.msi | Format-List

# Expected output:
# Status        : Valid
# SignerCertificate : [Subject]
#                  CN=SignPath Foundation
#                  ...
# TimeStamperCertificate : ...
```

**Method 3: SignTool (Windows SDK)**
```powershell
signtool verify /pa /v MarkRead-1.0.0-x64.msi
```

## Troubleshooting

### Signing Request Fails

**Error: "Artifact not found"**
- Ensure the artifact name matches exactly: `unsigned-msi`
- Check that the upload step completed successfully

**Error: "Invalid signing policy"**
- Verify `SIGNPATH_SIGNING_POLICY` matches your policy slug in SignPath.io
- Check that the policy is configured for MSI signing

**Error: "Authentication failed"**
- Verify `SIGNPATH_API_TOKEN` secret is set correctly
- Token may have expired - regenerate in SignPath.io

**Error: "Signing request timed out"**
- SignPath free tier may have delays during high usage
- Default timeout is 600 seconds (10 minutes)
- Check SignPath.io dashboard for request status

### Signed MSI Not Downloaded

If the workflow completes but uses unsigned MSI:
1. Check the SignPath.io dashboard for the signing request status
2. Verify the artifact configuration accepts MSI files
3. Check workflow logs for detailed error messages

### Certificate Not Trusted

If Windows shows warnings even with signed MSI:
- This is normal for new certificates
- Trust builds over time as more users install
- SignPath Foundation certificate is trusted but may trigger SmartScreen initially
- After ~50-100 installs, SmartScreen warnings should reduce

## Best Practices

### Do
- ✅ Keep API tokens secret
- ✅ Test signing with pre-release tags first
- ✅ Monitor SignPath.io dashboard for request status
- ✅ Verify signatures before announcing releases
- ✅ Keep SignPath.io artifact configuration updated

### Don't
- ❌ Commit API tokens to repository
- ❌ Share API tokens publicly
- ❌ Skip verification of signed artifacts
- ❌ Release without testing signed installer
- ❌ Change certificate without planning transition

## Costs and Limitations

### SignPath.io Foundation (Free for OSS)

**Included:**
- ✅ Unlimited signing requests
- ✅ Extended Validation (EV) certificate
- ✅ GitHub Actions integration
- ✅ Timestamping (signature valid after cert expires)
- ✅ Support for MSI, EXE, DLL, PowerShell

**Requirements:**
- Public GitHub repository
- Open source license (MIT ✓)
- Active maintenance
- Attribution to SignPath.io (optional but appreciated)

**Limitations:**
- Foundation certificate (not your company name)
- Community support only
- Best-effort SLA

For production projects requiring your company's identity on the certificate, consider:
- Commercial code signing certificate ($100-400/year)
- SignPath.io paid plans (starting at €25/month)

## Alternative: Self-Signed Certificate (Not Recommended)

For development/testing only:

```powershell
# Create self-signed certificate
$cert = New-SelfSignedCertificate -Type CodeSigningCert `
  -Subject "CN=MarkRead Development" `
  -CertStoreLocation Cert:\CurrentUser\My

# Sign MSI
Set-AuthenticodeSignature -FilePath .\MarkRead.msi `
  -Certificate $cert `
  -TimestampServer http://timestamp.digicert.com
```

⚠️ **Warning:** Self-signed certificates provide no security benefit for distribution:
- Not trusted by Windows
- Users see "Unknown Publisher" warnings
- No protection against SmartScreen

Only use for local testing. For production, use SignPath.io or purchase a commercial certificate.

## Resources

- [SignPath.io Documentation](https://about.signpath.io/documentation/)
- [SignPath.io GitHub Action](https://github.com/signpath/github-action-submit-signing-request)
- [Microsoft Authenticode](https://docs.microsoft.com/windows/win32/seccrypto/authenticode)
- [Windows Code Signing](https://docs.microsoft.com/windows-hardware/drivers/install/authenticode)

## Support

- **SignPath.io Issues:** support@signpath.io
- **MarkRead Issues:** https://github.com/schalkje/markread/issues

---

**Status:** ⏳ SignPath.io application pending / 🔒 Signing active

Last updated: 2025-01-08
