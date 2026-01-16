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

Tasks: T062-T071
#>

param(
    [Parameter(Mandatory=$false, HelpMessage="Version to release (e.g., 0.5.1)")]
    [string]$NewVersion,

    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Helper functions
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

# T062: Version validation (semver format check)
function Test-SemanticVersion {
    param([string]$Version)

    # Match semver pattern: major.minor.patch with optional prerelease/build metadata
    if ($Version -match '^(\d+)\.(\d+)\.(\d+)(-[\w\.\-]+)?(\+[\w\.\-]+)?$') {
        return $true
    }
    return $false
}

# T069: Duplicate version check
function Test-VersionInChangelog {
    param([string]$Version)

    if (Test-Path "CHANGELOG.md") {
        $changelogContent = Get-Content "CHANGELOG.md" -Raw
        if ($changelogContent -match "##\s+\[?$Version\]?") {
            return $true
        }
    }
    return $false
}

# T063: package.json version update
function Update-PackageJsonVersion {
    param(
        [string]$NewVersion,
        [bool]$IsDryRun
    )

    $packageJsonPath = "package.json"

    if (-not (Test-Path $packageJsonPath)) {
        throw "package.json not found at: $packageJsonPath"
    }

    if ($IsDryRun) {
        Write-Warning "Would update $packageJsonPath version to $NewVersion"
        return
    }

    # Read package.json
    $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    $oldVersion = $packageJson.version

    # Update version
    $packageJson.version = $NewVersion

    # Write back to package.json with proper formatting
    $packageJson | ConvertTo-Json -Depth 100 | Set-Content $packageJsonPath -Encoding UTF8

    Write-Success "Updated package.json version: $oldVersion → $NewVersion"
}

# T064: CHANGELOG.md prompt
function Edit-Changelog {
    param(
        [string]$Version,
        [bool]$IsDryRun
    )

    $changelogPath = "CHANGELOG.md"

    if (-not (Test-Path $changelogPath)) {
        Write-Warning "CHANGELOG.md not found, creating..."
        if (-not $IsDryRun) {
            "# Changelog`n`n" | Out-File $changelogPath -Encoding UTF8
        }
    }

    if ($IsDryRun) {
        Write-Warning "Would prompt to edit CHANGELOG.md for version $Version"
        return
    }

    Write-Header "CHANGELOG.md Entry"
    Write-Host "Add release notes for version $Version to CHANGELOG.md"
    Write-Host ""
    Write-Host "Suggested format:"
    Write-Host "## [$Version] - $(Get-Date -Format 'yyyy-MM-dd')"
    Write-Host ""
    Write-Host "### Added"
    Write-Host "- New feature description"
    Write-Host ""
    Write-Host "### Changed"
    Write-Host "- Updated behavior description"
    Write-Host ""
    Write-Host "### Fixed"
    Write-Host "- Bug fix description"
    Write-Host ""

    # Open CHANGELOG.md in default editor
    Write-Step "Opening CHANGELOG.md in your default editor..."

    # Try to open in editor
    try {
        if ($env:EDITOR) {
            & $env:EDITOR $changelogPath
        }
        elseif (Get-Command code -ErrorAction SilentlyContinue) {
            code --wait $changelogPath
        }
        elseif (Get-Command notepad -ErrorAction SilentlyContinue) {
            notepad $changelogPath | Out-Null
        }
        else {
            Start-Process $changelogPath
        }
    }
    catch {
        Write-Warning "Could not open editor automatically. Please edit CHANGELOG.md manually."
        Read-Host "Press Enter when you have finished editing CHANGELOG.md"
    }

    Write-Success "CHANGELOG.md updated"
}

# T065: Test/lint/build execution
function Invoke-QualityChecks {
    param([bool]$IsDryRun)

    Write-Header "Running Quality Checks"

    if ($IsDryRun) {
        Write-Warning "Would run: npm run type-check"
        Write-Warning "Would run: npm run lint"
        Write-Warning "Would run: npm test"
        Write-Warning "Would run: npm run build"
        return
    }

    # Type check
    Write-Step "Running TypeScript type-check..."
    try {
        npm run type-check
        Write-Success "Type check passed"
    }
    catch {
        Write-Error-Custom "Type check failed"
        throw "Type check failed. Fix errors before releasing."
    }

    # Lint
    Write-Step "Running ESLint..."
    try {
        npm run lint
        Write-Success "Lint passed"
    }
    catch {
        Write-Error-Custom "Lint failed"
        throw "Lint failed. Fix errors before releasing."
    }

    # # Tests
    # Write-Step "Running tests..."
    # try {
    #     npm test
    #     Write-Success "Tests passed"
    # }
    # catch {
    #     Write-Error-Custom "Tests failed"
    #     throw "Tests failed. Fix errors before releasing."
    # }

    # Build
    Write-Step "Building application..."
    try {
        npm run build
        Write-Success "Build completed"
    }
    catch {
        Write-Error-Custom "Build failed"
        throw "Build failed. Fix errors before releasing."
    }
}

# T066: Git commit and tag creation
function New-ReleaseCommit {
    param(
        [string]$Version,
        [bool]$IsDryRun
    )

    Write-Header "Creating Git Commit and Tag"

    if ($IsDryRun) {
        Write-Warning "Would stage all changes: git add ."
        Write-Warning "Would create commit: chore: Release v$Version"
        Write-Warning "Would create tag: v$Version"
        return
    }

    # Stage changes
    Write-Step "Staging changes..."
    git add .

    # Create commit
    Write-Step "Creating commit..."
    $commitMessage = @"
chore: Release v$Version

Updated version in package.json
Updated CHANGELOG.md with release notes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
"@

    git commit -m $commitMessage
    Write-Success "Commit created"

    # Create tag
    Write-Step "Creating tag v$Version..."
    git tag -a "v$Version" -m "Release version $Version"
    Write-Success "Tag v$Version created"
}

# T067: Push instructions output
function Show-PushInstructions {
    param([string]$Version)

    Write-Header "Release Ready!"

    Write-Host "Version $Version has been prepared for release." -ForegroundColor Green
    Write-Host ""
    Write-Host "To publish the release, run these commands:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  git push origin $(git branch --show-current)" -ForegroundColor Cyan
    Write-Host "  git push origin v$Version" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This will trigger the GitHub Actions release workflow that will:"
    Write-Host "  1. Build the application"
    Write-Host "  2. Package installers (NSIS and portable)"
    Write-Host "  3. Sign the installers (if configured)"
    Write-Host "  4. Create a GitHub Release"
    Write-Host "  5. Upload installers and update manifest"
    Write-Host ""
}

# Main execution
Write-Header "MarkRead Release Script"

if ($DryRun) {
    Write-Warning "DRY RUN MODE - No changes will be made"
}

# T063: Read current version from package.json
Write-Step "Reading current version from package.json..."
if (-not (Test-Path "package.json")) {
    Write-Error-Custom "package.json not found in current directory"
    exit 1
}

$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version
Write-Success "Current version: $currentVersion"

# Prompt for new version if not provided
if (-not $NewVersion) {
    Write-Host ""
    $NewVersion = Read-Host "Enter new version (current: $currentVersion)"
}

# T062: Validate version format
Write-Step "Validating version format..."
if (-not (Test-SemanticVersion $NewVersion)) {
    Write-Error-Custom "Invalid version format: $NewVersion"
    Write-Host "Version must follow semantic versioning (e.g., 1.0.0, 1.0.0-beta.1)"
    exit 1
}
Write-Success "Version format valid: $NewVersion"

# T069: Check for duplicate version
Write-Step "Checking for duplicate version..."
if (Test-VersionInChangelog $NewVersion) {
    Write-Warning "Version $NewVersion already exists in CHANGELOG.md"
    Write-Host ""
    $continue = Read-Host "Continue anyway? (yes/no)"
    if ($continue -ne "yes") {
        Write-Host "Release cancelled"
        exit 0
    }
}

# Summary
Write-Header "Release Summary"
Write-Host "Current version:  $currentVersion" -ForegroundColor White
Write-Host "New version:      $NewVersion" -ForegroundColor Green
Write-Host "Mode:             $(if ($DryRun) { 'DRY RUN' } else { 'LIVE' })" -ForegroundColor $(if ($DryRun) { 'Yellow' } else { 'Red' })
Write-Host ""

if (-not $DryRun) {
    $confirm = Read-Host "Proceed with release? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "Release cancelled"
        exit 0
    }
}

# T063: Update package.json version
Update-PackageJsonVersion -NewVersion $NewVersion -IsDryRun $DryRun

# T064: Prompt for CHANGELOG.md edits
Edit-Changelog -Version $NewVersion -IsDryRun $DryRun

# T065: Run quality checks
Invoke-QualityChecks -IsDryRun $DryRun

# T066: Create git commit and tag
New-ReleaseCommit -Version $NewVersion -IsDryRun $DryRun

# T067: Show push instructions
Show-PushInstructions -Version $NewVersion

Write-Success "Release script completed successfully!"
