# Speckit Configuration
# Source this file in your PowerShell profile or run it before using speckit commands

# Enable git worktrees (set to "false" to use traditional checkout)
$env:SPECKIT_USE_WORKTREES = "true"

# Worktree base directory (where feature worktrees will be created)
$env:SPECKIT_WORKTREE_BASE = "c:\repo\markread.worktrees"

Write-Host "Speckit configuration loaded:" -ForegroundColor Green
Write-Host "  Use worktrees: $env:SPECKIT_USE_WORKTREES" -ForegroundColor Cyan
Write-Host "  Worktree base: $env:SPECKIT_WORKTREE_BASE" -ForegroundColor Cyan
