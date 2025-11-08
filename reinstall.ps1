# MarkRead Reinstallation Script
# Run this script as Administrator

Write-Host "=== MarkRead Reinstallation ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill any running processes
Write-Host "[1/4] Stopping MarkRead processes..." -ForegroundColor Yellow
Get-Process -Name "MarkRead*" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Step 2: Uninstall via MSI
Write-Host "[2/4] Uninstalling old version..." -ForegroundColor Yellow
$product = Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -like "*MarkRead*" }
if ($product) {
    $product.Uninstall() | Out-Null
    Start-Sleep -Seconds 2
    Write-Host "  Uninstall completed" -ForegroundColor Green
} else {
    Write-Host "  No installed version found" -ForegroundColor Gray
}

# Step 3: Clean up installation folder if it still exists
Write-Host "[3/4] Cleaning installation folder..." -ForegroundColor Yellow
if (Test-Path "C:\Program Files\MarkRead") {
    try {
        Remove-Item "C:\Program Files\MarkRead" -Recurse -Force -ErrorAction Stop
        Write-Host "  Installation folder removed" -ForegroundColor Green
    } catch {
        Write-Host "  WARNING: Could not remove some files: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  Folder already clean" -ForegroundColor Green
}

# Step 4: Install new version
Write-Host "[4/4] Installing new version..." -ForegroundColor Yellow
$msiPath = Join-Path $PSScriptRoot "installer\bin\Release\MarkRead--x64.msi"
if (Test-Path $msiPath) {
    Write-Host "  Installing from: $msiPath" -ForegroundColor Gray
    Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /qn /norestart" -Wait -NoNewWindow
    Start-Sleep -Seconds 2
    
    # Verify installation
    if (Test-Path "C:\Program Files\MarkRead\MarkRead.exe") {
        Write-Host "  Installation successful!" -ForegroundColor Green
        
        # Check the architecture
        $arch = [System.Reflection.Assembly]::LoadFile("C:\Program Files\MarkRead\MarkRead.dll").GetName().ProcessorArchitecture
        Write-Host "  Architecture: $arch" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "=== Installation Complete ===" -ForegroundColor Green
        Write-Host "You can now launch MarkRead from the Start Menu or by running:" -ForegroundColor White
        Write-Host '  & "C:\Program Files\MarkRead\MarkRead.exe"' -ForegroundColor Gray
    } else {
        Write-Host "  ERROR: Installation failed - executable not found" -ForegroundColor Red
    }
} else {
    Write-Host "  ERROR: MSI installer not found at: $msiPath" -ForegroundColor Red
    Write-Host "  Please build the project first: dotnet build -c Release" -ForegroundColor Yellow
}
