# Assets Directory

This directory contains assets used for building the MSI installer.

## Required Files

Before building the MSI installer, you need to create these files:

### icon.ico
- **Purpose:** Application icon (Windows .ico format)
- **Sizes:** 256x256, 128x128, 64x64, 48x48, 32x32, 16x16
- **Tool:** Use an online converter or tool like GIMP, Paint.NET, or IcoFX
- **Design:** Simple "M" or markdown icon with modern look

### icon.png  
- **Purpose:** Package icon for GitHub/winget
- **Size:** 256x256 PNG
- **Design:** Same design as icon.ico

### License.rtf
- **Purpose:** License text displayed in MSI installer
- **Format:** Rich Text Format
- **Content:** Copy of MIT License formatted for installer

### installer-banner.bmp
- **Purpose:** Top banner in MSI installer dialogs
- **Size:** 493 x 58 pixels
- **Format:** 24-bit BMP
- **Design:** MarkRead branding/logo on white or light background

### installer-dialog.bmp
- **Purpose:** Left side image in MSI installer dialogs  
- **Size:** 493 x 312 pixels
- **Format:** 24-bit BMP
- **Design:** MarkRead branding/promotional image

## Creating Placeholders

For testing, you can create placeholder files:

### Windows PowerShell commands:

```powershell
# Create a simple placeholder ICO (you'll want to replace this with a real icon)
# Note: This requires a proper icon editor or online tool

# Create placeholder RTF license
@'
{\rtf1\ansi\deff0
{\fonttbl{\f0 Courier New;}}
\f0\fs20
MIT License

Copyright (c) 2025 MarkRead Project

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
}
'@ | Out-File -FilePath "License.rtf" -Encoding ASCII
```

## Tools for Creating Assets

- **Icon creation:** 
  - [GIMP](https://www.gimp.org/) - Free, powerful image editor
  - [Paint.NET](https://www.getpaint.net/) - Free Windows image editor
  - [ICO Convert](https://www.icoconverter.com/) - Online ICO converter

- **Bitmap creation:**
  - Any image editor (GIMP, Paint.NET, Photoshop)
  - Must save as 24-bit BMP

- **RTF editing:**
  - WordPad (Windows built-in)
  - Microsoft Word
  - Any text editor (for simple RTF)

## Current Status

⚠️ **TODO:** These files need to be created before building the MSI installer.

The installer will fail without these files. For initial testing, you can:
1. Comment out the WixVariable lines in Package.wxs
2. Use default WiX images (less professional but functional)
3. Create simple placeholder images as noted above
