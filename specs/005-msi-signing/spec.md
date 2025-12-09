# Feature Specification: Self-Signed MSI Code Signing and Distribution

**Feature Branch**: `005-msi-signing`  
**Created**: 2025-11-27  
**Status**: Draft  
**Input**: User description: "I want to sign my private app, that I am developing solo, as a private person; and distribute through github. There is already an installer created as part of the deployment; but it needs to be improved and signed. Goal: ship the MSI without 'Unknown publisher' warnings."

## Clarifications

### Session 2025-11-27

- Q: How should the system handle certificate expiration to minimize disruption? → A: Fail builds when certificate expires; manual intervention required to replace in GitHub Secrets
- Q: How should the certificate password be managed in GitHub Secrets? → A: Store as separate secret (CERT_PASSWORD); reference both secrets in workflow
- Q: How should the workflow handle signing failures? → A: Fail workflow with detailed diagnostics (cert validity, password verification); log errors but don't expose secrets
- Q: How should users verify MSI signature validity? → A: Automated workflow step verifies signature after signing; plus documentation for manual Windows verification

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated MSI Signing in CI/CD (Priority: P1)

As a solo developer, I want the build process to automatically sign my MSI installer during the GitHub Actions workflow, so that I can produce signed installers without manual intervention every time I create a release.

**Why this priority**: This is the foundation for the entire feature. Without automated signing, the developer must manually sign every build, which is error-prone and time-consuming. This delivers immediate value by streamlining the release process.

**Independent Test**: Can be fully tested by triggering a GitHub Actions workflow, verifying the MSI is signed with the certificate stored in GitHub Secrets, and confirming the signature is present on the output artifact.

**Acceptance Scenarios**:

1. **Given** a GitHub Actions workflow is triggered for a release, **When** the installer build completes, **Then** the MSI file is automatically signed with the self-signed certificate
2. **Given** the signing certificate is stored in GitHub Secrets, **When** the workflow runs, **Then** the certificate is securely retrieved and used for signing without exposing private keys in logs
3. **Given** a signed MSI is produced, **When** inspecting the file properties, **Then** the Digital Signatures tab shows a valid signature with the expected issuer name

---

### User Story 2 - Local Development Signing (Priority: P2)

As a solo developer, I want to sign my MSI installer on my development laptop using the same certificate, so that I can test the installation experience locally before pushing to CI/CD.

**Why this priority**: Essential for local testing and validation before committing to the repository. Allows the developer to verify the signing process works correctly in a controlled environment.

**Independent Test**: Can be fully tested by running the local build script, signing the MSI with a locally stored certificate, and installing it on the same machine without publisher warnings.

**Acceptance Scenarios**:

1. **Given** a certificate is available on the development laptop, **When** the developer builds the MSI locally, **Then** the MSI is signed with the local certificate
2. **Given** a signed MSI on the development laptop, **When** installing it on the same machine, **Then** the installation proceeds without "Unknown publisher" warnings
3. **Given** the developer needs to create or renew a certificate, **When** running a certificate generation script, **Then** a new self-signed certificate is created and stored securely

---

### User Story 3 - Installation on Other Machines (Priority: P3)

As a user installing the application on a different machine, I want clear instructions for trusting the self-signed certificate, so that I can install the signed MSI without "Unknown publisher" warnings.

**Why this priority**: This completes the end-to-end experience but is lower priority because it's a one-time manual setup per machine. The core value (automated signing) is already delivered by P1 and P2.

**Independent Test**: Can be fully tested by exporting the public certificate, importing it on a clean test machine, and installing the signed MSI without warnings.

**Acceptance Scenarios**:

1. **Given** a signed MSI and the public certificate file, **When** a user imports the certificate into their machine's Trusted Root and Trusted Publishers stores, **Then** the MSI installs without "Unknown publisher" warnings
2. **Given** a user needs to trust the certificate, **When** they follow the provided documentation, **Then** they can complete the certificate import process in under 5 minutes
3. **Given** a machine with the trusted certificate, **When** installing a newly released version of the MSI, **Then** no additional certificate import is required

---

### Edge Cases

 - **Untrusted certificate installation**: If a user installs the MSI without first importing the certificate, Windows will display a standard UAC warning with "Unknown publisher"; installation can proceed if the user accepts the warning. Documentation MUST explain this behavior and provide steps to avoid it by importing the certificate.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The build process MUST automatically sign the MSI installer with a self-signed code-signing certificate
- **FR-002**: The certificate and private key MUST be stored securely in GitHub Secrets; the certificate password MUST be stored as a separate secret for independent rotation
- **FR-003**: The signing process MUST be integrated into the GitHub Actions workflow that builds the installer
- **FR-004**: The developer MUST be able to sign the MSI locally on their development laptop using the same certificate
- **FR-005**: The system MUST provide the public certificate file (without private key) for users to import on other machines
- **FR-006**: The signed MSI MUST pass Windows code signature verification checks
- **FR-006a**: The GitHub Actions workflow MUST include an automated verification step after signing that confirms the MSI signature is valid before uploading artifacts
- **FR-007**: The system MUST provide documentation on how to create the self-signed certificate
- **FR-008**: The system MUST provide documentation on how to import the certificate on other machines to avoid "Unknown publisher" warnings and how to manually verify MSI signatures using Windows built-in tools
- **FR-009**: The GitHub Actions workflow MUST fail if signing fails, preventing unsigned installers from being released; failure logs MUST include diagnostic information (certificate validity, password verification status) without exposing secret values
- **FR-009a**: The GitHub Actions workflow MUST fail with a clear error message when attempting to sign with an expired certificate
- **FR-010**: The certificate MUST have a validity period of at least 1 year to minimize rotation frequency
- **FR-011**: The system MUST provide a way to export/backup the certificate and private key for continuity
- **FR-012**: The signed MSI MUST display the publisher name in the User Account Control (UAC) dialog during installation

### Assumptions

- The developer already has a GitHub repository with an MSI installer build process
- The developer has access to Windows command-line tools for certificate generation (e.g., PowerShell, makecert, or New-SelfSignedCertificate)
- Users installing on other machines are comfortable with manual certificate import or can follow step-by-step instructions
- The application is distributed through GitHub Releases or similar artifact storage
- No financial budget is available for purchasing a certificate from a trusted Certificate Authority
- The primary installation scenario is for testing/evaluation before investing in a commercial certificate
- The developer accepts that every user must manually trust the certificate on each machine

### Key Entities

- **Self-Signed Certificate**: A code-signing certificate generated by the developer, containing a public/private key pair, subject name, validity period, and code-signing extended key usage
- **Certificate Password**: A secret passphrase protecting the private key in the certificate file; stored as a separate GitHub Secret (CERT_PASSWORD) for independent rotation
- **GitHub Secret**: Secure storage for the certificate file (PFX format) and password within GitHub repository settings
- **Signed MSI**: The installer package with an embedded digital signature that can be verified against the certificate
- **Public Certificate**: The certificate without the private key (CER format) that users import to establish trust

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can trigger a GitHub Actions workflow that produces a signed MSI without manual signing steps
- **SC-002**: Installation of the signed MSI on a machine with the trusted certificate completes without "Unknown publisher" warnings
- **SC-003**: The certificate creation and GitHub Secrets setup can be completed in under 30 minutes following documentation
- **SC-004**: Certificate import on a new machine can be completed in under 5 minutes following documentation
- **SC-005**: 100% of MSI releases include a valid digital signature that passes Windows verification
- **SC-006**: The private key never appears in GitHub Actions logs or workflow artifacts
