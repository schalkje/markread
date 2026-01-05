# GitHub Device Flow Authentication Setup

MarkRead uses **GitHub Device Flow** for authentication - a secure OAuth method designed specifically for desktop and CLI applications.

## ✅ No Setup Required!

**MarkRead comes with authentication built-in.** Just click "Connect" and authenticate with your GitHub account. No configuration needed!

The official MarkRead OAuth App (Client ID: `Ov23liWG79zW29xRrTPN`) is already configured and ready to use.

## Why Device Flow?

✅ **No client secret required** - Perfect for desktop apps
✅ **No local server needed** - Simpler and more reliable
✅ **Better security** - No secrets distributed with your app
✅ **5,000 requests/hour** - Same rate limit as tokens
✅ **Better UX** - Simple code entry on GitHub's website

---

## Advanced: Use Your Own OAuth App (Optional)

Most users don't need this section. Only create your own OAuth App if you need custom branding or for enterprise deployments.

### Prerequisites

1. **GitHub Account**: You need a GitHub account to create an OAuth App
2. **GitHub OAuth App**: Required to get a Client ID

### Step 1: Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"** (or **"New GitHub App"** also works)
3. Fill in the application details:
   - **Application name**: `MarkRead` (or your preferred name)
   - **Homepage URL**: `https://github.com/yourusername/markread` (or any valid URL)
   - **Authorization callback URL**: `http://localhost` (Device Flow doesn't use callbacks, but GitHub requires a value)
   - **Application description**: (optional) "Markdown documentation reader for Git repositories"

4. Click **"Register application"**
5. Copy the **Client ID** (looks like `Ov23liRGSN8W9qQy9gkT`)
6. **Important**: You do NOT need the client secret for Device Flow!

### Step 2: Configure Environment Variable

After creating your own OAuth App, set the environment variable to use it:

**Windows (PowerShell)**:
```powershell
$env:GITHUB_CLIENT_ID = "your_client_id_here"
```

**Windows (Command Prompt)**:
```cmd
set GITHUB_CLIENT_ID=your_client_id_here
```

**macOS/Linux**:
```bash
export GITHUB_CLIENT_ID="your_client_id_here"
```

**Permanent Configuration**:
Add to your shell profile (~/.bashrc, ~/.zshrc, etc.) or Windows Environment Variables.

## How Device Flow Works

```
┌─────────────┐                          ┌─────────────┐
│   MarkRead  │                          │   GitHub    │
└──────┬──────┘                          └──────┬──────┘
       │                                        │
       │  1. Request device code                │
       │───────────────────────────────────────>│
       │                                        │
       │  2. Return: device_code + user_code    │
       │<───────────────────────────────────────│
       │     (e.g., "ABCD-1234")                │
       │                                        │
       │  3. Display code to user               │
       │     Open: github.com/login/device      │
       │                                        │
       │  4. Poll for completion (every 5s)     │
       │───────────────────────────────────────>│
       │<─────────── "authorization_pending" ───│
       │                                        │
       │     [User enters code on GitHub]       │
       │     [User authorizes MarkRead]         │
       │                                        │
       │  5. Poll again                         │
       │───────────────────────────────────────>│
       │<─────────── access_token ──────────────│
       │                                        │
       │  6. Store token securely               │
       │     (OS credential manager)            │
       │                                        │
```

## User Experience

When you click "Connect" in MarkRead:

1. **MarkRead displays a code** (e.g., "ABCD-1234")
2. **Browser opens automatically** to https://github.com/login/device
3. **You enter the code** on GitHub's website
4. **You click "Authorize"** to grant MarkRead access
5. **MarkRead detects authorization** and connects automatically
6. **Token stored securely** in your OS credential manager

## Security Features

- ✅ **No secrets in code**: Client ID is public, no secret needed
- ✅ **Secure token storage**: Tokens stored in OS credential manager
  - Windows: Windows Credential Manager
  - macOS: Keychain
  - Linux: Secret Service API (libsecret)
- ✅ **CSRF protection**: Device codes are single-use and expire
- ✅ **User-controlled**: You explicitly authorize each device
- ✅ **Revocable**: Tokens can be revoked anytime at github.com/settings/apps

## Troubleshooting

### Browser doesn't open automatically
- Click "Open GitHub to authorize" link in the dialog
- Manually visit https://github.com/login/device
- Enter the displayed code

### "Device code expired" error
- Device codes expire after 15 minutes
- Click "Connect" again to get a new code

### "Authentication failed" error
- Make sure you entered the correct code
- Check that you clicked "Authorize" on GitHub
- Verify your GitHub account has access to the repository

### Rate limiting issues
After authentication, you get:
- **5,000 requests/hour** for public repositories
- **5,000 requests/hour** for private repositories (if you have access)

### Token not persisting
- Check OS credential manager permissions
- On Linux, ensure `libsecret` is installed
- Try running MarkRead with elevated permissions once

## API Endpoints Used

MarkRead uses these GitHub API endpoints:

1. **Device Flow Initiation**:
   - `POST https://github.com/login/device/code`
   - Returns: device_code, user_code, verification_uri

2. **Token Polling**:
   - `POST https://github.com/login/oauth/access_token`
   - Returns: access_token (when authorized)

3. **User Info**:
   - `GET https://api.github.com/user`
   - Returns: username, email, avatar

## Scopes Requested

MarkRead requests these OAuth scopes:
- `repo`: Access to repositories (read files, fetch content)
- `user:email`: Read user email address

## Revoking Access

To revoke MarkRead's access:

1. Go to [GitHub Settings > Applications](https://github.com/settings/apps)
2. Find "MarkRead" in the list
3. Click "Revoke"

The token will be removed from your OS credential manager on next connection attempt.

## Development Notes

### File Structure
- `src/main/services/git/oauth-service.ts` - Device Flow implementation
- `src/main/ipc/git-handlers.ts` - IPC handlers for Device Flow
- `src/preload/git-api.ts` - Exposed API to renderer
- `src/renderer/components/git/RepoConnectDialog.tsx` - UI component

### Testing Device Flow
```typescript
// Initiate Device Flow
const response = await window.git.auth.initiateDeviceFlow({
  provider: 'github',
  scopes: ['repo', 'user:email']
});

console.log(`Enter this code: ${response.data.userCode}`);
console.log(`Visit: ${response.data.verificationUri}`);

// Poll for completion
const pollInterval = setInterval(async () => {
  const status = await window.git.auth.checkDeviceFlowStatus({
    sessionId: response.data.sessionId
  });

  if (status.data.isComplete) {
    clearInterval(pollInterval);
    if (status.data.isSuccess) {
      console.log('Authenticated!', status.data.user);
    } else {
      console.error('Failed:', status.data.error);
    }
  }
}, response.data.interval * 1000);
```

## References

- [GitHub Device Flow Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow)
- [OAuth 2.0 Device Authorization Grant](https://datatracker.ietf.org/doc/html/rfc8628)
- [GitHub REST API Documentation](https://docs.github.com/en/rest)
