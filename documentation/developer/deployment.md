# Deployment

> 📍 **Navigation**: [Home](../../../README.md) → [Documentation](../../README.md) → [Developer](../) → Deployment

Guide for deploying and distributing MarkRead.

## Build for Release

### Clean Release Build

```powershell
# Clean previous builds
dotnet clean --configuration Release

# Restore dependencies
dotnet restore

# Build release version
dotnet build --configuration Release --no-restore

# Run tests
dotnet test --configuration Release --no-build
```

### Output Location

```
bin/Release/net8.0-windows/
├── MarkRead.App.exe
├── MarkRead.App.dll
├── MarkRead.App.pdb (optional)
├── Markdig.dll
├── Microsoft.Web.WebView2.*.dll
└── runtimes/
```

## Publishing

### Self-Contained Deployment

Includes .NET runtime (no installation required):

```powershell
dotnet publish src/App/MarkRead.csproj `
  --configuration Release `
  --runtime win-x64 `
  --self-contained true `
  --output ./publish/win-x64
```

### Framework-Dependent Deployment

Requires .NET 8 installed:

```powershell
dotnet publish src/App/MarkRead.csproj `
  --configuration Release `
  --runtime win-x64 `
  --self-contained false `
  --output ./publish/win-x64-fdd
```

### Single-File Deployment

```powershell
dotnet publish src/App/MarkRead.csproj `
  --configuration Release `
  --runtime win-x64 `
  --self-contained true `
  --output ./publish/single-file `
  /p:PublishSingleFile=true `
  /p:IncludeNativeLibrariesForSelfExtract=true
```

## Deployment Options

### Option 1: Portable ZIP

Create portable archive:

```powershell
# Build
dotnet publish -c Release -r win-x64 --self-contained true

# Create ZIP
Compress-Archive -Path ./publish/win-x64/* -DestinationPath MarkRead-v1.0.0-win-x64.zip
```

**Pros:**
- No installer needed
- Easy to update
- Run from anywhere

**Cons:**
- Manual extraction
- No Start Menu entry
- No file associations

### Option 2: Windows Installer (MSI)

Using WiX Toolset:

```xml
<!-- Product.wxs -->
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="*" 
           Name="MarkRead" 
           Version="1.0.0" 
           Manufacturer="Your Company"
           UpgradeCode="PUT-GUID-HERE">
    
    <Package InstallerVersion="500" 
             Compressed="yes" 
             InstallScope="perMachine" />
    
    <MediaTemplate EmbedCab="yes" />
    
    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFilesFolder">
        <Directory Id="INSTALLFOLDER" Name="MarkRead" />
      </Directory>
    </Directory>
    
    <ComponentGroup Id="ProductComponents" Directory="INSTALLFOLDER">
      <!-- Add files here -->
    </ComponentGroup>
    
    <Feature Id="ProductFeature" Level="1">
      <ComponentGroupRef Id="ProductComponents" />
    </Feature>
  </Product>
</Wix>
```

### Option 3: Microsoft Store

Package as MSIX for Microsoft Store:

```powershell
# Create MSIX package
MakeAppx pack /d ./publish/win-x64 /p MarkRead.msix

# Sign package
SignTool sign /fd SHA256 /a /f certificate.pfx MarkRead.msix
```

## Deployment Checklist

- [ ] Version number updated
- [ ] Release notes prepared
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Dependencies verified
- [ ] Code signing certificate ready
- [ ] Installer tested
- [ ] Virus scan clean
- [ ] README updated

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH

Example: 1.2.3
- 1 = Major version
- 2 = Minor version
- 3 = Patch version
```

Update in `.csproj`:

```xml
<PropertyGroup>
  <Version>1.2.3</Version>
  <AssemblyVersion>1.2.3.0</AssemblyVersion>
  <FileVersion>1.2.3.0</FileVersion>
</PropertyGroup>
```

## Code Signing

### Why Sign Code?

- Proves authenticity
- Prevents tampering
- Avoids security warnings
- Required for Store

### Signing Process

```powershell
# Get certificate (from CA or self-signed for testing)

# Sign executable
SignTool sign /fd SHA256 /a /f certificate.pfx /p password MarkRead.App.exe

# Verify signature
SignTool verify /pa MarkRead.App.exe
```

## Distribution Channels

### GitHub Releases

1. Tag release: `git tag v1.0.0`
2. Push tag: `git push origin v1.0.0`
3. Create GitHub Release
4. Upload binaries (ZIP, installer)
5. Write release notes

### Microsoft Store

1. Create app listing
2. Package as MSIX
3. Submit for certification
4. Publish when approved

### Direct Download

Host on your website:
- Provide download links
- Include checksums (SHA256)
- Document installation steps
- Auto-update mechanism

## Auto-Update

### Checking for Updates

```csharp
public class UpdateService
{
    private const string UPDATE_URL = "https://example.com/api/version";
    
    public async Task<Version> CheckForUpdatesAsync()
    {
        using var client = new HttpClient();
        var response = await client.GetStringAsync(UPDATE_URL);
        var latestVersion = JsonSerializer.Deserialize<VersionInfo>(response);
        
        var currentVersion = Assembly.GetExecutingAssembly().GetName().Version;
        
        return latestVersion.Version > currentVersion 
            ? latestVersion.Version 
            : null;
    }
}
```

### Update Strategies

1. **Manual**: User downloads and installs
2. **In-app**: Download and install automatically
3. **Store**: Microsoft Store handles updates

## Continuous Deployment

### GitHub Actions

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: windows-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: 8.0.x
      
      - name: Publish
        run: |
          dotnet publish -c Release -r win-x64 --self-contained true
      
      - name: Create ZIP
        run: |
          Compress-Archive -Path ./publish/win-x64/* -DestinationPath MarkRead.zip
      
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
      
      - name: Upload Asset
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ./MarkRead.zip
          asset_name: MarkRead-${{ github.ref }}-win-x64.zip
          asset_content_type: application/zip
```

## Post-Release

1. Monitor for issues
2. Respond to feedback
3. Plan next release
4. Update roadmap

## See Also

- [Build Process](build-process.md)
- [Testing](testing.md)
- [Contributing](contributing.md)
