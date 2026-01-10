# MarkRead Packaging & Distribution Modernization Proposition

**Date:** 2026-01-09
**Current Version:** 0.5.0 (Electron)
**Status:** Proposal

---

## Executive Summary

MarkRead has successfully migrated from .NET WPF to Electron (v0.5.0), but the packaging and distribution infrastructure remains locked in the legacy WPF paradigm. 
1. Remove the old packaging
2. Implement a packaging and distribution infrastructure following  Electron best practices, focusing on Windows while planning for future Mac and mobile distribution.

**Key Issues:**
- CI/CD pipelines still build WPF MSI installers (non-functional)
- Orphaned WiX Toolset configuration (~4MB legacy artifacts)
- Code signing infrastructure needs Electron adaptation
- No auto-update mechanism for Electron builds
- Release scripts reference non-existent .NET files

**Proposed Solution:**
- Adopt `electron-builder` as the primary packaging tool (already configured)
- Implement NSIS-based Windows installers with code signing
- Set up `electron-updater` for seamless auto-updates
- Clean CI/CD pipelines for Electron-native workflows
- Plan extensible architecture for Mac/mobile future

---

## Part 1: Current State Analysis

### 🔴 Legacy WPF Artifacts (TO BE REMOVED)

| Item | Location | Size | Action |
|------|----------|------|--------|
| WiX Project | `installer/MarkRead.Installer.wixproj` | 7 KB | **DELETE** |
| WiX Configuration | `installer/Package.wxs` | 12 KB | **DELETE** |
| Built MSI | `installer/bin/Release/MarkRead-0.4.1-x64.msi` | 4.27 MB | **DELETE** |
| Build Artifacts | `installer/obj/**` | ~2 MB | **DELETE** |
| Installer Directory | `installer/` (entire directory) | ~6.5 MB | **DELETE** |

**GitHub Actions Issues:**
- [ci.yml](.github/workflows/ci.yml): Lines 20-50 reference .NET SDK, WiX installation, MSI builds
- [release.yml](.github/workflows/release.yml): Lines 30-120 build/sign MSI instead of Electron .exe
- Both workflows are **NON-FUNCTIONAL** for Electron builds

**PowerShell Script Issues:**
- [scripts/release.ps1](scripts/release.ps1): Line 45 reads `Directory.Build.props` (doesn't exist)
- [scripts/sign-msi.ps1](scripts/sign-msi.ps1): MSI-specific, needs Electron .exe variant

### 🟢 Current Electron Setup (KEEP & ENHANCE)

| Item | Location | Status |
|------|----------|--------|
| electron-builder config | `build/electron-builder.yml` | ✅ Present, needs enhancement |
| Build scripts | `package.json` scripts | ✅ Functional |
| Icon assets | `build/icon.ico` | ✅ Ready |
| Code signing scripts | `scripts/sign-*.ps1` | ⚠️ Needs Electron adaptation |

**Current `electron-builder` Configuration:**
```yaml
appId: com.markread.app
productName: MarkRead
directories:
  output: release
  buildResources: build
files:
  - dist/**/*
  - package.json

win:
  target:
    - target: nsis
      arch:
        - x64
  icon: build/icon.ico
  artifactName: MarkRead-Setup-${version}.exe
```

**Issue:** Configuration is basic and missing:
- Code signing configuration
- Auto-update endpoints
- Compression/optimization settings
- File associations (.md, .markdown)
- Portable/installer variants
- Advanced NSIS customization

---

## Part 2: Best Practice Electron Packaging Architecture

### 🎯 Recommended Stack (Windows MVP)

| Component | Tool/Technology | Purpose |
|-----------|-----------------|---------|
| **Build System** | electron-vite | TypeScript/React compilation |
| **Packaging** | electron-builder | Cross-platform installer generation |
| **Installer Format** | NSIS | Windows .exe installer (industry standard) |
| **Code Signing** | signtool.exe + Azure Code Signing | Trusted installation |
| **Auto-Updates** | electron-updater | Seamless background updates |
| **Distribution** | GitHub Releases | Public download hosting |
| **Update Server** | electron-release-server / GitHub | Update manifest & delta downloads |

### 📦 Enhanced `electron-builder.yml` Configuration

```yaml
# build/electron-builder.yml
appId: com.markread.app
productName: MarkRead
copyright: Copyright © 2026 schalken.net
asar: true  # Package source into ASAR for protection

directories:
  output: release/${version}
  buildResources: build

files:
  - out/**/*
  - package.json
  - node_modules/**/*
  - "!node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}"
  - "!node_modules/*/{test,__tests__,tests,powered-test,example,examples}"
  - "!node_modules/*.d.ts"
  - "!node_modules/.bin"
  - "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}"
  - "!.editorconfig"
  - "!**/._*"
  - "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}"
  - "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}"
  - "!**/{appveyor.yml,.travis.yml,circle.yml}"
  - "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"

compression: maximum  # LZMA compression for smaller installers
includeSubNodeModules: false

# Publish configuration for auto-updates
publish:
  provider: github
  owner: YourGitHubUsername
  repo: markread
  releaseType: release  # or 'draft' for staging

# Windows Configuration
win:
  target:
    - target: nsis
      arch: [x64]
    - target: portable  # Optional: Portable .exe (no installation)
      arch: [x64]

  icon: build/icon.ico
  artifactName: ${productName}-Setup-${version}.${ext}

  # Code Signing Configuration
  sign: ./scripts/electron-sign.ps1  # Custom signing script
  signingHashAlgorithms: ['sha256']

  # File Associations
  fileAssociations:
    - ext: md
      name: Markdown File
      description: Markdown Document
      icon: build/markdown-icon.ico
      role: Editor
    - ext: markdown
      name: Markdown File
      description: Markdown Document
      icon: build/markdown-icon.ico
      role: Editor

# NSIS Installer Configuration
nsis:
  oneClick: false  # Allow custom install directory
  perMachine: false  # Per-user installation (no admin required)
  allowElevation: true  # Allow elevation if user chooses
  allowToChangeInstallationDirectory: true
  installerIcon: build/icon.ico
  uninstallerIcon: build/icon.ico
  installerHeader: build/installer-header.bmp  # 150x57 bitmap
  installerSidebar: build/installer-sidebar.bmp  # 164x314 bitmap
  uninstallerSidebar: build/installer-sidebar.bmp

  createDesktopShortcut: always
  createStartMenuShortcut: true
  shortcutName: ${productName}

  # License
  license: LICENSE

  # Display Settings
  displayLanguageSelector: false  # Enable for multi-language
  installerLanguages: ['en_US']

  # Uninstall Settings
  deleteAppDataOnUninstall: false  # Preserve user data

  # Registry Settings
  include: build/installer.nsh  # Custom NSIS script for registry tweaks

  # Compression
  compression: lzma
  differentialPackage: true  # Enable delta updates

# macOS Configuration (Future)
mac:
  category: public.app-category.productivity
  icon: build/icon.icns
  target:
    - target: dmg
      arch: [x64, arm64]  # Apple Silicon + Intel
    - target: zip
      arch: [x64, arm64]
  artifactName: ${productName}-${version}-${arch}.${ext}
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  notarize:
    teamId: YOUR_TEAM_ID

# DMG Configuration (Future)
dmg:
  background: build/dmg-background.png
  icon: build/icon.icns
  iconSize: 100
  contents:
    - x: 380
      y: 180
      type: link
      path: /Applications
    - x: 122
      y: 180
      type: file

# Linux Configuration (Future - if applicable)
linux:
  target:
    - AppImage
    - deb
    - rpm
  category: Office
  icon: build/icons

# Snap Configuration (Future - Ubuntu)
snap:
  confinement: strict
  grade: stable
```

### 🔐 Code Signing Strategy

**Current Situation:**
- Existing PowerShell scripts sign MSI files
- Certificate infrastructure already in place (PFX + Azure)
- GitHub Secrets configured: `CERT_PFX`, `CERT_PASSWORD`

**Adaptation for Electron:**

Create `scripts/electron-sign.ps1`:
```powershell
# scripts/electron-sign.ps1
# Code signing script for Electron executables
param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

$ErrorActionPreference = "Stop"

# Validate file exists
if (-not (Test-Path $FilePath)) {
    throw "File not found: $FilePath"
}

# Get certificate from environment or Windows Certificate Store
$certPath = $env:CERT_PFX
$certPassword = $env:CERT_PASSWORD
$certThumbprint = $env:CERT_THUMBPRINT

# Find signtool.exe (Windows SDK)
$signtool = Get-Command signtool.exe -ErrorAction SilentlyContinue
if (-not $signtool) {
    # Search Windows SDK paths
    $sdkPaths = @(
        "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe",
        "C:\Program Files\Microsoft SDKs\Windows\*\bin\x64\signtool.exe"
    )

    foreach ($pattern in $sdkPaths) {
        $found = Get-ChildItem $pattern -ErrorAction SilentlyContinue |
                 Sort-Object LastWriteTime -Descending |
                 Select-Object -First 1
        if ($found) {
            $signtool = $found.FullName
            break
        }
    }

    if (-not $signtool) {
        throw "signtool.exe not found. Install Windows SDK."
    }
}

Write-Host "Signing: $FilePath"

# Sign with certificate
if ($certPath -and (Test-Path $certPath)) {
    # Sign with PFX file
    $securePassword = ConvertTo-SecureString $certPassword -AsPlainText -Force

    & $signtool sign `
        /f $certPath `
        /p $certPassword `
        /fd sha256 `
        /tr http://timestamp.digicert.com `
        /td sha256 `
        /d "MarkRead" `
        /du "https://github.com/YourGitHubUsername/markread" `
        $FilePath

} elseif ($certThumbprint) {
    # Sign with certificate from store
    & $signtool sign `
        /sha1 $certThumbprint `
        /fd sha256 `
        /tr http://timestamp.digicert.com `
        /td sha256 `
        /d "MarkRead" `
        /du "https://github.com/YourGitHubUsername/markread" `
        $FilePath

} else {
    throw "No certificate configured. Set CERT_PFX or CERT_THUMBPRINT environment variable."
}

if ($LASTEXITCODE -ne 0) {
    throw "Code signing failed with exit code $LASTEXITCODE"
}

Write-Host "✅ Successfully signed: $FilePath" -ForegroundColor Green

# Verify signature
& $signtool verify /pa /v $FilePath
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Signature verified successfully" -ForegroundColor Green
} else {
    Write-Warning "⚠️ Signature verification failed"
}
```

### 🔄 Auto-Update Implementation

**Install `electron-updater`:**
```bash
npm install electron-updater
```

**Update [src/main/index.ts](src/main/index.ts):**
```typescript
import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

// Configure logging
autoUpdater.logger = log
autoUpdater.logger.transports.file.level = 'info'

// Configure auto-updater
autoUpdater.autoDownload = false  // Manual download trigger
autoUpdater.autoInstallOnAppQuit = true

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // ... existing window setup

  return mainWindow
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for updates...')
})

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info)

  // Notify renderer process
  BrowserWindow.getAllWindows()[0]?.webContents.send('update-available', info)
})

autoUpdater.on('update-not-available', (info) => {
  log.info('No updates available:', info)
})

autoUpdater.on('error', (err) => {
  log.error('Update error:', err)
  BrowserWindow.getAllWindows()[0]?.webContents.send('update-error', err.message)
})

autoUpdater.on('download-progress', (progressObj) => {
  log.info(`Download progress: ${progressObj.percent}%`)
  BrowserWindow.getAllWindows()[0]?.webContents.send('update-download-progress', progressObj)
})

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info)
  BrowserWindow.getAllWindows()[0]?.webContents.send('update-downloaded', info)
})

app.whenReady().then(() => {
  createWindow()

  // Check for updates on startup (only in production)
  if (!app.isPackaged) {
    log.info('Development mode - skipping update check')
  } else {
    // Check for updates 5 seconds after launch
    setTimeout(() => {
      autoUpdater.checkForUpdates()
    }, 5000)

    // Check every 4 hours
    setInterval(() => {
      autoUpdater.checkForUpdates()
    }, 4 * 60 * 60 * 1000)
  }
})

// IPC handlers for manual update checks
import { ipcMain } from 'electron'

ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) {
    return { available: false, message: 'Development mode' }
  }
  return await autoUpdater.checkForUpdates()
})

ipcMain.handle('download-update', async () => {
  return await autoUpdater.downloadUpdate()
})

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true)
})
```

**Update UI Component (React):**

Create `src/renderer/src/components/UpdateNotification.tsx`:
```typescript
import React, { useEffect, useState } from 'react'

interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
}

interface DownloadProgress {
  percent: number
  transferred: number
  total: number
}

export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Listen for update events from main process
    window.electron.ipcRenderer.on('update-available', (_event, info) => {
      setUpdateAvailable(true)
      setUpdateInfo(info)
    })

    window.electron.ipcRenderer.on('update-download-progress', (_event, progress) => {
      setDownloadProgress(progress)
    })

    window.electron.ipcRenderer.on('update-downloaded', (_event, info) => {
      setDownloading(false)
      setUpdateDownloaded(true)
      setUpdateInfo(info)
    })

    window.electron.ipcRenderer.on('update-error', (_event, message) => {
      setError(message)
      setDownloading(false)
    })

    return () => {
      window.electron.ipcRenderer.removeAllListeners('update-available')
      window.electron.ipcRenderer.removeAllListeners('update-download-progress')
      window.electron.ipcRenderer.removeAllListeners('update-downloaded')
      window.electron.ipcRenderer.removeAllListeners('update-error')
    }
  }, [])

  const handleDownload = async () => {
    setDownloading(true)
    setError(null)
    await window.electron.ipcRenderer.invoke('download-update')
  }

  const handleInstall = () => {
    window.electron.ipcRenderer.invoke('install-update')
  }

  const handleDismiss = () => {
    setUpdateAvailable(false)
    setUpdateDownloaded(false)
    setError(null)
  }

  if (error) {
    return (
      <div className="update-notification error">
        <p>❌ Update error: {error}</p>
        <button onClick={handleDismiss}>Dismiss</button>
      </div>
    )
  }

  if (updateDownloaded) {
    return (
      <div className="update-notification ready">
        <p>🎉 Update {updateInfo?.version} is ready to install!</p>
        <div className="actions">
          <button onClick={handleInstall} className="primary">
            Restart & Install
          </button>
          <button onClick={handleDismiss}>Later</button>
        </div>
      </div>
    )
  }

  if (downloading && downloadProgress) {
    return (
      <div className="update-notification downloading">
        <p>⬇️ Downloading update {updateInfo?.version}...</p>
        <progress value={downloadProgress.percent} max={100} />
        <span>{Math.round(downloadProgress.percent)}%</span>
      </div>
    )
  }

  if (updateAvailable) {
    return (
      <div className="update-notification available">
        <p>🆕 Update {updateInfo?.version} is available!</p>
        {updateInfo?.releaseNotes && (
          <details>
            <summary>Release Notes</summary>
            <div dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }} />
          </details>
        )}
        <div className="actions">
          <button onClick={handleDownload} className="primary">
            Download Update
          </button>
          <button onClick={handleDismiss}>Not Now</button>
        </div>
      </div>
    )
  }

  return null
}
```

---

## Part 3: CI/CD Pipeline Modernization

### 🔧 Updated GitHub Actions Workflow

Replace [.github/workflows/release.yml](.github/workflows/release.yml) with:

```yaml
name: Release Electron Build

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release (e.g., v0.5.1)'
        required: true
        type: string

permissions:
  contents: write  # Create releases
  packages: write  # Publish packages

jobs:
  build-windows:
    name: Build Windows Installer
    runs-on: windows-latest

    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      CERT_PFX_BASE64: ${{ secrets.CERT_PFX }}
      CERT_PASSWORD: ${{ secrets.CERT_PASSWORD }}

    steps:
      - name: 📥 Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for versioning

      - name: 📦 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 🔧 Install Dependencies
        run: npm ci

      - name: 🔍 Verify Version Match
        shell: pwsh
        run: |
          $packageVersion = (Get-Content package.json | ConvertFrom-Json).version
          $tagVersion = "${{ github.ref_name }}".TrimStart('v')

          if ($packageVersion -ne $tagVersion) {
            Write-Error "Version mismatch! package.json=$packageVersion, tag=$tagVersion"
            exit 1
          }

          Write-Host "✅ Version verified: $packageVersion"

      - name: 🏗️ Build Electron Application
        run: npm run build

      - name: 🧪 Run Tests
        run: npm test
        continue-on-error: false

      - name: 📋 Type Check
        run: npm run type-check
        continue-on-error: false

      - name: 🔐 Prepare Code Signing Certificate
        shell: pwsh
        run: |
          $certBytes = [Convert]::FromBase64String($env:CERT_PFX_BASE64)
          $certPath = Join-Path $env:TEMP "cert.pfx"
          [IO.File]::WriteAllBytes($certPath, $certBytes)

          Write-Host "Certificate saved to: $certPath"
          echo "CERT_PFX=$certPath" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append

      - name: 🔨 Validate Certificate
        shell: pwsh
        run: |
          & "${{ github.workspace }}\scripts\validate-certificate.ps1" -CertPath $env:CERT_PFX -Password $env:CERT_PASSWORD

      - name: 📦 Package Electron Application
        run: npm run package
        env:
          CERT_PFX: ${{ env.CERT_PFX }}
          CERT_PASSWORD: ${{ secrets.CERT_PASSWORD }}

      - name: ✅ Verify Digital Signature
        shell: pwsh
        run: |
          $exePath = Get-ChildItem "release\${{ github.ref_name }}\*.exe" -Recurse | Select-Object -First 1

          if (-not $exePath) {
            Write-Error "No .exe found in release directory"
            exit 1
          }

          Write-Host "Verifying signature of: $($exePath.FullName)"
          & "${{ github.workspace }}\scripts\verify-signature.ps1" -FilePath $exePath.FullName

      - name: 📊 Generate Build Metadata
        shell: pwsh
        run: |
          $metadata = @{
            version = "${{ github.ref_name }}"
            buildDate = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            commit = "${{ github.sha }}"
            nodeVersion = (node --version)
            npmVersion = (npm --version)
            electronVersion = (npm list electron --depth=0 --json | ConvertFrom-Json).dependencies.electron.version
          }

          $metadata | ConvertTo-Json | Out-File "release\${{ github.ref_name }}\build-metadata.json"

      - name: 🚀 Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            release/${{ github.ref_name }}/*.exe
            release/${{ github.ref_name }}/*.exe.blockmap
            release/${{ github.ref_name }}/latest.yml
            release/${{ github.ref_name }}/build-metadata.json
          draft: false
          prerelease: ${{ contains(github.ref_name, 'alpha') || contains(github.ref_name, 'beta') || contains(github.ref_name, 'rc') }}
          generate_release_notes: true
          body: |
            ## MarkRead ${{ github.ref_name }}

            ### 📥 Downloads
            - **Windows Installer:** `MarkRead-Setup-${{ github.ref_name }}.exe`

            ### 🔄 Auto-Update
            If you have a previous version installed, MarkRead will automatically notify you of this update.

            ### 🔐 Code Signing
            All executables are digitally signed with a trusted certificate.

            ---

            **Full Changelog:** https://github.com/${{ github.repository }}/compare/v0.5.0...${{ github.ref_name }}

      - name: 🧹 Cleanup Sensitive Files
        if: always()
        shell: pwsh
        run: |
          if (Test-Path $env:CERT_PFX) {
            Remove-Item $env:CERT_PFX -Force
            Write-Host "✅ Certificate cleaned up"
          }

      - name: 📤 Upload Build Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: windows-installer-${{ github.ref_name }}
          path: release/${{ github.ref_name }}/*
          retention-days: 90

  # Future: macOS Build Job
  # build-macos:
  #   name: Build macOS Installer
  #   runs-on: macos-latest
  #   steps: [...]

  # Future: Auto-publish to Microsoft Store
  # publish-store:
  #   name: Publish to Microsoft Store
  #   runs-on: windows-latest
  #   needs: build-windows
  #   steps: [...]
```

### 🔄 Updated CI Workflow

Update [.github/workflows/ci.yml](.github/workflows/ci.yml):

```yaml
name: CI Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

jobs:
  test:
    name: Test & Lint
    runs-on: windows-latest

    steps:
      - name: 📥 Checkout Code
        uses: actions/checkout@v4

      - name: 📦 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 🔧 Install Dependencies
        run: npm ci

      - name: 🧪 Run Tests
        run: npm test

      - name: 📋 Type Check
        run: npm run type-check

      - name: 🎨 Lint Code
        run: npm run lint

      - name: 🏗️ Build Application
        run: npm run build

      - name: 📊 Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: coverage/
          retention-days: 30

  build-smoke-test:
    name: Build Smoke Test
    runs-on: windows-latest
    needs: test

    steps:
      - name: 📥 Checkout Code
        uses: actions/checkout@v4

      - name: 📦 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 🔧 Install Dependencies
        run: npm ci

      - name: 🏗️ Build Electron
        run: npm run build

      - name: 📦 Package (Unsigned)
        run: npm run package
        env:
          CSC_IDENTITY_AUTO_DISCOVERY: false  # Skip code signing in CI

      - name: ✅ Verify Build Output
        shell: pwsh
        run: |
          $exePath = Get-ChildItem "release\*\*.exe" -Recurse | Select-Object -First 1

          if (-not $exePath) {
            Write-Error "Build failed - no .exe produced"
            exit 1
          }

          Write-Host "✅ Build successful: $($exePath.Name)"
          Write-Host "Size: $([math]::Round($exePath.Length / 1MB, 2)) MB"
```

---

## Part 4: Release Script Modernization

Update [scripts/release.ps1](scripts/release.ps1) to work with Electron:

```powershell
# scripts/release.ps1
# Electron Release Orchestration Script

[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$NewVersion,
    [ValidateSet('major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', 'prerelease')]
    [string]$VersionBump,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Helper function to read package.json version
function Get-PackageVersion {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    return $packageJson.version
}

# Helper function to update package.json version
function Set-PackageVersion {
    param([string]$Version)

    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $packageJson.version = $Version
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
}

Write-Host "🚀 MarkRead Electron Release Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Get current version
$currentVersion = Get-PackageVersion
Write-Host "📦 Current version: $currentVersion"

# Determine new version
if ($NewVersion) {
    $version = $NewVersion.TrimStart('v')
} elseif ($VersionBump) {
    # Use npm version command to calculate
    $version = (npm version $VersionBump --no-git-tag-version) -replace '^v', ''

    # Revert package.json change (we'll do it properly later)
    & git checkout package.json
} else {
    # Interactive prompt
    $version = Read-Host "Enter new version (current: $currentVersion)"
    $version = $version.TrimStart('v')
}

Write-Host "🎯 Target version: $version" -ForegroundColor Green

if ($DryRun) {
    Write-Host "🧪 DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
}

# Validate version format
if ($version -notmatch '^\d+\.\d+\.\d+(-\w+(\.\d+)?)?$') {
    Write-Error "Invalid version format: $version"
    exit 1
}

# Update package.json
Write-Host "📝 Updating package.json..."
if (-not $DryRun) {
    Set-PackageVersion -Version $version
}

# Update CHANGELOG.md
Write-Host "📰 Updating CHANGELOG.md..."
$changelogPath = "CHANGELOG.md"
$today = Get-Date -Format "yyyy-MM-dd"

if (Test-Path $changelogPath) {
    $changelog = Get-Content $changelogPath -Raw

    # Check if version already exists
    if ($changelog -match "## \[$version\]") {
        Write-Warning "Version $version already exists in CHANGELOG.md"
    } else {
        # Prompt for changelog editor
        Write-Host "Opening CHANGELOG.md for editing..."
        Write-Host "Please add release notes under the [Unreleased] section."

        $editor = $env:EDITOR
        if (-not $editor) {
            $editor = "notepad"
        }

        if (-not $DryRun) {
            & $editor $changelogPath
            Read-Host "Press Enter when you've finished editing the changelog"
        }

        # Update [Unreleased] to version
        $updatedChangelog = $changelog -replace '\[Unreleased\]', "[$version] - $today"

        # Add new [Unreleased] section
        $unreleased = @"
## [Unreleased]

### Added

### Changed

### Fixed

### Removed

"@
        $updatedChangelog = $updatedChangelog -replace "(# Changelog\s+)", "`$1`n$unreleased`n"

        if (-not $DryRun) {
            $updatedChangelog | Set-Content $changelogPath
        }
    }
}

# Run tests
Write-Host "🧪 Running tests..."
if (-not $DryRun) {
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Tests failed. Aborting release."
        exit 1
    }
}

# Run linting
Write-Host "🎨 Running linter..."
if (-not $DryRun) {
    npm run lint
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Linting issues detected. Continue? (Y/N)"
        $continue = Read-Host
        if ($continue -ne 'Y') {
            exit 1
        }
    }
}

# Build application
Write-Host "🏗️ Building application..."
if (-not $DryRun) {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed. Aborting release."
        exit 1
    }
}

# Git operations
Write-Host "🔀 Creating git commit and tag..."

if (-not $DryRun) {
    # Stage changes
    & git add package.json CHANGELOG.md

    # Commit
    & git commit -m "chore: release v$version"

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Git commit failed"
        exit 1
    }

    # Create tag
    & git tag -a "v$version" -m "Release v$version"

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Git tag creation failed"
        exit 1
    }

    Write-Host "✅ Commit and tag created successfully" -ForegroundColor Green
}

# Push to remote
Write-Host ""
Write-Host "📤 Ready to push to remote repository" -ForegroundColor Yellow
Write-Host "   This will trigger the GitHub Actions release workflow."
Write-Host ""
Write-Host "Commands to run:"
Write-Host "   git push origin main" -ForegroundColor Cyan
Write-Host "   git push origin v$version" -ForegroundColor Cyan
Write-Host ""

if (-not $DryRun) {
    $push = Read-Host "Push now? (Y/N)"

    if ($push -eq 'Y') {
        & git push origin main
        & git push origin "v$version"

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Pushed successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🎉 Release v$version is now building on GitHub Actions" -ForegroundColor Green
            Write-Host "   Monitor progress at: https://github.com/YourUsername/markread/actions"
        } else {
            Write-Error "Git push failed"
            exit 1
        }
    }
}

Write-Host ""
Write-Host "✅ Release script completed" -ForegroundColor Green
```

---

## Part 5: File Association & Context Menu Integration

### 🗂️ Windows File Associations

**Handled by electron-builder NSIS:**
- `.md` and `.markdown` extensions auto-register
- "Open with MarkRead" appears in context menu
- Double-clicking `.md` files launches MarkRead

**Custom NSIS Script:** `build/installer.nsh`

```nsis
; Custom NSIS installation script
; This file is included by electron-builder's NSIS installer

!macro customInit
  ; Check if a newer version is already installed
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\{com.markread.app}" "DisplayVersion"
  ${If} $0 != ""
    ; Compare versions here if needed
  ${EndIf}
!macroend

!macro customInstall
  ; Add "Open with MarkRead" to context menu
  WriteRegStr HKCU "Software\Classes\*\shell\MarkRead" "" "Open with MarkRead"
  WriteRegStr HKCU "Software\Classes\*\shell\MarkRead" "Icon" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  WriteRegStr HKCU "Software\Classes\*\shell\MarkRead\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'

  ; Associate .md files
  WriteRegStr HKCU "Software\Classes\.md" "" "MarkRead.Document"
  WriteRegStr HKCU "Software\Classes\MarkRead.Document" "" "Markdown File"
  WriteRegStr HKCU "Software\Classes\MarkRead.Document\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCU "Software\Classes\MarkRead.Document\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'

  ; Associate .markdown files
  WriteRegStr HKCU "Software\Classes\.markdown" "" "MarkRead.Document"

  ; Refresh icon cache
  System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
!macroend

!macro customUnInstall
  ; Remove context menu entry
  DeleteRegKey HKCU "Software\Classes\*\shell\MarkRead"

  ; Remove file associations
  DeleteRegKey HKCU "Software\Classes\.md"
  DeleteRegKey HKCU "Software\Classes\.markdown"
  DeleteRegKey HKCU "Software\Classes\MarkRead.Document"

  ; Refresh icon cache
  System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
!macroend
```

---

## Part 6: Future Platform Support

### 🍎 macOS Distribution (Future)

**Requirements:**
- Apple Developer Account ($99/year)
- Code signing certificate (Developer ID Application)
- Notarization via `notarytool`
- DMG installer with drag-to-Applications UX

**electron-builder** already configured (see Part 2) - just need:
```bash
npm run package -- --mac
```

**Auto-update support:** Same `electron-updater` works on macOS

**Distribution options:**
1. **GitHub Releases** (free)
2. **Mac App Store** (requires mas-dev certificate, sandboxing)
3. **Homebrew Cask** (open-source distribution)

### 📱 Mobile Distribution (Long-term)

**Electron does not support mobile natively.** Options:

1. **Capacitor/Ionic** - Wrap web app in native container
   - Reuse React codebase
   - Add Capacitor plugins for file system access
   - Publish to App Store / Google Play

2. **React Native** - Native mobile rewrite
   - Share business logic
   - Rewrite UI with React Native components
   - Better performance, native feel

3. **Progressive Web App (PWA)** - Web-based mobile experience
   - No app store required
   - Limited file system access
   - Add to home screen

**Recommendation:** Evaluate PWA first (minimal investment), then Capacitor if native features needed.

---

## Part 7: Migration Checklist

### Phase 1: Cleanup (Week 1)

- [ ] **Delete legacy WPF artifacts:**
  ```powershell
  Remove-Item -Recurse -Force installer/
  ```

- [ ] **Update .gitignore:** Remove .NET entries, keep Electron

- [ ] **Archive v0.4.1 MSI:** Move to GitHub Releases archive

### Phase 2: Electron Configuration (Week 1-2)

- [ ] **Enhance `electron-builder.yml`** (see Part 2)

- [ ] **Create `scripts/electron-sign.ps1`**

- [ ] **Create `build/installer.nsh`**

- [ ] **Test local packaging:**
  ```bash
  npm run package
  ```

- [ ] **Verify code signing:**
  ```powershell
  .\scripts\verify-signature.ps1 -FilePath "release\0.5.0\MarkRead-Setup-0.5.0.exe"
  ```

### Phase 3: Auto-Update (Week 2)

- [ ] **Install `electron-updater`:**
  ```bash
  npm install electron-updater electron-log
  ```

- [ ] **Update `src/main/index.ts`** (see Part 2)

- [ ] **Create `UpdateNotification` component**

- [ ] **Test update flow:** Mock update server with older version

### Phase 4: CI/CD (Week 2-3)

- [ ] **Replace `.github/workflows/release.yml`**

- [ ] **Update `.github/workflows/ci.yml`**

- [ ] **Configure GitHub Secrets:**
  - `CERT_PFX` (base64-encoded PFX)
  - `CERT_PASSWORD`

- [ ] **Test release workflow:** Create `v0.5.1-beta.1` tag

### Phase 5: Release Scripts (Week 3)

- [ ] **Update `scripts/release.ps1`**

- [ ] **Test dry-run:**
  ```powershell
  .\scripts\release.ps1 -NewVersion "0.5.1" -DryRun
  ```

- [ ] **Document release process in `CONTRIBUTING.md`**

### Phase 6: Testing & Validation (Week 3-4)

- [ ] **Test fresh install:** Uninstall MarkRead, install new .exe

- [ ] **Test upgrade path:** Install v0.5.0, upgrade to v0.5.1

- [ ] **Test auto-update:** Mock update server, trigger update

- [ ] **Test file associations:** Double-click `.md` file

- [ ] **Test code signing:** Verify SmartScreen doesn't block

- [ ] **Test uninstall:** Verify clean removal, data preserved

### Phase 7: Documentation (Week 4)

- [ ] **Update README.md:** Installation instructions

- [ ] **Create `docs/RELEASE.md`:** Release process documentation

- [ ] **Create `docs/BUILDING.md`:** Build instructions

- [ ] **Update `CHANGELOG.md`:** Document packaging changes

---

## Part 8: Cost & Resource Estimates

| Item | Cost | Frequency | Notes |
|------|------|-----------|-------|
| **Code Signing Certificate** | $100-400 | Annual | Already have? |
| **Apple Developer Account** | $99 | Annual | For macOS (future) |
| **GitHub Actions** | Free | - | 2000 min/month free tier |
| **GitHub Releases Hosting** | Free | - | Unlimited bandwidth |
| **Domain (optional)** | $10 | Annual | For update server |
| **Developer Time** | 40-60 hours | One-time | Migration effort |

**Total one-time cost:** ~$0-400 (if new certificate needed)
**Ongoing annual cost:** ~$100-500

---

## Part 9: Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Code signing issues** | Medium | High | Test thoroughly in CI/CD before release |
| **Auto-update bugs** | Medium | Medium | Implement rollback mechanism, staged rollout |
| **Windows Defender false positives** | Low | Medium | Submit to Microsoft for analysis |
| **Large installer size** | Low | Low | Use ASAR, compression, tree-shaking |
| **Breaking changes in electron-builder** | Low | Low | Pin versions, test upgrades in staging |
| **Certificate expiration** | Low | High | Set calendar reminder 2 months before |

---

## Part 10: Success Metrics

**Post-Migration KPIs:**

1. **Installer Size:** < 100 MB (current v0.4.1 MSI: ~4 MB, expect growth)
2. **Installation Time:** < 30 seconds
3. **Update Success Rate:** > 95%
4. **SmartScreen Warnings:** 0% (with valid code signature)
5. **GitHub Actions Build Time:** < 10 minutes
6. **Release Process Time:** < 15 minutes (from tag to published)

---

## Part 11: Recommended Immediate Next Steps

1. **Run cleanup:**
   ```powershell
   Remove-Item -Recurse -Force installer/
   ```

2. **Test current packaging:**
   ```bash
   npm run package
   ```

3. **Review output in `release/` directory**

4. **If successful, proceed with enhanced config (Part 2)**

5. **Set up code signing locally before CI/CD**

---

## Appendix: Useful Commands

```bash
# Local development
npm run dev                    # Start Electron in dev mode
npm run build                  # Build TypeScript/React
npm run package                # Package with electron-builder

# Testing
npm test                       # Run Jest tests
npm run lint                   # ESLint
npm run type-check             # TypeScript validation

# Release
.\scripts\release.ps1 -NewVersion "0.5.1"
git push origin main
git push origin v0.5.1

# Code signing verification
signtool verify /pa /v .\release\0.5.0\MarkRead-Setup-0.5.0.exe

# Check for updates manually (Electron console)
require('electron').ipcRenderer.invoke('check-for-updates')
```

---

## Appendix: Further Reading

- [electron-builder Documentation](https://www.electron.build/)
- [electron-updater Guide](https://www.electron.build/auto-update)
- [Code Signing Best Practices](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)
- [NSIS Documentation](https://nsis.sourceforge.io/Docs/)
- [Windows App Certification Kit](https://developer.microsoft.com/en-us/windows/develop/app-certification-kit)

---
