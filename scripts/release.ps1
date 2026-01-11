#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automated release script for MarkRead Electron application.

.DESCRIPTION
    This script automates the entire release process:
    - Reads current version from package.json
    - Prompts for new version (with validation)
    - Updates package.json
    - Prompts for CHANGELOG.md entry
    - Runs tests and builds
    - Commits changes
    - Creates git tag
    - Provides push instructions

.PARAMETER NewVersion
    The version to release (e.g., "0.5.1"). If not provided, prompts interactively.

.PARAMETER DryRun
    Show what would be done without making any changes

.EXAMPLE
    .\scripts\release.ps1 -NewVersion "0.5.1"
    Release version 0.5.1

.EXAMPLE
    .\scripts\release.ps1 -NewVersion "0.5.1" -DryRun
    Preview what would happen without making changes
#>

param(
    [Parameter(Mandatory=$false, HelpMessage="Version to release (e.g., 0.5.1)")]
    [string]$NewVersion,

    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "================================================================"
    Write-Host "  $Message"
    Write-Host "================================================================"
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host "▶ $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Main execution starts here
Write-Header "MarkRead Release Script"

if ($DryRun) {
    Write-Warning "DRY RUN MODE - No changes will be made"
}

# Implementation will be completed in Phase 8 (US6):
# - T062: Version validation (semver format check)
# - T063: package.json version update
# - T064: CHANGELOG.md prompt
# - T065: Test/lint/build execution
# - T066: Git commit and tag creation
# - T067: Push instructions output
# - T068: Dry-run mode implementation
# - T069: Duplicate version check

Write-Step "Reading current version from package.json..."
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version
Write-Success "Current version: $currentVersion"

if (-not $NewVersion) {
    $NewVersion = Read-Host "Enter new version (current: $currentVersion)"
}

Write-Step "New version: $NewVersion"

if ($DryRun) {
    Write-Warning "Would update package.json version to $NewVersion"
    Write-Warning "Would prompt for CHANGELOG.md edits"
    Write-Warning "Would run tests, lint, and build"
    Write-Warning "Would create git commit and tag v$NewVersion"
    Write-Warning "Would show push instructions"
}
else {
    Write-Error-Custom "Full release implementation not yet complete (Phase 8 - US6)"
    Write-Host "Please wait for US6 implementation or use git commands manually:"
    Write-Host "  1. Update package.json version manually"
    Write-Host "  2. Edit CHANGELOG.md"
    Write-Host "  3. Run: npm run type-check && npm run lint && npm test && npm run build"
    Write-Host "  4. Run: git add . && git commit -m 'chore: Release v$NewVersion'"
    Write-Host "  5. Run: git tag v$NewVersion"
    Write-Host "  6. Run: git push origin main --tags"
    exit 1
}
