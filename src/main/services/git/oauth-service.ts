/**
 * Device Flow Authentication Service
 *
 * Handles GitHub Device Flow authentication - perfect for desktop applications.
 * No client secret required, no local server needed.
 *
 * Phase 4 - User Story 2 (Device Flow Implementation)
 */

import { v4 as uuidv4 } from 'uuid';
import { shell } from 'electron';
import axios from 'axios';
import { credentialStore } from '../storage/credential-store';
import type {
  InitiateDeviceFlowRequest,
  InitiateDeviceFlowResponse,
  CheckDeviceFlowStatusResponse,
} from '../../../shared/types/git-contracts';

/**
 * Device Flow session state
 */
interface DeviceFlowSession {
  sessionId: string;
  provider: 'github' | 'azure';
  scopes: string[];
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
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
}

/**
 * GitHub OAuth App Client ID
 * Only Client ID is needed for Device Flow - no secret required!
 *
 * Default: Official MarkRead OAuth App (Ov23liWG79zW29xRrTPN)
 * Override: Set the GITHUB_CLIENT_ID environment variable to use your own OAuth App
 *
 * The Client ID is public and safe to distribute with the application.
 * See OAUTH_SETUP.md for instructions on creating your own GitHub OAuth App.
 */
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'Ov23liWG79zW29xRrTPN';

/**
 * Device Flow authentication service
 *
 * Features:
 * - GitHub Device Flow (no client secret needed)
 * - No local HTTP server required
 * - Simple polling mechanism
 * - Automatic browser opening
 * - Session management
 *
 * How it works:
 * 1. Request device code from GitHub
 * 2. Display user code to user
 * 3. Open verification URL in browser
 * 4. Poll GitHub until user completes authorization
 * 5. Store access token securely
 */
export class OAuthService {
  private sessions: Map<string, DeviceFlowSession> = new Map();

  /**
   * Initiate Device Flow authentication
   *
   * @param request - Device Flow initiation request
   * @returns Session info, user code, and verification URL
   */
  async initiateDeviceFlow(request: InitiateDeviceFlowRequest): Promise<InitiateDeviceFlowResponse> {
    const { provider, scopes } = request;

    // Only GitHub is supported for now
    if (provider !== 'github') {
      throw {
        code: 'INVALID_URL',
        message: 'Only GitHub authentication is currently supported',
        retryable: false,
      };
    }

    const defaultScopes = scopes || ['repo', 'user:email'];

    try {
      // Step 1: Request device code from GitHub
      const deviceCodeResponse = await axios.post(
        'https://github.com/login/device/code',
        {
          client_id: GITHUB_CLIENT_ID,
          scope: defaultScopes.join(' '),
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      const {
        device_code,
        user_code,
        verification_uri,
        expires_in,
        interval,
      } = deviceCodeResponse.data;

      // Create session
      const sessionId = uuidv4();
      const session: DeviceFlowSession = {
        sessionId,
        provider,
        scopes: defaultScopes,
        deviceCode: device_code,
        userCode: user_code,
        verificationUri: verification_uri,
        expiresIn: expires_in,
        interval: interval || 5,
        startedAt: Date.now(),
        isComplete: false,
        isSuccess: false,
      };

      // Store session
      this.sessions.set(sessionId, session);

      // Open browser to verification URL
      let browserOpened = false;
      try {
        await shell.openExternal(verification_uri);
        browserOpened = true;
      } catch (error) {
        console.error('Failed to open browser:', error);
        // Continue anyway - user can manually open URL
      }

      // Set up automatic cleanup after expiration
      setTimeout(() => {
        const currentSession = this.sessions.get(sessionId);
        if (currentSession && !currentSession.isComplete) {
          this.completeSession(currentSession, false, 'Device code expired');
        }
      }, expires_in * 1000);

      return {
        sessionId,
        userCode: user_code,
        verificationUri: verification_uri,
        expiresIn: expires_in,
        interval: interval || 5,
        browserOpened,
      };
    } catch (error: any) {
      throw {
        code: 'NETWORK_ERROR',
        message: `Failed to initiate Device Flow: ${error.message}`,
        retryable: true,
      };
    }
  }

  /**
   * Check Device Flow session status
   * This is called by the UI to poll for completion
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

    // If session is already complete, return cached result
    if (session.isComplete) {
      return {
        isComplete: session.isComplete,
        isSuccess: session.isSuccess,
        user: session.user,
        error: session.error,
      };
    }

    // Check if session has expired
    const elapsed = (Date.now() - session.startedAt) / 1000;
    if (elapsed > session.expiresIn) {
      this.completeSession(session, false, 'Device code expired');
      return {
        isComplete: true,
        isSuccess: false,
        error: 'Device code expired',
      };
    }

    // Poll GitHub for access token
    try {
      await this.pollForAccessToken(session);
    } catch (error: any) {
      // Errors during polling are expected (authorization_pending, slow_down)
      // They don't mean the session has failed, just that we should keep polling
      console.log('Polling status:', error.message);
    }

    return {
      isComplete: session.isComplete,
      isSuccess: session.isSuccess,
      interval: session.interval, // Return current interval (may have increased)
      user: session.user,
      error: session.error,
    };
  }

  /**
   * Poll GitHub for access token
   *
   * @param session - Device Flow session
   */
  private async pollForAccessToken(session: DeviceFlowSession): Promise<void> {
    try {
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: GITHUB_CLIENT_ID,
          device_code: session.deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      const { access_token, error, error_description } = response.data;

      if (error) {
        // Handle specific error cases
        if (error === 'authorization_pending') {
          // User hasn't authorized yet - keep polling
          throw new Error('Authorization pending');
        } else if (error === 'slow_down') {
          // We're polling too fast - increase interval by 5 seconds
          session.interval += 5;
          console.log(`[Device Flow] Slowing down polling - new interval: ${session.interval}s`);
          throw new Error('Polling too fast - interval increased');
        } else if (error === 'expired_token') {
          // Device code expired
          this.completeSession(session, false, 'Device code expired');
          throw new Error('Device code expired');
        } else if (error === 'access_denied') {
          // User denied authorization
          this.completeSession(session, false, 'Access denied by user');
          throw new Error('Access denied');
        } else {
          // Other error
          this.completeSession(session, false, error_description || error);
          throw new Error(error_description || error);
        }
      }

      if (access_token) {
        // Success! We got the access token
        await this.completeAuthentication(session, access_token);
      }
    } catch (error: any) {
      // Re-throw to let caller know status
      throw error;
    }
  }

  /**
   * Complete authentication by getting user info and storing token
   *
   * @param session - Device Flow session
   * @param accessToken - GitHub access token
   */
  private async completeAuthentication(session: DeviceFlowSession, accessToken: string): Promise<void> {
    try {
      // Get user information
      const userInfo = await this.getUserInfo(accessToken);

      // Store token securely
      await credentialStore.storeToken(session.provider, accessToken);

      // Update session
      session.accessToken = accessToken;
      session.user = userInfo;

      this.completeSession(session, true);
    } catch (error: any) {
      this.completeSession(session, false, `Failed to complete authentication: ${error.message}`);
    }
  }

  /**
   * Get user information from GitHub
   *
   * @param accessToken - GitHub access token
   * @returns User information
   */
  private async getUserInfo(accessToken: string): Promise<{
    username: string;
    email?: string;
    avatarUrl?: string;
  }> {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return {
        username: response.data.login,
        email: response.data.email,
        avatarUrl: response.data.avatar_url,
      };
    } catch (error: any) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  /**
   * Complete Device Flow session
   *
   * @param session - Device Flow session
   * @param success - Whether authentication was successful
   * @param error - Error message (if failed)
   */
  private completeSession(session: DeviceFlowSession, success: boolean, error?: string): void {
    session.isComplete = true;
    session.isSuccess = success;
    session.error = error;

    // Clean up session after 5 minutes
    setTimeout(() => {
      this.sessions.delete(session.sessionId);
    }, 5 * 60 * 1000);
  }

  /**
   * Cancel Device Flow session
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
export const oauthService = new OAuthService();
