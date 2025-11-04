# MSIX Packaging Build Error - Resolution

## Problem

The original MSIX build failed with:

```
error MSB4019: The imported project "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\DesktopBridge\Microsoft.DesktopBridge.props" was not found.
```

This error occurs because the **Windows Application Packaging (WAP) project** requires the **Universal Windows Platform (UWP) development** workload, which is not installed in your Visual Studio.

## Solution

I've created an **alternative SDK-based build method** that doesn't require the UWP workload. This is now the recommended approach.

### Prerequisites Check

First, check what you have installed:

```powershell
cd c:\repo\markread\installer
.\check-prerequisites.ps1
```

Current status (based on your system):
- ✓ .NET 8 SDK: Installed (8.0.303)
- ✗ Windows SDK: **Not installed** (required)
- ✓ Visual Studio 2022: Installed (but UWP workload missing)

## Installation Options

### Option 1: Install Windows SDK (Recommended)

This enables the **SDK build method** which is simpler and doesn't require Visual Studio workloads.

```powershell
# Quick install via winget
winget install Microsoft.WindowsSDK.10.0.22621
```

After installing, you can build with:

```powershell
cd c:\repo\markread\installer
.\build-msix-sdk.ps1 -Version "1.0.0.0" -Configuration Release
```

**Advantages:**
- No Visual Studio workload required
- Uses standard Windows SDK tools (`makeappx.exe`)
- Faster to set up
- Works on build servers without full VS install

### Option 2: Install UWP Workload in Visual Studio

This enables the **WAP build method** (the original approach).

1. Open **Visual Studio Installer**
2. Click **Modify** on your Visual Studio 2022 installation
3. Go to **Workloads** tab
4. Check **Universal Windows Platform development**
5. Click **Modify** to install (this will take 10-20 minutes)

After installing, you can build with:

```powershell
cd c:\repo\markread\installer
.\build-installer.ps1 -Version "1.0.0.0" -Configuration Release
```

**Disadvantages:**
- Requires large UWP workload installation (~5 GB)
- Slower to set up
- Requires full Visual Studio

## Build Scripts

### New: `build-msix-sdk.ps1` (Recommended)
- Uses Windows SDK tools directly
- No Visual Studio workloads required
- Creates MSIX package from published .NET app

### Original: `build-installer.ps1`
- Uses Windows Application Packaging Project (.wapproj)
- Requires Visual Studio with UWP workload
- Uses MSBuild with DesktopBridge SDK

### Helper: `check-prerequisites.ps1`
- Diagnoses which tools are installed
- Provides installation guidance
- Recommends which build method to use

## Quick Start

### Recommended Path (Windows SDK)

```powershell
# 1. Install Windows SDK
winget install Microsoft.WindowsSDK.10.0.22621

# 2. Verify installation
.\check-prerequisites.ps1

# 3. Build MSIX package
.\build-msix-sdk.ps1 -Version "1.0.0.0" -Configuration Release
```

### Alternative Path (Visual Studio UWP)

```powershell
# 1. Install UWP workload via Visual Studio Installer
# (Manual step in GUI)

# 2. Verify installation
.\check-prerequisites.ps1

# 3. Build MSIX package
.\build-installer.ps1 -Version "1.0.0.0" -Configuration Release
```

## Files Created

```
installer/
├── build-msix-sdk.ps1         # NEW: SDK-based build (recommended)
├── build-installer.ps1         # ORIGINAL: WAP-based build
├── check-prerequisites.ps1     # NEW: Diagnostic tool
├── MarkRead.Package.wapproj   # WAP project (for original method)
├── Package.appxmanifest       # MSIX manifest
└── README.md                   # Updated documentation
```

## Testing the Package

After building, the package will be in `AppPackages/`:

```
AppPackages/
└── MarkRead_1.0.0.0_x64_Release/
    ├── MarkRead_1.0.0.0_x64.msix     # The package
    └── build-summary.txt              # Build details
```

To install:
1. Enable **Developer Mode** in Windows Settings
2. Right-click the `.msix` file
3. Select **Install**

## Documentation Updated

The `installer/README.md` has been updated with:
- Both build methods documented
- Clear prerequisites for each method
- Installation instructions for Windows SDK
- Troubleshooting section expanded

## Next Steps

1. **Install Windows SDK** (recommended):
   ```powershell
   winget install Microsoft.WindowsSDK.10.0.22621
   ```

2. **Run prerequisite check**:
   ```powershell
   .\check-prerequisites.ps1
   ```

3. **Build the package**:
   ```powershell
   .\build-msix-sdk.ps1 -Version "1.0.0.0"
   ```

4. **Test the installation** on your machine

## For CI/CD

The SDK method is better suited for GitHub Actions or other CI/CD pipelines because:
- Smaller install footprint
- Faster setup time
- More reliable in automated environments
- Doesn't require full Visual Studio

You can add Windows SDK to your CI workflow with:
```yaml
- name: Install Windows SDK
  run: winget install Microsoft.WindowsSDK.10.0.22621 --silent --accept-package-agreements
```
