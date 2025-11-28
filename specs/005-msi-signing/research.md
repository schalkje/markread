# Research: Self-Signed MSI Code Signing and Distribution

## Decision: Use PowerShell and WiX Toolset for MSI signing
- Rationale: Native Windows tools, no cost, aligns with solo dev constraints
- Alternatives considered: Third-party signing tools (cost, complexity), paid CA (not viable for test phase)

## Decision: Store certificate and password as separate GitHub Secrets
- Rationale: Security best practice, enables independent rotation
- Alternatives considered: Embed password in PFX, store in workflow file (less secure)

## Decision: Fail builds on certificate expiration, require manual renewal
- Rationale: Prevents unsigned releases, keeps process simple
- Alternatives considered: Automated renewal (risk of silent failures), allow expired certs (security risk)

## Decision: Fail workflow with detailed diagnostics on signing failure
- Rationale: Actionable feedback, prevents unsigned artifacts
- Alternatives considered: Retry logic (unnecessary for solo dev), upload unsigned MSI (not acceptable)

## Decision: Automated signature verification in workflow, plus manual Windows check
- Rationale: Defense-in-depth, easy for solo dev and users
- Alternatives considered: Manual only (less reliable), third-party verification (cost, complexity)

## Decision: Standard Windows UAC warning for untrusted cert
- Rationale: Honest, sets correct expectations, easy to document
- Alternatives considered: Pre-install check (adds complexity), fail install (blocks user unnecessarily)
