<#
.SYNOPSIS
    Validates a code signing certificate for MSI signing.

.DESCRIPTION
    Checks if a certificate is valid for code signing:
    - Certificate exists and is accessible
    - Not expired
    - Has code signing extended key usage
    - Private key is available (for signing)

.PARAMETER Thumbprint
    The thumbprint of the certificate to validate

.PARAMETER PfxPath
    Path to a PFX file to validate (alternative to Thumbprint)

.PARAMETER Password
    Password for the PFX file (if using PfxPath)

.PARAMETER CheckPrivateKey
    Whether to verify that private key is available (required for signing)

.EXAMPLE
    .\validate-certificate.ps1 -Thumbprint "ABC123..."

.EXAMPLE
    .\validate-certificate.ps1 -PfxPath "cert.pfx" -Password "MyPassword"

.EXAMPLE
    # Validate certificate in store has private key
    .\validate-certificate.ps1 -Thumbprint "ABC123..." -CheckPrivateKey
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$Thumbprint,
    
    [Parameter(Mandatory = $false)]
    [string]$PfxPath,
    
    [Parameter(Mandatory = $false)]
    [string]$Password,
    
    [Parameter(Mandatory = $false)]
    [switch]$CheckPrivateKey
)

$ErrorActionPreference = "Stop"

Write-Host "Validating certificate..." -ForegroundColor Cyan

try {
    $cert = $null
    $validationErrors = @()
    $validationWarnings = @()

    # Load certificate
    if ($PfxPath) {
        if (-not (Test-Path $PfxPath)) {
            throw "PFX file not found: $PfxPath"
        }

        if (-not $Password) {
            throw "Password required for PFX file"
        }

        Write-Host "Loading certificate from PFX..." -ForegroundColor Gray
        $securePassword = ConvertTo-SecureString -String $Password -Force -AsPlainText
        $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($PfxPath, $securePassword)
    }
    elseif ($Thumbprint) {
        Write-Host "Loading certificate from store..." -ForegroundColor Gray
        
        $cert = Get-ChildItem -Path "Cert:\CurrentUser\My\$Thumbprint" -ErrorAction SilentlyContinue
        
        if (-not $cert) {
            $cert = Get-ChildItem -Path "Cert:\LocalMachine\My\$Thumbprint" -ErrorAction SilentlyContinue
        }

        if (-not $cert) {
            throw "Certificate with thumbprint '$Thumbprint' not found"
        }
    }
    else {
        throw "Either -Thumbprint or -PfxPath must be specified"
    }

    Write-Host "`nCertificate Details:" -ForegroundColor Cyan
    Write-Host "  Subject: $($cert.Subject)" -ForegroundColor Gray
    Write-Host "  Issuer: $($cert.Issuer)" -ForegroundColor Gray
    Write-Host "  Thumbprint: $($cert.Thumbprint)" -ForegroundColor Gray
    Write-Host "  Valid From: $($cert.NotBefore)" -ForegroundColor Gray
    Write-Host "  Valid To: $($cert.NotAfter)" -ForegroundColor Gray

    # Check expiration
    $now = Get-Date
    if ($cert.NotAfter -lt $now) {
        $validationErrors += "Certificate expired on $($cert.NotAfter)"
    }
    elseif ($cert.NotAfter -lt $now.AddDays(30)) {
        $daysRemaining = ($cert.NotAfter - $now).Days
        $validationWarnings += "Certificate expires in $daysRemaining days (on $($cert.NotAfter))"
    }

    if ($cert.NotBefore -gt $now) {
        $validationErrors += "Certificate not yet valid (valid from $($cert.NotBefore))"
    }

    # Check code signing EKU
    $hasCodeSigningEku = $false
    foreach ($eku in $cert.Extensions) {
        if ($eku.Oid.Value -eq "2.5.29.37") {  # Enhanced Key Usage
            $ekuString = $eku.Format($false)
            if ($ekuString -match "Code Signing" -or $ekuString -match "1\.3\.6\.1\.5\.5\.7\.3\.3") {
                $hasCodeSigningEku = $true
                break
            }
        }
    }

    if (-not $hasCodeSigningEku) {
        $validationErrors += "Certificate does not have Code Signing extended key usage"
    }

    # Check private key
    if ($CheckPrivateKey -or $PfxPath) {
        if ($cert.HasPrivateKey) {
            Write-Host "  Private Key: Available" -ForegroundColor Gray
        }
        else {
            $validationErrors += "Private key not available (required for signing)"
        }
    }

    # Report validation results
    Write-Host "`nValidation Results:" -ForegroundColor Cyan

    if ($validationErrors.Count -eq 0 -and $validationWarnings.Count -eq 0) {
        Write-Host "✓ Certificate is valid for code signing" -ForegroundColor Green
        exit 0
    }

    if ($validationWarnings.Count -gt 0) {
        Write-Host "`nWarnings:" -ForegroundColor Yellow
        foreach ($warning in $validationWarnings) {
            Write-Host "  ⚠ $warning" -ForegroundColor Yellow
        }
    }

    if ($validationErrors.Count -gt 0) {
        Write-Host "`nErrors:" -ForegroundColor Red
        foreach ($error in $validationErrors) {
            Write-Host "  ✗ $error" -ForegroundColor Red
        }
        
        Write-Host "`nCertificate validation failed!" -ForegroundColor Red
        exit 1
    }

    # Only warnings
    if ($validationWarnings.Count -gt 0) {
        Write-Host "`n✓ Certificate is valid but has warnings" -ForegroundColor Yellow
        exit 0
    }
}
catch {
    Write-Error "Certificate validation failed: $_"
    exit 1
}
