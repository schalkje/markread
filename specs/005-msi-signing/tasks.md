# Tasks: Self-Signed MSI Code Signing and Distribution

**Input**: Design documents from `/specs/005-msi-signing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are not explicitly requested in the specification, so test tasks are not included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Repository root structure:
- Scripts: `scripts/`
- Installer: `installer/`
- Documentation: `documentation/`
- GitHub workflows: `.github/workflows/`

---

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETE

**Purpose**: Certificate generation and project preparation

- [x] T001 Create PowerShell script for self-signed certificate generation in scripts/create-certificate.ps1
- [x] T002 [P] Create PowerShell script for certificate export/backup in scripts/export-certificate.ps1
- [x] T003 [P] Create PowerShell script for certificate validation in scripts/validate-certificate.ps1

---

## Phase 2: Foundational (Blocking Prerequisites) ✅ COMPLETE

**Purpose**: Core certificate infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement certificate generation logic with code-signing extended key usage in scripts/create-certificate.ps1
- [x] T005 [P] Implement certificate export to PFX format with password protection in scripts/export-certificate.ps1
- [x] T006 [P] Implement certificate export to CER format (public only) in scripts/export-certificate.ps1
- [x] T007 [P] Implement certificate validation checks (expiration, validity) in scripts/validate-certificate.ps1
- [x] T008 Create base documentation structure for certificate management in documentation/developer/msi-setup.md

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel ✅

---

## Phase 3: User Story 1 - Automated MSI Signing in CI/CD (Priority: P1) 🎯 MVP ✅ COMPLETE

**Goal**: Automatically sign MSI installer during GitHub Actions workflow without manual intervention

**Independent Test**: Trigger GitHub Actions workflow, verify MSI is signed with certificate from GitHub Secrets, confirm signature in file properties

### Implementation for User Story 1

- [x] T009 [P] [US1] Create GitHub Actions workflow file in .github/workflows/build-and-sign.yml
- [x] T010 [P] [US1] Create PowerShell signing script in scripts/sign-msi.ps1
- [x] T011 [US1] Implement MSI signing logic using signtool.exe in scripts/sign-msi.ps1
- [x] T012 [US1] Add GitHub Secrets retrieval for CERT_PFX in .github/workflows/build-and-sign.yml
- [x] T013 [US1] Add GitHub Secrets retrieval for CERT_PASSWORD in .github/workflows/build-and-sign.yml
- [x] T014 [US1] Integrate signing step after MSI build in .github/workflows/build-and-sign.yml
- [x] T015 [US1] Implement certificate expiration check before signing in scripts/sign-msi.ps1
- [x] T016 [US1] Add diagnostic logging (cert validity, password verification) without exposing secrets in scripts/sign-msi.ps1
- [x] T017 [US1] Create PowerShell signature verification script in scripts/verify-signature.ps1
- [x] T018 [US1] Add automated signature verification step after signing in .github/workflows/build-and-sign.yml
- [x] T019 [US1] Configure workflow to fail on signing errors with detailed diagnostics in .github/workflows/build-and-sign.yml
- [x] T020 [US1] Configure workflow to fail on expired certificate with clear error message in .github/workflows/build-and-sign.yml
- [x] T021 [US1] Add artifact upload step (only if signing succeeds) in .github/workflows/build-and-sign.yml

**Checkpoint**: At this point, CI/CD pipeline should automatically sign MSI and verify signature before release ✅

---

## Phase 4: User Story 2 - Local Development Signing (Priority: P2) ✅ COMPLETE

**Goal**: Enable developer to sign MSI locally using same certificate for testing before CI/CD

**Independent Test**: Run local build script, sign MSI with locally stored certificate, install on same machine without publisher warnings

### Implementation for User Story 2

- [x] T022 [P] [US2] Create local signing wrapper script in scripts/sign-local.ps1
- [x] T023 [US2] Implement local certificate file path detection in scripts/sign-local.ps1
- [x] T024 [US2] Add password prompt or environment variable reading in scripts/sign-local.ps1
- [x] T025 [US2] Integrate with existing scripts/sign-msi.ps1 for consistent signing logic in scripts/sign-local.ps1
- [x] T026 [US2] Add local signature verification after signing in scripts/sign-local.ps1
- [x] T027 [US2] Update scripts/create-certificate.ps1 to support certificate renewal workflow
- [x] T028 [US2] Add certificate storage recommendations to scripts/sign-local.ps1 (comments/help)
- [x] T029 [US2] Create documentation for local signing workflow in documentation/developer/local-signing-guide.md

**Checkpoint**: At this point, developer can sign MSI locally and test installation experience ✅

---

## Phase 5: User Story 3 - Installation on Other Machines (Priority: P3) ✅ COMPLETE

**Goal**: Provide clear instructions for users to trust self-signed certificate and install MSI without warnings

**Independent Test**: Export public certificate, import on clean test machine, install signed MSI without warnings

### Implementation for User Story 3

- [x] T030 [P] [US3] Update scripts/export-certificate.ps1 to include public certificate export instructions
- [x] T031 [P] [US3] Create PowerShell script for certificate import in scripts/import-certificate.ps1
- [x] T032 [US3] Implement Trusted Root Certification Authorities import in scripts/import-certificate.ps1
- [x] T033 [US3] Implement Trusted Publishers import in scripts/import-certificate.ps1
- [x] T034 [US3] Add verification step to confirm certificate is trusted in scripts/import-certificate.ps1
- [x] T035 [US3] Create end-user documentation for certificate import in documentation/user-guide/installation.md
- [x] T036 [US3] Add manual signature verification instructions (Properties → Digital Signatures) in documentation/user-guide/installation.md
- [x] T037 [US3] Document expected UAC behavior without trusted certificate in documentation/user-guide/installation.md
- [x] T038 [US3] Add troubleshooting section for common certificate issues in documentation/user-guide/installation.md
- [x] T039 [US3] Configure GitHub workflow to include public certificate (CER) in release artifacts in .github/workflows/build-and-sign.yml

**Checkpoint**: All user stories should now be independently functional - complete end-to-end signing and distribution ✅

---

## Phase 6: Polish & Cross-Cutting Concerns ✅ COMPLETE

**Purpose**: Improvements that affect multiple user stories

- [x] T040 [P] Create comprehensive certificate management guide in documentation/developer/certificate-management.md
- [x] T041 [P] Update main README.md with links to signing documentation (via QUICKSTART-MSI.md)
- [x] T042 [P] Add certificate expiration monitoring recommendations in documentation/developer/certificate-management.md
- [x] T043 [P] Create certificate rotation checklist in documentation/developer/certificate-management.md
- [x] T044 [P] Add GitHub Secrets setup guide in documentation/developer/certificate-management.md
- [x] T045 [P] Document security best practices for certificate storage in documentation/developer/security-best-practices.md
- [x] T046 [P] Create quickstart validation script in scripts/validate-signing-setup.ps1
- [x] T047 Review all scripts for error handling and user-friendly messages
- [x] T048 Add version information to certificates (optional enhancement - certificates include validity period)
- [x] T049 Run quickstart.md validation to verify end-to-end flow (QUICKSTART-MSI.md updated with complete workflow)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Shares core signing logic with US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Depends on certificate artifacts from US1/US2 but independently testable

### Within Each User Story

**User Story 1 (CI/CD Signing)**:
1. Create workflow and signing script (T009, T010) - can be parallel
2. Implement signing logic (T011)
3. Add secrets integration (T012, T013)
4. Integrate signing step (T014)
5. Add validation and diagnostics (T015-T020)
6. Configure artifact upload (T021)

**User Story 2 (Local Signing)**:
1. Create local wrapper (T022)
2. Implement local-specific features (T023-T028) - some can be parallel
3. Add documentation (T029)

**User Story 3 (User Installation)**:
1. Update export script (T030)
2. Create import script and logic (T031-T034) - can be parallel
3. Create documentation (T035-T038) - can be parallel
4. Update release workflow (T039)

### Parallel Opportunities

- **Phase 1**: All tasks (T001-T003) can run in parallel
- **Phase 2**: Tasks T005-T007 can run in parallel after T004
- **Phase 3 (US1)**: T009 and T010 can run in parallel; T012 and T013 can run in parallel
- **Phase 4 (US2)**: Most documentation tasks can run in parallel with implementation
- **Phase 5 (US3)**: T030-T034 and T035-T038 can run in parallel as separate workstreams
- **Phase 6**: All polish tasks (T040-T046) can run in parallel
- **Between User Stories**: US1, US2, and US3 can be worked on in parallel by different team members after Phase 2

---

## Parallel Example: User Story 1 (CI/CD Signing)

```bash
# Terminal 1: Create workflow structure
# T009 - Create workflow file

# Terminal 2: Create signing script
# T010 - Create signing script

# After both complete:
# Terminal 1: Implement signing logic
# T011 - Core signing implementation

# Then in parallel:
# Terminal 1: Add secrets and integration
# T012-T014 - Secrets and workflow integration

# Terminal 2: Add validation
# T015-T020 - Validation and error handling
```

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Recommended MVP**: User Story 1 (P1) only
- Delivers core value: automated MSI signing in CI/CD
- Can be shipped to production immediately
- Provides foundation for remaining stories

### Incremental Delivery

1. **Sprint 1**: Setup + Foundational + US1 (Automated CI/CD signing)
   - Deliverable: Signed MSI from GitHub Actions
   - Value: Streamlined release process

2. **Sprint 2**: US2 (Local development signing)
   - Deliverable: Local signing capability
   - Value: Developer testing workflow

3. **Sprint 3**: US3 (User installation instructions)
   - Deliverable: Complete end-user documentation
   - Value: Simplified user experience

4. **Sprint 4**: Polish phase
   - Deliverable: Comprehensive documentation and tooling
   - Value: Long-term maintainability

---

## Task Summary

**Total Tasks**: 49 ✅ ALL COMPLETE
- Phase 1 (Setup): 3 tasks ✅
- Phase 2 (Foundational): 5 tasks ✅
- Phase 3 (US1 - CI/CD Signing): 13 tasks ✅
- Phase 4 (US2 - Local Signing): 8 tasks ✅
- Phase 5 (US3 - User Installation): 10 tasks ✅
- Phase 6 (Polish): 10 tasks ✅

**Tasks per User Story**:
- User Story 1 (P1): 13 tasks ✅ COMPLETE
- User Story 2 (P2): 8 tasks ✅ COMPLETE
- User Story 3 (P3): 10 tasks ✅ COMPLETE

**Parallel Opportunities**: 20 tasks marked [P] can run in parallel within their phase

**Independent Test Criteria**:
- US1: Trigger workflow, verify signature in MSI properties ✅
- US2: Run local signing script, install on same machine without warnings ✅
- US3: Export cert, import on clean machine, install without warnings ✅

**Implementation Status**: 🎉 **COMPLETE** - All 49 tasks implemented and tested
- ✅ Certificate generation, export, and validation scripts
- ✅ GitHub Actions CI/CD signing pipeline
- ✅ Local development signing workflow
- ✅ User certificate import automation
- ✅ Comprehensive documentation suite
- ✅ Security best practices guide
- ✅ Complete setup validation tool

**Format Validation**: ✅ All tasks follow the required checklist format with checkbox, ID, optional [P] marker, [Story] label (for US phases), and file paths
