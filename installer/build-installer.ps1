# Build MarkRead MSIX Package
# This script builds both the application and creates the MSIX package

param(
    [Parameter(Mandatory=$false)]
    [string]$Version = "1.0.0.0",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("Release", "Debug")]
    [string]$Configuration = "Release",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("x64", "x86")]
    [string]$Platform = "x64"
)

$ErrorActionPreference = "Stop"

# Paths
$rootDir = Split-Path -Parent $PSScriptRoot
$waprojPath = Join-Path $PSScriptRoot "MarkRead.Package.wapproj"
$imagesDir = Join-Path $PSScriptRoot "Images"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Building MarkRead MSIX Package" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Version: $Version" -ForegroundColor Yellow
Write-Host "Configuration: $Configuration" -ForegroundColor Yellow
Write-Host "Platform: $Platform" -ForegroundColor Yellow
Write-Host ""

# Step 1: Check for images
Write-Host "[1/5] Checking for package images..." -ForegroundColor Green
$requiredImages = @("Square44x44Logo.png", "Square150x150Logo.png", "Wide310x150Logo.png", "StoreLogo.png", "SplashScreen.png")
$missingImages = $requiredImages | Where-Object { -not (Test-Path (Join-Path $imagesDir $_)) }

if ($missingImages.Count -gt 0) {
    Write-Host "Missing images: $($missingImages -join ', ')" -ForegroundColor Yellow
    Write-Host "Generating placeholder images..." -ForegroundColor Yellow
    & (Join-Path $imagesDir "generate-placeholder-images.ps1")
}

# Step 2: Update version in manifest
Write-Host "[2/5] Updating package manifest version..." -ForegroundColor Green
$manifestPath = Join-Path $PSScriptRoot "Package.appxmanifest"
[xml]$manifest = Get-Content $manifestPath
$manifest.Package.Identity.Version = $Version
$manifest.Save($manifestPath)

# Step 3: Find MSBuild
Write-Host "[3/5] Locating MSBuild..." -ForegroundColor Green
$msbuild = & "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" `
    -latest -requires Microsoft.Component.MSBuild -find MSBuild\**\Bin\MSBuild.exe `
    -prerelease | Select-Object -First 1

if (-not $msbuild) {
    Write-Error "MSBuild not found. Please install Visual Studio 2019 or later with .NET desktop development workload."
    exit 1
}

Write-Host "Using MSBuild: $msbuild" -ForegroundColor Gray

# Step 4: Restore the packaging project
Write-Host "[4/5] Restoring packaging project..." -ForegroundColor Green
& $msbuild $waprojPath /t:Restore /p:Configuration=$Configuration /p:Platform=$Platform

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to restore packaging project"
    exit 1
}

# Step 5: Build the MSIX package
Write-Host "[5/5] Building MSIX package..." -ForegroundColor Green
$appxPackageDir = Join-Path $rootDir "AppPackages"
& $msbuild $waprojPath `
    /p:Configuration=$Configuration `
    /p:Platform=$Platform `
    /p:AppxPackageDir=$appxPackageDir `
    /p:AppxBundle=Never `
    /p:UapAppxPackageBuildMode=SideloadOnly `
    /p:AppxPackageSigningEnabled=false

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build MSIX package"
    exit 1
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Build Completed Successfully!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Package Location: $appxPackageDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: The MSIX package is unsigned. For testing:" -ForegroundColor White
Write-Host "1. Enable Developer Mode in Windows Settings" -ForegroundColor White
Write-Host "2. Right-click the .msix file and select 'Install'" -ForegroundColor White
Write-Host ""
Write-Host "For production, you'll need to sign the package with a certificate." -ForegroundColor Yellow
