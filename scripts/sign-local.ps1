#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Local MSI signing wrapper for development workflow.

.DESCRIPTION
    Simplified signing script for developers to sign MSI installers locally.
    Automatically detects certificates in local certificate stores, prompts for
    selection if multiple candidates exist, and handles password entry securely.

.PARAMETER MsiPath
    Path to the MSI file to sign. Supports wildcards for latest build detection.

.PARAMETER CertificatePath
    Optional path to a PFX file. If not provided, searches local certificate stores.

.PARAMETER Password
    Optional certificate password. If not provided and PFX is used, prompts securely.

.PARAMETER Thumbprint
    Optional certificate thumbprint to use from certificate store. Skips selection prompt.

.PARAMETER TimestampServer
    Timestamp server URL. Default: http://timestamp.digicert.com

.PARAMETER SkipValidation
    Skip certificate validation checks (expiration, EKU). Not recommended.

.EXAMPLE
    .\sign-local.ps1
    Searches for MSI in default location, prompts for certificate selection.

.EXAMPLE
    .\sign-local.ps1 -MsiPath "installer\bin\Release\*.msi"
    Signs the latest MSI from Release folder with auto-detected certificate.

.EXAMPLE
    .\sign-local.ps1 -CertificatePath "mycert.pfx"
    Signs MSI using specific PFX file, prompts for password.

.EXAMPLE
    .\sign-local.ps1 -Thumbprint "ABC123..." -MsiPath "output.msi"
    Signs specific MSI using certificate from store by thumbprint.
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$MsiPath = "installer\bin\**\*.msi",

    [Parameter()]
    [string]$CertificatePath = "",

    [Parameter()]
    [SecureString]$Password,

    [Parameter()]
    [string]$Thumbprint = "",

    [Parameter()]
    [string]$TimestampServer = "http://timestamp.digicert.com",

    [Parameter()]
    [switch]$SkipValidation
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

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

function Find-MsiFile {
    param([string]$Pattern)
    
    Write-Section "Finding MSI File"
    
    $msiFiles = Get-ChildItem -Path $Pattern -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    
    if (-not $msiFiles) {
        Write-Failure "No MSI files found matching pattern: $Pattern"
        Write-Host "Search locations:"
        Write-Host "  - installer\bin\Debug\"
        Write-Host "  - installer\bin\Release\"
        throw "MSI file not found"
    }
    
    $selectedMsi = $msiFiles[0]
    Write-Success "Found: $($selectedMsi.FullName)"
    Write-Host "  Size: $([math]::Round($selectedMsi.Length / 1MB, 2)) MB"
    Write-Host "  Modified: $($selectedMsi.LastWriteTime)"
    
    return $selectedMsi.FullName
}

function Find-CertificatesInStore {
    Write-Section "Searching Certificate Stores"
    
    $stores = @("CurrentUser\My", "LocalMachine\My")
    $certificates = @()
    
    foreach ($storePath in $stores) {
        $parts = $storePath -split '\\'
        $location = $parts[0]
        $storeName = $parts[1]
        
        try {
            $store = Get-Item "Cert:\$storePath" -ErrorAction SilentlyContinue
            if ($store) {
                $certs = Get-ChildItem "Cert:\$storePath" -CodeSigningCert -ErrorAction SilentlyContinue
                foreach ($cert in $certs) {
                    if ($cert.HasPrivateKey -and $cert.NotAfter -gt (Get-Date)) {
                        $certificates += [PSCustomObject]@{
                            Certificate = $cert
                            Location = $location
                            Store = $storeName
                            Subject = $cert.Subject
                            Issuer = $cert.Issuer
                            Thumbprint = $cert.Thumbprint
                            NotAfter = $cert.NotAfter
                        }
                    }
                }
            }
        }
        catch {
            Write-Verbose "Could not access store: $storePath"
        }
    }
    
    return $certificates
}

function Select-Certificate {
    param([array]$Certificates)
    
    if ($Certificates.Count -eq 0) {
        Write-Failure "No valid code signing certificates found in certificate stores"
        Write-Host "`nTo create a certificate, run: .\scripts\create-certificate.ps1"
        throw "No certificates available"
    }
    
    if ($Certificates.Count -eq 1) {
        $selected = $Certificates[0]
        Write-Success "Using certificate: $($selected.Subject)"
        return $selected.Certificate
    }
    
    Write-Host "`nFound $($Certificates.Count) code signing certificates:`n"
    
    for ($i = 0; $i -lt $Certificates.Count; $i++) {
        $cert = $Certificates[$i]
        Write-Host "[$($i + 1)] $($cert.Subject)"
        Write-Host "     Issuer: $($cert.Issuer)"
        Write-Host "     Thumbprint: $($cert.Thumbprint)"
        Write-Host "     Expires: $($cert.NotAfter.ToString('yyyy-MM-dd'))"
        Write-Host "     Location: $($cert.Location)\$($cert.Store)"
        Write-Host ""
    }
    
    do {
        $selection = Read-Host "Select certificate [1-$($Certificates.Count)]"
        $index = [int]$selection - 1
    } while ($index -lt 0 -or $index -ge $Certificates.Count)
    
    $selected = $Certificates[$index]
    Write-Success "Selected: $($selected.Subject)"
    return $selected.Certificate
}

function Get-SecurePassword {
    param([string]$Prompt = "Enter certificate password")
    
    Write-Host ""
    $securePass = Read-Host -Prompt $Prompt -AsSecureString
    return $securePass
}

function Invoke-Signing {
    param(
        [string]$MsiFile,
        [object]$Certificate,
        [string]$PfxPath = "",
        [SecureString]$CertPassword = $null,
        [string]$Timestamp
    )
    
    Write-Section "Signing MSI"
    
    # Validate certificate unless skipped
    if (-not $SkipValidation) {
        $validateScript = Join-Path $PSScriptRoot "validate-certificate.ps1"
        if (Test-Path $validateScript) {
            Write-Host "Validating certificate..."
            
            if ($PfxPath) {
                & $validateScript -CertificatePath $PfxPath -ErrorAction Stop
            }
            else {
                & $validateScript -Thumbprint $Certificate.Thumbprint -ErrorAction Stop
            }
            
            Write-Success "Certificate validation passed"
        }
    }
    
    # Call sign-msi.ps1
    $signScript = Join-Path $PSScriptRoot "sign-msi.ps1"
    if (-not (Test-Path $signScript)) {
        throw "sign-msi.ps1 not found at: $signScript"
    }
    
    $signArgs = @{
        MsiPath = $MsiFile
        TimestampUrl = $Timestamp
        ErrorAction = "Stop"
    }
    
    if ($PfxPath) {
        $signArgs.PfxPath = $PfxPath
        if ($CertPassword) {
            $signArgs.Password = $CertPassword
        }
    }
    else {
        $signArgs.Thumbprint = $Certificate.Thumbprint
    }
    
    Write-Host "Invoking signing operation..."
    & $signScript @signArgs
}

function Invoke-Verification {
    param([string]$MsiFile)
    
    Write-Section "Verifying Signature"
    
    $verifyScript = Join-Path $PSScriptRoot "verify-signature.ps1"
    if (Test-Path $verifyScript) {
        & $verifyScript -MsiPath $MsiFile -ErrorAction Stop
    }
    else {
        Write-Warning "verify-signature.ps1 not found, skipping verification"
    }
}

# ============================================================================
# Main Script Logic
# ============================================================================

try {
    Write-Host "MarkRead Local MSI Signing Tool" -ForegroundColor Magenta
    Write-Host "================================`n" -ForegroundColor Magenta
    
    # Step 1: Find MSI file
    $msiFile = Find-MsiFile -Pattern $MsiPath
    
    # Step 2: Determine certificate source
    $certificate = $null
    $pfxPath = ""
    $certPassword = $Password
    
    if ($CertificatePath) {
        # Use specified PFX file
        Write-Section "Using PFX Certificate"
        
        if (-not (Test-Path $CertificatePath)) {
            throw "Certificate file not found: $CertificatePath"
        }
        
        $pfxPath = Resolve-Path $CertificatePath
        Write-Success "Certificate: $pfxPath"
        
        if (-not $certPassword) {
            $certPassword = Get-SecurePassword -Prompt "Enter PFX password"
        }
    }
    elseif ($Thumbprint) {
        # Use specified thumbprint
        Write-Section "Using Certificate Store"
        
        $allCerts = Find-CertificatesInStore
        $certificate = ($allCerts | Where-Object { $_.Thumbprint -eq $Thumbprint }).Certificate
        
        if (-not $certificate) {
            throw "Certificate with thumbprint not found: $Thumbprint"
        }
        
        Write-Success "Certificate: $($certificate.Subject)"
    }
    else {
        # Auto-detect and select
        $availableCerts = Find-CertificatesInStore
        $certificate = Select-Certificate -Certificates $availableCerts
    }
    
    # Step 3: Sign the MSI
    if ($pfxPath) {
        Invoke-Signing -MsiFile $msiFile -PfxPath $pfxPath -CertPassword $certPassword -Timestamp $TimestampServer
    }
    else {
        Invoke-Signing -MsiFile $msiFile -Certificate $certificate -Timestamp $TimestampServer
    }
    
    # Step 4: Verify signature
    Invoke-Verification -MsiFile $msiFile
    
    # Step 5: Success summary
    Write-Section "Summary"
    Write-Success "MSI successfully signed: $msiFile"
    Write-Host "`nNext steps:"
    Write-Host "  1. Test the MSI installer"
    Write-Host "  2. Distribute to users (see docs for certificate installation)"
    Write-Host "  3. For CI/CD signing, see: .github/workflows/build-and-sign.yml"
    Write-Host ""
    
    exit 0
}
catch {
    Write-Host ""
    Write-Failure "Signing failed: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "Common solutions:"
    Write-Host "  • No certificate? Run: .\scripts\create-certificate.ps1"
    Write-Host "  • No MSI file? Run: dotnet build markread.sln -c Release"
    Write-Host "  • Wrong password? Check certificate export or use -Password"
    Write-Host "  • Certificate expired? Check expiration with Get-ChildItem Cert:\CurrentUser\My"
    Write-Host ""
    
    exit 1
}
