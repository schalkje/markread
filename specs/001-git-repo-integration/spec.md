# Feature Specification: Git Repository Integration

**Feature Branch**: `001-git-repo-integration`
**Created**: 2025-12-29
**Status**: Draft
**Input**: User description: "Connect to Git Repositories - The Markdown Reader application will include robust support for interacting with Git repositories, specifically targeting GitHub and Azure DevOps."

## Clarifications

### Session 2025-12-29

- Q: Which GitHub and Azure DevOps APIs should be used for repository integration? → A: GitHub REST API v3 + Azure DevOps REST API v7.1 (stable, well-supported)
- Q: How should the system handle API rate limits from GitHub and Azure DevOps? → A: Exponential backoff with user notification for sustained limits (transparent, resilient)
- Q: How is repository uniqueness determined to prevent duplicates in recent items and cache? → A: Normalized Git URL (e.g., https://github.com/user/repo standardized)
- Q: What specific UI indicators and capabilities are available when offline vs online? → A: Offline badge + cached content only with refresh disabled (honest, functional)
- Q: Beyond OS credential manager, is additional encryption needed for authentication tokens? → A: OS credential manager only (system-level encryption, industry standard)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect and View Repository Files (Priority: P1)

Users want to connect to a GitHub or Azure DevOps repository and immediately view markdown files without cloning the entire repository to their local machine.

**Why this priority**: This is the foundational capability that enables all other features. Without the ability to connect and view files, no other repository interactions are possible. It delivers immediate value by allowing users to read documentation directly from remote repositories.

**Independent Test**: Can be fully tested by connecting to the public GitHub repository of markread itself (https://github.com/schalkje/markread), selecting the main branch, and viewing a README.md file. Delivers the core value of remote repository access without requiring any other features.

**Acceptance Scenarios**:

1. **Given** a user has opened the application, **When** they select "Connect to Repository" and provide a GitHub repository URL, **Then** they see a list of markdown files from the default branch within 30 seconds
2. **Given** a user provides valid repository credentials, **When** authentication completes successfully, **Then** the repository file tree appears and the user can navigate folders
3. **Given** a user selects a markdown file from the repository, **When** the file loads, **Then** the markdown content renders with proper formatting and all embedded images display correctly
4. **Given** a repository connection fails, **When** the error occurs, **Then** the user sees a clear error message indicating the cause (invalid URL, authentication failure, network issue, etc.)

---

### User Story 2 - Authenticate with Personal Access Tokens (Priority: P2)

Users need a reliable fallback authentication method using Personal Access Tokens when OAuth authentication is unavailable or fails, particularly for private repositories or organizational restrictions.

**Why this priority**: While OAuth is the preferred authentication method, many enterprise environments and private repositories require PAT authentication. This ensures users can access their repositories regardless of authentication restrictions.

**Independent Test**: Can be tested independently by attempting to connect to a private repository using only a PAT (without OAuth). Delivers value by enabling access to private and enterprise repositories.

**Acceptance Scenarios**:

1. **Given** a user chooses PAT authentication, **When** they enter a valid token for a private repository, **Then** they gain access to the repository files
2. **Given** a user enters an invalid PAT, **When** authentication fails, **Then** they see a specific error message indicating token invalidity and guidance on creating a new token
3. **Given** a PAT with limited permissions, **When** accessing restricted resources, **Then** the user sees clear messaging about permission requirements

---

### User Story 3 - Switch Between Branches (Priority: P3)

Users want to switch between different branches of a repository to view documentation or files specific to different versions, releases, or feature branches.

**Why this priority**: Different branches often contain different versions of documentation. This feature enables users to reference documentation for specific releases, development branches, or historical versions without switching repositories.

**Independent Test**: Can be tested by connecting to a repository with multiple branches, then switching between branches and verifying that file content updates accordingly. Delivers value by enabling multi-version documentation access.

**Acceptance Scenarios**:

1. **Given** a user has connected to a repository, **When** they select a different branch from the branch selector, **Then** the file tree updates to reflect that branch's content within 5 seconds
2. **Given** a user is viewing a file on branch A, **When** they switch to branch B, **Then** the same file path on branch B loads automatically if it exists
3. **Given** a file exists on one branch but not another, **When** switching branches, **Then** the user sees appropriate messaging that the file doesn't exist on the new branch
4. **Given** a user has unsaved changes in the current view, **When** attempting to switch branches, **Then** the system warns them about potential loss of context

---

### User Story 4 - Access Recent Repositories (Priority: P4)

Users want quick access to their recently opened repositories and folders from a unified list on the main page, with visual indicators distinguishing Git repositories from local folders.

**Why this priority**: After establishing basic repository access, users need efficient navigation to frequently accessed repositories. This reduces friction for daily workflows and improves productivity for regular users.

**Independent Test**: Can be tested by opening several repositories and folders, then reopening the application and verifying the recent list appears with correct icons and branch information. Delivers value through improved navigation efficiency.

**Acceptance Scenarios**:

1. **Given** a user has previously opened 5 repositories and 3 local folders, **When** they open the application main page, **Then** they see a unified list showing all 8 items with Git repositories marked with a distinct icon
2. **Given** a Git repository entry in recent items, **When** viewing the list, **Then** each repository shows the last accessed branch name
3. **Given** a user clicks a recent repository entry, **When** the connection initiates, **Then** the repository opens to the previously accessed branch
4. **Given** a repository no longer exists or is inaccessible, **When** attempting to open from recent list, **Then** the user sees an error message and the item is marked as unavailable

---

### User Story 5 - Open Multiple Branches Simultaneously (Priority: P5)

Users want to compare documentation or files across different branches by opening multiple branches of the same repository in separate tabs or panes.

**Why this priority**: This advanced feature supports comparison workflows, such as reviewing changes between release versions or comparing feature branch documentation with the main branch. It's lower priority as users can accomplish similar tasks through branch switching, but it significantly improves comparison workflows.

**Independent Test**: Can be tested by opening the same repository twice with different branches selected, then verifying both remain accessible and independently navigable. Delivers value for advanced comparison and research workflows.

**Acceptance Scenarios**:

1. **Given** a user has repository A on branch main open, **When** they open repository A again and select branch develop, **Then** both branches are accessible in separate tabs
2. **Given** multiple branches are open, **When** the user navigates files in one tab, **Then** the other tabs remain unaffected and maintain their own navigation state
3. **Given** a user has opened multiple branches, **When** viewing the tab list, **Then** each tab clearly shows the repository name and branch name
4. **Given** limited system resources, **When** opening many branches, **Then** older inactive tabs are automatically cached to preserve memory while remaining quickly restorable

---

### User Story 6 - Azure DevOps Repository Support (Priority: P6)

Users working in enterprise environments need to connect to Azure DevOps repositories with the same capabilities available for GitHub repositories.

**Why this priority**: While GitHub support (P1) is more widely used, Azure DevOps is essential for enterprise users. It's prioritized lower because it extends the same core functionality to a different platform rather than adding new capabilities.

**Independent Test**: Can be tested independently by connecting to an Azure DevOps repository and performing the same operations as GitHub (view files, switch branches, authenticate). Delivers value by supporting enterprise users.

**Acceptance Scenarios**:

1. **Given** a user provides an Azure DevOps repository URL, **When** authenticating and connecting, **Then** the repository opens with the same functionality as GitHub repositories
2. **Given** an Azure DevOps repository with multiple projects, **When** connecting, **Then** the user can navigate the project structure and access files within each project
3. **Given** Azure DevOps-specific authentication requirements, **When** setting up connection, **Then** the user sees appropriate guidance for Azure DevOps PAT creation and permissions

---

### Edge Cases

- What happens when a repository has thousands of files in a single directory? System must paginate or lazy-load file lists to prevent performance degradation.
- How does the system handle binary files (PDFs, images, videos) in the repository? Non-markdown files should be downloadable but only rendered in the markdown viewer when embeded in the current page.
- What happens when network connectivity is lost during repository browsing? System must display an offline badge, allow viewing of cached content only, and disable refresh/branch switching operations until connectivity is restored.
- How does the system handle extremely large markdown files (>10MB)? System should warn users and potentially offer to download rather than render inline.
- What happens when a file contains relative links to files outside the repository? System should detect and indicate that external links cannot be resolved within the repository context.
- How does the system handle repositories with non-standard branch naming or branch protection? System should gracefully handle all valid Git branch names and respect branch access permissions.
- What happens when authentication tokens expire during an active session? System should detect expiration and prompt for re-authentication without losing current navigation context.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support connecting to GitHub repositories via HTTPS URLs
- **FR-002**: System MUST support connecting to Azure DevOps repositories via HTTPS URLs
- **FR-003**: System MUST authenticate users using OAuth 2.0 for both GitHub and Azure DevOps
- **FR-004**: System MUST provide Personal Access Token (PAT) authentication as a fallback when OAuth is unavailable or fails
- **FR-005**: System MUST securely store authentication credentials exclusively using the operating system's credential manager (Windows Credential Manager, macOS Keychain, Linux Secret Service) without additional application-level encryption layers
- **FR-006**: System MUST display a unified list of recently opened local folders and Git repositories on the main page
- **FR-007**: System MUST visually distinguish Git repository entries from local folder entries using distinct icons
- **FR-008**: System MUST show the branch name for each Git repository in the recent items list
- **FR-009**: System MUST allow users to select a specific branch when initially opening a repository
- **FR-010**: System MUST allow users to switch branches after a repository is open
- **FR-011**: System MUST support opening multiple branches of the same repository simultaneously in separate tabs
- **FR-012**: System MUST fetch and display the repository file tree structure within 30 seconds of successful connection
- **FR-013**: System MUST resolve and display images referenced in markdown files using repository-relative paths
- **FR-014**: System MUST resolve and make clickable any links to other files within the repository
- **FR-015**: System MUST cache fetched file content to improve performance on subsequent access
- **FR-016**: System MUST treat the remote repository as the source of truth and provide a refresh mechanism to check for updates
- **FR-017**: System MUST handle authentication failures with clear error messages indicating the specific failure reason
- **FR-018**: System MUST handle network failures gracefully and display cached content when available
- **FR-019**: System MUST display appropriate error messages when a repository URL is invalid or inaccessible
- **FR-020**: System MUST limit cache size and automatically evict oldest entries when cache limits are reached
- **FR-021**: System MUST persist recently opened repositories across application restarts
- **FR-022**: System MUST support repositories with any valid Git branch naming conventions
- **FR-023**: System MUST render markdown files using the same rendering engine as local files
- **FR-024**: System MUST indicate when a file has been cached versus freshly fetched from the remote
- **FR-025**: System MUST allow users to manually refresh/reload files from the remote repository
- **FR-026**: System MUST normalize repository URLs to a standardized format (removing trailing slashes, .git suffix, and protocol variations) to ensure repository uniqueness across recent items and cache storage
- **FR-027**: System MUST display a visible offline indicator badge when network connectivity to repository providers is unavailable
- **FR-028**: System MUST disable refresh and branch switching operations when in offline mode while maintaining access to cached file content
- **FR-029**: System MUST automatically restore online functionality when network connectivity is re-established

### Key Entities

- **Repository**: Represents a remote Git repository (GitHub or Azure DevOps), uniquely identified by normalized Git URL (standardized format removing trailing slashes, .git suffix, and protocol variations), containing URL, authentication method, default branch, and last accessed timestamp
- **Branch**: Represents a specific branch within a repository, containing branch name, last commit hash, and last accessed timestamp
- **Repository File**: Represents a file within a repository, containing file path, content, file type, branch reference, and cache metadata
- **Authentication Credential**: Represents stored authentication information, containing provider type (GitHub/Azure DevOps), credential type (OAuth/PAT), token/secret (encrypted by OS credential manager), and expiration timestamp
- **Recent Item**: Represents an entry in the recent items list, containing item type (local folder or Git repository), location/URL, display name, icon identifier, and last accessed timestamp
- **Cache Entry**: Represents cached file content, containing file identifier, content data, fetch timestamp, size, and eviction priority

### Integration Requirements

- **IR-001**: System MUST use GitHub REST API v3 for all GitHub repository operations (file retrieval, branch listing, authentication)
- **IR-002**: System MUST use Azure DevOps REST API v7.1 for all Azure DevOps repository operations
- **IR-003**: System MUST handle API-specific error codes and rate limit responses according to each provider's specifications
- **IR-004**: System MUST implement exponential backoff retry strategy when API rate limits are encountered
- **IR-005**: System MUST notify users with a clear message when rate limits persist beyond automatic retry attempts, including estimated time until limit reset

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully connect to a public GitHub repository and view a markdown file within 30 seconds from clicking "Connect to Repository"
- **SC-002**: Users can successfully authenticate with both OAuth and PAT methods with a 95% success rate for valid credentials
- **SC-003**: Branch switching completes and displays updated content within 5 seconds for repositories with up to 1,000 files
- **SC-004**: The recent repositories list loads instantly (under 1 second) when opening the application
- **SC-005**: Cached files load within 1 second, while uncached files load within 5 seconds on standard broadband connections
- **SC-006**: Users can successfully open and navigate at least 5 different branches of the same repository simultaneously without performance degradation
- **SC-007**: Markdown images referenced with relative paths display correctly in 100% of valid repository structures
- **SC-008**: The system handles repository connection failures gracefully with clear error messages in 100% of error scenarios
- **SC-009**: Cache system maintains at least 50 most recently accessed files per repository without exceeding 100MB per repository
- **SC-010**: Users can successfully connect to and browse both GitHub and Azure DevOps repositories with identical functionality
- **SC-011**: The application maintains repository connections and cached content across application restarts
- **SC-012**: Authentication token expiration is detected and users are re-prompted within 5 seconds of expiration being detected

## Assumptions

- Users have network connectivity when initially connecting to repositories; offline access is limited to cached content
- Repository sizes are reasonable for remote browsing (repositories with tens of thousands of files may experience performance limitations)
- Users have appropriate permissions to access the repositories they attempt to connect to
- PAT tokens are created by users through the Git provider's interface (GitHub/Azure DevOps) before using them in the application
- The application operates in read-only mode; no commits, pushes, or repository modifications are required
- File references in markdown (images, links) use standard relative path conventions
- System resources (memory, disk space) are sufficient to cache at least 5GB of repository content total
- OAuth authentication redirects are handled by the system's default web browser
- Repository providers (GitHub, Azure DevOps) maintain stable API endpoints and authentication mechanisms
- Network latency for repository operations is under 500ms for typical broadband connections
