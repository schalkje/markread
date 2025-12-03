#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Validate complete code signing setup for MarkRead.

.DESCRIPTION
    Comprehensive validation script to verify all code signing components
    are properly configured for both local development and CI/CD workflows.
    
    Checks:
    - Certificate availability and validity
    - GitHub Secrets configuration
    - Required scripts present
    - Workflow files correct
    - Documentation complete
    - Dependencies available (signtool.exe, WiX)

.PARAMETER Quick
    Skip optional checks (GitHub API calls, dependency checks). Faster validation.

.PARAMETER FixIssues
    Attempt to automatically fix common issues where possible.

.PARAMETER CertificateThumbprint
    Specific certificate to validate. If not provided, searches for code signing certs.

.EXAMPLE
    .\validate-signing-setup.ps1
    Full validation of signing setup.

.EXAMPLE
    .\validate-signing-setup.ps1 -Quick
    Quick validation, skips GitHub API and dependency checks.

.EXAMPLE
    .\validate-signing-setup.ps1 -CertificateThumbprint "ABC123..." -FixIssues
    Validate specific certificate and fix issues.
#>

[CmdletBinding()]
param(
    [Parameter()]
    [switch]$Quick,

    [Parameter()]
    [switch]$FixIssues,

    [Parameter()]
    [string]$CertificateThumbprint = ""
)

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

# ============================================================================
# Configuration
# ============================================================================

$REQUIRED_SCRIPTS = @(
    "scripts/create-certificate.ps1",
    "scripts/export-certificate.ps1",
    "scripts/validate-certificate.ps1",
    "scripts/sign-msi.ps1",
    "scripts/verify-signature.ps1",
    "scripts/sign-local.ps1",
    "scripts/import-certificate.ps1"
)

$REQUIRED_WORKFLOWS = @(
    ".github/workflows/build-and-sign.yml"
)

$REQUIRED_DOCS = @(
    "documentation/developer/msi-setup.md",
    "documentation/developer/local-signing-guide.md",
    "documentation/developer/certificate-management.md",
    "documentation/developer/security-best-practices.md",
    "documentation/user-guide/installation.md"
)

# ============================================================================
# Helper Functions
# ============================================================================

$script:CheckCount = 0
$script:PassCount = 0
$script:FailCount = 0
$script:WarnCount = 0
$script:Issues = @()

function Write-Section {
    param([string]$Title)
    Write-Host "`n" -NoNewline
    Write-Host "═══ $Title " -ForegroundColor Cyan -NoNewline
    Write-Host ("═" * (70 - $Title.Length)) -ForegroundColor Cyan
}

function Write-Check {
    param([string]$Message)
    $script:CheckCount++
    Write-Host "  Checking: $Message" -ForegroundColor Gray
}

function Write-Pass {
    param([string]$Message)
    $script:PassCount++
    Write-Host "  ✓ " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Fail {
    param(
        [string]$Message,
        [string]$Fix = ""
    )
    $script:FailCount++
    Write-Host "  ✗ " -ForegroundColor Red -NoNewline
    Write-Host $Message -ForegroundColor Red
    
    if ($Fix) {
        Write-Host "    Fix: $Fix" -ForegroundColor Yellow
        $script:Issues += [PSCustomObject]@{
            Type = "Error"
            Message = $Message
            Fix = $Fix
        }
    }
}

function Write-Warn {
    param(
        [string]$Message,
        [string]$Suggestion = ""
    )
    $script:WarnCount++
    Write-Host "  ⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host $Message -ForegroundColor Yellow
    
    if ($Suggestion) {
        Write-Host "    Suggestion: $Suggestion" -ForegroundColor Gray
        $script:Issues += [PSCustomObject]@{
            Type = "Warning"
            Message = $Message
            Fix = $Suggestion
        }
    }
}

function Test-ScriptFile {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        Write-Fail "Script missing: $Path" "Create or restore from repository"
        return $false
    }
    
    # Check PowerShell syntax
    try {
        $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content $Path -Raw), [ref]$null)
        Write-Pass "Script exists: $(Split-Path $Path -Leaf)"
        return $true
    }
    catch {
        Write-Fail "Script syntax error: $Path" "Check PowerShell syntax: $($_.Exception.Message)"
        return $false
    }
}

function Test-FileContent {
    param(
        [string]$Path,
        [string]$Pattern,
        [string]$Description
    )
    
    if (-not (Test-Path $Path)) {
        Write-Fail "$Description check failed: File not found" "Create $Path"
        return $false
    }
    
    $content = Get-Content $Path -Raw
    if ($content -match $Pattern) {
        Write-Pass $Description
        return $true
    }
    else {
        Write-Warn "$Description not found in $Path" "Review file content"
        return $false
    }
}

# ============================================================================
# Validation Checks
# ============================================================================

function Test-ScriptsExist {
    Write-Section "Scripts Validation"
    
    $allExist = $true
    foreach ($script in $REQUIRED_SCRIPTS) {
        Write-Check "Script: $script"
        $exists = Test-ScriptFile -Path $script
        $allExist = $allExist -and $exists
    }
    
    return $allExist
}

function Test-WorkflowsExist {
    Write-Section "GitHub Workflows Validation"
    
    $allValid = $true
    foreach ($workflow in $REQUIRED_WORKFLOWS) {
        Write-Check "Workflow: $workflow"
        
        if (-not (Test-Path $workflow)) {
            Write-Fail "Workflow missing: $workflow" "Create workflow file"
            $allValid = $false
            continue
        }
        
        Write-Pass "Workflow exists: $(Split-Path $workflow -Leaf)"
        
        # Validate workflow content
        $content = Get-Content $workflow -Raw
        
        if ($content -match 'CERT_PFX') {
            Write-Pass "  Uses CERT_PFX secret"
        }
        else {
            Write-Warn "  CERT_PFX secret not referenced" "Add certificate decode step"
            $allValid = $false
        }
        
        if ($content -match 'CERT_PASSWORD') {
            Write-Pass "  Uses CERT_PASSWORD secret"
        }
        else {
            Write-Warn "  CERT_PASSWORD secret not referenced" "Add password to signing step"
            $allValid = $false
        }
        
        if ($content -match 'sign-msi\.ps1') {
            Write-Pass "  Calls sign-msi.ps1"
        }
        else {
            Write-Fail "  Signing script not called" "Add signing step to workflow"
            $allValid = $false
        }
        
        if ($content -match 'verify-signature\.ps1') {
            Write-Pass "  Calls verify-signature.ps1"
        }
        else {
            Write-Warn "  Verification script not called" "Add verification step to workflow"
        }
    }
    
    return $allValid
}

function Test-CertificateAvailable {
    Write-Section "Certificate Validation"
    
    if ($CertificateThumbprint) {
        Write-Check "Specific certificate: $CertificateThumbprint"
        
        $cert = Get-Item "Cert:\CurrentUser\My\$CertificateThumbprint" -ErrorAction SilentlyContinue
        if (-not $cert) {
            $cert = Get-Item "Cert:\LocalMachine\My\$CertificateThumbprint" -ErrorAction SilentlyContinue
        }
        
        if (-not $cert) {
            Write-Fail "Certificate not found with thumbprint: $CertificateThumbprint" "Import certificate or use different thumbprint"
            return $false
        }
        
        $certs = @($cert)
    }
    else {
        Write-Check "Code signing certificates in store"
        
        $certsUser = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert -ErrorAction SilentlyContinue
        $certsMachine = Get-ChildItem Cert:\LocalMachine\My -CodeSigningCert -ErrorAction SilentlyContinue
        
        $certs = @($certsUser) + @($certsMachine) | Where-Object { $_ -ne $null }
    }
    
    if ($certs.Count -eq 0) {
        Write-Fail "No code signing certificates found" "Run: .\scripts\create-certificate.ps1"
        return $false
    }
    
    Write-Pass "Found $($certs.Count) code signing certificate(s)"
    
    # Validate each certificate
    $validCerts = 0
    foreach ($cert in $certs) {
        Write-Host ""
        Write-Host "  Certificate: $($cert.Subject)"
        
        # Check expiration
        if ($cert.NotAfter -lt (Get-Date)) {
            Write-Fail "  Expired: $($cert.NotAfter)" "Create new certificate"
        }
        elseif ($cert.NotAfter -lt (Get-Date).AddDays(30)) {
            Write-Warn "  Expires soon: $($cert.NotAfter)" "Plan certificate renewal"
        }
        else {
            Write-Pass "  Valid until: $($cert.NotAfter)"
        }
        
        # Check private key
        if ($cert.HasPrivateKey) {
            Write-Pass "  Has private key"
        }
        else {
            Write-Fail "  Missing private key" "Re-import certificate with private key"
        }
        
        # Check EKU
        $codeSigningEku = $cert.EnhancedKeyUsageList | Where-Object { $_.ObjectId -eq "1.3.6.1.5.5.7.3.3" }
        if ($codeSigningEku) {
            Write-Pass "  Has Code Signing EKU"
        }
        else {
            Write-Fail "  Missing Code Signing EKU" "Certificate not suitable for code signing"
        }
        
        if ($cert.NotAfter -gt (Get-Date) -and $cert.HasPrivateKey -and $codeSigningEku) {
            $validCerts++
        }
    }
    
    if ($validCerts -eq 0) {
        Write-Fail "`nNo valid certificates available" "Create or import valid code signing certificate"
        return $false
    }
    
    Write-Pass "`n$validCerts valid certificate(s) ready for signing"
    return $true
}

function Test-GitHubSecrets {
    Write-Section "GitHub Secrets Validation"
    
    if ($Quick) {
        Write-Warn "Skipping GitHub Secrets check (Quick mode)" "Run without -Quick for full validation"
        return $true
    }
    
    Write-Host "  Note: Cannot directly validate secrets content (encrypted)"
    Write-Host "  Checking if secrets should exist based on workflow..."
    
    $workflowPath = ".github/workflows/build-and-sign.yml"
    if (-not (Test-Path $workflowPath)) {
        Write-Warn "Workflow file not found, cannot check secrets" "Create workflow first"
        return $false
    }
    
    $workflow = Get-Content $workflowPath -Raw
    
    if ($workflow -match 'CERT_PFX') {
        Write-Host "  ℹ CERT_PFX secret required" -ForegroundColor Cyan
        Write-Host "    Verify: GitHub Settings → Secrets → Actions → CERT_PFX exists"
    }
    
    if ($workflow -match 'CERT_PASSWORD') {
        Write-Host "  ℹ CERT_PASSWORD secret required" -ForegroundColor Cyan
        Write-Host "    Verify: GitHub Settings → Secrets → Actions → CERT_PASSWORD exists"
    }
    
    Write-Warn "Manual verification needed for GitHub Secrets" "Check GitHub Settings → Secrets → Actions"
    
    Write-Host "`n  To set up secrets:"
    Write-Host "    1. Export certificate: .\scripts\export-certificate.ps1"
    Write-Host "    2. Convert to Base64:"
    Write-Host "       `$pfxBytes = [IO.File]::ReadAllBytes('certificate.pfx')"
    Write-Host "       [Convert]::ToBase64String(`$pfxBytes) | Set-Clipboard"
    Write-Host "    3. Add to GitHub Secrets (Settings → Secrets → Actions)"
    
    return $true
}

function Test-Dependencies {
    Write-Section "Dependencies Validation"
    
    if ($Quick) {
        Write-Warn "Skipping dependencies check (Quick mode)" "Run without -Quick for full validation"
        return $true
    }
    
    # Check signtool.exe
    Write-Check "signtool.exe availability"
    $signtool = Get-Command "signtool.exe" -ErrorAction SilentlyContinue
    
    if (-not $signtool) {
        # Search common locations
        $commonPaths = @(
            "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe",
            "${env:ProgramFiles}\Windows Kits\10\bin\*\x64\signtool.exe"
        )
        
        foreach ($pattern in $commonPaths) {
            $found = Get-ChildItem $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) {
                Write-Pass "signtool.exe found: $($found.FullName)"
                $signtool = $found
                break
            }
        }
    }
    
    if (-not $signtool) {
        Write-Fail "signtool.exe not found" "Install Windows SDK: https://developer.microsoft.com/windows/downloads/windows-sdk/"
        return $false
    }
    else {
        Write-Pass "signtool.exe available"
    }
    
    # Check WiX
    Write-Check "WiX Toolset availability"
    $wix = Get-Command "wix" -ErrorAction SilentlyContinue
    
    if (-not $wix) {
        Write-Warn "WiX not found in PATH" "Install: dotnet tool install --global wix"
    }
    else {
        Write-Pass "WiX Toolset available"
    }
    
    # Check .NET SDK
    Write-Check ".NET SDK availability"
    $dotnet = Get-Command "dotnet" -ErrorAction SilentlyContinue
    
    if (-not $dotnet) {
        Write-Fail ".NET SDK not found" "Install: https://dotnet.microsoft.com/download"
        return $false
    }
    else {
        $version = (dotnet --version)
        Write-Pass ".NET SDK available: $version"
    }
    
    return $true
}

function Test-DocumentationComplete {
    Write-Section "Documentation Validation"
    
    $allExist = $true
    foreach ($doc in $REQUIRED_DOCS) {
        Write-Check "Documentation: $doc"
        
        if (-not (Test-Path $doc)) {
            Write-Fail "Documentation missing: $doc" "Create or restore documentation"
            $allExist = $false
            continue
        }
        
        Write-Pass "Documentation exists: $(Split-Path $doc -Leaf)"
    }
    
    # Check key content
    Write-Check "MSI setup doc has code signing section"
    Test-FileContent -Path "documentation/developer/msi-setup.md" -Pattern "Code Signing" -Description "  Code signing section present" | Out-Null
    
    Write-Check "User guide has certificate installation"
    Test-FileContent -Path "documentation/user-guide/installation.md" -Pattern "certificate|Certificate" -Description "  Certificate instructions present" | Out-Null
    
    return $allExist
}

function Test-GitIgnore {
    Write-Section ".gitignore Validation"
    
    if (-not (Test-Path ".gitignore")) {
        Write-Warn ".gitignore file not found" "Create .gitignore with certificate exclusions"
        return $false
    }
    
    $gitignore = Get-Content ".gitignore" -Raw
    
    $patterns = @{
        "*.pfx" = "PFX files"
        "*.p12" = "P12 files"
        "*password*" = "Password files"
        "*.key" = "Key files"
    }
    
    $allPresent = $true
    foreach ($pattern in $patterns.Keys) {
        Write-Check "Pattern: $pattern"
        
        if ($gitignore -match [regex]::Escape($pattern)) {
            Write-Pass "  Excluded: $($patterns[$pattern])"
        }
        else {
            Write-Warn "  Not excluded: $($patterns[$pattern])" "Add '$pattern' to .gitignore"
            $allPresent = $false
        }
    }
    
    return $allPresent
}

function Test-QuickstartScenario {
    Write-Section "End-to-End Test"
    
    Write-Check "Simulating signing workflow"
    
    # Check if MSI exists
    $msiPattern = "installer\bin\**\*.msi"
    $msis = Get-ChildItem $msiPattern -ErrorAction SilentlyContinue
    
    if (-not $msis) {
        Write-Warn "No MSI found for signing test" "Build solution: dotnet build markread.sln -c Release"
        return $false
    }
    
    $msi = $msis | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Write-Pass "  Found MSI: $($msi.Name)"
    
    # Check if can find certificate
    $certs = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert -ErrorAction SilentlyContinue
    if ($certs.Count -eq 0) {
        Write-Warn "  No certificate available for test" "Create certificate first"
        return $false
    }
    
    Write-Pass "  Certificate available for signing"
    Write-Pass "  Ready for signing test: .\scripts\sign-local.ps1"
    
    return $true
}

# ============================================================================
# Main Validation Flow
# ============================================================================

try {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║       MarkRead Code Signing Setup Validation                        ║" -ForegroundColor Magenta
    Write-Host "╚══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
    
    $results = @{
        Scripts = Test-ScriptsExist
        Workflows = Test-WorkflowsExist
        Certificates = Test-CertificateAvailable
        Secrets = Test-GitHubSecrets
        Dependencies = Test-Dependencies
        Documentation = Test-DocumentationComplete
        GitIgnore = Test-GitIgnore
        EndToEnd = Test-QuickstartScenario
    }
    
    # Summary
    Write-Section "Validation Summary"
    
    Write-Host ""
    Write-Host "  Total Checks: $script:CheckCount"
    Write-Host "  Passed:       " -NoNewline
    Write-Host $script:PassCount -ForegroundColor Green
    Write-Host "  Warnings:     " -NoNewline
    Write-Host $script:WarnCount -ForegroundColor Yellow
    Write-Host "  Failed:       " -NoNewline
    Write-Host $script:FailCount -ForegroundColor Red
    
    # Component status
    Write-Host "`n  Component Status:"
    foreach ($component in $results.Keys) {
        $status = if ($results[$component]) { "✓" } else { "✗" }
        $color = if ($results[$component]) { "Green" } else { "Red" }
        Write-Host "    $status $component" -ForegroundColor $color
    }
    
    # Issues summary
    if ($script:Issues.Count -gt 0) {
        Write-Section "Issues Requiring Attention"
        
        $errorIssues = $script:Issues | Where-Object { $_.Type -eq "Error" }
        $warnIssues = $script:Issues | Where-Object { $_.Type -eq "Warning" }
        
        if ($errorIssues.Count -gt 0) {
            Write-Host "`n  Critical Issues:" -ForegroundColor Red
            foreach ($issue in $errorIssues) {
                Write-Host "    • $($issue.Message)" -ForegroundColor Red
                Write-Host "      → $($issue.Fix)" -ForegroundColor Yellow
            }
        }
        
        if ($warnIssues.Count -gt 0) {
            Write-Host "`n  Warnings:" -ForegroundColor Yellow
            foreach ($issue in $warnIssues) {
                Write-Host "    • $($issue.Message)" -ForegroundColor Yellow
                Write-Host "      → $($issue.Fix)" -ForegroundColor Gray
            }
        }
    }
    
    # Overall result
    Write-Host ""
    if ($script:FailCount -eq 0) {
        Write-Host "╔══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║  ✓ Code Signing Setup: READY                                        ║" -ForegroundColor Green
        Write-Host "╚══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
        
        if ($script:WarnCount -gt 0) {
            Write-Host "`nRecommendation: Address warnings before production release." -ForegroundColor Yellow
        }
        
        Write-Host "`nNext steps:"
        Write-Host "  1. Test local signing: .\scripts\sign-local.ps1"
        Write-Host "  2. Verify GitHub Secrets are set (cannot auto-check)"
        Write-Host "  3. Create test release to verify CI/CD signing"
        Write-Host "  4. Distribute certificate to users: .\scripts\import-certificate.ps1"
        
        exit 0
    }
    else {
        Write-Host "╔══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
        Write-Host "║  ✗ Code Signing Setup: ISSUES DETECTED                              ║" -ForegroundColor Red
        Write-Host "╚══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
        
        Write-Host "`nResolve critical issues before attempting to sign releases." -ForegroundColor Red
        
        if ($FixIssues) {
            Write-Host "`nNote: -FixIssues was specified but automatic fixes not yet implemented." -ForegroundColor Yellow
            Write-Host "Please address issues manually using the suggested fixes above."
        }
        
        exit 1
    }
}
catch {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  Validation Error                                                    ║" -ForegroundColor Red
    Write-Host "╚══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Stack Trace:" -ForegroundColor Gray
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    
    exit 1
}
