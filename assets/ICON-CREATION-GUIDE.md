# Creating Icons for MarkRead

## Quick Option: Use Existing Icon Template

### Step 1: Download a Markdown Icon

Visit one of these sites and download a markdown icon:

1. **Icons8** (https://icons8.com)
   - Search for "markdown" or "md file"
   - Download PNG at 256x256
   - Free with attribution

2. **Flaticon** (https://www.flaticon.com)
   - Search for "markdown"
   - Download PNG at 512x512
   - Free with attribution

3. **Create Your Own**
   - Simple "M" letter in modern font
   - Use blue/purple gradient
   - Dark background works well

### Step 2: Convert PNG to ICO

**Option A: Online Converter (Easiest)**

1. Go to https://www.icoconverter.com/
2. Upload your PNG
3. Select all sizes: 16, 32, 48, 64, 128, 256
4. Click "Convert ICO"
5. Download and save as `assets/icon.ico`

**Option B: Using GIMP (Free Software)**

1. Install GIMP (https://www.gimp.org/)
2. Open your PNG
3. Scale to 256x256 (Image > Scale Image)
4. Export As > Save as `.ico`
5. In dialog, check all sizes
6. Save to `assets/icon.ico`

**Option C: Using ImageMagick (Command Line)**

```powershell
# Install ImageMagick first: https://imagemagick.org/

# Convert PNG to ICO with multiple sizes
magick convert icon-source.png -define icon:auto-resize=256,128,64,48,32,16 assets\icon.ico
```

### Step 3: Copy for PNG Version

```powershell
# Simply copy your source PNG as icon.png
Copy-Item "your-source-icon.png" -Destination "assets\icon.png"

# Or resize if needed
# Using ImageMagick:
magick convert your-source-icon.png -resize 256x256 assets\icon.png
```

## Design Recommendations

### Color Scheme
- **Primary:** Blue (#0078D6) - matches Windows
- **Accent:** Purple/Violet (#7B68EE) - markdown themed
- **Background:** Dark (#1E1E1E) or Transparent

### Style
- Modern, flat design
- Simple and recognizable at small sizes
- Clear at 16x16 pixels
- Markdown "M" or document icon
- Optional: Small down-arrow symbol (markdown reference)

### Examples of Good Icon Concepts

1. **Letter M** - Bold sans-serif "M" on colored background
2. **Document** - Page with markdown syntax visible
3. **Down Arrow + Document** - Markdown reference symbol
4. **M with Down Arrow** - Combines both concepts

## Verify Your Icons

After creating, test them:

```powershell
# Check icon file is valid
Get-Item assets\icon.ico
Get-Item assets\icon.png

# Verify sizes (should be >10KB for ICO with multiple sizes)
(Get-Item assets\icon.ico).Length
(Get-Item assets\icon.png).Length
```

## Current Status

```
assets/
├── ✅ License.rtf           (Created)
├── ⚠️  icon.ico             (Need to create - REQUIRED)
├── ⚠️  icon.png             (Need to create - REQUIRED)
├── ⬜ installer-banner.bmp  (Optional - commented out in Package.wxs)
└── ⬜ installer-dialog.bmp  (Optional - commented out in Package.wxs)
```

## Using a Temporary/Test Icon

If you want to build immediately without designing an icon:

1. Find any PNG image
2. Convert to ICO (any size will work for testing)
3. Copy as both icon.ico and icon.png
4. Build and test installer
5. Replace with proper icon later

```powershell
# Example with Windows default icon (testing only)
# Note: This won't look professional, just for testing builds

# Find a system icon and copy it
Copy-Item "C:\Windows\System32\imageres.dll" -Destination "temp.dll"
# Extract icon using online tool or icon extractor software
# Save as assets\icon.ico and assets\icon.png
```

## Need Help?

- **Can't create icon?** Ask in GitHub issues, someone might contribute one
- **Don't have image software?** Use the online converters (easiest)
- **Want custom design?** Hire from Fiverr/Upwork (5-20 USD typically)

## Next After Icons

Once icons are created:

```powershell
# 1. Verify files exist
Get-ChildItem assets\

# 2. Build the installer
dotnet build --configuration Release

# 3. Test the MSI
msiexec /i "src\Installer\bin\Release\MarkRead-0.1.0-x64.msi"
```

---

**Icon creation blocking the build?** It's the only remaining requirement before your first MSI build!
