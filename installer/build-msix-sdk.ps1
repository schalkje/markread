# Build MarkRead MSIX Package using Windows SDK (no Visual Studio workload required)
# This script uses makeappx.exe and signtool.exe from the Windows SDK

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
$appProjectPath = Join-Path $rootDir "src\App\MarkRead.App.csproj"
$manifestPath = Join-Path $PSScriptRoot "Package.appxmanifest"
$imagesDir = Join-Path $PSScriptRoot "Images"
$outputDir = Join-Path $rootDir "AppPackages\MarkRead_${Version}_${Platform}_${Configuration}"
$packagingDir = Join-Path $outputDir "PackageRoot"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Building MarkRead MSIX Package" -ForegroundColor Cyan
Write-Host "(Using Windows SDK method)" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Version: $Version" -ForegroundColor Yellow
Write-Host "Configuration: $Configuration" -ForegroundColor Yellow
Write-Host "Platform: $Platform" -ForegroundColor Yellow
Write-Host ""

# Step 1: Find Windows SDK tools
Write-Host "[1/7] Locating Windows SDK tools..." -ForegroundColor Green

# Check common Windows SDK installation paths
$sdkBasePaths = @(
    "C:\Program Files (x86)\Windows Kits\10\bin",
    "C:\Program Files\Windows Kits\10\bin"
)

$sdkPath = $null
foreach ($basePath in $sdkBasePaths) {
    if (Test-Path $basePath) {
        $sdkPath = Get-ChildItem -Path $basePath -Directory | 
            Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+$' } |
            Sort-Object Name -Descending | 
            Select-Object -First 1
        if ($sdkPath) {
            break
        }
    }
}

if (-not $sdkPath) {
    Write-Host ""
    Write-Host "ERROR: Windows SDK not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "The Windows SDK is required to build MSIX packages." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Installation options:" -ForegroundColor Cyan
    Write-Host "  1. Via winget (recommended):" -ForegroundColor White
    Write-Host "     winget install Microsoft.WindowsSDK.10.0.22621" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Via Visual Studio Installer:" -ForegroundColor White
    Write-Host "     - Open Visual Studio Installer" -ForegroundColor Gray
    Write-Host "     - Modify your installation" -ForegroundColor Gray
    Write-Host "     - Individual Components > SDKs, libraries, and frameworks" -ForegroundColor Gray
    Write-Host "     - Check 'Windows 10 SDK (10.0.19041.0 or later)'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Standalone installer:" -ForegroundColor White
    Write-Host "     https://developer.microsoft.com/windows/downloads/windows-sdk/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Alternative: Use the WAP project method (requires VS with UWP workload)" -ForegroundColor Yellow
    Write-Host "  .\build-installer.ps1" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

$makeappx = Join-Path $sdkPath.FullName "$Platform\makeappx.exe"
$signtool = Join-Path $sdkPath.FullName "$Platform\signtool.exe"

if (-not (Test-Path $makeappx)) {
    Write-Error "makeappx.exe not found at: $makeappx`nPlease install the complete Windows SDK with all components."
    exit 1
}

Write-Host "Using SDK: $($sdkPath.Name)" -ForegroundColor Gray
Write-Host "MakeAppx: $makeappx" -ForegroundColor Gray

# Step 2: Check for images
Write-Host "[2/7] Checking for package images..." -ForegroundColor Green
$requiredImages = @("Square44x44Logo.png", "Square150x150Logo.png", "Wide310x150Logo.png", "StoreLogo.png", "SplashScreen.png")
$missingImages = $requiredImages | Where-Object { -not (Test-Path (Join-Path $imagesDir $_)) }

if ($missingImages.Count -gt 0) {
    Write-Host "Missing images: $($missingImages -join ', ')" -ForegroundColor Yellow
    Write-Host "Generating placeholder images..." -ForegroundColor Yellow
    & (Join-Path $imagesDir "generate-placeholder-images.ps1")
}

# Step 3: Build the WPF application
Write-Host "[3/7] Building WPF application..." -ForegroundColor Green
$publishDir = Join-Path $rootDir "src\App\bin\${Configuration}\net8.0-windows\publish"

dotnet publish $appProjectPath `
    -c $Configuration `
    -r "win-$Platform" `
    --self-contained false `
    -o $publishDir

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build WPF application"
    exit 1
}

# Step 4: Create packaging directory structure
Write-Host "[4/7] Creating package directory structure..." -ForegroundColor Green

if (Test-Path $outputDir) {
    Remove-Item $outputDir -Recurse -Force
}

New-Item -ItemType Directory -Path $packagingDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packagingDir "Images") -Force | Out-Null

# Copy application files
Copy-Item -Path "$publishDir\*" -Destination $packagingDir -Recurse -Force

# Copy images
Copy-Item -Path "$imagesDir\*.png" -Destination (Join-Path $packagingDir "Images") -Force

# Copy and update manifest
$manifestContent = Get-Content $manifestPath -Raw

# Replace MSBuild tokens with actual values
$manifestContent = $manifestContent -replace '\$targetnametoken\$', "MarkRead.App"
$manifestContent = $manifestContent -replace '\$targetentrypoint\$', "Windows.FullTrustApplication"

# Replace version in Identity element only (not XML declaration)
$manifestContent = $manifestContent -replace '<Identity([^>]*?)Version="[^"]*"', "<Identity`$1Version=`"$Version`""

# Save as AppxManifest.xml (makeappx expects this exact name)
$manifestContent | Set-Content (Join-Path $packagingDir "AppxManifest.xml") -Encoding UTF8 -Force

Write-Host "Packaging directory: $packagingDir" -ForegroundColor Gray

# Step 5: Create MSIX package
Write-Host "[5/7] Creating MSIX package..." -ForegroundColor Green
$msixPath = Join-Path $outputDir "MarkRead_${Version}_${Platform}.msix"

& $makeappx pack /d $packagingDir /p $msixPath /o

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create MSIX package"
    exit 1
}

Write-Host "Package created: $msixPath" -ForegroundColor Gray

# Step 6: Optional - Sign the package (if certificate is available)
Write-Host "[6/7] Checking for signing certificate..." -ForegroundColor Green
$certPath = Join-Path $PSScriptRoot "MarkRead_TemporaryKey.pfx"

if (Test-Path $certPath) {
    Write-Host "Signing package..." -ForegroundColor Yellow
    & $signtool sign /fd SHA256 /f $certPath /p "" $msixPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Package signed successfully" -ForegroundColor Green
    } else {
        Write-Warning "Failed to sign package. It can still be installed in Developer Mode."
    }
} else {
    Write-Host "No certificate found - package is unsigned" -ForegroundColor Yellow
}

# Step 7: Calculate file size
Write-Host "[7/7] Package information..." -ForegroundColor Green
$fileSize = (Get-Item $msixPath).Length / 1MB
Write-Host "Package size: $($fileSize.ToString('N2')) MB" -ForegroundColor Gray

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Build Completed Successfully!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Package: $msixPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "To install the unsigned package:" -ForegroundColor White
Write-Host "1. Enable Developer Mode in Windows Settings" -ForegroundColor White
Write-Host "2. Right-click the .msix file and select 'Install'" -ForegroundColor White
Write-Host ""

# Create a summary file
$summaryPath = Join-Path $outputDir "build-summary.txt"
@"
MarkRead MSIX Package Build Summary
====================================

Version: $Version
Configuration: $Configuration
Platform: $Platform
Build Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Package: $msixPath
Size: $($fileSize.ToString('N2')) MB
Signed: $(if (Test-Path $certPath) { "Yes" } else { "No" })

Windows SDK: $($sdkPath.Name)
.NET SDK: $(dotnet --version)

Installation Instructions:
1. Enable Developer Mode (Settings > Privacy & Security > For developers)
2. Double-click the .msix file or right-click and select Install
3. The app will appear in the Start menu as "MarkRead"

To uninstall:
- Right-click MarkRead in Start menu > Uninstall
- Or use Settings > Apps > Installed apps
"@ | Set-Content $summaryPath

Write-Host "Build summary saved to: $summaryPath" -ForegroundColor Gray
