# MarkRead Screenshot Automation

This directory contains scripts to automatically capture screenshots of the MarkRead application for documentation purposes.

## Quick Start

### Option 1: PowerShell Script (Recommended for Windows)

Run the PowerShell script from the repository root:

```powershell
cd tests\screenshots
.\capture-screenshots.ps1
```

This will:
1. Build the application (if needed)
2. Launch MarkRead in different states
3. Capture screenshots automatically
4. Save images to `documentation/images/screenshots/`

### Option 2: Playwright (Advanced)

Install dependencies:

```powershell
cd tests\screenshots
npm install
```

Run the test:

```powershell
npm run capture
```

## Generated Screenshots

The script captures three key screenshots:

1. **main-window.png** - The main application window with documentation loaded
2. **open-folder.png** - The start screen showing the "Open Folder" option
3. **navigation-basics.png** - The application showing navigation features (back/forward, file tree)

## Requirements

- Windows 10/11
- .NET 8 SDK
- PowerShell 5.1 or later
- MarkRead application built in Debug mode

## Manual Capture

If automated capture doesn't work, you can manually:

1. Build the app: `dotnet build`
2. Run: `.\src\App\bin\Debug\net8.0-windows\MarkRead.App.exe .\documentation`
3. Use Windows Snipping Tool (Win+Shift+S) to capture screenshots
4. Save them to `documentation/images/screenshots/`

## Troubleshooting

**App not found error:**
- Build the application first: `dotnet build` from repository root

**Screenshots are blank:**
- Increase delay times in the script
- Your display may have DPI scaling - adjust capture code

**App doesn't close:**
- Manually close with: `Get-Process -Name "MarkRead.App" | Stop-Process -Force`
