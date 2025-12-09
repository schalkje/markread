<#
.SYNOPSIS
    Creates a self-signed code signing certificate for MSI signing.

.DESCRIPTION
    Generates a self-signed certificate with code signing extended key usage,
    suitable for signing MSI installers. Certificate is created in the local
    machine certificate store and can be exported to PFX format.

.PARAMETER SubjectName
    The subject name for the certificate (e.g., "CN=YourName" or "CN=Your Company")

.PARAMETER ValidityYears
    Number of years the certificate should be valid (default: 2)

.PARAMETER Password
    Password to protect the private key when exporting to PFX

.PARAMETER ExportPath
    Path where to export the PFX file (optional)

.EXAMPLE
    .\create-certificate.ps1 -SubjectName "CN=MarkRead Developer" -Password "MySecurePassword123"

.EXAMPLE
    .\create-certificate.ps1 -SubjectName "CN=MarkRead Developer" -ValidityYears 3 -Password "MySecurePassword123" -ExportPath "C:\Certs\markread-cert.pfx"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$SubjectName,
    
    [Parameter(Mandatory = $false)]
    [int]$ValidityYears = 2,
    
    [Parameter(Mandatory = $false)]
    [string]$Password,
    
    [Parameter(Mandatory = $false)]
    [string]$ExportPath
)

$ErrorActionPreference = "Stop"

Write-Host "Creating self-signed code signing certificate..." -ForegroundColor Cyan

try {
    # Ensure subject name starts with CN=
    if (-not $SubjectName.StartsWith("CN=")) {
        $SubjectName = "CN=$SubjectName"
    }

    # Calculate expiration date
    $expirationDate = (Get-Date).AddYears($ValidityYears)

    # Create certificate in local machine store
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject $SubjectName `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -Provider "Microsoft Enhanced RSA and AES Cryptographic Provider" `
        -KeyExportPolicy Exportable `
        -KeyUsage DigitalSignature `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -NotAfter $expirationDate `
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3")  # Code Signing EKU

    Write-Host "✓ Certificate created successfully" -ForegroundColor Green
    Write-Host "  Subject: $($cert.Subject)" -ForegroundColor Gray
    Write-Host "  Thumbprint: $($cert.Thumbprint)" -ForegroundColor Gray
    Write-Host "  Valid From: $($cert.NotBefore)" -ForegroundColor Gray
    Write-Host "  Valid To: $($cert.NotAfter)" -ForegroundColor Gray
    Write-Host "  Store Location: Cert:\CurrentUser\My\$($cert.Thumbprint)" -ForegroundColor Gray

    # Export to PFX if path provided
    if ($ExportPath -and $Password) {
        Write-Host "`nExporting certificate to PFX..." -ForegroundColor Cyan
        
        $securePassword = ConvertTo-SecureString -String $Password -Force -AsPlainText
        $exportDir = Split-Path -Parent $ExportPath
        
        if ($exportDir -and -not (Test-Path $exportDir)) {
            New-Item -ItemType Directory -Path $exportDir -Force | Out-Null
        }

        Export-PfxCertificate `
            -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" `
            -FilePath $ExportPath `
            -Password $securePassword `
            -Force | Out-Null

        Write-Host "✓ Certificate exported to: $ExportPath" -ForegroundColor Green
    }
    elseif ($ExportPath -and -not $Password) {
        Write-Warning "Password required for PFX export. Certificate created but not exported."
    }

    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Use export-certificate.ps1 to export to PFX and CER formats" -ForegroundColor Gray
    Write-Host "2. Add the PFX file and password to GitHub Secrets" -ForegroundColor Gray
    Write-Host "3. Distribute the public CER file to users" -ForegroundColor Gray

    # Return certificate object
    return $cert
}
catch {
    Write-Error "Failed to create certificate: $_"
    exit 1
}
