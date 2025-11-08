#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test the CHANGELOG editor workflow from release.ps1

.DESCRIPTION
    This script demonstrates how the CHANGELOG editor feature works.
    It creates a temporary template file and opens it in your editor.
    
.EXAMPLE
    .\scripts\test-changelog-editor.ps1
#>

$ErrorActionPreference = "Stop"

# Colors
$Green = "`e[32m"
$Cyan = "`e[36m"
$Bold = "`e[1m"
$Reset = "`e[0m"

Write-Host ""
Write-Host "${Bold}${Cyan}Testing CHANGELOG Editor Workflow${Reset}"
Write-Host ""

# Create a temporary file with template
$tempFile = [System.IO.Path]::GetTempFileName()
$tempMdFile = $tempFile -replace '\.tmp$', '.md'
Move-Item -Path $tempFile -Destination $tempMdFile -Force

$version = "0.2.0"
$today = Get-Date -Format "yyyy-MM-dd"

# Create template content
$template = @"
# Release Notes for v$version
# 
# Edit the sections below. Lines starting with # are comments and will be ignored.
# Delete sections you don't need. Save and close the editor to continue.
# 
# Format:
#   - Use bullet points (-)
#   - Be clear and concise
#   - Write for end users, not developers
#

## [$version] - $today

### Added
- 

### Changed
- 

### Fixed
- 

### Security
- 

"@

Set-Content -Path $tempMdFile -Value $template

Write-Host "Template file created: ${Cyan}$tempMdFile${Reset}"
Write-Host ""
Write-Host "Instructions:"
Write-Host "  1. The editor will open with a template"
Write-Host "  2. Edit the release notes"
Write-Host "  3. Remove empty sections (or add content)"
Write-Host "  4. Save and close the editor"
Write-Host "  5. The script will show what it extracted"
Write-Host ""

# Detect editor
$editor = $null
$editorName = ""

if (Get-Command code -ErrorAction SilentlyContinue) {
    $editor = "code"
    $editorName = "VS Code"
    $editorArgs = @("--wait", $tempMdFile)
} elseif (Get-Command notepad++ -ErrorAction SilentlyContinue) {
    $editor = "notepad++"
    $editorName = "Notepad++"
    $editorArgs = @($tempMdFile)
} else {
    $editor = "notepad.exe"
    $editorName = "Notepad"
    $editorArgs = @($tempMdFile)
}

Write-Host "${Green}Opening in $editorName...${Reset}"
Write-Host "${Cyan}(waiting for you to close)${Reset}"
Write-Host ""

# Open editor and wait
if ($editor -eq "code") {
    & $editor @editorArgs
} else {
    Start-Process -FilePath $editor -ArgumentList $editorArgs -Wait
}

Write-Host "${Green}✅ Editor closed${Reset}"
Write-Host ""

# Read and process the content
$editedContent = Get-Content $tempMdFile -Raw

Write-Host "${Bold}Raw content from editor:${Reset}"
Write-Host "${Cyan}$("-" * 70)${Reset}"
Write-Host $editedContent
Write-Host "${Cyan}$("-" * 70)${Reset}"
Write-Host ""

# Process: Remove comment lines
$lines = $editedContent -split "`r?`n"
$cleanedLines = $lines | Where-Object { 
    $_ -notmatch '^\s*#' -and  # Remove comment lines
    $_ -notmatch '^\s*$' -or   # But keep non-empty lines
    $_ -match '^#{2,}'          # Keep markdown headers
}

$entry = ($cleanedLines -join "`n") -replace '(?m)^\s*$\n\s*$\n', "`n"
$entry = $entry.Trim()

Write-Host "${Bold}Processed content (after removing comments):${Reset}"
Write-Host "${Cyan}$("-" * 70)${Reset}"
Write-Host $entry
Write-Host "${Cyan}$("-" * 70)${Reset}"
Write-Host ""

if ($entry.Length -gt 50) {
    Write-Host "${Green}✅ Content detected (${entry.Length} chars)${Reset}"
    Write-Host ""
    Write-Host "This would be added to CHANGELOG.md"
} else {
    Write-Host "${Cyan}⚠️  No substantial content (${entry.Length} chars)${Reset}"
    Write-Host ""
    Write-Host "In the real script, you'd be asked to edit again or skip"
}

# Clean up
Remove-Item -Path $tempMdFile -Force -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "${Green}Test completed!${Reset}"
Write-Host ""
