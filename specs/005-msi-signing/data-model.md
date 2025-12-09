# Data Model: Self-Signed MSI Code Signing

## Entities

### SelfSignedCertificate
- Fields:
  - SubjectName (string)
  - ValidFrom (date)
  - ValidTo (date)
  - PublicKey (string)
  - PrivateKey (string, encrypted)
  - Password (string, stored in GitHub Secret)
  - FilePath (string)
- Relationships:
  - Used to sign MSI

### SignedMSI
- Fields:
  - FileName (string)
  - FilePath (string)
  - SignatureStatus (enum: Valid, Invalid, Expired)
  - PublisherName (string)
  - BuildDate (date)
- Relationships:
  - Signed by SelfSignedCertificate

### GitHubSecret
- Fields:
  - Name (string)
  - Value (string, encrypted)
  - Type (enum: Certificate, Password)
- Relationships:
  - Stores SelfSignedCertificate and Password

### PublicCertificate
- Fields:
  - FileName (string)
  - FilePath (string)
  - SubjectName (string)
- Relationships:
  - Exported from SelfSignedCertificate

## Validation Rules
- Certificate must be valid (not expired) before signing
- Password must match certificate
- MSI must have valid signature before release
- GitHub Secrets must not expose private key or password in logs
