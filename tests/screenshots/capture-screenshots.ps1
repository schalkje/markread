# MarkRead Screenshot Capture Script
# Captures screenshots of the MarkRead application for documentation

param(
    [string]$AppPath = "..\..\src\App\bin\Debug\net8.0-windows\MarkRead.exe",
    [string]$DocsPath = "..\..\documentation",
    [string]$OutputDir = "..\..\documentation\images\screenshots"
)

# Resolve paths
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$AppPath = Join-Path $RepoRoot "src\App\bin\Debug\net8.0-windows\MarkRead.exe"
$DocsPath = Join-Path $RepoRoot "documentation"
$OutputDir = Join-Path $RepoRoot "documentation\images\screenshots"

Write-Host "MarkRead Screenshot Capture" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""

# Verify app exists
if (-not (Test-Path $AppPath)) {
    Write-Error "MarkRead.exe not found at: $AppPath"
    Write-Host "Please build the application first with: dotnet build" -ForegroundColor Yellow
    exit 1
}

# Verify documentation folder
if (-not (Test-Path $DocsPath)) {
    Write-Error "Documentation folder not found at: $DocsPath"
    exit 1
}

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Host "Created output directory: $OutputDir" -ForegroundColor Green
}

# Load required assemblies
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Add Windows API functions for window capture
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;

public class WindowCapture {
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindow(IntPtr hWnd);
}
"@

# Function to capture screenshot of a specific window
function Capture-WindowScreenshot {
    param(
        [string]$ProcessName,
        [string]$OutputPath,
        [int]$Delay = 500
    )
    
    Start-Sleep -Milliseconds $Delay
    
    # Find the window
    $process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $process -or -not $process.MainWindowHandle) {
        Write-Warning "Could not find window for process: $ProcessName"
        return $false
    }
    
    $hWnd = $process.MainWindowHandle
    
    # Verify window is valid
    if (-not [WindowCapture]::IsWindow($hWnd)) {
        Write-Warning "Invalid window handle"
        return $false
    }
    
    # Bring window to foreground
    [WindowCapture]::SetForegroundWindow($hWnd) | Out-Null
    Start-Sleep -Milliseconds 200
    
    # Get window bounds
    $rect = New-Object WindowCapture+RECT
    [WindowCapture]::GetWindowRect($hWnd, [ref]$rect) | Out-Null
    
    $width = $rect.Right - $rect.Left
    $height = $rect.Bottom - $rect.Top
    
    if ($width -le 0 -or $height -le 0) {
        Write-Warning "Invalid window dimensions"
        return $false
    }
    
    # Capture the window area
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, [System.Drawing.Size]::new($width, $height))
    
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "✓ Screenshot saved: $OutputPath" -ForegroundColor Green
    Write-Host "  Window position: ($($rect.Left), $($rect.Top)) Size: $width x $height" -ForegroundColor Gray
    return $true
}

# Function to stop MarkRead app
function Stop-MarkReadApp {
    Get-Process -Name "MarkRead.App" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

Write-Host "Cleaning up any existing MarkRead processes..." -ForegroundColor Yellow
Stop-MarkReadApp

# Screenshot 1: Main Window
Write-Host ""
Write-Host "Capturing Screenshot 1: Main Window" -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Cyan
Write-Host "Launching MarkRead with documentation folder..."

$proc1 = Start-Process -FilePath $AppPath -ArgumentList "`"$DocsPath`"" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 3  # Wait for app to fully load

Capture-WindowScreenshot -ProcessName "MarkRead.App" -OutputPath (Join-Path $OutputDir "main-window.png") -Delay 1000

Stop-MarkReadApp

# Screenshot 2: Open Folder (Start Screen)
Write-Host ""
Write-Host "Capturing Screenshot 2: Open Folder (Start Screen)" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host "Launching MarkRead without folder..."

$proc2 = Start-Process -FilePath $AppPath -PassThru -WindowStyle Normal
Start-Sleep -Seconds 2  # Wait for start screen

Capture-WindowScreenshot -ProcessName "MarkRead.App" -OutputPath (Join-Path $OutputDir "open-folder.png") -Delay 1000

Stop-MarkReadApp

# Screenshot 3: Navigation Basics
Write-Host ""
Write-Host "Capturing Screenshot 3: Navigation Basics" -ForegroundColor Cyan
Write-Host "-----------------------------------------" -ForegroundColor Cyan
Write-Host "Launching MarkRead with documentation folder..."
Write-Host "Please click on a file in the sidebar after the app opens..." -ForegroundColor Yellow

$proc3 = Start-Process -FilePath $AppPath -ArgumentList "`"$DocsPath`"" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 3

Write-Host "Waiting 5 seconds for you to interact with the app..." -ForegroundColor Yellow
Write-Host "(Open a file from the sidebar to show navigation)" -ForegroundColor Yellow
Start-Sleep -Seconds 5

Capture-WindowScreenshot -ProcessName "MarkRead.App" -OutputPath (Join-Path $OutputDir "navigation-basics.png") -Delay 500

Stop-MarkReadApp

# Summary
Write-Host ""
Write-Host "Screenshot Capture Complete!" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green
Write-Host ""
Write-Host "Screenshots saved to: $OutputDir" -ForegroundColor Cyan
Write-Host "  1. main-window.png"
Write-Host "  2. open-folder.png"
Write-Host "  3. navigation-basics.png"
Write-Host ""
Write-Host "You can now use these images in your documentation." -ForegroundColor Green
