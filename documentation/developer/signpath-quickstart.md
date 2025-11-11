# SignPath.io Quick Start

Quick reference for setting up code signing with SignPath.io's free open-source plan.

## Prerequisites Checklist

- [ ] Open-source GitHub repository (✅ markread)
- [ ] MIT or other OSS license (✅ MIT)
- [ ] Active development
- [ ] Valid email for contact

## Step-by-Step Setup

### 1. Apply for Free Plan (5 minutes)

Visit: https://about.signpath.io/product/editions

Fill out form:
- **Project:** MarkRead
- **Repository:** https://github.com/schalkje/markread
- **License:** MIT
- **Description:** Modern WPF Markdown viewer for Windows

⏱️ Wait 1-3 business days for approval

### 2. Configure SignPath.io (10 minutes)

Once approved, log in to https://app.signpath.io:

1. **Create Project:**
   - Name: `markread`
   - Description: MSI installer signing

2. **Add Artifact Configuration:**
   ```xml
   <artifact-configuration xmlns="http://signpath.io/artifact-configuration/v1">
     <msi-file>
       <authenticode-sign/>
     </msi-file>
   </artifact-configuration>
   ```

3. **Create Signing Policy:**
   - Name: `release-signing`
   - Type: Release Signing
   - Certificate: Open Source certificate

4. **Connect GitHub:**
   - Link GitHub account
   - Grant access to repository

5. **Generate API Token:**
   - Settings > API Tokens
   - Name: GitHub Actions Release
   - Copy token immediately!

### 3. Configure GitHub (5 minutes)

Go to: https://github.com/schalkje/markread/settings/secrets/actions

**Add Secret:**
```
Name: SIGNPATH_API_TOKEN
Value: <token-from-step-2>
```

**Add Variables:**
```
SIGNPATH_ENABLED = true
SIGNPATH_ORGANIZATION_ID = <your-org-id-from-signpath>
SIGNPATH_PROJECT_SLUG = markread
SIGNPATH_SIGNING_POLICY = release-signing
```

### 4. Test (2 minutes)

```powershell
# Create test tag
git tag -a v0.1.0-test -m "Test signing"
git push origin v0.1.0-test

# Watch workflow at:
# https://github.com/schalkje/markread/actions
```

Verify signed MSI:
```powershell
# Download MSI from release
Get-AuthenticodeSignature .\MarkRead-*-x64.msi
# Should show: Status = Valid
```

## Configuration Reference

### GitHub Secrets (Secret - not visible after creation)

| Name | Description | Example |
|------|-------------|---------|
| `SIGNPATH_API_TOKEN` | API token from SignPath.io | `sp_abc123...` |

### GitHub Variables (Visible)

| Name | Description | Example |
|------|-------------|---------|
| `SIGNPATH_ENABLED` | Enable/disable signing | `true` |
| `SIGNPATH_ORGANIZATION_ID` | Your org ID from SignPath | `abc123...` |
| `SIGNPATH_PROJECT_SLUG` | Project identifier | `markread` |
| `SIGNPATH_SIGNING_POLICY` | Signing policy name | `release-signing` |

### Where to Find IDs

1. **Organization ID:**
   - SignPath.io > Settings > Organization
   - URL: `https://app.signpath.io/organizations/<ORG-ID>`

2. **Project Slug:**
   - What you named the project (lowercase, no spaces)
   - URL: `https://app.signpath.io/.../<PROJECT-SLUG>`

3. **Signing Policy:**
   - What you named the policy
   - SignPath.io > Project > Signing Policies

## Workflow Behavior

### With Signing Enabled (`SIGNPATH_ENABLED=true`)

```
Build MSI → Upload to GitHub → Submit to SignPath → Wait for signing → Download signed MSI → Release
```

Release notes show: 🔒 "This installer is digitally signed"

### Without Signing (`SIGNPATH_ENABLED=false` or not set)

```
Build MSI → Release unsigned
```

Release notes show: ⚠️ "This installer is currently unsigned"

## Troubleshooting

### Workflow fails at signing step

Check:
1. All GitHub secrets/variables are set
2. API token is valid (regenerate if needed)
3. SignPath.io dashboard shows the request

### Signed MSI not found

Check:
1. SignPath.io dashboard - did signing complete?
2. Artifact configuration accepts MSI files
3. Workflow logs for detailed errors

### MSI still shows "Unknown Publisher"

- Normal for new certificates
- Trust builds over time
- SignPath Foundation cert is trusted but SmartScreen may still warn initially

## Verification

### Check MSI Signature

```powershell
# Quick check
Get-AuthenticodeSignature .\MarkRead-1.0.0-x64.msi

# Expected output:
# Status: Valid
# SignerCertificate: CN=SignPath Foundation
```

### Install and Verify

1. Right-click MSI
2. Properties > Digital Signatures
3. Should show valid signature

## Disabling Signing

To temporarily disable signing (e.g., during development):

```
Set GitHub Variable:
SIGNPATH_ENABLED = false
```

Workflow will use unsigned MSI but continue normally.

## Resources

- [Full Setup Guide](./signpath-setup.md)
- [SignPath.io Docs](https://about.signpath.io/documentation/)
- [GitHub Action](https://github.com/signpath/github-action-submit-signing-request)

## Support

- **Setup Issues:** See [signpath-setup.md](./signpath-setup.md)
- **SignPath Support:** support@signpath.io
- **MarkRead Issues:** https://github.com/schalkje/markread/issues

---

**Total Setup Time:** ~20 minutes (plus 1-3 days approval wait)

Last updated: 2025-01-08
