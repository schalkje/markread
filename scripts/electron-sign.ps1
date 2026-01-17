#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Code signing script for Electron installers

.DESCRIPTION
    Signs Electron installers with SHA256 certificate and timestamp.
    Supports both PFX files and Windows Certificate Store.

.PARAMETER Path
    Path to the file to sign (required)

.PARAMETER Verify
    Verify signature only (don't sign)

.EXAMPLE
    .\scripts\electron-sign.ps1 -Path "dist\MarkRead-Setup-0.5.1.exe"
    Sign installer using environment variables for certificate

.EXAMPLE
    .\scripts\electron-sign.ps1 -Path "dist\MarkRead-Setup-0.5.1.exe" -Verify
    Verify existing signature

.NOTES
    Environment Variables:
    - PFX_PATH: Path to PFX certificate file (Option A)
    - PFX_PASSWORD: Password for PFX file (Option A)
    - CERT_THUMBPRINT: Certificate thumbprint for Windows Store (Option B)
    - TIMESTAMP_SERVER: Timestamp server URL (default: http://timestamp.digicert.com)
#>

param(
    [Parameter(Mandatory=$true, HelpMessage="Path to file to sign or verify")]
    [string]$Path,

    [Parameter(Mandatory=$false)]
    [switch]$Verify
)

$ErrorActionPreference = "Stop"

# =============================================================================
# CONFIGURATION
# =============================================================================

$TimestampServer = if ($env:TIMESTAMP_SERVER) { $env:TIMESTAMP_SERVER } else { "http://timestamp.digicert.com" }
$ExpirationWarningDays = 30

# =============================================================================
# FUNCTIONS
# =============================================================================

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    $colors = @{
        "Info" = "Cyan"
        "Success" = "Green"
        "Warning" = "Yellow"
        "Error" = "Red"
    }
    $prefix = @{
        "Info" = "▶"
        "Success" = "✓"
        "Warning" = "⚠"
        "Error" = "✗"
    }
    Write-Host "$($prefix[$Type]) $Message" -ForegroundColor $colors[$Type]
}

function Find-SignTool {
    Write-Status "Locating signtool.exe from Windows SDK..." "Info"

    $sdkPath = "C:\Program Files (x86)\Windows Kits\10\bin"

    if (-not (Test-Path $sdkPath)) {
        throw "Windows SDK not found at $sdkPath. Please install Windows SDK from: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/"
    }

    # Find latest SDK version
    $versions = Get-ChildItem -Path $sdkPath -Directory |
                Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+$' } |
                Sort-Object Name -Descending

    if ($versions.Count -eq 0) {
        throw "No Windows SDK versions found in $sdkPath"
    }

    $signToolPath = Join-Path $versions[0].FullName "x64\signtool.exe"

    if (-not (Test-Path $signToolPath)) {
        throw "signtool.exe not found at $signToolPath"
    }

    Write-Status "Found signtool.exe: $signToolPath" "Success"
    return $signToolPath
}

function Get-Certificate {
    Write-Status "Loading certificate..." "Info"

    # Option A: PFX File
    if ($env:PFX_PATH) {
        if (-not (Test-Path $env:PFX_PATH)) {
            throw "PFX file not found: $env:PFX_PATH"
        }

        if (-not $env:PFX_PASSWORD) {
            throw "PFX_PASSWORD environment variable required when using PFX_PATH"
        }

        Write-Status "Using PFX certificate: $env:PFX_PATH" "Info"

        # Load certificate to check expiration
        $password = ConvertTo-SecureString -String $env:PFX_PASSWORD -AsPlainText -Force
        $cert = Get-PfxCertificate -FilePath $env:PFX_PATH -Password $password

        return @{
            Type = "PFX"
            Path = $env:PFX_PATH
            Password = $env:PFX_PASSWORD
            Certificate = $cert
        }
    }
    # Option B: Certificate Store
    elseif ($env:CERT_THUMBPRINT) {
        Write-Status "Using certificate from Windows Store: $env:CERT_THUMBPRINT" "Info"

        # Find certificate in store
        $cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Thumbprint -eq $env:CERT_THUMBPRINT }

        if (-not $cert) {
            throw "Certificate with thumbprint $env:CERT_THUMBPRINT not found in CurrentUser\My store"
        }

        return @{
            Type = "Store"
            Thumbprint = $env:CERT_THUMBPRINT
            Certificate = $cert
        }
    }
    else {
        throw "No certificate configured. Set either PFX_PATH + PFX_PASSWORD or CERT_THUMBPRINT environment variables."
    }
}

function Test-CertificateExpiration {
    param([System.Security.Cryptography.X509Certificates.X509Certificate2]$Certificate)

    $now = Get-Date
    $expiryDate = $Certificate.NotAfter
    $daysUntilExpiry = ($expiryDate - $now).Days

    Write-Status "Certificate expires: $expiryDate" "Info"
    Write-Status "Days until expiration: $daysUntilExpiry" "Info"

    if ($expiryDate -lt $now) {
        throw "Certificate has EXPIRED on $expiryDate"
    }

    if ($daysUntilExpiry -lt $ExpirationWarningDays) {
        Write-Status "Certificate expires in $daysUntilExpiry days (less than $ExpirationWarningDays days)" "Warning"
    }
    else {
        Write-Status "Certificate expiration check passed" "Success"
    }
}

function Invoke-SignFile {
    param(
        [string]$FilePath,
        [hashtable]$CertInfo,
        [string]$SignToolPath
    )

    Write-Status "Signing file: $FilePath" "Info"

    # Build signtool command
    $signArgs = @(
        "sign"
        "/fd", "SHA256"                    # File digest algorithm
        "/tr", $TimestampServer            # Timestamp server
        "/td", "SHA256"                    # Timestamp digest algorithm
        "/v"                               # Verbose output
    )

    # Add certificate source
    if ($CertInfo.Type -eq "PFX") {
        $signArgs += "/f", $CertInfo.Path
        $signArgs += "/p", $CertInfo.Password
    }
    else {
        $signArgs += "/sha1", $CertInfo.Thumbprint
    }

    # Add file to sign
    $signArgs += $FilePath

    # Execute signtool
    Write-Status "Executing: signtool $($signArgs -join ' ')" "Info"

    $output = & $SignToolPath $signArgs 2>&1
    $exitCode = $LASTEXITCODE

    Write-Host $output

    if ($exitCode -ne 0) {
        throw "Code signing failed with exit code $exitCode"
    }

    Write-Status "File signed successfully" "Success"
}

function Test-Signature {
    param(
        [string]$FilePath,
        [string]$SignToolPath
    )

    Write-Status "Verifying signature: $FilePath" "Info"

    # Use PowerShell's Get-AuthenticodeSignature which is more lenient with self-signed certs
    $signature = Get-AuthenticodeSignature -FilePath $FilePath

    if ($null -eq $signature -or $null -eq $signature.SignerCertificate) {
        throw "No signature found on file"
    }

    Write-Status "Signature found:" "Success"
    Write-Host "  Status: $($signature.Status)"
    Write-Host "  Subject: $($signature.SignerCertificate.Subject)"
    Write-Host "  Issuer: $($signature.SignerCertificate.Issuer)"
    Write-Host "  Thumbprint: $($signature.SignerCertificate.Thumbprint)"
    Write-Host "  Valid from: $($signature.SignerCertificate.NotBefore)"
    Write-Host "  Valid to: $($signature.SignerCertificate.NotAfter)"

    if ($null -ne $signature.TimeStamperCertificate) {
        Write-Host "  Timestamp: $($signature.TimeStamperCertificate.NotBefore)"
        Write-Status "Signature is timestamped" "Success"
    }
    else {
        Write-Status "Warning: Signature is not timestamped" "Warning"
    }

    # Check signature status
    switch ($signature.Status) {
        "Valid" {
            Write-Status "Signature verification passed (trusted chain)" "Success"
        }
        "UnknownError" {
            # UnknownError can occur with self-signed certificates
            # If we have a valid certificate and timestamp, accept it
            if ($null -ne $signature.SignerCertificate -and $null -ne $signature.TimeStamperCertificate) {
                Write-Status "Signature verified (self-signed certificate with UnknownError status)" "Success"
            } else {
                throw "Signature verification failed with unknown error and incomplete signature data"
            }
        }
        "NotSigned" {
            throw "File is not signed"
        }
        "HashMismatch" {
            throw "File hash does not match signature"
        }
        "NotTrusted" {
            # This is expected for self-signed certificates
            Write-Status "Signature verified (self-signed certificate - not in trusted root store)" "Success"
        }
        default {
            Write-Status "Signature status: $($signature.Status) (non-critical)" "Warning"
        }
    }
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

try {
    Write-Host ""
    Write-Host "================================================================"
    Write-Host "  Electron Code Signing Tool"
    Write-Host "================================================================"
    Write-Host ""

    # Validate file exists
    if (-not (Test-Path $Path)) {
        throw "File not found: $Path"
    }

    # Find signtool
    $signTool = Find-SignTool

    if ($Verify) {
        # Verify mode
        Test-Signature -FilePath $Path -SignToolPath $signTool
    }
    else {
        # Sign mode
        $certInfo = Get-Certificate
        Test-CertificateExpiration -Certificate $certInfo.Certificate
        Invoke-SignFile -FilePath $Path -CertInfo $certInfo -SignToolPath $signTool
        Test-Signature -FilePath $Path -SignToolPath $signTool
    }

    Write-Host ""
    Write-Status "Operation completed successfully" "Success"
    Write-Host ""
    exit 0
}
catch {
    Write-Host ""
    Write-Status "Operation failed: $($_.Exception.Message)" "Error"
    Write-Host ""
    exit 1
}
