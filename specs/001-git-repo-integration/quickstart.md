# Quick Start Guide: Git Repository Integration

**Date**: 2025-12-29

## Overview

The Git Repository Integration feature allows you to connect directly to GitHub and Azure DevOps repositories without cloning them to your local machine. View markdown files, switch between branches, and access documentation from your remote repositories seamlessly within the Markdown Reader application.

## Prerequisites

Before you begin, ensure you have:

- **Active internet connection** for initial repository connection
- **Valid GitHub or Azure DevOps account** with appropriate repository access permissions
- **Repository URL** (HTTPS format)
- *Optional*: Personal Access Token (PAT) if using PAT authentication instead of OAuth

## Connecting to a GitHub Repository

### OAuth Authentication (Recommended)

OAuth authentication provides a secure, streamlined login experience without sharing credentials directly with the application.

#### Steps:

1. Open the Markdown Reader application
2. Click **"Connect to Repository"** button on the main page
3. Enter your GitHub repository URL in the format:
   ```
   https://github.com/username/repository
   ```
4. Select **OAuth** as the authentication method
5. Click **"Authenticate"** - your default web browser will open
6. Log in to GitHub (if not already logged in)
7. Review the permissions requested and click **"Authorize"**
8. Return to the Markdown Reader application - authentication will complete automatically
9. Select your desired branch from the branch dropdown
10. Click **"Connect"** - the repository file tree will load within 30 seconds

### Personal Access Token (PAT) Authentication

PAT authentication is useful when OAuth is unavailable or if you prefer token-based authentication.

#### Steps:

1. Open the Markdown Reader application
2. Click **"Connect to Repository"** button
3. Enter your GitHub repository URL:
   ```
   https://github.com/username/repository
   ```
4. Select **Personal Access Token** as the authentication method
5. Paste your GitHub PAT in the provided field
6. Select your desired branch from the dropdown
7. Click **"Connect"** - the repository file tree will load within 30 seconds

#### Creating a GitHub Personal Access Token

Follow these steps to create a PAT if you don't have one:

1. Log in to [GitHub.com](https://github.com)
2. Click your **profile icon** in the top-right corner
3. Select **Settings**
4. In the left sidebar, click **Developer settings**
5. Click **Personal access tokens** → **Tokens (classic)**
6. Click **Generate new token** → **Generate new token (classic)**
7. Name your token (e.g., "markread-access")
8. Set the **Expiration** (recommended: 90 days)
9. Select scopes (minimum required):
   - `repo` - Full control of private repositories
   - `public_repo` - Access to public repositories
   *(For private repositories, select the full `repo` scope)*
10. Scroll to the bottom and click **"Generate token"**
11. **Copy the token immediately** - you won't see it again
12. Store it securely (use your operating system's credential manager for safety)
13. Return to Markdown Reader and paste it when prompted

> **Security Note**: Never share your PAT publicly. Treat it like a password. If compromised, regenerate it immediately from GitHub Settings.

## Connecting to an Azure DevOps Repository

### OAuth/Entra ID Authentication

Azure DevOps supports OAuth authentication through Microsoft Entra ID.

#### Steps:

1. Open the Markdown Reader application
2. Click **"Connect to Repository"** button
3. Enter your Azure DevOps repository URL in the format:
   ```
   https://dev.azure.com/organization/project/_git/repository
   ```
4. Select **OAuth/Entra ID** as the authentication method
5. Click **"Authenticate"** - your default web browser will open
6. Log in with your Microsoft account
7. Review the permissions and consent to the application access
8. Return to Markdown Reader - authentication will complete automatically
9. Select your desired branch and project
10. Click **"Connect"** - the repository file tree will load

> **Note**: Azure DevOps OAuth supports standard OAuth flows. If your organization requires additional setup, consult your Azure administrator.

### Personal Access Token (PAT) Authentication

PAT authentication is a reliable fallback for Azure DevOps repositories, especially in enterprise environments.

#### Steps:

1. Open the Markdown Reader application
2. Click **"Connect to Repository"** button
3. Enter your Azure DevOps repository URL:
   ```
   https://dev.azure.com/organization/project/_git/repository
   ```
4. Select **Personal Access Token** as the authentication method
5. Paste your Azure DevOps PAT in the provided field
6. Select your desired branch and project
7. Click **"Connect"** - the repository file tree will load

#### Creating an Azure DevOps Personal Access Token

Follow these steps to create a PAT:

1. Log in to [dev.azure.com](https://dev.azure.com)
2. Click your **profile icon** in the top-right corner
3. Select **Personal access tokens**
4. Click **New Token**
5. Enter a **name** (e.g., "markread-access")
6. Select your **organization** from the dropdown
7. Set the **Expiration** (recommended: 90 days)
8. Select scopes (minimum required):
   - `Code (Read)` - Read access to repository code and files
   *(For private repositories, ensure your organization membership is active)*
9. Click **"Create"**
10. **Copy the token immediately** - you won't see it again
11. Store it securely in your system's credential manager
12. Return to Markdown Reader and paste it when prompted

> **Security Note**: Treat your Azure DevOps PAT like a password. If compromised, delete it from Personal access tokens settings and create a new one.

## Common Tasks

### Switching Branches

Once connected to a repository:

1. Look for the **Branch Selector** dropdown in the top toolbar
2. Click the dropdown to view all available branches
3. Select your desired branch from the list
4. The file tree will update within 5 seconds
5. If you were viewing a file, Markdown Reader will attempt to load the same file on the new branch (if it exists)

### Viewing Files

1. In the **File Tree** panel on the left, browse the repository structure
2. Click on any markdown file (`.md` extension) to view its contents
3. The file will render in the main editor pane with:
   - Proper markdown formatting
   - Syntax highlighting for code blocks
   - Embedded images displayed correctly
   - Clickable links to other files in the repository

### Refreshing Content

To check for the latest updates from the remote repository:

1. Click the **Refresh** button in the top toolbar (circular arrow icon)
2. The current file will re-fetch from the remote
3. You'll see a status indicator showing whether the content is cached or freshly fetched
4. *Note*: Refresh is disabled while offline

### Working Offline

When your internet connection is lost:

1. An **Offline** badge appears in the top status bar
2. You can continue viewing previously cached files
3. The following operations are **disabled** until connectivity returns:
   - Refreshing files
   - Switching branches
   - Connecting to new repositories
4. Once online again, all features automatically re-enable

## Troubleshooting

### Connection Failures

**Problem**: "Failed to connect to repository"

**Solutions**:
- Verify the repository URL is correct and in HTTPS format
- Confirm you have internet connectivity
- Check that the repository exists and is accessible with your account
- For private repositories, ensure your authentication token has the correct permissions

**Problem**: "Repository URL is invalid"

**Solutions**:
- Use the full HTTPS URL format (e.g., `https://github.com/username/repo`)
- Remove any trailing slashes or `.git` extensions
- Double-check for typos in the organization or repository name

### Authentication Errors

**Problem**: "Authentication failed" or "Invalid credentials"

**Solutions for OAuth**:
- Ensure you're not blocking pop-ups in your browser
- Check that you're logged in to the correct GitHub/Azure account
- Try logging out and logging back in
- Clear your browser cache and try again

**Solutions for PAT**:
- Verify the token hasn't expired (check creation date and expiration)
- Confirm the token has the required `repo` (GitHub) or `Code (Read)` (Azure) scopes
- Re-generate the token if you're unsure of its validity
- Ensure there are no extra spaces when pasting the token
- For private repositories, confirm your user account has access

**Problem**: "Token has insufficient permissions"

**Solutions**:
- Create a new token with the required scopes:
  - GitHub: `repo` scope (for private repos) or `public_repo` (for public only)
  - Azure DevOps: `Code (Read)` scope minimum
- Regenerate the token if scopes cannot be modified

### Network Issues

**Problem**: "Network timeout" or slow file loading

**Solutions**:
- Check your internet connection speed
- Try closing and reopening the connection
- Accessing from a repository with fewer files may be faster
- Files load faster once they've been cached locally

**Problem**: Repository works intermittently

**Solutions**:
- This may indicate API rate limiting (see section below)
- Try again after waiting 1-5 minutes
- The application will notify you if rate limits are reached

### Rate Limiting

**Problem**: "Rate limit exceeded" message

**What this means**: Your API provider (GitHub or Azure DevOps) is temporarily limiting requests due to high volume.

**Solutions**:
- Wait for the estimated reset time shown in the error message (typically 1 hour)
- Reduce the frequency of refresh operations
- If the problem persists, contact your API provider support
- The application implements automatic retry with exponential backoff

**Problem**: Consistent rate limiting issues

**Solutions**:
- Consider using a PAT instead of OAuth (some rate limits are higher for authenticated requests)
- For Azure DevOps, ensure your PAT has the minimal required scopes
- Contact your administrator if operating in an enterprise environment with strict rate limits

---

**Need more help?** Check your application's Help menu or visit the project documentation for advanced topics and additional support resources.
