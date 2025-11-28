# Quickstart: Self-Signed MSI Code Signing

## 1. Generate Self-Signed Certificate
- Use PowerShell: `New-SelfSignedCertificate` and export as PFX
- Store PFX file and password securely

## 2. Add Certificate and Password to GitHub Secrets
- Upload PFX file as a GitHub Secret (e.g., CERT_PFX)
- Add password as a separate GitHub Secret (e.g., CERT_PASSWORD)

## 3. Configure GitHub Actions Workflow
- Add signing step using PowerShell and WiX Toolset
- Reference secrets for certificate and password
- Add automated signature verification step

## 4. Build and Sign MSI Locally (Optional)
- Use same certificate and password for local signing
- Verify signature using Windows Properties → Digital Signatures tab

## 5. Distribute Signed MSI
- Release signed MSI via GitHub Releases
- Provide public certificate (CER) for users to import

## 6. Install on Other Machines
- Import public certificate into Trusted Root and Trusted Publishers
- Install MSI; no "Unknown publisher" warning if certificate is trusted

## 7. Renew Certificate (if expired)
- Generate new certificate and update GitHub Secrets
- Re-run workflow to produce signed MSI
