# Tasks: Packaging & Distribution Modernization

**Input**: Design documents from `/specs/002-packaging-modernization/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are not explicitly requested in this feature specification. Tasks focus on implementation, configuration, and infrastructure.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single Electron project**: Root directory structure with scripts/, assets/, .github/workflows/, electron-builder.yml
- Legacy artifacts in installer/ directory (to be removed)
- Configuration files at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and packaging infrastructure setup

- [X] T001 Review current project structure and verify package.json has correct metadata (productName, version, author, license)
- [X] T002 [P] Install electron-builder as dev dependency in package.json
- [X] T003 [P] Install electron-updater as dependency in package.json
- [X] T004 [P] Add packaging scripts to package.json (package, publish)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create electron-builder.yml at repository root with basic configuration (appId, productName, directories)
- [X] T006 [P] Create scripts/electron-sign.ps1 PowerShell script skeleton (locate signtool.exe function)
- [X] T007 [P] Verify assets/ directory has all required files (icon.ico, icon.png, installer-banner.bmp, installer-dialog.bmp, License.rtf)
- [X] T008 [P] Create .github/workflows/ci.yml skeleton (Node.js 20 setup, checkout)
- [X] T009 [P] Create .github/workflows/release.yml skeleton (Node.js 20 setup, checkout)
- [X] T010 Create scripts/release.ps1 skeleton for release automation

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Clean Legacy Artifacts (Priority: P1) 🎯 MVP

**Goal**: Remove all legacy WPF packaging artifacts (~6.5MB) from the codebase so that the repository is clean, maintainable, and only contains relevant Electron packaging infrastructure.

**Independent Test**: Verify that installer/ directory is deleted, .gitignore has no .NET entries, repository is ~6.5MB smaller, and npm run build succeeds without .NET dependencies.

### Implementation for User Story 1

- [X] T011 [US1] Delete installer/ directory completely (includes MarkRead.Installer.wixproj, Package.wxs, all build artifacts)
- [X] T012 [P] [US1] Remove scripts/sign-msi.ps1 (MSI-specific signing script)
- [X] T013 [P] [US1] Update .gitignore to remove .NET-specific entries (*.csproj, bin/, obj/, etc.) while preserving Electron entries
- [X] T014 [P] [US1] Update README.md to remove references to WiX and MSI packaging
- [X] T015 [US1] Commit changes with message "chore: Remove legacy WPF/WiX packaging artifacts"
- [X] T016 [US1] Verify git history shows ~6.5MB reduction in repository size

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - legacy artifacts removed, repository clean

---

## Phase 4: User Story 2 - Functional CI/CD Pipelines (Priority: P1)

**Goal**: Establish functional CI/CD pipelines that build and test Electron installers so that releases are automated, reliable, and follow Electron best practices.

**Independent Test**: Create test tag v0.5.1-beta.1, verify GitHub Actions workflow successfully builds unsigned Electron .exe, runs tests, performs type checking, and produces build artifacts.

### Implementation for User Story 2

- [X] T017 [P] [US2] Implement CI workflow .github/workflows/ci.yml with steps: npm ci, type-check, lint, test, build, package (unsigned)
- [X] T018 [P] [US2] Add artifact upload to CI workflow for unsigned installer (retention: 30 days)
- [X] T019 [US2] Implement release workflow .github/workflows/release.yml with trigger on v*.*.* tags
- [X] T020 [US2] Add version validation step in release workflow to compare package.json version with git tag
- [X] T021 [US2] Add steps to release workflow: type-check, lint, test, build (matching CI workflow)
- [X] T022 [US2] Add packaging step to release workflow (will be completed in US3 with signing)
- [X] T023 [P] [US2] Add artifact upload to release workflow for installer, portable .exe, latest.yml, blockmap (retention: 90 days)
- [ ] T024 [US2] Test CI workflow by pushing to develop branch and verify build succeeds
- [ ] T025 [US2] Test release workflow by creating test tag v0.5.1-beta.1 (without signing, expect unsigned build)

**Checkpoint**: At this point, User Story 2 should be fully functional and testable independently - CI/CD pipelines build and test Electron installers

---

## Phase 5: User Story 3 - Code Signed Installers (Priority: P2)

**Goal**: Provide digitally signed installers so that users can trust the application is authentic and Windows SmartScreen does not block the installation.

**Independent Test**: Run packaged installer through Windows SmartScreen and signtool verification, confirming zero warnings and valid certificate chain.

### Implementation for User Story 3

- [X] T026 [P] [US3] Implement certificate loading logic in scripts/electron-sign.ps1 (PFX file or Windows Certificate Store)
- [X] T027 [P] [US3] Implement certificate expiration check in scripts/electron-sign.ps1 (WARN if <30 days, FAIL if expired)
- [X] T028 [US3] Implement signing logic in scripts/electron-sign.ps1 (SHA256, timestamp from DigiCert)
- [X] T029 [P] [US3] Implement signature verification logic in scripts/electron-sign.ps1 (signtool verify /pa /v)
- [X] T030 [US3] Configure electron-builder.yml win.sign to call scripts/electron-sign.ps1
- [X] T031 [US3] Add certificate expiration check step in .github/workflows/release.yml before packaging
- [X] T032 [US3] Configure GitHub Secrets for code signing (PFX_PATH, PFX_PASSWORD or CERT_THUMBPRINT)
- [X] T033 [US3] Add signature verification step in .github/workflows/release.yml after packaging
- [ ] T034 [US3] Test signing locally with development self-signed certificate
- [ ] T035 [US3] Test release workflow with code signing enabled (use test certificate)

**Checkpoint**: At this point, User Story 3 should be fully functional and testable independently - installers are digitally signed and pass SmartScreen verification

---

## Phase 6: User Story 4 - Auto-Update Functionality (Priority: P2)

**Goal**: Provide automatic update notifications and seamless update installation so that users always have the latest features and security fixes without manual downloads.

**Independent Test**: Run MarkRead v0.5.0, publish v0.5.1 to GitHub Releases, verify app detects update, downloads in background, and prompts user to restart and install.

### Implementation for User Story 4

- [X] T036 [P] [US4] Configure electron-builder.yml publish section for GitHub Releases provider
- [X] T037 [P] [US4] Implement auto-update initialization in src/main/index.ts (configure electron-updater, skip in dev mode)
- [X] T038 [P] [US4] Implement startup update check in src/main/index.ts (5-second delay after app launch)
- [X] T039 [P] [US4] Implement periodic update check in src/main/index.ts (every 4 hours)
- [X] T040 [US4] Implement update-available event handler in src/main/index.ts (show notification with download option)
- [X] T041 [US4] Implement download-progress event handler in src/main/index.ts (send progress to renderer)
- [X] T042 [US4] Implement update-downloaded event handler in src/main/index.ts (show notification with restart option)
- [X] T043 [P] [US4] Implement exponential backoff for update check failures in src/main/index.ts (1hr, 2hr, 4hr retry intervals)
- [X] T044 [P] [US4] Implement rollback detection in src/main/index.ts (crash flag, previous version backup)
- [X] T045 [P] [US4] Add portable mode detection in src/main/index.ts (skip auto-updates if process.env.PORTABLE_EXECUTABLE_FILE)
- [ ] T046 [US4] Test auto-update flow with local mock versions (update-available, download-progress, update-downloaded events)
- [ ] T047 [US4] Test exponential backoff by simulating GitHub API failures

**Checkpoint**: At this point, User Story 4 should be fully functional and testable independently - auto-updates work with rollback and resilience

---

## Phase 7: User Story 5 - Enhanced electron-builder Configuration (Priority: P2)

**Goal**: Provide a comprehensive electron-builder configuration that follows best practices so that installers are optimized, secure, and ready for cross-platform distribution.

**Independent Test**: Run npm run package, verify output includes NSIS installer with correct settings, portable .exe variant, ASAR packaging, maximum compression, file associations configured, and latest.yml for auto-updates.

### Implementation for User Story 5

- [X] T048 [P] [US5] Configure electron-builder.yml win target with NSIS and portable variants
- [X] T049 [P] [US5] Configure electron-builder.yml NSIS section (oneClick: false, allowToChangeInstallationDirectory: true, perMachine: false)
- [X] T050 [P] [US5] Configure electron-builder.yml NSIS shortcuts (createDesktopShortcut: true, createStartMenuShortcut: true)
- [X] T051 [P] [US5] Configure electron-builder.yml NSIS license (assets/License.rtf)
- [X] T052 [P] [US5] Configure electron-builder.yml NSIS installer UI (installerHeader: assets/installer-banner.bmp, installerSidebar: assets/installer-dialog.bmp)
- [X] T053 [P] [US5] Configure electron-builder.yml NSIS data preservation (deleteAppDataOnUninstall: false)
- [X] T054 [P] [US5] Configure electron-builder.yml portable section (artifactName pattern)
- [X] T055 [P] [US5] Configure electron-builder.yml compression (maximum LZMA compression)
- [X] T056 [P] [US5] Configure electron-builder.yml asar packaging (asar: true)
- [X] T057 [P] [US5] Configure electron-builder.yml fileAssociations for .md and .markdown extensions
- [X] T058 [P] [US5] Configure electron-builder.yml win.icon (assets/icon.ico)
- [ ] T059 [US5] Test packaging locally with npm run package and verify all configuration settings
- [ ] T060 [US5] Verify installer size is <100MB with LZMA compression
- [ ] T061 [US5] Verify portable .exe stores settings in ./portable-data/ (not %LOCALAPPDATA%)

**Checkpoint**: At this point, User Story 5 should be fully functional and testable independently - electron-builder configuration produces optimized, professional installers

---

## Phase 8: User Story 6 - Modernized Release Scripts (Priority: P3)

**Goal**: Provide modernized PowerShell release scripts that work with Electron's package.json versioning so that the release process is streamlined and error-free.

**Independent Test**: Run .\scripts\release.ps1 -NewVersion "0.5.1" -DryRun, verify it reads package.json version, updates version correctly, prompts for CHANGELOG.md edits, runs tests/lint/build, creates git commit and tag, and provides clear push instructions.

### Implementation for User Story 6

- [X] T062 [P] [US6] Implement version validation in scripts/release.ps1 (semver format check)
- [X] T063 [P] [US6] Implement package.json version update in scripts/release.ps1 (read current version, update to new version)
- [X] T064 [US6] Implement CHANGELOG.md prompt in scripts/release.ps1 (open editor, wait for user)
- [X] T065 [P] [US6] Implement test/lint/build execution in scripts/release.ps1 with failure handling
- [X] T066 [P] [US6] Implement git commit and tag creation in scripts/release.ps1
- [X] T067 [P] [US6] Implement push instructions output in scripts/release.ps1 (clear commands to push main and tags)
- [X] T068 [P] [US6] Implement dry-run mode in scripts/release.ps1 (-DryRun flag)
- [X] T069 [P] [US6] Implement duplicate version check in scripts/release.ps1 (warn if version exists in CHANGELOG.md)
- [X] T070 [US6] Test release script with -DryRun flag and verify output
- [ ] T071 [US6] Test release script with actual version update (use test branch)

**Checkpoint**: At this point, User Story 6 should be fully functional and testable independently - release script automates version management and release process

---

## Phase 9: User Story 7 - File Associations & Context Menu (Priority: P3)

**Goal**: Provide .md and .markdown file associations with "Open with MarkRead" in the context menu so that users can easily open markdown files with a double-click or right-click.

**Independent Test**: Install MarkRead, right-click a .md file to verify "Open with MarkRead" appears in context menu, and double-click a .md file to verify it opens in MarkRead.

### Implementation for User Story 7

- [X] T072 [P] [US7] Implement file open handler in src/main/index.ts (handle file:// protocol and command-line args)
- [X] T073 [P] [US7] Implement second-instance handler in src/main/index.ts (open file in existing window if app already running)
- [X] T074 [P] [US7] Register file association protocol handler in src/main/index.ts (app.setAsDefaultProtocolClient for markread://)
- [ ] T075 [US7] Test file associations by installing NSIS installer and double-clicking .md file
- [ ] T076 [US7] Test context menu by right-clicking .md file and selecting "Open with MarkRead"
- [ ] T077 [US7] Test file association cleanup by uninstalling MarkRead and verifying registry entries are removed

**Checkpoint**: At this point, User Story 7 should be fully functional and testable independently - file associations work for .md and .markdown files

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T078 [P] Create build-metadata.json generation script (version, buildDate, commitSHA, nodeVersion, npmVersion, electronVersion)
- [ ] T079 [P] Add build-metadata.json generation to .github/workflows/release.yml
- [ ] T080 [P] Implement installer logging in src/main/index.ts (write to %LOCALAPPDATA%\MarkRead\Logs with timestamps and error codes)
- [ ] T081 [P] Implement error dialog display in src/main/index.ts (show log path and error code on installation failure)
- [ ] T082 [P] Update README.md with new packaging instructions (electron-builder, not WiX)
- [ ] T083 [P] Update CHANGELOG.md with packaging modernization entry
- [ ] T084 [P] Add npm scripts documentation in package.json (comments explaining package, publish, build commands)
- [ ] T085 Run full end-to-end test: clean repository → build → package → sign → verify → install → test app → uninstall
- [ ] T086 Run quickstart.md validation (follow all steps to verify accuracy)
- [ ] T087 [P] Archive legacy v0.4.1 MSI installer to GitHub Releases for historical reference (if not already done)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories (may benefit from US1 clean repository)
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Integrates with US2 (CI/CD pipelines) but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Requires US5 publish config but independently testable
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 6 (P3)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 7 (P3)**: Can start after Foundational (Phase 2) - Requires US5 fileAssociations config but independently testable

### Within Each User Story

- Setup/configuration tasks before implementation
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks (T002, T003, T004) can run in parallel
- All Foundational tasks marked [P] (T006, T007, T008, T009) can run in parallel within Phase 2
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows):
  - US1: Clean legacy artifacts
  - US2: CI/CD pipelines
  - US3: Code signing
  - US4: Auto-updates
  - US5: electron-builder config
  - US6: Release scripts
  - US7: File associations
- Within each user story, all tasks marked [P] can run in parallel
- All Polish tasks marked [P] (T078-T084, T087) can run in parallel

---

## Parallel Example: User Story 5 (Enhanced electron-builder Configuration)

```bash
# Launch all configuration tasks for User Story 5 together:
Task: "Configure electron-builder.yml win target with NSIS and portable variants"
Task: "Configure electron-builder.yml NSIS section (oneClick: false, allowToChangeInstallationDirectory: true, perMachine: false)"
Task: "Configure electron-builder.yml NSIS shortcuts (createDesktopShortcut: true, createStartMenuShortcut: true)"
Task: "Configure electron-builder.yml NSIS license (assets/License.rtf)"
Task: "Configure electron-builder.yml NSIS installer UI (installerHeader: assets/installer-banner.bmp, installerSidebar: assets/installer-dialog.bmp)"
Task: "Configure electron-builder.yml NSIS data preservation (deleteAppDataOnUninstall: false)"
Task: "Configure electron-builder.yml portable section (artifactName pattern)"
Task: "Configure electron-builder.yml compression (maximum LZMA compression)"
Task: "Configure electron-builder.yml asar packaging (asar: true)"
Task: "Configure electron-builder.yml fileAssociations for .md and .markdown extensions"
Task: "Configure electron-builder.yml win.icon (assets/icon.ico)"

# Then run integration tests:
Task: "Test packaging locally with npm run package and verify all configuration settings"
Task: "Verify installer size is <100MB with LZMA compression"
Task: "Verify portable .exe stores settings in ./portable-data/ (not %LOCALAPPDATA%)"
```

---

## Parallel Example: User Story 3 (Code Signing)

```bash
# Launch all independent signing script tasks together:
Task: "Implement certificate loading logic in scripts/electron-sign.ps1 (PFX file or Windows Certificate Store)"
Task: "Implement certificate expiration check in scripts/electron-sign.ps1 (WARN if <30 days, FAIL if expired)"
Task: "Implement signature verification logic in scripts/electron-sign.ps1 (signtool verify /pa /v)"

# Then sequential tasks:
Task: "Implement signing logic in scripts/electron-sign.ps1 (SHA256, timestamp from DigiCert)"
Task: "Configure electron-builder.yml win.sign to call scripts/electron-sign.ps1"
Task: "Add certificate expiration check step in .github/workflows/release.yml before packaging"
Task: "Configure GitHub Secrets for code signing (PFX_PATH, PFX_PASSWORD or CERT_THUMBPRINT)"
Task: "Add signature verification step in .github/workflows/release.yml after packaging"
Task: "Test signing locally with development self-signed certificate"
Task: "Test release workflow with code signing enabled (use test certificate)"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Clean Legacy Artifacts)
4. Complete Phase 4: User Story 2 (Functional CI/CD Pipelines)
5. **STOP and VALIDATE**: Test that CI/CD builds unsigned Electron installers successfully
6. Deploy/demo if ready

**Rationale**: US1 + US2 provide the foundation for all packaging work - clean repository and functional build pipelines.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Commit (repository clean)
3. Add User Story 2 → Test independently → Commit (CI/CD functional)
4. Add User Story 3 → Test independently → Commit (code signing works)
5. Add User Story 5 → Test independently → Commit (optimized installer)
6. Add User Story 4 → Test independently → Commit (auto-updates work)
7. Add User Story 6 → Test independently → Commit (release automation)
8. Add User Story 7 → Test independently → Commit (file associations)
9. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Clean Legacy Artifacts)
   - Developer B: User Story 2 (CI/CD Pipelines)
   - Developer C: User Story 5 (electron-builder Configuration)
3. After priority P1 stories complete:
   - Developer A: User Story 3 (Code Signing)
   - Developer B: User Story 4 (Auto-Updates)
4. After priority P2 stories complete:
   - Developer A: User Story 6 (Release Scripts)
   - Developer B: User Story 7 (File Associations)
5. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Tests are not explicitly requested in this feature, focus is on implementation and infrastructure
- Code signing requires Windows SDK (signtool.exe) and certificate credentials
- Auto-updates require GitHub Releases and proper publish configuration
- File associations are configured via electron-builder and handled by NSIS installer
- Portable .exe variant disables auto-updates and stores settings locally

---

## Summary

- **Total Tasks**: 87 tasks across 10 phases
- **MVP Scope** (Recommended): User Stories 1 & 2 (Tasks T001-T025) = 25 tasks
- **Full Feature Scope**: All 7 user stories (Tasks T001-T087) = 87 tasks

### Task Count by User Story

| User Story | Priority | Task Count | Description |
|------------|----------|------------|-------------|
| Setup | - | 4 tasks | Project initialization |
| Foundational | - | 6 tasks | Core infrastructure (BLOCKS all stories) |
| US1 | P1 | 6 tasks | Clean Legacy Artifacts |
| US2 | P1 | 9 tasks | Functional CI/CD Pipelines |
| US3 | P2 | 10 tasks | Code Signed Installers |
| US4 | P2 | 12 tasks | Auto-Update Functionality |
| US5 | P2 | 14 tasks | Enhanced electron-builder Configuration |
| US6 | P3 | 10 tasks | Modernized Release Scripts |
| US7 | P3 | 6 tasks | File Associations & Context Menu |
| Polish | - | 10 tasks | Cross-cutting concerns |

### Parallel Opportunities

- **Setup Phase**: 3 tasks can run in parallel (T002, T003, T004)
- **Foundational Phase**: 4 tasks can run in parallel (T006, T007, T008, T009)
- **After Foundational**: All 7 user stories can start in parallel if team capacity allows
- **Within US3**: 3 tasks can run in parallel (T026, T027, T029)
- **Within US4**: 5 tasks can run in parallel (T036-T039, T045)
- **Within US5**: 11 tasks can run in parallel (T048-T058)
- **Within US6**: 6 tasks can run in parallel (T062, T063, T065, T066, T067, T068, T069)
- **Within US7**: 3 tasks can run in parallel (T072, T073, T074)
- **Polish Phase**: 7 tasks can run in parallel (T078-T084, T087)

### Independent Test Criteria

Each user story has clear independent test criteria:
- **US1**: Repository is ~6.5MB smaller, no installer/ directory, .gitignore has no .NET entries
- **US2**: Test tag triggers workflow, builds unsigned installer, runs tests/lint/type-check
- **US3**: Signed installer passes signtool verify and Windows SmartScreen
- **US4**: App detects update, downloads in background, prompts to restart
- **US5**: npm run package produces NSIS installer, portable .exe, <100MB size, file associations
- **US6**: Release script updates package.json, prompts for CHANGELOG.md, creates git commit/tag
- **US7**: Double-click .md file opens in MarkRead, context menu shows "Open with MarkRead"

---

**Format Validation**: ✅ All 87 tasks follow the required checklist format with checkbox, Task ID, optional [P] marker, [Story] label (where applicable), and file paths in descriptions.

**Next Step**: Begin implementation with Phase 1 (Setup) tasks, then complete Phase 2 (Foundational) before starting any user story work.
