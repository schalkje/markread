<#
.SYNOPSIS
Workaround for winCodeSign symlink extraction issue on Windows

.DESCRIPTION
electron-builder downloads winCodeSign tools that contain macOS symlinks which fail
to extract on Windows without Developer Mode or admin privileges. This script manually
extracts only the Windows binaries, skipping the problematic darwin directory.
#>

$ErrorActionPreference = 'Stop'

$cacheDir = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
$extractTarget = Join-Path $cacheDir "winCodeSign-2.6.0"

Write-Host "Looking for winCodeSign archive in cache..."

# Find the downloaded .7z archive
$archive = Get-ChildItem -Path $cacheDir -Filter "*.7z" -File | Select-Object -First 1

if (-not $archive) {
    Write-Host "No winCodeSign archive found. It will be downloaded on next build attempt."
    exit 0
}

Write-Host "Found archive: $($archive.Name)"

# Check if already extracted
if (Test-Path $extractTarget) {
    Write-Host "winCodeSign already extracted at: $extractTarget"
    exit 0
}

# Get 7zip executable from node_modules
$sevenZip = "node_modules\7zip-bin\win\x64\7za.exe"
if (-not (Test-Path $sevenZip)) {
    Write-Error "7zip not found at: $sevenZip"
    exit 1
}

Write-Host "Extracting Windows binaries only (excluding darwin/macOS symlinks)..."

# Extract excluding darwin directory to avoid symlink errors
$excludeArg = "-x!*darwin*"
& $sevenZip x $excludeArg "-o$extractTarget" $archive.FullName

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Successfully extracted winCodeSign tools (darwin files excluded)" -ForegroundColor Green
    Write-Host "You can now run 'npm run package' to create installers" -ForegroundColor Green
} else {
    Write-Error "Failed to extract archive (exit code: $LASTEXITCODE)"
    exit $LASTEXITCODE
}
