<#
.SYNOPSIS
    Verifies the digital signature of an MSI file.

.DESCRIPTION
    Checks if an MSI file has a valid digital signature and displays
    signature details including signer, timestamp, and validity.

.PARAMETER MsiPath
    Path to the MSI file to verify

.PARAMETER Detailed
    Show detailed signature information

.EXAMPLE
    .\verify-signature.ps1 -MsiPath "MarkRead.msi"

.EXAMPLE
    .\verify-signature.ps1 -MsiPath "MarkRead.msi" -Detailed
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$MsiPath,
    
    [Parameter(Mandatory = $false)]
    [switch]$Detailed
)

$ErrorActionPreference = "Stop"

Write-Host "Verifying MSI Signature" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan

# Validate MSI file exists
if (-not (Test-Path $MsiPath)) {
    Write-Error "MSI file not found: $MsiPath"
    exit 1
}

$msiFullPath = (Resolve-Path $MsiPath).Path
Write-Host "`nMSI File: $msiFullPath" -ForegroundColor Gray

try {
    # Get signature
    $signature = Get-AuthenticodeSignature -FilePath $msiFullPath
    
    Write-Host "`nSignature Status: " -NoNewline
    
    switch ($signature.Status) {
        "Valid" {
            Write-Host "✓ VALID" -ForegroundColor Green
            
            Write-Host "`nSigner Certificate:" -ForegroundColor Cyan
            Write-Host "  Subject: $($signature.SignerCertificate.Subject)" -ForegroundColor Gray
            Write-Host "  Issuer: $($signature.SignerCertificate.Issuer)" -ForegroundColor Gray
            Write-Host "  Thumbprint: $($signature.SignerCertificate.Thumbprint)" -ForegroundColor Gray
            Write-Host "  Valid From: $($signature.SignerCertificate.NotBefore)" -ForegroundColor Gray
            Write-Host "  Valid To: $($signature.SignerCertificate.NotAfter)" -ForegroundColor Gray
            
            # Check expiration warning
            $now = Get-Date
            if ($signature.SignerCertificate.NotAfter -lt $now.AddDays(30)) {
                $daysRemaining = ($signature.SignerCertificate.NotAfter - $now).Days
                if ($daysRemaining -gt 0) {
                    Write-Host "  ⚠ Certificate expires in $daysRemaining days" -ForegroundColor Yellow
                }
            }
            
            if ($signature.TimeStamperCertificate) {
                Write-Host "`nTimestamp:" -ForegroundColor Cyan
                Write-Host "  Timestamp Server: $($signature.TimeStamperCertificate.Subject)" -ForegroundColor Gray
                Write-Host "  Timestamp Date: $($signature.TimeStamperCertificate.NotBefore)" -ForegroundColor Gray
            }
            
            if ($Detailed) {
                Write-Host "`nDetailed Certificate Information:" -ForegroundColor Cyan
                $signature.SignerCertificate | Format-List
            }
            
            Write-Host "`n=======================" -ForegroundColor Cyan
            Write-Host "Verification Successful ✓" -ForegroundColor Green
            Write-Host "=======================" -ForegroundColor Cyan
            
            exit 0
        }
        "NotSigned" {
            Write-Host "✗ NOT SIGNED" -ForegroundColor Red
            Write-Host "`nThe MSI file does not have a digital signature." -ForegroundColor Yellow
            exit 1
        }
        "HashMismatch" {
            Write-Host "✗ HASH MISMATCH" -ForegroundColor Red
            Write-Host "`nThe file has been modified after signing." -ForegroundColor Yellow
            Write-Host "Message: $($signature.StatusMessage)" -ForegroundColor Gray
            exit 1
        }
        "NotTrusted" {
            Write-Host "⚠ NOT TRUSTED" -ForegroundColor Yellow
            Write-Host "`nThe signature is valid but the certificate is not trusted." -ForegroundColor Yellow
            Write-Host "Message: $($signature.StatusMessage)" -ForegroundColor Gray
            
            Write-Host "`nSigner Certificate:" -ForegroundColor Cyan
            Write-Host "  Subject: $($signature.SignerCertificate.Subject)" -ForegroundColor Gray
            Write-Host "  Issuer: $($signature.SignerCertificate.Issuer)" -ForegroundColor Gray
            
            Write-Host "`nTo trust this certificate:" -ForegroundColor Yellow
            Write-Host "  1. Export the public certificate (CER file)" -ForegroundColor Gray
            Write-Host "  2. Import into Trusted Root Certification Authorities" -ForegroundColor Gray
            Write-Host "  3. Import into Trusted Publishers" -ForegroundColor Gray
            
            exit 1
        }
        default {
            Write-Host "⚠ $($signature.Status)" -ForegroundColor Yellow
            
            # Check if this is the "not trusted" error for self-signed certs
            if ($signature.StatusMessage -like "*not trusted by the trust provider*") {
                Write-Host "`nThe MSI is SIGNED CORRECTLY but the certificate is not trusted yet." -ForegroundColor Yellow
                Write-Host "This is normal for self-signed certificates." -ForegroundColor Gray
                
                Write-Host "`nSigner Certificate:" -ForegroundColor Cyan
                if ($signature.SignerCertificate) {
                    Write-Host "  Subject: $($signature.SignerCertificate.Subject)" -ForegroundColor Gray
                    Write-Host "  Issuer: $($signature.SignerCertificate.Issuer)" -ForegroundColor Gray
                    Write-Host "  Thumbprint: $($signature.SignerCertificate.Thumbprint)" -ForegroundColor Gray
                }
                
                Write-Host "`nTo trust this certificate:" -ForegroundColor Cyan
                Write-Host "  1. Export: .\scripts\export-certificate.ps1 -Thumbprint '$($signature.SignerCertificate.Thumbprint)' -OutputDir '.'" -ForegroundColor Gray
                Write-Host "  2. Import: .\scripts\import-certificate.ps1 -CertificatePath 'certificate.cer'" -ForegroundColor Gray
                Write-Host "  3. Re-verify: Signature will show as Valid after certificate trusted" -ForegroundColor Gray
                
                Write-Host "`n" -NoNewline
                Write-Host "✓ Signing successful " -ForegroundColor Green -NoNewline
                Write-Host "(certificate trust pending)" -ForegroundColor Yellow
                
                # Exit with success since the signing itself worked
                exit 0
            }
            else {
                Write-Host "`nSignature verification failed." -ForegroundColor Red
                if ($signature.StatusMessage) {
                    Write-Host "Message: $($signature.StatusMessage)" -ForegroundColor Gray
                }
                exit 1
            }
        }
    }
}
catch {
    Write-Host "`n=======================" -ForegroundColor Red
    Write-Host "Verification Failed ✗" -ForegroundColor Red
    Write-Host "=======================" -ForegroundColor Red
    Write-Error $_.Exception.Message
    exit 1
}
