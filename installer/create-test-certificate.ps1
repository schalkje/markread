# Create a self-signed test certificate for MSIX package signing
# This certificate is for DEVELOPMENT/TESTING only

param(
    [Parameter(Mandatory=$false)]
    [string]$Publisher = "CN=MarkRead",
    
    [Parameter(Mandatory=$false)]
    [string]$FriendlyName = "MarkRead Test Certificate"
)

$ErrorActionPreference = "Stop"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Creating Test Certificate" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Publisher: $Publisher" -ForegroundColor Yellow
Write-Host "Friendly Name: $FriendlyName" -ForegroundColor Yellow
Write-Host ""

# Certificate output paths
$certPath = Join-Path $PSScriptRoot "MarkRead_TemporaryKey.pfx"
$cerPath = Join-Path $PSScriptRoot "MarkRead_TemporaryKey.cer"

# Check if certificate already exists
if (Test-Path $certPath) {
    Write-Host "Certificate already exists at: $certPath" -ForegroundColor Yellow
    $response = Read-Host "Do you want to replace it? (y/n)"
    if ($response -ne 'y') {
        Write-Host "Keeping existing certificate." -ForegroundColor Green
        exit 0
    }
    Remove-Item $certPath -Force
    Remove-Item $cerPath -Force -ErrorAction SilentlyContinue
}

Write-Host "[1/4] Creating self-signed certificate..." -ForegroundColor Green

# Create the certificate
$cert = New-SelfSignedCertificate `
    -Type Custom `
    -Subject $Publisher `
    -KeyUsage DigitalSignature `
    -FriendlyName $FriendlyName `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}") `
    -NotAfter (Get-Date).AddYears(2)

Write-Host "  Certificate created with thumbprint: $($cert.Thumbprint)" -ForegroundColor Gray

Write-Host "[2/4] Exporting certificate to PFX..." -ForegroundColor Green

# Export to PFX (with no password for simplicity and security)
# Note: We use a space as the password since PowerShell doesn't allow truly empty strings
$securePassword = ConvertTo-SecureString -String " " -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $certPath -Password $securePassword | Out-Null

Write-Host "  PFX exported to: $certPath" -ForegroundColor Gray
Write-Host "  Password: (space character - effectively no password)" -ForegroundColor Gray

Write-Host "[3/4] Exporting public certificate to CER..." -ForegroundColor Green

# Export public certificate (for installing on other machines)
Export-Certificate -Cert $cert -FilePath $cerPath | Out-Null

Write-Host "  CER exported to: $cerPath" -ForegroundColor Gray

Write-Host "[4/4] Installing certificate to Trusted Root..." -ForegroundColor Green

# Import to Trusted Root Certification Authorities (Local Machine - required for MSIX installation)
# This requires administrator privileges
try {
    # Try to install to Local Machine (requires admin)
    Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\LocalMachine\Root" -ErrorAction Stop | Out-Null
    Write-Host "  ✓ Certificate installed to Local Machine Trusted Root store" -ForegroundColor Green
    $installed = $true
} catch {
    Write-Host "  ✗ Could not install to Local Machine Trusted Root (requires admin)" -ForegroundColor Yellow
    $installed = $false
    
    # Try Current User as fallback (but this won't work for MSIX)
    try {
        Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\CurrentUser\Root" -ErrorAction Stop | Out-Null
        Write-Host "  ⚠ Certificate installed to Current User store only" -ForegroundColor Yellow
        Write-Host "  ⚠ MSIX installation requires Local Machine certificate!" -ForegroundColor Yellow
    } catch {
        Write-Host "  ✗ Could not install certificate automatically" -ForegroundColor Red
    }
}

# Clean up certificate from Personal store (we only need it in the file)
Remove-Item -Path "Cert:\CurrentUser\My\$($cert.Thumbprint)" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Certificate Created Successfully!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Certificate files:" -ForegroundColor White
Write-Host "  PFX (for signing): $certPath" -ForegroundColor Cyan
Write-Host "  CER (for distribution): $cerPath" -ForegroundColor Cyan
Write-Host ""
if ($installed) {
    Write-Host "✓ Certificate is ready to use!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "1. Build the MSIX package (it will be signed automatically):" -ForegroundColor Gray
    Write-Host "   .\build-msix-sdk.ps1 -Version `"1.0.0.0`"" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. To install on THIS machine:" -ForegroundColor Gray
    Write-Host "   - Just double-click the .msix file to install" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "⚠ MANUAL INSTALLATION REQUIRED!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "The certificate was created but not installed (requires admin)." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "TO INSTALL THE CERTIFICATE (run as Administrator):" -ForegroundColor Cyan
    Write-Host "1. Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor White
    Write-Host "2. Run this command:" -ForegroundColor White
    Write-Host "   Import-Certificate -FilePath '$cerPath' -CertStoreLocation 'Cert:\LocalMachine\Root'" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "OR manually install:" -ForegroundColor Cyan
    Write-Host "1. Right-click: $cerPath" -ForegroundColor White
    Write-Host "2. Select 'Install Certificate'" -ForegroundColor White
    Write-Host "3. Choose 'Local Machine' (requires admin)" -ForegroundColor White
    Write-Host "4. Select 'Trusted Root Certification Authorities'" -ForegroundColor White
    Write-Host "5. Click Finish" -ForegroundColor White
    Write-Host ""
}
Write-Host "To install on OTHER machines:" -ForegroundColor White
Write-Host "1. Copy the .cer file to the other machine" -ForegroundColor Gray
Write-Host "2. Install it as described above (Local Machine, Trusted Root)" -ForegroundColor Gray
Write-Host "3. Then install the MSIX package" -ForegroundColor Gray
Write-Host ""
Write-Host "IMPORTANT: This is a TEST certificate only!" -ForegroundColor Yellow
Write-Host "For production releases, use a real code signing certificate from a trusted CA." -ForegroundColor Yellow
Write-Host ""

# Save certificate info to file
$infoPath = Join-Path $PSScriptRoot "certificate-info.txt"
@"
MarkRead Test Certificate Information
======================================

Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Publisher: $Publisher
Friendly Name: $FriendlyName
Password: (none)
Thumbprint: $($cert.Thumbprint)
Expires: $($cert.NotAfter.ToString("yyyy-MM-dd"))

Files:
- PFX (private key): $certPath
- CER (public key): $cerPath

Usage:
1. The build script will automatically use the PFX file to sign packages
2. Distribute the CER file with your app for users to install
3. Users must install the CER to Trusted Root before installing the MSIX

Installing CER on another machine:
1. Right-click MarkRead_TemporaryKey.cer
2. Select "Install Certificate"
3. Choose "Local Machine" (requires admin)
4. Select "Place all certificates in the following store"
5. Browse to "Trusted Root Certification Authorities"
6. Click Finish

WARNING: This is a TEST certificate. For production:
- Purchase a code signing certificate from DigiCert, Sectigo, etc.
- Or use Azure Code Signing for cloud-based signing
- Self-signed certificates will show security warnings to users
"@ | Set-Content $infoPath

Write-Host "Certificate details saved to: $infoPath" -ForegroundColor Gray
