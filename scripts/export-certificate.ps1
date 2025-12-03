<#
.SYNOPSIS
    Exports a code signing certificate to PFX and/or CER formats.

.DESCRIPTION
    Exports an existing certificate from the certificate store to:
    - PFX format (includes private key, password protected) for signing
    - CER format (public key only) for distribution to users

.PARAMETER Thumbprint
    The thumbprint of the certificate to export

.PARAMETER Password
    Password to protect the PFX file

.PARAMETER PfxPath
    Path where to export the PFX file (includes private key)

.PARAMETER CerPath
    Path where to export the CER file (public key only)

.EXAMPLE
    .\export-certificate.ps1 -Thumbprint "ABC123..." -Password "MyPassword" -PfxPath "cert.pfx" -CerPath "cert.cer"

.EXAMPLE
    # Export only public certificate for user distribution
    .\export-certificate.ps1 -Thumbprint "ABC123..." -CerPath "markread-public.cer"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Thumbprint,
    
    [Parameter(Mandatory = $false)]
    [string]$Password,
    
    [Parameter(Mandatory = $false)]
    [string]$PfxPath,
    
    [Parameter(Mandatory = $false)]
    [string]$CerPath
)

$ErrorActionPreference = "Stop"

Write-Host "Exporting certificate..." -ForegroundColor Cyan

try {
    # Find certificate
    $cert = Get-ChildItem -Path "Cert:\CurrentUser\My\$Thumbprint" -ErrorAction SilentlyContinue
    
    if (-not $cert) {
        $cert = Get-ChildItem -Path "Cert:\LocalMachine\My\$Thumbprint" -ErrorAction SilentlyContinue
    }

    if (-not $cert) {
        throw "Certificate with thumbprint '$Thumbprint' not found in CurrentUser\My or LocalMachine\My"
    }

    Write-Host "Found certificate:" -ForegroundColor Gray
    Write-Host "  Subject: $($cert.Subject)" -ForegroundColor Gray
    Write-Host "  Valid To: $($cert.NotAfter)" -ForegroundColor Gray

    # Export to PFX (private key)
    if ($PfxPath) {
        if (-not $Password) {
            throw "Password required for PFX export"
        }

        Write-Host "`nExporting to PFX (with private key)..." -ForegroundColor Cyan
        
        $securePassword = ConvertTo-SecureString -String $Password -Force -AsPlainText
        $exportDir = Split-Path -Parent $PfxPath
        
        if ($exportDir -and -not (Test-Path $exportDir)) {
            New-Item -ItemType Directory -Path $exportDir -Force | Out-Null
        }

        Export-PfxCertificate `
            -Cert $cert `
            -FilePath $PfxPath `
            -Password $securePassword `
            -Force | Out-Null

        Write-Host "✓ PFX exported to: $PfxPath" -ForegroundColor Green
        Write-Host "  WARNING: Keep this file secure - it contains the private key!" -ForegroundColor Yellow
    }

    # Export to CER (public key only)
    if ($CerPath) {
        Write-Host "`nExporting to CER (public key only)..." -ForegroundColor Cyan
        
        $exportDir = Split-Path -Parent $CerPath
        
        if ($exportDir -and -not (Test-Path $exportDir)) {
            New-Item -ItemType Directory -Path $exportDir -Force | Out-Null
        }

        Export-Certificate `
            -Cert $cert `
            -FilePath $CerPath `
            -Force | Out-Null

        Write-Host "✓ CER exported to: $CerPath" -ForegroundColor Green
        Write-Host "  This file can be safely distributed to users" -ForegroundColor Gray
    }

    if (-not $PfxPath -and -not $CerPath) {
        Write-Warning "No export paths specified. Use -PfxPath and/or -CerPath parameters."
    }

    Write-Host "`nNext steps:" -ForegroundColor Yellow
    if ($PfxPath) {
        Write-Host "1. Store PFX file and password in GitHub Secrets" -ForegroundColor Gray
        Write-Host "2. NEVER commit the PFX file to source control" -ForegroundColor Gray
    }
    if ($CerPath) {
        Write-Host "3. Distribute CER file to users for certificate trust" -ForegroundColor Gray
        Write-Host "4. Include CER file in GitHub Releases" -ForegroundColor Gray
    }
}
catch {
    Write-Error "Failed to export certificate: $_"
    exit 1
}
