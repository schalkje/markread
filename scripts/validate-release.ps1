#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Validates that everything is ready for a release before creating a git tag.

.DESCRIPTION
    This script validates:
    - Tag version matches Directory.Build.props
    - CHANGELOG.md mentions the version
    - Tag doesn't already exist
    - Working directory is clean
    
.PARAMETER TagVersion
    The version tag to validate (e.g., "v0.2.0" or "0.2.0")
    
.PARAMETER SkipClean
    Skip checking if working directory is clean
    
.EXAMPLE
    .\validate-release.ps1 -TagVersion "v0.2.0"
    
.EXAMPLE
    .\validate-release.ps1 -TagVersion "0.2.0" -SkipClean
#>

param(
    [Parameter(Mandatory=$true, HelpMessage="Version tag to validate (e.g., v0.2.0)")]
    [string]$TagVersion,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipClean
)

$ErrorActionPreference = "Stop"

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Reset = "`e[0m"

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

Write-Host ""
Write-Host "🔍 Validating release for tag: $TagVersion"
Write-Host ""

# Normalize version (remove 'v' prefix if present)
$version = $TagVersion -replace '^v', ''
$tagWithV = "v$version"

$allGood = $true

# Check 1: Validate version format
Write-Host "1️⃣  Checking version format..."
if ($version -notmatch '^\d+\.\d+\.\d+(-[\w\.]+)?$') {
    Write-Failure "Invalid version format: $version"
    Write-Host "   Expected format: X.Y.Z or X.Y.Z-prerelease"
    Write-Host "   Examples: 0.1.0, 1.2.3, 1.0.0-beta.1"
    $allGood = $false
} else {
    Write-Success "Version format is valid: $version"
}

# Check 2: Read version from Directory.Build.props
Write-Host ""
Write-Host "2️⃣  Checking Directory.Build.props..."

if (-not (Test-Path "Directory.Build.props")) {
    Write-Failure "Directory.Build.props not found!"
    Write-Host "   Make sure you're running this from the repository root."
    exit 1
}

[xml]$props = Get-Content "Directory.Build.props"
$propsVersion = $props.Project.PropertyGroup.Version

Write-Host "   Tag version:         $version"
Write-Host "   Directory.Build.props: $propsVersion"

if ($version -ne $propsVersion) {
    Write-Failure "Version mismatch!"
    Write-Host ""
    Write-Host "   Please update Directory.Build.props:"
    Write-Host "   <Version>$version</Version>"
    Write-Host "   <AssemblyVersion>$version.0</AssemblyVersion>"
    Write-Host "   <FileVersion>$version.0</FileVersion>"
    $allGood = $false
} else {
    Write-Success "Version matches Directory.Build.props"
}

# Check 3: Verify CHANGELOG.md mentions this version
Write-Host ""
Write-Host "3️⃣  Checking CHANGELOG.md..."

if (-not (Test-Path "CHANGELOG.md")) {
    Write-Warning-Custom "CHANGELOG.md not found"
    Write-Host "   Consider adding a CHANGELOG.md file."
} else {
    $changelogContent = Get-Content "CHANGELOG.md" -Raw
    
    # Check for version in format: ## [X.Y.Z] - YYYY-MM-DD
    if ($changelogContent -match "\[[$version\]]") {
        Write-Success "CHANGELOG.md mentions version $version"
    } else {
        Write-Warning-Custom "CHANGELOG.md doesn't mention version $version"
        Write-Host "   Add an entry like:"
        Write-Host "   ## [$version] - $(Get-Date -Format 'yyyy-MM-dd')"
        Write-Host ""
        Write-Host "   ### Added"
        Write-Host "   - New feature description"
        $allGood = $false
    }
}

# Check 4: Verify tag doesn't already exist
Write-Host ""
Write-Host "4️⃣  Checking if tag already exists..."

$existingTag = git tag -l $tagWithV
if ($existingTag) {
    Write-Failure "Tag $tagWithV already exists!"
    Write-Host "   To delete it:"
    Write-Host "   git tag -d $tagWithV"
    Write-Host "   git push origin :refs/tags/$tagWithV"
    $allGood = $false
} else {
    Write-Success "Tag $tagWithV doesn't exist yet"
}

# Check 5: Verify working directory is clean (optional)
if (-not $SkipClean) {
    Write-Host ""
    Write-Host "5️⃣  Checking if working directory is clean..."
    
    $status = git status --porcelain
    if ($status) {
        Write-Warning-Custom "Working directory has uncommitted changes:"
        Write-Host ""
        git status --short
        Write-Host ""
        Write-Host "   Commit or stash changes before creating a release tag."
        $allGood = $false
    } else {
        Write-Success "Working directory is clean"
    }
}

# Check 6: Verify on main/master branch (optional warning)
Write-Host ""
Write-Host "6️⃣  Checking current branch..."

$currentBranch = git branch --show-current
if ($currentBranch -ne "main" -and $currentBranch -ne "master") {
    Write-Warning-Custom "You're on branch '$currentBranch', not 'main' or 'master'"
    Write-Host "   Releases are typically created from the main branch."
    Write-Host "   Continue only if this is intentional (e.g., hotfix branch)."
} else {
    Write-Success "On branch: $currentBranch"
}

# Summary
Write-Host ""
Write-Host "═════════════════════════════════════════════════════"

if ($allGood) {
    Write-Host ""
    Write-Success "All checks passed! Ready to create release."
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host ""
    Write-Host "  1. Create annotated tag:"
    Write-Host "     ${Green}git tag -a $tagWithV -m `"Release version $version`"${Reset}"
    Write-Host ""
    Write-Host "  2. Push tag to trigger GitHub Actions release:"
    Write-Host "     ${Green}git push origin $tagWithV${Reset}"
    Write-Host ""
    Write-Host "  3. Monitor workflow:"
    Write-Host "     https://github.com/schalkje/markread/actions"
    Write-Host ""
    Write-Host "  4. Verify release:"
    Write-Host "     https://github.com/schalkje/markread/releases"
    Write-Host ""
    
    exit 0
} else {
    Write-Host ""
    Write-Failure "Validation failed. Please fix the issues above."
    Write-Host ""
    exit 1
}
