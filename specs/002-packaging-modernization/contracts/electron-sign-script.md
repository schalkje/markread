# Contract: Code Signing Script
# File: scripts/electron-sign.ps1

## Purpose

PowerShell script to sign Electron installers with SHA256 using Windows SDK signtool, supporting both PFX files and Windows Certificate Store.

## Usage

### Sign Installer

```powershell
.\scripts\electron-sign.ps1 -Path "dist\MarkRead-Setup-0.5.1.exe"
```

### Verify Signature

```powershell
.\scripts\electron-sign.ps1 -Path "dist\MarkRead-Setup-0.5.1.exe" -Verify
```

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `-Path` | String | Yes | Path to .exe file to sign or verify |
| `-Verify` | Switch | No | If present, verify signature instead of signing |

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `CERT_THUMBPRINT` | Option A | Certificate thumbprint in Windows Certificate Store | `A1B2C3D4E5F6...` |
| `PFX_PATH` | Option B | Path to PFX certificate file | `C:\certs\markread.pfx` |
| `PFX_PASSWORD` | Option B | Password for PFX file | `super-secret-password` |
| `TIMESTAMP_SERVER` | No (optional) | RFC 3161 timestamp server URL | `http://timestamp.digicert.com` (default) |

**Note**: Use either Option A (CERT_THUMBPRINT) OR Option B (PFX_PATH + PFX_PASSWORD), not both.

## Script Logic

### 1. Locate signtool.exe

```powershell
# Search Windows SDK installations
$sdkPath = "C:\Program Files (x86)\Windows Kits\10\bin"
$signtool = Get-ChildItem -Path $sdkPath -Recurse -Filter "signtool.exe" |
    Where-Object { $_.FullName -match "x64" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $signtool) {
    throw "signtool.exe not found. Install Windows SDK."
}
```

### 2. Load Certificate

```powershell
if ($env:CERT_THUMBPRINT) {
    # Option A: Windows Certificate Store
    $cert = Get-ChildItem Cert:\CurrentUser\My |
        Where-Object { $_.Thumbprint -eq $env:CERT_THUMBPRINT }
    if (-not $cert) {
        throw "Certificate not found in store: $env:CERT_THUMBPRINT"
    }
} elseif ($env:PFX_PATH -and $env:PFX_PASSWORD) {
    # Option B: PFX File
    $securePassword = ConvertTo-SecureString -String $env:PFX_PASSWORD -AsPlainText -Force
    $cert = Get-PfxCertificate -FilePath $env:PFX_PATH
} else {
    throw "No certificate configuration found"
}
```

### 3. Check Certificate Expiration

```powershell
$daysUntilExpiration = ($cert.NotAfter - (Get-Date)).Days

if ($cert.NotAfter -lt (Get-Date)) {
    Write-Error "Certificate has EXPIRED on $($cert.NotAfter)"
    exit 1  # FAIL build
} elseif ($daysUntilExpiration -lt 30) {
    Write-Warning "Certificate expires in $daysUntilExpiration days! Plan renewal."
    # Continue signing (WARN but not FAIL)
} else {
    Write-Host "Certificate valid until $($cert.NotAfter) ($daysUntilExpiration days remaining)"
}
```

### 4. Sign with SHA256 and Timestamp

```powershell
$timestampServer = if ($env:TIMESTAMP_SERVER) { $env:TIMESTAMP_SERVER } else { "http://timestamp.digicert.com" }

if ($env:CERT_THUMBPRINT) {
    # Sign with certificate store
    & $signtool sign `
        /sha1 $env:CERT_THUMBPRINT `
        /fd SHA256 `
        /tr $timestampServer `
        /td SHA256 `
        /v `
        $Path
} else {
    # Sign with PFX file
    & $signtool sign `
        /f $env:PFX_PATH `
        /p $env:PFX_PASSWORD `
        /fd SHA256 `
        /tr $timestampServer `
        /td SHA256 `
        /v `
        $Path
}

if ($LASTEXITCODE -ne 0) {
    throw "Signing failed with exit code $LASTEXITCODE"
}
```

### 5. Verify Signature

```powershell
if ($Verify) {
    & $signtool verify /pa /v $Path
    if ($LASTEXITCODE -ne 0) {
        throw "Signature verification failed"
    }
    Write-Host "Signature verification PASSED" -ForegroundColor Green
} else {
    # Auto-verify after signing
    & $signtool verify /pa /v $Path
    if ($LASTEXITCODE -ne 0) {
        throw "Signature verification failed after signing"
    }
}
```

## Exit Codes

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success (signed and verified, or verification passed) |
| 1 | Certificate expired |
| 2 | Certificate not found |
| 3 | signtool.exe not found |
| 4 | Signing failed |
| 5 | Verification failed |

## Functional Requirements Satisfied

- **FR-008**: Code signing script (scripts/electron-sign.ps1) locates signtool.exe from Windows SDK, signs .exe files with certificate from environment variables (PFX file or certificate store thumbprint), uses SHA256 hash algorithm, includes timestamp from DigiCert timestamp server, verifies signature after signing, and checks certificate expiration date to fail build with warning if certificate expires within 30 days

## Success Criteria Addressed

- **SC-005**: Code signed installers pass Windows SmartScreen verification with 0% warning rate when run by users

## Notes

- **SHA256 Required**: SHA-1 is deprecated and no longer accepted by Windows SmartScreen
- **Timestamping**: RFC 3161 timestamp ensures signature remains valid after certificate expiration
- **Certificate Sources**: Supports both Windows Certificate Store and PFX files for flexibility
- **Expiration Handling**: Warns if <30 days remaining, fails if expired (FR-008)
- **Auto-Verify**: Always verifies signature after signing to catch errors early
- **Called by electron-builder**: Configured via `win.sign` in electron-builder.yml

## Example Output

### Successful Signing

```
Locating signtool.exe...
Found: C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe

Loading certificate...
Certificate: CN=MarkRead Project
Thumbprint: A1B2C3D4E5F6...
Expires: 2027-01-11 (365 days remaining)

Signing: dist\MarkRead-Setup-0.5.1.exe
Algorithm: SHA256
Timestamp: http://timestamp.digicert.com

Successfully signed: dist\MarkRead-Setup-0.5.1.exe

Verifying signature...
Signature verification PASSED
```

### Expiration Warning

```
Loading certificate...
Certificate: CN=MarkRead Development
Thumbprint: A1B2C3D4E5F6...
WARNING: Certificate expires in 25 days! Plan renewal.

Signing: dist\MarkRead-Setup-0.5.1.exe
...
Successfully signed: dist\MarkRead-Setup-0.5.1.exe
```

### Expiration Failure

```
Loading certificate...
Certificate: CN=MarkRead Old
Thumbprint: A1B2C3D4E5F6...
ERROR: Certificate has EXPIRED on 2025-12-15

Signing FAILED: Certificate expired
```

## Testing

### Test with Development Certificate

```powershell
# Create self-signed cert
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=MarkRead Dev"

# Export to PFX
$password = ConvertTo-SecureString -String "test123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "test-cert.pfx" -Password $password

# Test signing
$env:PFX_PATH = "test-cert.pfx"
$env:PFX_PASSWORD = "test123"
.\scripts\electron-sign.ps1 -Path "dist\MarkRead-Setup-0.5.1.exe"

# Test verification
.\scripts\electron-sign.ps1 -Path "dist\MarkRead-Setup-0.5.1.exe" -Verify
```

### Test Certificate Expiration Warning

```powershell
# Create cert expiring in 20 days
$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject "CN=MarkRead Expiring" `
    -NotAfter (Get-Date).AddDays(20)

# Export and test (should warn but succeed)
$password = ConvertTo-SecureString -String "test123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "expiring-cert.pfx" -Password $password

$env:PFX_PATH = "expiring-cert.pfx"
$env:PFX_PASSWORD = "test123"
.\scripts\electron-sign.ps1 -Path "dist\MarkRead-Setup-0.5.1.exe"
# Expected: WARNING message about expiration
```

## References

- https://docs.microsoft.com/en-us/windows/win32/seccrypto/signtool
- https://www.electron.build/code-signing
- https://knowledge.digicert.com/solution/SO912.html (timestamping)
