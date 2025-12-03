#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Import MarkRead code signing certificate for trusted installation.

.DESCRIPTION
    Imports the MarkRead public certificate (.cer file) into the Windows certificate
    stores to enable trusted installation of signed MSI files. This eliminates
    "Unknown publisher" warnings during installation.
    
    The certificate is installed into:
    - Trusted Root Certification Authorities (for trust chain)
    - Trusted Publishers (for code signing trust)

.PARAMETER CertificatePath
    Path to the .cer certificate file to import. If not provided, attempts to
    download from the latest GitHub release.

.PARAMETER SkipTrustedPublishers
    Skip importing to Trusted Publishers store. Only import to Trusted Root.

.PARAMETER SkipTrustedRoot
    Skip importing to Trusted Root store. Only import to Trusted Publishers.

.PARAMETER Force
    Force re-import even if certificate already exists in stores.

.PARAMETER CheckOnly
    Only check if certificate is already installed, don't import.

.EXAMPLE
    .\import-certificate.ps1
    Downloads certificate from latest GitHub release and imports to both stores.

.EXAMPLE
    .\import-certificate.ps1 -CertificatePath "C:\Downloads\markread-cert.cer"
    Imports specific certificate file to both stores.

.EXAMPLE
    .\import-certificate.ps1 -CheckOnly
    Checks if MarkRead certificate is already trusted, displays status.

.EXAMPLE
    .\import-certificate.ps1 -SkipTrustedPublishers
    Only imports to Trusted Root (basic trust, may still show warnings).

.NOTES
    Requires Administrator privileges to import to LocalMachine certificate stores.
    For non-admin users, certificates are imported to CurrentUser stores instead.
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$CertificatePath = "",

    [Parameter()]
    [switch]$SkipTrustedPublishers,

    [Parameter()]
    [switch]$SkipTrustedRoot,

    [Parameter()]
    [switch]$Force,

    [Parameter()]
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# ============================================================================
# Configuration
# ============================================================================

$GITHUB_REPO = "owner/markread"  # Update with actual repo
$CERT_FILENAME = "markread-cert.cer"
$CERT_SUBJECT = "CN=MarkRead"  # Update with actual subject

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Section {
    param([string]$Title)
    Write-Host "`n=== $Title ===" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Failure {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]$identity
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-CertificateStoreLocation {
    if (Test-Administrator) {
        return "LocalMachine"
    }
    else {
        return "CurrentUser"
    }
}

function Test-CertificateInstalled {
    param(
        [string]$Subject,
        [string]$Store
    )
    
    $location = Get-CertificateStoreLocation
    $storePath = "Cert:\$location\$Store"
    
    try {
        $certs = Get-ChildItem $storePath -ErrorAction SilentlyContinue | 
                 Where-Object { $_.Subject -like "*$Subject*" }
        
        return ($null -ne $certs -and $certs.Count -gt 0)
    }
    catch {
        return $false
    }
}

function Get-InstalledCertificate {
    param([string]$Subject)
    
    $location = Get-CertificateStoreLocation
    $stores = @("Root", "TrustedPublisher")
    $results = @()
    
    foreach ($store in $stores) {
        $storePath = "Cert:\$location\$store"
        try {
            $certs = Get-ChildItem $storePath -ErrorAction SilentlyContinue | 
                     Where-Object { $_.Subject -like "*$Subject*" }
            
            foreach ($cert in $certs) {
                $results += [PSCustomObject]@{
                    Store = $store
                    Subject = $cert.Subject
                    Thumbprint = $cert.Thumbprint
                    NotAfter = $cert.NotAfter
                    Issuer = $cert.Issuer
                }
            }
        }
        catch {
            Write-Verbose "Could not access store: $storePath"
        }
    }
    
    return $results
}

function Get-LatestReleaseCertificate {
    Write-Section "Downloading Certificate"
    
    try {
        # Get latest release info
        $apiUrl = "https://api.github.com/repos/$GITHUB_REPO/releases/latest"
        Write-Host "Fetching latest release from GitHub..."
        
        $release = Invoke-RestMethod -Uri $apiUrl -ErrorAction Stop
        
        # Find certificate asset
        $certAsset = $release.assets | Where-Object { $_.name -eq $CERT_FILENAME }
        
        if (-not $certAsset) {
            Write-Failure "Certificate file not found in latest release"
            Write-Host "Looking for: $CERT_FILENAME"
            Write-Host "Available assets:"
            $release.assets | ForEach-Object { Write-Host "  - $($_.name)" }
            throw "Certificate not found"
        }
        
        # Download certificate
        $tempPath = Join-Path $env:TEMP $CERT_FILENAME
        Write-Host "Downloading: $($certAsset.name) ($([math]::Round($certAsset.size / 1KB, 2)) KB)"
        
        Invoke-WebRequest -Uri $certAsset.browser_download_url -OutFile $tempPath -ErrorAction Stop
        
        Write-Success "Downloaded to: $tempPath"
        return $tempPath
    }
    catch {
        Write-Failure "Failed to download certificate: $($_.Exception.Message)"
        Write-Host "`nAlternative: Download manually from:"
        Write-Host "  https://github.com/$GITHUB_REPO/releases/latest"
        Write-Host "Then run: .\import-certificate.ps1 -CertificatePath <path>"
        throw
    }
}

function Import-CertificateToStore {
    param(
        [string]$CertPath,
        [string]$StoreName
    )
    
    $location = Get-CertificateStoreLocation
    $storeLocation = "Cert:\$location\$StoreName"
    
    try {
        Write-Host "Importing to $location\$StoreName..."
        
        $cert = Import-Certificate -FilePath $CertPath -CertStoreLocation $storeLocation -ErrorAction Stop
        
        Write-Success "Imported: $($cert.Subject)"
        Write-Host "  Thumbprint: $($cert.Thumbprint)"
        Write-Host "  Expires: $($cert.NotAfter.ToString('yyyy-MM-dd'))"
        
        return $true
    }
    catch {
        Write-Failure "Import failed: $($_.Exception.Message)"
        return $false
    }
}

function Show-CertificateStatus {
    param([string]$Subject)
    
    Write-Section "Certificate Status"
    
    $location = Get-CertificateStoreLocation
    $certs = Get-InstalledCertificate -Subject $Subject
    
    if ($certs.Count -eq 0) {
        Write-Warning "MarkRead certificate not found in certificate stores"
        Write-Host "Location checked: $location"
        Write-Host "Stores checked: Root, TrustedPublisher"
        return $false
    }
    
    Write-Success "MarkRead certificate found"
    Write-Host "Location: $location"
    Write-Host ""
    
    foreach ($cert in $certs) {
        Write-Host "[$($cert.Store)]"
        Write-Host "  Subject: $($cert.Subject)"
        Write-Host "  Thumbprint: $($cert.Thumbprint)"
        Write-Host "  Expires: $($cert.NotAfter.ToString('yyyy-MM-dd HH:mm:ss'))"
        Write-Host "  Issuer: $($cert.Issuer)"
        
        if ($cert.NotAfter -lt (Get-Date)) {
            Write-Warning "  STATUS: EXPIRED"
        }
        elseif ($cert.NotAfter -lt (Get-Date).AddDays(30)) {
            Write-Warning "  STATUS: Expiring soon"
        }
        else {
            Write-Success "  STATUS: Valid"
        }
        Write-Host ""
    }
    
    return $true
}

function Show-InstallationInstructions {
    param([bool]$IsAdmin)
    
    Write-Host "`n=== What This Means ===" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "✓ MarkRead MSI installers will now install without warnings"
    Write-Host "✓ You trust software signed with this certificate"
    
    if (-not $IsAdmin) {
        Write-Host "⚠ Certificate only trusted for your user account"
        Write-Host "  To trust for all users, run as Administrator"
    }
    else {
        Write-Host "✓ Certificate trusted for all users on this computer"
    }
    
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Download MarkRead MSI installer"
    Write-Host "  2. Double-click to install (no warnings!)"
    Write-Host "  3. Enjoy MarkRead"
    Write-Host ""
}

function Remove-InstalledCertificates {
    param([string]$Subject)
    
    Write-Section "Removing Existing Certificates"
    
    $location = Get-CertificateStoreLocation
    $stores = @("Root", "TrustedPublisher")
    $removed = 0
    
    foreach ($store in $stores) {
        $storePath = "Cert:\$location\$store"
        
        try {
            $certs = Get-ChildItem $storePath -ErrorAction SilentlyContinue | 
                     Where-Object { $_.Subject -like "*$Subject*" }
            
            foreach ($cert in $certs) {
                Write-Host "Removing from $store: $($cert.Thumbprint)"
                Remove-Item -Path "$storePath\$($cert.Thumbprint)" -Force -ErrorAction Stop
                $removed++
            }
        }
        catch {
            Write-Warning "Could not remove from $store: $($_.Exception.Message)"
        }
    }
    
    if ($removed -gt 0) {
        Write-Success "Removed $removed certificate(s)"
    }
    else {
        Write-Host "No certificates to remove"
    }
}

# ============================================================================
# Main Script Logic
# ============================================================================

try {
    Write-Host "MarkRead Certificate Import Tool" -ForegroundColor Magenta
    Write-Host "=================================`n" -ForegroundColor Magenta
    
    # Check admin status
    $isAdmin = Test-Administrator
    $location = Get-CertificateStoreLocation
    
    if ($isAdmin) {
        Write-Host "Running as: Administrator" -ForegroundColor Green
        Write-Host "Certificates will be installed to: LocalMachine (all users)`n"
    }
    else {
        Write-Warning "Running as: Standard User"
        Write-Host "Certificates will be installed to: CurrentUser (your account only)"
        Write-Host "For all users, right-click and 'Run as Administrator'`n"
    }
    
    # Check-only mode
    if ($CheckOnly) {
        $found = Show-CertificateStatus -Subject $CERT_SUBJECT
        
        if ($found) {
            Write-Success "`nMarkRead certificate is installed and trusted"
            exit 0
        }
        else {
            Write-Warning "`nMarkRead certificate is NOT installed"
            Write-Host "Run without -CheckOnly to install"
            exit 1
        }
    }
    
    # Get certificate path
    if (-not $CertificatePath) {
        $CertificatePath = Get-LatestReleaseCertificate
    }
    else {
        if (-not (Test-Path $CertificatePath)) {
            throw "Certificate file not found: $CertificatePath"
        }
        
        $CertificatePath = Resolve-Path $CertificatePath
        Write-Section "Using Certificate File"
        Write-Success "Certificate: $CertificatePath"
    }
    
    # Validate certificate file
    try {
        $certObj = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 $CertificatePath
        Write-Host "  Subject: $($certObj.Subject)"
        Write-Host "  Thumbprint: $($certObj.Thumbprint)"
        Write-Host "  Expires: $($certObj.NotAfter.ToString('yyyy-MM-dd'))"
    }
    catch {
        throw "Invalid certificate file: $($_.Exception.Message)"
    }
    
    # Check if already installed
    if (-not $Force) {
        $inRoot = Test-CertificateInstalled -Subject $CERT_SUBJECT -Store "Root"
        $inPublishers = Test-CertificateInstalled -Subject $CERT_SUBJECT -Store "TrustedPublisher"
        
        if ($inRoot -and $inPublishers) {
            Write-Section "Certificate Already Installed"
            Show-CertificateStatus -Subject $CERT_SUBJECT | Out-Null
            Write-Host ""
            Write-Host "Certificate is already installed and trusted."
            Write-Host "Use -Force to re-import."
            exit 0
        }
    }
    
    # Remove existing if force
    if ($Force) {
        Remove-InstalledCertificates -Subject $CERT_SUBJECT
    }
    
    # Import to stores
    Write-Section "Importing Certificate"
    
    $success = $true
    
    if (-not $SkipTrustedRoot) {
        $result = Import-CertificateToStore -CertPath $CertificatePath -StoreName "Root"
        $success = $success -and $result
    }
    
    if (-not $SkipTrustedPublishers) {
        $result = Import-CertificateToStore -CertPath $CertificatePath -StoreName "TrustedPublisher"
        $success = $success -and $result
    }
    
    if (-not $success) {
        throw "Certificate import failed"
    }
    
    # Show final status
    Show-CertificateStatus -Subject $CERT_SUBJECT | Out-Null
    Show-InstallationInstructions -IsAdmin $isAdmin
    
    Write-Success "Certificate import complete"
    exit 0
}
catch {
    Write-Host ""
    Write-Failure "Certificate import failed: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "Troubleshooting:"
    Write-Host "  • Run as Administrator for LocalMachine trust (all users)"
    Write-Host "  • Check certificate file is valid .cer format"
    Write-Host "  • Ensure Windows certificate stores are accessible"
    Write-Host "  • See documentation: documentation/user-guide/installation.md"
    Write-Host ""
    
    exit 1
}
