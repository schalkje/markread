/**
 * Azure DevOps GCM Authentication Service
 *
 * Uses Git Credential Manager (GCM) for Azure DevOps authentication.
 * GCM handles OAuth, PAT storage, and token refresh automatically.
 *
 * This approach follows VS Code's pattern - let Git handle credentials.
 * No Azure AD app registration needed!
 */

import { v4 as uuidv4 } from 'uuid';
import { gitCredentialHelper } from './git-credential-helper';
import { credentialStore } from '../storage/credential-store';
import type {
  InitiateDeviceFlowRequest,
  InitiateDeviceFlowResponse,
  CheckDeviceFlowStatusResponse,
} from '../../../shared/types/git-contracts';

/**
 * Azure DevOps GCM authentication session state
 */
interface AzureAuthSession {
  sessionId: string;
  provider: 'azure';
  url: string;
  startedAt: number;
  isComplete: boolean;
  isSuccess: boolean;
  accessToken?: string;
  user?: {
    username: string;
    email?: string;
    avatarUrl?: string;
  };
  error?: string;
  authPromise?: Promise<void>;
}

/**
 * Azure DevOps GCM authentication service
 *
 * Features:
 * - Git Credential Manager integration
 * - No Azure AD app registration needed
 * - Supports OAuth and PAT automatically
 * - GCM handles browser OAuth flow
 * - Cross-platform support
 *
 * How it works:
 * 1. Run `git ls-remote` to trigger GCM authentication
 * 2. GCM opens browser for OAuth (or prompts for PAT)
 * 3. Extract token from GCM using `git credential fill`
 * 4. Use token for REST API calls
 */
export class AzureOAuthService {
  private sessions: Map<string, AzureAuthSession> = new Map();

  /**
   * Initiate GCM authentication for Azure DevOps
   *
   * @param request - Authentication request
   * @returns Session info
   */
  async initiateDeviceFlow(request: InitiateDeviceFlowRequest): Promise<InitiateDeviceFlowResponse> {
    const { provider } = request;

    // Only Azure DevOps is supported
    if (provider !== 'azure') {
      throw {
        code: 'INVALID_URL',
        message: 'Only Azure DevOps authentication is supported by this service',
        retryable: false,
      };
    }

    // Check if Git is installed
    const gitVersion = await gitCredentialHelper.checkGitInstalled();
    if (!gitVersion) {
      throw {
        code: 'GIT_NOT_FOUND',
        message: 'Git is not installed. Please install Git to use Azure DevOps authentication.',
        retryable: false,
        details: 'Download Git from https://git-scm.com/downloads',
      };
    }

    // Check if GCM is available
    const hasGCM = await gitCredentialHelper.checkGCMAvailable();
    if (!hasGCM) {
      console.warn('[AzureOAuthService] GCM may not be available, but will try anyway');
    }

    // Get repository URL from request (we need this to authenticate)
    // The URL will be passed from the UI when the user tries to connect
    const url = request.url;
    if (!url) {
      throw {
        code: 'INVALID_REQUEST',
        message: 'Repository URL is required for Azure DevOps authentication',
        retryable: false,
      };
    }

    const sessionId = uuidv4();
    const session: AzureAuthSession = {
      sessionId,
      provider,
      url,
      startedAt: Date.now(),
      isComplete: false,
      isSuccess: false,
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Start authentication in the background
    const authPromise = this.performAuthentication(session);
    session.authPromise = authPromise;

    // Return immediately with session ID
    // The UI will poll checkDeviceFlowStatus to track progress
    return {
      sessionId,
      userCode: 'Authenticating with Git Credential Manager...',
      verificationUri: 'Git will handle authentication',
      expiresIn: 300, // 5 minutes
      interval: 2, // Poll every 2 seconds
      browserOpened: true, // GCM will open browser if needed
    };
  }

  /**
   * Perform GCM authentication
   *
   * @param session - Authentication session
   */
  private async performAuthentication(session: AzureAuthSession): Promise<void> {
    try {
      console.log('[AzureOAuthService] Starting GCM authentication for:', session.url);

      // Trigger authentication with git ls-remote
      // This will cause GCM to open a browser for OAuth or prompt for PAT
      await gitCredentialHelper.triggerAuthentication(session.url, 120000); // 2 minute timeout

      console.log('[AzureOAuthService] Git authentication successful, waiting for GCM to store credential...');

      // Wait a moment for GCM to finish storing the credential
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

      console.log('[AzureOAuthService] Extracting credential from GCM...');

      // Extract the token from GCM
      const credential = await gitCredentialHelper.getCredential(session.url);

      console.log('[AzureOAuthService] Credential extracted, token length:', credential.password.length);

      // Store token securely
      await credentialStore.storeToken('azure', credential.password);

      // Extract username from credential
      const username = credential.username || 'Azure DevOps User';

      // Update session
      session.accessToken = credential.password;
      session.user = {
        username,
        email: undefined, // GCM doesn't provide email
        avatarUrl: undefined,
      };

      this.completeSession(session, true);
      console.log('[AzureOAuthService] Authentication completed successfully');
    } catch (error: any) {
      console.error('[AzureOAuthService] Authentication failed:', error);

      let errorMessage = 'Authentication failed';
      if (error.code === 'TIMEOUT') {
        errorMessage = 'Authentication timed out. Please try again.';
      } else if (error.code === 'AUTH_FAILED') {
        errorMessage = 'Authentication failed. Please check your credentials.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      this.completeSession(session, false, errorMessage);
    }
  }

  /**
   * Check authentication session status
   *
   * @param sessionId - Session identifier
   * @returns Session status
   */
  async checkDeviceFlowStatus(sessionId: string): Promise<CheckDeviceFlowStatusResponse> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return {
        isComplete: true,
        isSuccess: false,
        error: 'Session not found or expired',
      };
    }

    // Return current status
    return {
      isComplete: session.isComplete,
      isSuccess: session.isSuccess,
      interval: 2, // Check every 2 seconds
      user: session.user,
      error: session.error,
    };
  }

  /**
   * Complete authentication session
   *
   * @param session - Authentication session
   * @param success - Whether authentication was successful
   * @param error - Error message (if failed)
   */
  private completeSession(session: AzureAuthSession, success: boolean, error?: string): void {
    session.isComplete = true;
    session.isSuccess = success;
    session.error = error;

    if (error) {
      console.error('[AzureOAuthService] Session completed with error:', error);
    }

    // Clean up session after 5 minutes
    setTimeout(() => {
      this.sessions.delete(session.sessionId);
    }, 5 * 60 * 1000);
  }

  /**
   * Cancel authentication session
   *
   * @param sessionId - Session identifier
   */
  cancelDeviceFlow(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.completeSession(session, false, 'Cancelled by user');
    }
  }
}

// Export singleton instance
export const azureOAuthService = new AzureOAuthService();
