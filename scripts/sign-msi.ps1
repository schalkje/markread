<#
.SYNOPSIS
    Signs an MSI installer with a code signing certificate.

.DESCRIPTION
    Uses signtool.exe to sign an MSI file with a code signing certificate.
    Supports both certificate store and PFX file sources.
    Includes validation, expiration checks, and diagnostic logging.

.PARAMETER MsiPath
    Path to the MSI file to sign

.PARAMETER PfxPath
    Path to the PFX file containing the certificate

.PARAMETER Password
    Password for the PFX file

.PARAMETER Thumbprint
    Thumbprint of certificate in the certificate store (alternative to PFX)

.PARAMETER TimestampUrl
    URL of timestamp server (default: http://timestamp.digicert.com)

.PARAMETER Description
    Description to include in the signature

.EXAMPLE
    .\sign-msi.ps1 -MsiPath "MarkRead.msi" -PfxPath "cert.pfx" -Password "MyPassword"

.EXAMPLE
    .\sign-msi.ps1 -MsiPath "MarkRead.msi" -Thumbprint "ABC123..." -Description "MarkRead Installer"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$MsiPath,
    
    [Parameter(Mandatory = $false)]
    [string]$PfxPath,
    
    [Parameter(Mandatory = $false)]
    [string]$Password,
    
    [Parameter(Mandatory = $false)]
    [string]$Thumbprint,
    
    [Parameter(Mandatory = $false)]
    [string]$TimestampUrl = "http://timestamp.digicert.com",
    
    [Parameter(Mandatory = $false)]
    [string]$Description = "MarkRead Installer"
)

$ErrorActionPreference = "Stop"

Write-Host "MSI Signing Process Started" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Validate inputs
if (-not $PfxPath -and -not $Thumbprint) {
    Write-Error "Either -PfxPath or -Thumbprint must be specified"
    exit 1
}

if ($PfxPath -and -not $Password) {
    Write-Error "Password required when using PfxPath"
    exit 1
}

# Validate MSI file exists
if (-not (Test-Path $MsiPath)) {
    Write-Error "MSI file not found: $MsiPath"
    exit 1
}

$msiFullPath = (Resolve-Path $MsiPath).Path
Write-Host "`nMSI File: $msiFullPath" -ForegroundColor Gray

try {
    # Step 1: Validate certificate
    Write-Host "`n[1/4] Validating certificate..." -ForegroundColor Cyan
    
    if ($PfxPath) {
        # Validate PFX file
        if (-not (Test-Path $PfxPath)) {
            throw "PFX file not found: $PfxPath"
        }
        
        Write-Host "  Loading certificate from PFX: $PfxPath" -ForegroundColor Gray
        
        $securePassword = ConvertTo-SecureString -String $Password -Force -AsPlainText
        $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($PfxPath, $securePassword)
        
        Write-Host "  Subject: $($cert.Subject)" -ForegroundColor Gray
        Write-Host "  Valid To: $($cert.NotAfter)" -ForegroundColor Gray
        
        # Check expiration
        $now = Get-Date
        if ($cert.NotAfter -lt $now) {
            throw "Certificate expired on $($cert.NotAfter)"
        }
        
        if ($cert.NotAfter -lt $now.AddDays(30)) {
            $daysRemaining = ($cert.NotAfter - $now).Days
            Write-Warning "Certificate expires in $daysRemaining days (on $($cert.NotAfter))"
        }
        
        # Verify private key
        if (-not $cert.HasPrivateKey) {
            throw "Certificate does not have a private key"
        }
        
        Write-Host "  ✓ Certificate is valid" -ForegroundColor Green
    }
    else {
        # Validate certificate from store
        Write-Host "  Looking for certificate with thumbprint: $Thumbprint" -ForegroundColor Gray
        
        $cert = Get-ChildItem -Path "Cert:\CurrentUser\My\$Thumbprint" -ErrorAction SilentlyContinue
        if (-not $cert) {
            $cert = Get-ChildItem -Path "Cert:\LocalMachine\My\$Thumbprint" -ErrorAction SilentlyContinue
        }
        
        if (-not $cert) {
            throw "Certificate with thumbprint '$Thumbprint' not found"
        }
        
        Write-Host "  Subject: $($cert.Subject)" -ForegroundColor Gray
        Write-Host "  Valid To: $($cert.NotAfter)" -ForegroundColor Gray
        
        # Check expiration
        $now = Get-Date
        if ($cert.NotAfter -lt $now) {
            throw "Certificate expired on $($cert.NotAfter)"
        }
        
        if (-not $cert.HasPrivateKey) {
            throw "Certificate does not have a private key"
        }
        
        Write-Host "  ✓ Certificate is valid" -ForegroundColor Green
    }

    # Step 2: Locate signtool.exe
    Write-Host "`n[2/4] Locating signtool.exe..." -ForegroundColor Cyan
    
    $signtoolPaths = @(
        "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe",
        "C:\Program Files (x86)\Windows Kits\10\App Certification Kit\signtool.exe",
        "C:\Program Files\Microsoft SDKs\Windows\*\bin\signtool.exe"
    )
    
    $signtool = $null
    foreach ($pattern in $signtoolPaths) {
        $found = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | 
                 Sort-Object -Property FullName -Descending | 
                 Select-Object -First 1
        
        if ($found) {
            $signtool = $found.FullName
            break
        }
    }
    
    if (-not $signtool) {
        throw "signtool.exe not found. Please install Windows SDK."
    }
    
    Write-Host "  Found: $signtool" -ForegroundColor Gray

    # Step 3: Sign the MSI
    Write-Host "`n[3/4] Signing MSI..." -ForegroundColor Cyan
    
    $signArgs = @(
        "sign",
        "/fd", "SHA256",
        "/tr", $TimestampUrl,
        "/td", "SHA256",
        "/d", $Description
    )
    
    if ($PfxPath) {
        $signArgs += @("/f", $PfxPath, "/p", $Password)
    }
    else {
        $signArgs += @("/sha1", $Thumbprint)
    }
    
    $signArgs += $msiFullPath
    
    Write-Host "  Executing signtool..." -ForegroundColor Gray
    
    # Execute signtool (hide password in output)
    $signArgsDisplay = $signArgs -replace $Password, "****"
    Write-Host "  Command: signtool $($signArgsDisplay -join ' ')" -ForegroundColor DarkGray
    
    $output = & $signtool $signArgs 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -ne 0) {
        Write-Host "`nSigntool output:" -Fforeground Color Yellow
        $output | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        throw "Signing failed with exit code $exitCode"
    }
    
    Write-Host "  ✓ MSI signed successfully" -ForegroundColor Green

    # Step 4: Verify signature
    Write-Host "`n[4/4] Verifying signature..." -ForegroundColor Cyan
    
    $verifyArgs = @("verify", "/pa", "/v", $msiFullPath)
    $verifyOutput = & $signtool $verifyArgs 2>&1
    $verifyExitCode = $LASTEXITCODE
    
    if ($verifyExitCode -ne 0) {
        Write-Warning "Signature verification returned warnings/errors:"
        $verifyOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    }
    else {
        Write-Host "  ✓ Signature verified successfully" -ForegroundColor Green
    }
    
    # Display signature details
    $signature = Get-AuthenticodeSignature -FilePath $msiFullPath
    
    if ($signature.Status -eq "Valid") {
        Write-Host "`nSignature Details:" -ForegroundColor Cyan
        Write-Host "  Status: $($signature.Status)" -ForegroundColor Green
        Write-Host "  Signer: $($signature.SignerCertificate.Subject)" -ForegroundColor Gray
        Write-Host "  Timestamp: $($signature.TimeStamperCertificate.NotBefore)" -ForegroundColor Gray
        Write-Host "  Valid Until: $($signature.SignerCertificate.NotAfter)" -ForegroundColor Gray
    }
    else {
        Write-Warning "Signature status: $($signature.Status)"
        if ($signature.StatusMessage) {
            Write-Warning "Message: $($signature.StatusMessage)"
        }
    }
    
    Write-Host "`n=============================" -ForegroundColor Cyan
    Write-Host "MSI Signing Complete ✓" -ForegroundColor Green
    Write-Host "=============================" -ForegroundColor Cyan
    
    exit 0
}
catch {
    Write-Host "`n=============================" -ForegroundColor Red
    Write-Host "MSI Signing Failed ✗" -ForegroundColor Red
    Write-Host "=============================" -ForegroundColor Red
    Write-Error $_.Exception.Message
    
    # Provide diagnostic info without exposing secrets
    Write-Host "`nDiagnostic Information:" -ForegroundColor Yellow
    Write-Host "  MSI Path: $msiFullPath" -ForegroundColor Gray
    
    if ($PfxPath) {
        Write-Host "  PFX Path: $PfxPath" -ForegroundColor Gray
        Write-Host "  Password: [REDACTED]" -ForegroundColor Gray
    }
    
    if ($Thumbprint) {
        Write-Host "  Thumbprint: $Thumbprint" -ForegroundColor Gray
    }
    
    Write-Host "  Timestamp URL: $TimestampUrl" -ForegroundColor Gray
    
    exit 1
}
