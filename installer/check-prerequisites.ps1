# Check Prerequisites for MSIX Package Build
# This script verifies that all required tools are installed

$ErrorActionPreference = "Continue"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "MarkRead MSIX Build Prerequisites" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: .NET SDK
Write-Host "[1/4] Checking .NET SDK..." -ForegroundColor Green
try {
    $dotnetVersion = dotnet --version
    Write-Host "  ✓ .NET SDK found: $dotnetVersion" -ForegroundColor Green
    
    # Check if it's .NET 8 or later
    if ($dotnetVersion -match '^(\d+)\.') {
        $majorVersion = [int]$matches[1]
        if ($majorVersion -lt 8) {
            Write-Host "  ⚠ Warning: .NET 8 or later is required (found: $dotnetVersion)" -ForegroundColor Yellow
            $allGood = $false
        }
    }
} catch {
    Write-Host "  ✗ .NET SDK not found" -ForegroundColor Red
    Write-Host "    Install from: https://dotnet.microsoft.com/download/dotnet/8.0" -ForegroundColor Yellow
    $allGood = $false
}

# Check 2: Windows SDK
Write-Host "[2/4] Checking Windows SDK..." -ForegroundColor Green
$sdkBasePaths = @(
    "C:\Program Files (x86)\Windows Kits\10\bin",
    "C:\Program Files\Windows Kits\10\bin"
)

$sdkFound = $false
foreach ($basePath in $sdkBasePaths) {
    if (Test-Path $basePath) {
        $sdkVersions = Get-ChildItem -Path $basePath -Directory | 
            Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+$' } |
            Sort-Object Name -Descending
        
        if ($sdkVersions) {
            $sdkFound = $true
            $latestSdk = $sdkVersions | Select-Object -First 1
            Write-Host "  ✓ Windows SDK found: $($latestSdk.Name)" -ForegroundColor Green
            
            # Check for makeappx.exe
            $makeappx = Join-Path $latestSdk.FullName "x64\makeappx.exe"
            if (Test-Path $makeappx) {
                Write-Host "    makeappx.exe: Found" -ForegroundColor Gray
            } else {
                Write-Host "    makeappx.exe: Not found (incomplete SDK installation)" -ForegroundColor Yellow
                $allGood = $false
            }
            
            break
        }
    }
}

if (-not $sdkFound) {
    Write-Host "  ✗ Windows SDK not found" -ForegroundColor Red
    Write-Host "    Required for SDK build method (build-msix-sdk.ps1)" -ForegroundColor Yellow
    Write-Host "    Install via: winget install Microsoft.WindowsSDK.10.0.22621" -ForegroundColor Yellow
    $allGood = $false
}

# Check 3: Visual Studio + MSBuild (for WAP method)
Write-Host "[3/4] Checking Visual Studio & MSBuild..." -ForegroundColor Green
$vswherePath = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"

if (Test-Path $vswherePath) {
    $vsPath = & $vswherePath -latest -property installationPath 2>$null
    
    if ($vsPath) {
        $vsVersion = & $vswherePath -latest -property displayName 2>$null
        Write-Host "  ✓ Visual Studio found: $vsVersion" -ForegroundColor Green
        
        # Check for MSBuild
        $msbuild = & $vswherePath -latest -requires Microsoft.Component.MSBuild -find MSBuild\**\Bin\MSBuild.exe -prerelease 2>$null | Select-Object -First 1
        
        if ($msbuild) {
            Write-Host "    MSBuild: Found" -ForegroundColor Gray
        } else {
            Write-Host "    MSBuild: Not found" -ForegroundColor Yellow
        }
        
        # Check for DesktopBridge SDK (UWP workload)
        $desktopBridgePath = Join-Path $vsPath "MSBuild\Microsoft\DesktopBridge"
        if (Test-Path $desktopBridgePath) {
            Write-Host "    UWP Workload: Installed" -ForegroundColor Gray
            Write-Host "    → Can use WAP build (build-installer.ps1)" -ForegroundColor Cyan
        } else {
            Write-Host "    UWP Workload: Not installed" -ForegroundColor Yellow
            Write-Host "    → Cannot use WAP build method" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  ⚠ Visual Studio not found (optional)" -ForegroundColor Yellow
    Write-Host "    Required only for WAP build method (build-installer.ps1)" -ForegroundColor Gray
}

# Check 4: PowerShell version
Write-Host "[4/4] Checking PowerShell..." -ForegroundColor Green
Write-Host "  ✓ PowerShell version: $($PSVersionTable.PSVersion)" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

if ($allGood -and $sdkFound) {
    Write-Host "✓ All prerequisites met for SDK build!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can build the MSIX package using:" -ForegroundColor White
    Write-Host "  .\build-msix-sdk.ps1 -Version `"1.0.0.0`"" -ForegroundColor Cyan
} elseif (-not $sdkFound) {
    Write-Host "⚠ Windows SDK is missing" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To install Windows SDK:" -ForegroundColor White
    Write-Host "  winget install Microsoft.WindowsSDK.10.0.22621" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After installing, run this script again to verify." -ForegroundColor Gray
} else {
    Write-Host "⚠ Some prerequisites are missing" -ForegroundColor Yellow
    Write-Host "Please review the messages above and install missing components." -ForegroundColor Gray
}

Write-Host ""
