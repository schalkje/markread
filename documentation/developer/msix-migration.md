# MSIX Packaging for MAUI Migration

This document describes the transition from WiX MSI to MSIX packaging for MarkRead.

## Why MSIX?

The MAUI migration required updating the packaging strategy because:

1. **MAUI Architecture**: MAUI apps have different output structure than WPF
2. **Modern Windows**: MSIX is the recommended packaging format for Windows 10/11
3. **Better Integration**: MSIX provides better OS integration (Start Menu, file associations, command-line aliases)
4. **Cleaner Installation**: Isolated installation with automatic uninstall
5. **Update Support**: Built-in update mechanism

## Migration Timeline

### Before (WPF + MSI)
- WiX Toolset for MSI generation
- Manual file harvesting
- Complex dependency management
- Package: `installer/bin/Release/MarkRead.msi`

### After (MAUI + MSIX)
- Native .NET publish with MSIX support
- Automatic dependency bundling
- Simplified build process
- Package: `src/bin/Release/.../MarkRead.msix`

## What Changed

### Project Configuration

**MarkRead.csproj** now includes:

```xml
<WindowsPackageType>MSIX</WindowsPackageType>
<WindowsAppSDKSelfContained>true</WindowsAppSDKSelfContained>
<AppxPackageSigningEnabled>true</AppxPackageSigningEnabled>
```

### Manifest File

**Package.appxmanifest** defines:
- Application identity
- File associations (.md, .markdown)
- Command-line execution alias (`markread.exe`)
- Visual assets and branding
- Required capabilities

### Build Scripts

New PowerShell scripts:
- `scripts/build-msix.ps1` - Build and sign MSIX
- `scripts/install-msix.ps1` - Install MSIX locally

### GitHub Actions

New workflow: `.github/workflows/release-msix.yml`
- Builds for x64 and arm64
- Signs with certificate from secrets
- Creates GitHub releases with MSIX assets

## Certificate Requirements

### Development (Self-Signed)

```powershell
.\scripts\create-certificate.ps1 -SubjectName "CN=schalken.net"
```

The subject **must match** the `Publisher` in `Package.appxmanifest`:

```xml
<Identity Name="com.schalken.markread" Publisher="CN=schalken.net" .../>
```

### Production

For public distribution, use:
1. Certificate from trusted CA (DigiCert, Sectigo, etc.)
2. Microsoft Store signing (automatic)

## Installation Process

### MSIX vs MSI

| Aspect | MSI (Old) | MSIX (New) |
|--------|-----------|------------|
| **Installation Location** | `C:\Program Files\MarkRead` | `C:\Program Files\WindowsApps\com.schalken.markread_*` |
| **Uninstall** | Add/Remove Programs | Settings > Apps or Add/Remove Programs |
| **Updates** | Manual MSI | Automatic update support |
| **File Associations** | Registry entries | Declared in manifest |
| **Command-Line** | Added to PATH | Execution alias |
| **Requires Admin** | Yes | No (per-user mode) |

### Trust Model

MSIX packages require trusted certificates:

1. **Self-signed** (Development):
   - Must manually trust certificate
   - Install to "Trusted People" store
   - Required only on first install

2. **CA-signed** (Production):
   - Automatically trusted
   - No user intervention needed

## Command-Line Support

Both MSI and MSIX support command-line arguments, but differently:

### MSI Approach
- Executable in `C:\Program Files\MarkRead\MarkRead.exe`
- Added to PATH during installation
- Direct executable invocation

### MSIX Approach
- Execution alias defined in manifest:
  ```xml
  <uap5:ExecutionAlias Alias="markread.exe" />
  ```
- Automatically added to PATH
- Resolves to packaged executable

**Usage** (identical for both):
```powershell
markread README.md
markread C:\MyDocs
markread .
```

## Build Comparison

### Old Process (MSI)

```powershell
# 1. Build app
dotnet build markread.sln --configuration Release

# 2. Build installer (separate project)
dotnet build installer/MarkRead.Installer.wixproj --configuration Release

# 3. Sign MSI
signtool sign /f cert.pfx /p password installer/bin/Release/MarkRead.msi
```

### New Process (MSIX)

```powershell
# Single command builds and signs
dotnet publish src/MarkRead.csproj `
  -c Release `
  -r win-x64 `
  /p:WindowsPackageType=MSIX `
  /p:PackageCertificateThumbprint=THUMBPRINT
```

Or use the helper script:
```powershell
.\scripts\build-msix.ps1
```

## File Structure Comparison

### MSI Output
```
installer/
└── bin/
    └── Release/
        └── MarkRead.msi  (~600 KB)
```

### MSIX Output
```
src/
└── bin/
    └── Release/
        └── net10.0-windows10.0.19041.0/
            └── win-x64/
                └── MarkRead.msix  (~50-100 MB)
```

**Note**: MSIX is larger because it includes all dependencies (self-contained).

## Transition Checklist

If you're migrating from the old WPF/MSI version:

- [ ] Uninstall old MSI version
- [ ] Remove old MarkRead from Program Files
- [ ] Install MSIX package
- [ ] Verify command-line works: `markread --version`
- [ ] Test file associations (double-click .md files)
- [ ] Remove old certificates (if using new ones)

## Backwards Compatibility

### Breaking Changes

1. **Installation Location**: App is in WindowsApps (protected)
2. **Uninstall Process**: Use Settings > Apps instead of legacy uninstaller
3. **Certificate**: Different signing certificate

### Compatible Features

✅ Command-line arguments (same syntax)  
✅ File associations (.md, .markdown)  
✅ Settings and configuration (compatible format)  
✅ All application features  

## Future Considerations

### Microsoft Store

MSIX packages can be published to Microsoft Store:

1. Update manifest with Store identity
2. Use Store certificate
3. Submit through Partner Center
4. Automatic updates for users

### App Installer

Future enhancement: Publish `.appinstaller` file for web-based installation:

```xml
<AppInstaller>
  <MainPackage Name="com.schalken.markread"
               Publisher="CN=schalken.net"
               Version="0.1.0.0"
               Uri="https://releases.example.com/MarkRead.msix" />
  <UpdateSettings>
    <OnLaunch HoursBetweenUpdateChecks="24" />
  </UpdateSettings>
</AppInstaller>
```

Users can install via:
```powershell
Add-AppxPackage -AppInstallerFile "https://releases.example.com/MarkRead.appinstaller"
```

## Troubleshooting Migration

### "Cannot remove old version"

```powershell
# List all MarkRead installations
Get-AppxPackage | Where-Object {$_.Name -like "*markread*"}

# Remove MSIX version
Remove-AppxPackage -Package "com.schalken.markread_*"

# Uninstall MSI version
# Use Add/Remove Programs or:
msiexec /x {PRODUCT-CODE-GUID}
```

### Certificate Conflicts

```powershell
# List all MarkRead certificates
Get-ChildItem Cert:\CurrentUser\My | Where-Object {$_.Subject -like "*MarkRead*"}
Get-ChildItem Cert:\LocalMachine\TrustedPeople | Where-Object {$_.Subject -like "*MarkRead*"}

# Remove old certificates
Remove-Item Cert:\CurrentUser\My\THUMBPRINT
```

### Command Not Found

After MSIX installation, if `markread` command doesn't work:

1. **Re-login** to Windows (refreshes PATH)
2. **Check installation**:
   ```powershell
   Get-AppxPackage -Name "com.schalken.markread"
   ```
3. **Use full path** temporarily:
   ```powershell
   explorer.exe shell:AppsFolder\$(Get-AppxPackage com.schalken.markread).PackageFamilyName!App
   ```

## References

- [QUICKSTART-MSIX.md](../QUICKSTART-MSIX.md) - Quick start guide
- [Microsoft MSIX Documentation](https://learn.microsoft.com/en-us/windows/msix/)
- [MAUI Windows Packaging](https://learn.microsoft.com/en-us/dotnet/maui/windows/deployment/)
- [Package.appxmanifest Reference](https://learn.microsoft.com/en-us/uwp/schemas/appxpackage/appx-package-manifest)

## Questions?

For issues or questions about MSIX packaging:
1. Check [QUICKSTART-MSIX.md](../QUICKSTART-MSIX.md)
2. Review [GitHub Issues](https://github.com/schalkje/markread/issues)
3. See [Microsoft MSIX Troubleshooting](https://learn.microsoft.com/en-us/windows/msix/troubleshooting)
