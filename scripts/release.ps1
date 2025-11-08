#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automated release script for MarkRead.

.DESCRIPTION
    This script automates the entire release process:
    - Reads current version from Directory.Build.props
    - Prompts for new version (with validation)
    - Updates Directory.Build.props
    - Prompts for CHANGELOG.md entry
    - Commits changes
    - Creates and pushes git tag
    - Monitors GitHub Actions workflow
    
.PARAMETER Version
    The version to release (e.g., "0.2.0" or "v0.2.0"). If not provided, prompts interactively.
    
.PARAMETER SkipValidation
    Skip pre-release validation checks
    
.PARAMETER SkipTests
    Skip running tests before release
    
.PARAMETER DryRun
    Show what would be done without making any changes
    
.PARAMETER Editor
    Editor to use for CHANGELOG.md (code, notepad, notepad++, auto). Default: auto
    
.EXAMPLE
    .\scripts\release.ps1
    Interactive mode - prompts for version, opens editor for CHANGELOG
    
.EXAMPLE
    .\scripts\release.ps1 -Version "0.2.0"
    Release version 0.2.0 with default editor
    
.EXAMPLE
    .\scripts\release.ps1 -Version "0.2.0" -Editor notepad
    Release version 0.2.0 using Notepad for CHANGELOG
    
.EXAMPLE
    .\scripts\release.ps1 -Version "0.2.0-beta.1"
    Release pre-release version 0.2.0-beta.1
    
.EXAMPLE
    .\scripts\release.ps1 -DryRun
    Preview what would happen without making changes
#>

param(
    [Parameter(Mandatory=$false, HelpMessage="Version to release (e.g., 0.2.0)")]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipValidation,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false, HelpMessage="Editor to use for CHANGELOG (code, notepad, notepad++)")]
    [ValidateSet('code', 'notepad', 'notepad++', 'auto')]
    [string]$Editor = 'auto'
)

$ErrorActionPreference = "Stop"

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Cyan = "`e[36m"
$Bold = "`e[1m"
$Reset = "`e[0m"

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "${Bold}${Cyan}═══════════════════════════════════════════════════════${Reset}"
    Write-Host "${Bold}${Cyan}  $Message${Reset}"
    Write-Host "${Bold}${Cyan}═══════════════════════════════════════════════════════${Reset}"
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host "${Blue}▶${Reset} ${Bold}$Message${Reset}"
}

function Write-Success {
    param([string]$Message)
    Write-Host "${Green}✅ $Message${Reset}"
}

function Write-Failure {
    param([string]$Message)
    Write-Host "${Red}❌ $Message${Reset}"
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "${Yellow}⚠️  $Message${Reset}"
}

function Write-Info {
    param([string]$Message)
    Write-Host "${Cyan}ℹ️  $Message${Reset}"
}

function Exit-WithError {
    param([string]$Message)
    Write-Host ""
    Write-Failure $Message
    Write-Host ""
    exit 1
}

function Get-CurrentVersion {
    if (-not (Test-Path "Directory.Build.props")) {
        Exit-WithError "Directory.Build.props not found! Run this script from repository root."
    }
    
    [xml]$props = Get-Content "Directory.Build.props"
    return $props.Project.PropertyGroup.Version
}

function Test-VersionFormat {
    param([string]$Version)
    return $Version -match '^\d+\.\d+\.\d+(-[\w\.]+)?$'
}

function Get-NextVersionSuggestions {
    param([string]$CurrentVersion)
    
    if ($CurrentVersion -match '^(\d+)\.(\d+)\.(\d+)') {
        $major = [int]$Matches[1]
        $minor = [int]$Matches[2]
        $patch = [int]$Matches[3]
        
        return @{
            Patch = "$major.$minor.$($patch + 1)"
            Minor = "$major.$($minor + 1).0"
            Major = "$($major + 1).0.0"
        }
    }
    
    return $null
}

function Invoke-Command-Safe {
    param(
        [string]$Command,
        [string]$Description,
        [switch]$DryRun
    )
    
    Write-Step $Description
    
    if ($DryRun) {
        Write-Info "[DRY RUN] Would execute: $Command"
        return $true
    }
    
    try {
        Invoke-Expression $Command
        return $true
    } catch {
        Write-Failure "Failed: $_"
        return $false
    }
}

# ============================================================================
# Main Script
# ============================================================================

Clear-Host
Write-Header "MarkRead Release Automation"

if ($DryRun) {
    Write-Warning-Custom "DRY RUN MODE - No changes will be made"
    Write-Host ""
}

# Check we're in the right directory
if (-not (Test-Path "Directory.Build.props")) {
    Exit-WithError "Must run from repository root (where Directory.Build.props is located)"
}

# Check git is available
try {
    git --version | Out-Null
} catch {
    Exit-WithError "Git is not installed or not in PATH"
}

# ============================================================================
# Step 1: Get Current Version
# ============================================================================

Write-Step "Reading current version from Directory.Build.props..."
$currentVersion = Get-CurrentVersion
Write-Success "Current version: $currentVersion"

# ============================================================================
# Step 2: Determine New Version
# ============================================================================

Write-Host ""
Write-Step "Determining new version..."

if (-not $Version) {
    $suggestions = Get-NextVersionSuggestions -CurrentVersion $currentVersion
    
    Write-Host ""
    Write-Host "Current version: ${Bold}$currentVersion${Reset}"
    Write-Host ""
    Write-Host "Suggestions:"
    Write-Host "  1) Patch: $($suggestions.Patch) ${Cyan}(bug fixes)${Reset}"
    Write-Host "  2) Minor: $($suggestions.Minor) ${Cyan}(new features)${Reset}"
    Write-Host "  3) Major: $($suggestions.Major) ${Cyan}(breaking changes)${Reset}"
    Write-Host "  4) Custom version"
    Write-Host ""
    
    $choice = Read-Host "Select version type (1-4, or Enter for patch)"
    
    if ([string]::IsNullOrWhiteSpace($choice)) {
        $choice = "1"
    }
    
    switch ($choice) {
        "1" { $Version = $suggestions.Patch }
        "2" { $Version = $suggestions.Minor }
        "3" { $Version = $suggestions.Major }
        "4" {
            $Version = Read-Host "Enter custom version (e.g., 0.2.0 or 0.2.0-beta.1)"
        }
        default {
            Exit-WithError "Invalid choice"
        }
    }
}

# Normalize version (remove 'v' prefix if present)
$Version = $Version -replace '^v', ''

# Validate version format
if (-not (Test-VersionFormat -Version $Version)) {
    Exit-WithError "Invalid version format: $Version (expected: X.Y.Z or X.Y.Z-prerelease)"
}

Write-Success "New version: $Version"

# Check if this is a pre-release
$isPreRelease = $Version -match '-'
if ($isPreRelease) {
    Write-Info "This is a pre-release version"
}

# ============================================================================
# Step 3: Pre-Release Validation
# ============================================================================

if (-not $SkipValidation) {
    Write-Host ""
    Write-Step "Running pre-release validation..."
    
    # Check working directory is clean
    $status = git status --porcelain
    if ($status -and -not $DryRun) {
        Write-Warning-Custom "Working directory has uncommitted changes:"
        Write-Host ""
        git status --short
        Write-Host ""
        $continue = Read-Host "Continue anyway? (y/N)"
        if ($continue -ne "y") {
            Exit-WithError "Aborted by user"
        }
    } else {
        Write-Success "Working directory is clean"
    }
    
    # Check current branch
    $currentBranch = git branch --show-current
    if ($currentBranch -ne "main" -and $currentBranch -ne "master") {
        Write-Warning-Custom "Current branch: $currentBranch (not main/master)"
        $continue = Read-Host "Continue anyway? (y/N)"
        if ($continue -ne "y") {
            Exit-WithError "Aborted by user"
        }
    } else {
        Write-Success "On branch: $currentBranch"
    }
    
    # Check tag doesn't exist
    $existingTag = git tag -l "v$Version"
    if ($existingTag) {
        Exit-WithError "Tag v$Version already exists!"
    } else {
        Write-Success "Tag v$Version doesn't exist"
    }
}

# ============================================================================
# Step 4: Run Tests (Optional)
# ============================================================================

if (-not $SkipTests) {
    Write-Host ""
    Write-Step "Running tests..."
    
    if (Test-Path "tests") {
        if (-not $DryRun) {
            $testResult = dotnet test --configuration Release --verbosity minimal
            if ($LASTEXITCODE -ne 0) {
                Exit-WithError "Tests failed! Fix tests before releasing."
            }
            Write-Success "All tests passed"
        } else {
            Write-Info "[DRY RUN] Would run: dotnet test --configuration Release"
        }
    } else {
        Write-Info "No tests found, skipping"
    }
}

# ============================================================================
# Step 5: Update Directory.Build.props
# ============================================================================

Write-Host ""
Write-Step "Updating Directory.Build.props..."

if (-not $DryRun) {
    [xml]$props = Get-Content "Directory.Build.props"
    $props.Project.PropertyGroup.Version = $Version
    $props.Project.PropertyGroup.AssemblyVersion = "$Version.0"
    $props.Project.PropertyGroup.FileVersion = "$Version.0"
    $props.Save((Resolve-Path "Directory.Build.props"))
    Write-Success "Updated to version $Version"
} else {
    Write-Info "[DRY RUN] Would update Directory.Build.props to $Version"
}

# ============================================================================
# Step 6: Update CHANGELOG.md
# ============================================================================

Write-Host ""
Write-Step "Updating CHANGELOG.md..."

$changelogPath = "CHANGELOG.md"
$changelogExists = Test-Path $changelogPath

if ($changelogExists) {
    $today = Get-Date -Format "yyyy-MM-dd"
    
    # Create a temporary file with template
    $tempFile = [System.IO.Path]::GetTempFileName()
    $tempMdFile = $tempFile -replace '\.tmp$', '.md'
    Move-Item -Path $tempFile -Destination $tempMdFile -Force
    
    # Create template content
    $template = @"
# Release Notes for v$Version
# 
# Edit the sections below. Lines starting with # are comments and will be ignored.
# Delete sections you don't need. Save and close the editor to continue.
# 
# Format:
#   - Use bullet points (-)
#   - Be clear and concise
#   - Write for end users, not developers
#

## [$Version] - $today

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
    
    Write-Host ""
    Write-Host "${Bold}Opening editor for CHANGELOG entry...${Reset}"
    Write-Host ""
    Write-Host "  Template file: ${Cyan}$tempMdFile${Reset}"
    Write-Host "  Instructions:"
    Write-Host "    1. Edit the release notes"
    Write-Host "    2. Remove empty sections"
    Write-Host "    3. Save and close the editor"
    Write-Host ""
    
    if (-not $DryRun) {
        # Detect available editors
        $editorCmd = $null
        $editorName = ""
        $editorArgs = @()
        
        if ($Editor -eq 'auto') {
            # Try VS Code first
            if (Get-Command code -ErrorAction SilentlyContinue) {
                $editorCmd = "code"
                $editorName = "VS Code"
                $editorArgs = @("--wait", $tempMdFile)
            }
            # Try Notepad++ 
            elseif (Get-Command notepad++ -ErrorAction SilentlyContinue) {
                $editorCmd = "notepad++"
                $editorName = "Notepad++"
                $editorArgs = @($tempMdFile)
            }
            # Try Notepad (always available on Windows)
            else {
                $editorCmd = "notepad.exe"
                $editorName = "Notepad"
                $editorArgs = @($tempMdFile)
            }
        } else {
            # Use specified editor
            switch ($Editor) {
                'code' {
                    if (Get-Command code -ErrorAction SilentlyContinue) {
                        $editorCmd = "code"
                        $editorName = "VS Code"
                        $editorArgs = @("--wait", $tempMdFile)
                    } else {
                        Write-Warning-Custom "VS Code (code) not found, falling back to Notepad"
                        $editorCmd = "notepad.exe"
                        $editorName = "Notepad"
                        $editorArgs = @($tempMdFile)
                    }
                }
                'notepad++' {
                    if (Get-Command notepad++ -ErrorAction SilentlyContinue) {
                        $editorCmd = "notepad++"
                        $editorName = "Notepad++"
                        $editorArgs = @($tempMdFile)
                    } else {
                        Write-Warning-Custom "Notepad++ not found, falling back to Notepad"
                        $editorCmd = "notepad.exe"
                        $editorName = "Notepad"
                        $editorArgs = @($tempMdFile)
                    }
                }
                'notepad' {
                    $editorCmd = "notepad.exe"
                    $editorName = "Notepad"
                    $editorArgs = @($tempMdFile)
                }
            }
        }
        
        Write-Info "Opening in $editorName... (waiting for you to close)"
        
        # Open editor and wait for it to close
        if ($editorCmd -eq "code") {
            # VS Code with --wait flag blocks until file is closed
            & $editorCmd @editorArgs
        } else {
            # For other editors, use Start-Process -Wait
            Start-Process -FilePath $editorCmd -ArgumentList $editorArgs -Wait
        }
        
        Write-Success "Editor closed"
        
        # Read the edited content
        $editedContent = Get-Content $tempMdFile -Raw
        
        # Remove comment lines and clean up
        $lines = $editedContent -split "`r?`n"
        $cleanedLines = $lines | Where-Object { 
            $_ -notmatch '^\s*#' -and  # Remove comment lines
            $_ -notmatch '^\s*$' -or   # But keep non-empty lines
            $_ -match '^#{2,}'          # Keep markdown headers
        }
        
        # Join back and clean up excessive blank lines
        $entry = ($cleanedLines -join "`n") -replace '(?m)^\s*$\n\s*$\n', "`n"
        $entry = $entry.Trim()
        
        # Check if user added any content
        if ($entry -match '-\s*$' -or $entry.Length -lt 50) {
            Write-Warning-Custom "No substantial content detected in CHANGELOG entry"
            $continue = Read-Host "Continue without CHANGELOG update? (y/N)"
            if ($continue -ne "y") {
                # Give another chance to edit
                Write-Info "Opening editor again..."
                if ($editorCmd -eq "code") {
                    & $editorCmd @editorArgs
                } else {
                    Start-Process -FilePath $editorCmd -ArgumentList $editorArgs -Wait
                }
                $editedContent = Get-Content $tempMdFile -Raw
                $lines = $editedContent -split "`r?`n"
                $cleanedLines = $lines | Where-Object { $_ -notmatch '^\s*#' }
                $entry = ($cleanedLines -join "`n").Trim()
            }
        }
        
        if ($entry.Length -gt 50) {
            # Read existing changelog
            $existingContent = Get-Content $changelogPath -Raw
            
            # Find where to insert (after "# Changelog" or at the beginning)
            if ($existingContent -match '(?ms)(# Changelog.*?\n+)(.*)') {
                $newContent = $Matches[1] + $entry + "`n`n" + $Matches[2]
            } elseif ($existingContent -match '(?ms)(# CHANGELOG.*?\n+)(.*)') {
                $newContent = $Matches[1] + $entry + "`n`n" + $Matches[2]
            } else {
                $newContent = $entry + "`n`n" + $existingContent
            }
            
            Set-Content -Path $changelogPath -Value $newContent
            Write-Success "CHANGELOG.md updated"
            
            # Show preview
            Write-Host ""
            Write-Host "${Bold}Added to CHANGELOG.md:${Reset}"
            Write-Host "${Cyan}$("-" * 60)${Reset}"
            $entry -split "`n" | Select-Object -First 10 | ForEach-Object { Write-Host $_ }
            if (($entry -split "`n").Count -gt 10) {
                Write-Host "${Cyan}... (truncated)${Reset}"
            }
            Write-Host "${Cyan}$("-" * 60)${Reset}"
        } else {
            Write-Info "CHANGELOG.md not updated (no content added)"
        }
        
        # Clean up temp file
        Remove-Item -Path $tempMdFile -Force -ErrorAction SilentlyContinue
        
    } else {
        Write-Info "[DRY RUN] Would open editor for CHANGELOG.md entry"
        Remove-Item -Path $tempMdFile -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Warning-Custom "CHANGELOG.md not found - consider creating one"
}

# ============================================================================
# Step 7: Build and Test
# ============================================================================

Write-Host ""
Write-Step "Building release version..."

if (-not $DryRun) {
    dotnet clean | Out-Null
    $buildResult = dotnet build --configuration Release
    if ($LASTEXITCODE -ne 0) {
        Exit-WithError "Build failed!"
    }
    Write-Success "Build completed successfully"
    
    # Verify version in built executable
    $exePath = "src\bin\Release\net8.0-windows\MarkRead.exe"
    if (Test-Path $exePath) {
        $fileVersion = (Get-Item $exePath).VersionInfo.FileVersion
        if ($fileVersion -like "$Version.*") {
            Write-Success "Verified executable version: $fileVersion"
        } else {
            Write-Warning-Custom "Executable version mismatch: $fileVersion (expected $Version.0.0)"
        }
    }
} else {
    Write-Info "[DRY RUN] Would run: dotnet build --configuration Release"
}

# ============================================================================
# Step 8: Review Changes
# ============================================================================

Write-Host ""
Write-Step "Reviewing changes..."

if (-not $DryRun) {
    Write-Host ""
    Write-Host "${Bold}Files to be committed:${Reset}"
    git status --short
    Write-Host ""
    
    Write-Host "${Bold}Diff:${Reset}"
    git diff Directory.Build.props
    if ($changelogExists) {
        git diff CHANGELOG.md | Select-Object -First 50
    }
    Write-Host ""
}

# ============================================================================
# Step 9: Commit Changes
# ============================================================================

Write-Host ""
Write-Step "Committing changes..."

$commitMessage = "Release v$Version"

if (-not $DryRun) {
    git add Directory.Build.props
    if ($changelogExists) {
        git add CHANGELOG.md
    }
    
    git commit -m $commitMessage
    if ($LASTEXITCODE -ne 0) {
        Exit-WithError "Commit failed!"
    }
    Write-Success "Changes committed: $commitMessage"
} else {
    Write-Info "[DRY RUN] Would commit: $commitMessage"
}

# ============================================================================
# Step 10: Create and Push Tag
# ============================================================================

Write-Host ""
Write-Step "Creating git tag..."

$tagName = "v$Version"
$tagMessage = "Release version $Version"

if (-not $DryRun) {
    git tag -a $tagName -m $tagMessage
    if ($LASTEXITCODE -ne 0) {
        Exit-WithError "Tag creation failed!"
    }
    Write-Success "Tag created: $tagName"
} else {
    Write-Info "[DRY RUN] Would create tag: $tagName"
}

# ============================================================================
# Step 11: Push to Remote
# ============================================================================

Write-Host ""
Write-Step "Pushing to remote..."

if (-not $DryRun) {
    Write-Host ""
    Write-Host "${Bold}Ready to push:${Reset}"
    Write-Host "  - Commit: $commitMessage"
    Write-Host "  - Tag: $tagName"
    Write-Host ""
    Write-Host "${Yellow}This will trigger the GitHub Actions release workflow!${Reset}"
    Write-Host ""
    
    $confirm = Read-Host "Push to remote? (Y/n)"
    if ($confirm -eq "n") {
        Write-Warning-Custom "Aborted. To push manually:"
        Write-Host "  git push origin main"
        Write-Host "  git push origin $tagName"
        exit 0
    }
    
    # Push commit
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Exit-WithError "Push failed!"
    }
    Write-Success "Pushed commit to main"
    
    # Push tag (this triggers release workflow)
    git push origin $tagName
    if ($LASTEXITCODE -ne 0) {
        Exit-WithError "Tag push failed!"
    }
    Write-Success "Pushed tag: $tagName"
} else {
    Write-Info "[DRY RUN] Would push commit and tag $tagName"
}

# ============================================================================
# Step 12: Monitor Release
# ============================================================================

Write-Host ""
Write-Header "Release Triggered Successfully!"

Write-Host "${Bold}Version:${Reset} $Version"
Write-Host "${Bold}Tag:${Reset} $tagName"
Write-Host ""

Write-Host "${Bold}Next Steps:${Reset}"
Write-Host "  1. Monitor GitHub Actions workflow:"
Write-Host "     ${Cyan}https://github.com/schalkje/markread/actions${Reset}"
Write-Host ""
Write-Host "  2. Wait for release to be created (~10-15 minutes)"
Write-Host ""
Write-Host "  3. Verify release:"
Write-Host "     ${Cyan}https://github.com/schalkje/markread/releases/tag/$tagName${Reset}"
Write-Host ""

if (-not $DryRun) {
    $openBrowser = Read-Host "Open GitHub Actions in browser? (Y/n)"
    if ($openBrowser -ne "n") {
        Start-Process "https://github.com/schalkje/markread/actions"
    }
}

Write-Host ""
Write-Success "Release process completed! 🎉"
Write-Host ""
