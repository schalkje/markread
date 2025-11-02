# Interactive MarkRead Screenshot Capture
# Run this script and manually interact with the app for best results

param(
    [int]$DelaySeconds = 5
)

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$AppPath = Join-Path $RepoRoot "src\App\bin\Debug\net8.0-windows\MarkRead.App.exe"
$DocsPath = Join-Path $RepoRoot "documentation"
$OutputDir = Join-Path $RepoRoot "documentation\images\screenshots"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Capture-Screenshot {
    param([string]$Name)
    
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
    
    $outputPath = Join-Path $OutputDir "$Name.png"
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "✓ Saved: $Name.png" -ForegroundColor Green
}

# Ensure output directory
New-Item -ItemType Directory -Path $OutputDir -Force -ErrorAction SilentlyContinue | Out-Null

# Clean up
Get-Process -Name "MarkRead.App" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║  MarkRead Screenshot Capture - Interactive Mode           ║
╚═══════════════════════════════════════════════════════════╝

This script will launch MarkRead in different modes.
After each launch, you'll have $DelaySeconds seconds to arrange the window.

Press ENTER to continue...
"@ -ForegroundColor Cyan

Read-Host

# Screenshot 1: Main window with docs
Write-Host "`n[1/3] Capturing: Main Window" -ForegroundColor Yellow
Write-Host "Launching MarkRead with documentation folder..." -ForegroundColor Gray
Start-Process -FilePath $AppPath -ArgumentList "`"$DocsPath`"" -WindowStyle Normal
Write-Host "Waiting $DelaySeconds seconds..." -ForegroundColor Gray
Start-Sleep -Seconds $DelaySeconds
Capture-Screenshot -Name "main-window"
Get-Process -Name "MarkRead.App" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# Screenshot 2: Start screen
Write-Host "`n[2/3] Capturing: Open Folder (Start Screen)" -ForegroundColor Yellow
Write-Host "Launching MarkRead without folder..." -ForegroundColor Gray
Start-Process -FilePath $AppPath -WindowStyle Normal
Write-Host "Waiting $DelaySeconds seconds..." -ForegroundColor Gray
Start-Sleep -Seconds $DelaySeconds
Capture-Screenshot -Name "open-folder"
Get-Process -Name "MarkRead.App" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# Screenshot 3: Navigation
Write-Host "`n[3/3] Capturing: Navigation Basics" -ForegroundColor Yellow
Write-Host "Launching MarkRead with documentation folder..." -ForegroundColor Gray
Write-Host "ACTION REQUIRED: Please click on a file in the sidebar!" -ForegroundColor Red
Start-Process -FilePath $AppPath -ArgumentList "`"$DocsPath`"" -WindowStyle Normal
Write-Host "Waiting $DelaySeconds seconds for you to interact..." -ForegroundColor Gray
Start-Sleep -Seconds $DelaySeconds
Capture-Screenshot -Name "navigation-basics"
Get-Process -Name "MarkRead.App" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║  Screenshots Captured Successfully!                       ║
╚═══════════════════════════════════════════════════════════╝

Location: $OutputDir

Files created:
  • main-window.png
  • open-folder.png
  • navigation-basics.png

"@ -ForegroundColor Green
