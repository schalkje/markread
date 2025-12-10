<#
.SYNOPSIS
    Install MarkRead MSIX package

.DESCRIPTION
    Installs the MarkRead MSIX package and trusts the certificate if needed.
    Handles certificate installation automatically for self-signed packages.

.PARAMETER MsixPath
    Path to the MSIX package file. If not provided, searches for latest in bin folder.

.PARAMETER Force
    Uninstall existing version before installing

.EXAMPLE
    .\install-msix.ps1
    Install latest MSIX from bin folder

.EXAMPLE
    .\install-msix.ps1 -MsixPath "C:\path\to\MarkRead.msix"
    Install specific MSIX file

.EXAMPLE
    .\install-msix.ps1 -Force
    Uninstall existing version and install fresh
#>

param(
    [Parameter()]
    [string]$MsixPath,

    [Parameter()]
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "MarkRead MSIX Installer" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Find MSIX package
if (-not $MsixPath) {
    Write-Host "Searching for MSIX package..." -ForegroundColor Yellow
    
    $binPath = Join-Path $RepoRoot "src\bin"
    $msixFiles = Get-ChildItem -Path $binPath -Filter "*.msix" -Recurse -ErrorAction SilentlyContinue
    
    if (-not $msixFiles) {
        Write-Error "No MSIX package found. Run .\scripts\build-msix.ps1 first."
    }
    
    $MsixPath = ($msixFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
}

if (-not (Test-Path $MsixPath)) {
    Write-Error "MSIX package not found: $MsixPath"
}

Write-Host "  ✓ Found package: $(Split-Path -Leaf $MsixPath)" -ForegroundColor Green
Write-Host "    Location: $(Split-Path -Parent $MsixPath)" -ForegroundColor Gray
Write-Host ""

# Check if already installed
Write-Host "Checking for existing installation..." -ForegroundColor Yellow

$existingApp = Get-AppxPackage -Name "com.schalken.markread" -ErrorAction SilentlyContinue

if ($existingApp) {
    Write-Host "  ℹ Found existing installation: $($existingApp.Version)" -ForegroundColor Yellow
    
    if ($Force) {
        Write-Host "  Uninstalling existing version..." -ForegroundColor Yellow
        Remove-AppxPackage -Package $existingApp.PackageFullName
        Write-Host "  ✓ Uninstalled" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "An existing version is installed. Options:" -ForegroundColor Yellow
        Write-Host "  1. Run with -Force to uninstall and reinstall" -ForegroundColor Gray
        Write-Host "  2. This installation will update the existing version" -ForegroundColor Gray
        Write-Host ""
    }
}

# Trust certificate
Write-Host "Checking certificate trust..." -ForegroundColor Yellow

$signature = Get-AuthenticodeSignature -FilePath $MsixPath
$signerCert = $signature.SignerCertificate

if ($signerCert) {
    Write-Host "  Signed by: $($signerCert.Subject)" -ForegroundColor Gray
    
    # Check if certificate is trusted
    $trustedCert = Get-ChildItem -Path "Cert:\LocalMachine\TrustedPeople" -ErrorAction SilentlyContinue | 
        Where-Object { $_.Thumbprint -eq $signerCert.Thumbprint }
    
    if (-not $trustedCert) {
        Write-Host "  ⚠ Certificate not yet trusted" -ForegroundColor Yellow
        Write-Host "  Installing certificate to Trusted People store..." -ForegroundColor Yellow
        Write-Host "  (Administrator elevation required)" -ForegroundColor Gray
        
        # Export certificate to temp file
        $tempCert = [System.IO.Path]::GetTempFileName() + ".cer"
        $certBytes = $signerCert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
        [System.IO.File]::WriteAllBytes($tempCert, $certBytes)
        
        try {
            # Import to Trusted People store (requires admin)
            $process = Start-Process -FilePath "certutil.exe" -ArgumentList @(
                "-addstore",
                "TrustedPeople",
                $tempCert
            ) -Verb RunAs -Wait -PassThru
            
            if ($process.ExitCode -eq 0) {
                Write-Host "  ✓ Certificate trusted successfully" -ForegroundColor Green
            } else {
                Write-Warning "Failed to trust certificate. You may be prompted during installation."
            }
        } finally {
            Remove-Item $tempCert -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "  ✓ Certificate already trusted" -ForegroundColor Green
    }
} else {
    Write-Warning "Package is not signed. Installation may fail."
}

# Install MSIX
Write-Host ""
Write-Host "Installing MSIX package..." -ForegroundColor Yellow

try {
    Add-AppxPackage -Path $MsixPath -ErrorAction Stop
    Write-Host "  ✓ Installation completed successfully!" -ForegroundColor Green
} catch {
    Write-Error "Installation failed: $_"
}

# Verify installation
Write-Host ""
Write-Host "Verifying installation..." -ForegroundColor Yellow

$installedApp = Get-AppxPackage -Name "com.schalken.markread" -ErrorAction SilentlyContinue

if ($installedApp) {
    Write-Host "  ✓ MarkRead is installed" -ForegroundColor Green
    Write-Host "    Version: $($installedApp.Version)" -ForegroundColor Gray
    Write-Host "    Install Location: $($installedApp.InstallLocation)" -ForegroundColor Gray
} else {
    Write-Error "Installation verification failed. Package not found."
}

# Summary
Write-Host ""
Write-Host "Installation Complete! ✓" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Host "Launch MarkRead:" -ForegroundColor Yellow
Write-Host "  • From Start Menu: Search for 'MarkRead'" -ForegroundColor Gray
Write-Host "  • From Command Line: markread" -ForegroundColor Gray
Write-Host "  • From Command Line with file: markread README.md" -ForegroundColor Gray
Write-Host "  • From Command Line with folder: markread ." -ForegroundColor Gray
Write-Host ""
