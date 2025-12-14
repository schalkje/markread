# For Windows with MAUI
Write-Host "=" * 71 -ForegroundColor Cyan
Write-Host "  MAUI Windows App - Local Development" -ForegroundColor Cyan
Write-Host "=" * 71 -ForegroundColor Cyan
Write-Host ""

Write-Host "Building and running with dotnet..." -ForegroundColor Cyan
Write-Host "Note: Using 'dotnet run' ensures proper Windows App SDK initialization" -ForegroundColor Gray
Write-Host ""

# Use dotnet run which handles MAUI startup properly
dotnet run --project src/MarkRead.csproj --framework net10.0-windows10.0.19041.0

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}