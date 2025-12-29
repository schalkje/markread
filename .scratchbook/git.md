# Connect to Git Repositories

## Feature Overview

The Markdown Reader application will include robust support for interacting with Git repositories, specifically targeting GitHub and Azure DevOps. This feature aims to enhance user productivity by seamlessly integrating Git repository browsing and management capabilities directly within the application.

### Key Features

1. **Repository Support**
   - Full support for GitHub and Azure DevOps repositories.
   - Integrated security and user-based authentication mechanisms.
   - Backup authentication support using Personal Access Tokens (PAT).

2. **Recent Repositories and Folders**
   - The main page will display a unified list of recently opened folders and Git repositories.
   - Git repositories will be visually distinguishable with a dedicated icon.
   - Each entry will include the branch name for Git repositories to provide context.

3. **Branch Management**
   - Users can select a specific branch when opening a repository.
   - Support for opening multiple branches of the same repository next to each other, like opening multiple folders on the same drive.

4. **Performance Optimization**
   - Caching mechanisms will be implemented to improve performance.
   - The remote repository will always be treated as the source of truth, ensuring data consistency.

5. **File and Image Resolution**
   - References to other local files and images within the repository will be resolved relative to the Git repository structure.

This feature will provide a seamless and efficient way for users to interact with Git repositories, making the Markdown Reader application a powerful tool for developers and content creators.
