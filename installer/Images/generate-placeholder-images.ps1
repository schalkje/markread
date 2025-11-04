# Generate MSIX Package Images
# This script creates placeholder images for the MSIX package
# Replace these with your actual branding images

$imagesDir = $PSScriptRoot

# Required image sizes for MSIX
$images = @{
    "Square44x44Logo.png" = 44
    "Square150x150Logo.png" = 150
    "Wide310x150Logo.png" = @(310, 150)
    "StoreLogo.png" = 50
    "SplashScreen.png" = @(620, 300)
}

Write-Host "Creating placeholder images for MSIX package..." -ForegroundColor Cyan
Write-Host "Note: Replace these with your actual branded images" -ForegroundColor Yellow
Write-Host ""

# Create a simple colored PNG using .NET
Add-Type -AssemblyName System.Drawing

foreach ($imageName in $images.Keys) {
    $size = $images[$imageName]
    
    if ($size -is [array]) {
        $width = $size[0]
        $height = $size[1]
    } else {
        $width = $size
        $height = $size
    }
    
    $imagePath = Join-Path $imagesDir $imageName
    
    if (Test-Path $imagePath) {
        Write-Host "Skipping $imageName (already exists)" -ForegroundColor Gray
        continue
    }
    
    # Create a bitmap with a blue background and white text
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Fill with blue background
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 120, 212))
    $graphics.FillRectangle($brush, 0, 0, $width, $height)
    
    # Add "MR" text in the center
    $font = New-Object System.Drawing.Font("Segoe UI", [Math]::Min($width, $height) / 4, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $text = "MR"
    $textSize = $graphics.MeasureString($text, $font)
    $x = ($width - $textSize.Width) / 2
    $y = ($height - $textSize.Height) / 2
    $graphics.DrawString($text, $font, $textBrush, $x, $y)
    
    # Save the image
    $bitmap.Save($imagePath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Cleanup
    $graphics.Dispose()
    $bitmap.Dispose()
    $brush.Dispose()
    $textBrush.Dispose()
    $font.Dispose()
    
    Write-Host "Created $imageName ($width x $height)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done! Please replace these placeholder images with your actual branding." -ForegroundColor Cyan
