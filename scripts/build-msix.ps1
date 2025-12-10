<#
.SYNOPSIS
    Build and sign MarkRead MSIX package

.DESCRIPTION
    Builds the MarkRead MAUI app and creates a signed MSIX package.
    Uses self-signed certificate for development/testing or production certificate for release.

.PARAMETER Configuration
    Build configuration (Debug or Release). Default: Release

.PARAMETER Architecture
    Target architecture (x64, x86, arm64). Default: x64

.PARAMETER CertificateThumbprint
    Thumbprint of certificate to use for signing. If not provided, looks for existing dev certificate.

.PARAMETER CreateCertificate
    Create a new self-signed certificate if one doesn't exist

.PARAMETER SkipBuild
    Skip the build step and only sign an existing package

.EXAMPLE
    .\build-msix.ps1
    Build and sign with existing certificate

.EXAMPLE
    .\build-msix.ps1 -CreateCertificate
    Create certificate if needed, then build and sign

.EXAMPLE
    .\build-msix.ps1 -Configuration Debug -Architecture x64
    Build debug version for x64
#>

param(
    [Parameter()]
    [ValidateSet('Debug', 'Release')]
    [string]$Configuration = 'Release',

    [Parameter()]
    [ValidateSet('x64', 'x86', 'arm64')]
    [string]$Architecture = 'x64',

    [Parameter()]
    [string]$CertificateThumbprint,

    [Parameter()]
    [switch]$CreateCertificate,

    [Parameter()]
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$SrcPath = Join-Path $RepoRoot "src"
$ProjectFile = Join-Path $SrcPath "MarkRead.csproj"

Write-Host "MarkRead MSIX Build and Sign Tool" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Error ".NET SDK not found. Please install .NET 10 SDK."
}

$dotnetVersion = dotnet --version
Write-Host "  ✓ .NET SDK: $dotnetVersion" -ForegroundColor Green

# Check/Create Certificate
Write-Host ""
Write-Host "Certificate Management" -ForegroundColor Yellow
Write-Host "---------------------" -ForegroundColor Yellow

$Publisher = "CN=schalken.net"
$cert = $null

if ($CertificateThumbprint) {
    # Use provided certificate
    $cert = Get-ChildItem -Path "Cert:\CurrentUser\My\$CertificateThumbprint" -ErrorAction SilentlyContinue
    if (-not $cert) {
        $cert = Get-ChildItem -Path "Cert:\LocalMachine\My\$CertificateThumbprint" -ErrorAction SilentlyContinue
    }
    
    if (-not $cert) {
        Write-Error "Certificate with thumbprint $CertificateThumbprint not found."
    }
    
    Write-Host "  ✓ Using certificate: $($cert.Subject)" -ForegroundColor Green
    Write-Host "    Thumbprint: $($cert.Thumbprint)" -ForegroundColor Gray
} else {
    # Look for existing certificate
    $cert = Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object { 
        $_.Subject -like "*$Publisher*" -and 
        $_.NotAfter -gt (Get-Date) -and
        $_.HasPrivateKey
    } | Select-Object -First 1

    if ($cert) {
        Write-Host "  ✓ Found existing certificate: $($cert.Subject)" -ForegroundColor Green
        Write-Host "    Thumbprint: $($cert.Thumbprint)" -ForegroundColor Gray
        Write-Host "    Expires: $($cert.NotAfter.ToString('yyyy-MM-dd'))" -ForegroundColor Gray
    } elseif ($CreateCertificate) {
        Write-Host "  Creating new self-signed certificate..." -ForegroundColor Yellow
        
        $certScript = Join-Path $PSScriptRoot "create-certificate.ps1"
        if (-not (Test-Path $certScript)) {
            Write-Error "Certificate creation script not found: $certScript"
        }
        
        & $certScript -SubjectName $Publisher -ValidityYears 2
        
        # Look for the newly created certificate
        $cert = Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object { 
            $_.Subject -eq $Publisher -and 
            $_.NotAfter -gt (Get-Date) -and
            $_.HasPrivateKey
        } | Sort-Object NotBefore -Descending | Select-Object -First 1
        
        if (-not $cert) {
            Write-Error "Failed to create certificate."
        }
        
        Write-Host "  ✓ Certificate created successfully" -ForegroundColor Green
        Write-Host "    Thumbprint: $($cert.Thumbprint)" -ForegroundColor Gray
    } else {
        Write-Host "  ✗ No suitable certificate found." -ForegroundColor Red
        Write-Host ""
        Write-Host "Options:" -ForegroundColor Yellow
        Write-Host "  1. Run with -CreateCertificate to create a new certificate" -ForegroundColor Gray
        Write-Host "  2. Run scripts\create-certificate.ps1 separately" -ForegroundColor Gray
        Write-Host "  3. Provide -CertificateThumbprint parameter" -ForegroundColor Gray
        exit 1
    }
}

$CertificateThumbprint = $cert.Thumbprint

# Build MSIX Package
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "Building MSIX Package" -ForegroundColor Yellow
    Write-Host "--------------------" -ForegroundColor Yellow
    Write-Host "  Configuration: $Configuration" -ForegroundColor Gray
    Write-Host "  Architecture: $Architecture" -ForegroundColor Gray
    Write-Host ""

    $publishArgs = @(
        'publish',
        $ProjectFile,
        '-c', $Configuration,
        '-r', "win-$Architecture",
        '-f', 'net10.0-windows10.0.19041.0',
        '/p:WindowsPackageType=MSIX',
        '/p:WindowsAppSDKSelfContained=true',
        '/p:GenerateAppInstallerFile=false',
        "/p:PackageCertificateThumbprint=$CertificateThumbprint",
        '/p:AppxPackageSigningEnabled=true'
    )

    Write-Host "Running: dotnet $($publishArgs -join ' ')" -ForegroundColor Gray
    Write-Host ""

    & dotnet @publishArgs

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed with exit code $LASTEXITCODE"
    }

    Write-Host ""
    Write-Host "  ✓ Build completed successfully" -ForegroundColor Green
}

# Find the MSIX package
Write-Host ""
Write-Host "Locating MSIX Package" -ForegroundColor Yellow
Write-Host "--------------------" -ForegroundColor Yellow

$msixSearchPath = Join-Path $SrcPath "bin\$Configuration\net10.0-windows10.0.19041.0\win-$Architecture"
$msixFiles = Get-ChildItem -Path $msixSearchPath -Filter "*.msix" -Recurse -ErrorAction SilentlyContinue

if (-not $msixFiles) {
    Write-Error "No MSIX package found in $msixSearchPath"
}

$msixFile = $msixFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Write-Host "  ✓ Found: $($msixFile.Name)" -ForegroundColor Green
Write-Host "    Location: $($msixFile.DirectoryName)" -ForegroundColor Gray
Write-Host "    Size: $([math]::Round($msixFile.Length / 1MB, 2)) MB" -ForegroundColor Gray

# Verify signature
Write-Host ""
Write-Host "Verifying Signature" -ForegroundColor Yellow
Write-Host "------------------" -ForegroundColor Yellow

try {
    $signature = Get-AuthenticodeSignature -FilePath $msixFile.FullName
    
    if ($signature.Status -eq 'Valid') {
        Write-Host "  ✓ Package is properly signed" -ForegroundColor Green
        Write-Host "    Signer: $($signature.SignerCertificate.Subject)" -ForegroundColor Gray
        Write-Host "    Status: $($signature.Status)" -ForegroundColor Gray
    } else {
        Write-Host "  ⚠ Signature status: $($signature.Status)" -ForegroundColor Yellow
        Write-Host "    Note: Self-signed certificates show as 'UnknownError' but still work" -ForegroundColor Gray
    }
} catch {
    Write-Warning "Could not verify signature: $_"
}

# Summary
Write-Host ""
Write-Host "Build Complete! ✓" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green
Write-Host ""
Write-Host "MSIX Package: " -NoNewline
Write-Host $msixFile.FullName -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. To install: Double-click the MSIX file" -ForegroundColor Gray
Write-Host "  2. Trust the certificate if prompted (first install only)" -ForegroundColor Gray
Write-Host "  3. Run from Start Menu or command line: markread" -ForegroundColor Gray
Write-Host ""
Write-Host "Installation Script:" -ForegroundColor Yellow
Write-Host "  .\scripts\install-msix.ps1 -MsixPath `"$($msixFile.FullName)`"" -ForegroundColor Gray
Write-Host ""
