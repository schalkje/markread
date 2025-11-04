# Install the MarkRead test certificate to Local Machine Trusted Root
# This script must be run as Administrator

param(
    [Parameter(Mandatory=$false)]
    [string]$CertPath = (Join-Path $PSScriptRoot "MarkRead_TemporaryKey.cer")
)

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host ""
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To run as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor White
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor White
    Write-Host "3. Navigate to: $PSScriptRoot" -ForegroundColor White
    Write-Host "4. Run: .\install-certificate.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Or run this command from an admin PowerShell:" -ForegroundColor Yellow
    Write-Host "  Import-Certificate -FilePath '$CertPath' -CertStoreLocation 'Cert:\LocalMachine\Root'" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

$ErrorActionPreference = "Stop"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Installing MarkRead Test Certificate" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $CertPath)) {
    Write-Host "ERROR: Certificate file not found!" -ForegroundColor Red
    Write-Host "Expected: $CertPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please run .\create-test-certificate.ps1 first" -ForegroundColor White
    exit 1
}

Write-Host "Certificate: $CertPath" -ForegroundColor Yellow
Write-Host ""

try {
    Write-Host "Installing certificate to Local Machine Trusted Root store..." -ForegroundColor Green
    
    $cert = Import-Certificate -FilePath $CertPath -CertStoreLocation "Cert:\LocalMachine\Root"
    
    Write-Host ""
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host "✓ Certificate Installed Successfully!" -ForegroundColor Green
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Certificate Details:" -ForegroundColor White
    Write-Host "  Subject: $($cert.Subject)" -ForegroundColor Gray
    Write-Host "  Thumbprint: $($cert.Thumbprint)" -ForegroundColor Gray
    Write-Host "  Expires: $($cert.NotAfter.ToString('yyyy-MM-dd'))" -ForegroundColor Gray
    Write-Host "  Store: LocalMachine\Root" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You can now install MSIX packages signed with this certificate." -ForegroundColor Green
    Write-Host "Just double-click the .msix file to install." -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to install certificate!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
