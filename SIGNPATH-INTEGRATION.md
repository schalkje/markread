# SignPath.io Integration - Setup Summary

## What Was Changed

### 1. GitHub Actions Workflow (`.github/workflows/release.yml`)

**Enhanced the release workflow to:**
- Upload unsigned MSI as GitHub artifact
- Submit MSI to SignPath.io for code signing
- Wait for signing completion
- Download and use signed MSI
- Fallback to unsigned MSI if signing not configured
- Update release notes to indicate signing status

**Key features:**
- ✅ Fully backward compatible (works with or without SignPath)
- ✅ Configurable via GitHub variables
- ✅ Clear status messages in workflow logs
- ✅ Automatic retry and error handling

### 2. Documentation Created

1. **`documentation/developer/signpath-setup.md`**
   - Comprehensive 1000+ line guide
   - SignPath.io application process
   - GitHub integration steps
   - Troubleshooting section
   - Verification commands
   - Best practices

2. **`documentation/developer/signpath-quickstart.md`**
   - Quick 20-minute setup guide
   - Step-by-step checklist
   - Configuration reference
   - Common troubleshooting

3. **Updated `documentation/developer/msi-setup.md`**
   - Added code signing section
   - References SignPath.io setup
   - Verification commands
   - Alternative signing methods

4. **Updated `documentation/developer/release-process.md`**
   - Added code signing section
   - Signing workflow explanation
   - Troubleshooting tips
   - Links to setup guides

## How It Works

### Without SignPath Configured (Current State)

```
Build MSI → Locate unsigned MSI → Release unsigned MSI
```

- Workflow continues normally
- Release notes show warning about unsigned installer
- No changes to current behavior

### With SignPath Configured (After Setup)

```
Build MSI → Upload artifact → Submit to SignPath → 
Wait for signing → Download signed MSI → Release signed MSI
```

- MSI is digitally signed
- Release notes show signing badge
- Users see verified publisher

## Next Steps to Enable Signing

### Step 1: Apply for SignPath.io (5 minutes)

1. Visit: https://about.signpath.io/product/editions
2. Click "Apply for Foundation Edition"
3. Fill out form:
   - Project: MarkRead
   - Repository: https://github.com/schalkje/markread
   - License: MIT
   - Description: Modern WPF Markdown viewer for Windows

### Step 2: Wait for Approval (1-3 business days)

You'll receive an email with:
- Organization ID
- Setup instructions
- Dashboard access

### Step 3: Configure SignPath.io (10 minutes)

Log in to https://app.signpath.io and:
1. Create project named `markread`
2. Add MSI artifact configuration
3. Create release signing policy
4. Connect GitHub account
5. Generate API token

See: `documentation/developer/signpath-quickstart.md` for detailed steps

### Step 4: Configure GitHub Secrets/Variables (5 minutes)

Go to: https://github.com/schalkje/markread/settings/secrets/actions

**Add Secret:**
```
SIGNPATH_API_TOKEN = <token from SignPath>
```

**Add Variables:**
```
SIGNPATH_ENABLED = true
SIGNPATH_ORGANIZATION_ID = <your org ID>
SIGNPATH_PROJECT_SLUG = markread
SIGNPATH_SIGNING_POLICY = release-signing
```

### Step 5: Test (2 minutes)

```powershell
# Create test tag
git tag -a v0.1.0-test-signing -m "Test SignPath integration"
git push origin v0.1.0-test-signing

# Watch workflow
# https://github.com/schalkje/markread/actions

# Verify signed MSI
Get-AuthenticodeSignature .\MarkRead-*-x64.msi
```

## Benefits

### For Users
- ✅ No "Unknown Publisher" warnings
- ✅ Verified authenticity
- ✅ Protection against tampering
- ✅ Reduced Windows SmartScreen warnings

### For Project
- ✅ Professional appearance
- ✅ Increased trust
- ✅ Better security posture
- ✅ Free for open-source!

## Configuration Reference

### GitHub Variables to Add

| Variable | Value | Description |
|----------|-------|-------------|
| `SIGNPATH_ENABLED` | `true` | Enable signing |
| `SIGNPATH_ORGANIZATION_ID` | `<your-id>` | From SignPath.io |
| `SIGNPATH_PROJECT_SLUG` | `markread` | Project name |
| `SIGNPATH_SIGNING_POLICY` | `release-signing` | Policy name |

### GitHub Secrets to Add

| Secret | Description |
|--------|-------------|
| `SIGNPATH_API_TOKEN` | API token from SignPath.io |

## Workflow Behavior

### Current (Unsigned)
- Release notes: "⚠️ This installer is currently unsigned"
- Users see: "Unknown Publisher" warning
- Works perfectly, just not signed

### After Setup (Signed)
- Release notes: "🔒 This installer is digitally signed"
- Users see: "SignPath Foundation" as publisher
- Reduced SmartScreen warnings over time

## Cost

**$0** - SignPath.io Foundation Edition is free for open-source projects!

**Requirements:**
- Public repository ✅
- Open source license (MIT) ✅
- Active development ✅
- Give optional attribution ✅

## Timeline

- **Application:** 5 minutes
- **Approval:** 1-3 business days
- **Setup:** 15 minutes
- **Testing:** 5 minutes
- **Total:** ~30 minutes (plus wait time)

## Support Resources

- **Setup Guide:** `documentation/developer/signpath-setup.md`
- **Quick Start:** `documentation/developer/signpath-quickstart.md`
- **SignPath Support:** support@signpath.io
- **Documentation:** https://about.signpath.io/documentation/

## Testing Without SignPath

The workflow works perfectly without SignPath configured:
1. No secrets/variables needed
2. Continues with unsigned MSI
3. Clear warning messages
4. No impact on releases

You can test the updated workflow immediately without setting up SignPath.

## Questions?

- Check `documentation/developer/signpath-setup.md` for detailed guides
- Create issue: https://github.com/schalkje/markread/issues
- SignPath support: support@signpath.io

---

**Ready to enable code signing?** Start with Step 1 above or see `signpath-quickstart.md`

Last updated: 2025-01-08
