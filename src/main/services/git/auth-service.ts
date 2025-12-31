/**
 * Authentication Service
 *
 * Handles authentication with Git providers using Personal Access Tokens.
 * Validates tokens and stores them securely in the credential store.
 *
 * Phase 4 - User Story 2 (T057)
 */

import { credentialStore } from '../storage/credential-store';
import { gitHttpClient } from './http-client';
import type {
  AuthenticateWithPATRequest,
  AuthenticateWithPATResponse,
} from '../../../shared/types/git-contracts';

/**
 * Authentication service
 *
 * Features:
 * - PAT validation against provider API
 * - Secure credential storage
 * - Token scope detection
 * - User information retrieval
 */
export class AuthService {
  /**
   * Authenticate with a Personal Access Token
   *
   * @param request - Authentication request
   * @returns Authentication result with user info
   */
  async authenticateWithPAT(request: AuthenticateWithPATRequest): Promise<AuthenticateWithPATResponse> {
    const { provider, token, testRepository } = request;

    // Validate token format
    if (!token || token.trim().length === 0) {
      throw {
        code: 'INVALID_TOKEN',
        message: 'Token cannot be empty',
        retryable: false,
      };
    }

    // For now, only GitHub is supported
    if (provider !== 'github') {
      throw {
        code: 'INVALID_URL',
        message: 'Only GitHub is currently supported for PAT authentication',
        retryable: false,
      };
    }

    let validated = false;
    let user: { username: string; email?: string } | undefined;
    let scopes: string[] | undefined;

    // Validate token by making a test API call
    try {
      // Test the token by fetching user info
      const userInfo = await this.validateGitHubToken(token);
      validated = true;
      user = {
        username: userInfo.login,
        email: userInfo.email,
      };

      // If a test repository was provided, try to access it
      if (testRepository) {
        await this.testRepositoryAccess(token, testRepository);
      }

      // Extract scopes from the token (GitHub includes this in response headers)
      scopes = userInfo.scopes;
    } catch (error: any) {
      // Token validation failed
      throw {
        code: error.code || 'AUTH_FAILED',
        message: error.message || 'Failed to validate Personal Access Token',
        retryable: false,
        details: 'Please check that your token is valid and has the required permissions (repo scope for private repositories).',
      };
    }

    // Store the token securely
    try {
      await credentialStore.storeToken(provider, token);
    } catch (error: any) {
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to store authentication token securely',
        retryable: true,
        details: error.message,
      };
    }

    return {
      tokenStored: true,
      validated,
      user,
      scopes,
    };
  }

  /**
   * Validate a GitHub Personal Access Token
   *
   * @param token - GitHub PAT
   * @returns User information
   */
  private async validateGitHubToken(token: string): Promise<{
    login: string;
    email?: string;
    scopes?: string[];
  }> {
    try {
      // Make authenticated request to GitHub user API
      const response = await gitHttpClient.getAxiosInstance().get(
        'https://api.github.com/user',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      // Extract scopes from response headers
      const scopesHeader = response.headers['x-oauth-scopes'];
      const scopes = scopesHeader ? scopesHeader.split(',').map((s: string) => s.trim()) : undefined;

      return {
        login: response.data.login,
        email: response.data.email,
        scopes,
      };
    } catch (error: any) {
      // GitHub API will return 401 for invalid tokens
      if (error.response?.status === 401) {
        throw {
          code: 'INVALID_TOKEN',
          message: 'Invalid Personal Access Token. Please check your token and try again.',
        };
      }

      // Other errors
      throw {
        code: 'AUTH_FAILED',
        message: error.message || 'Failed to validate token with GitHub',
      };
    }
  }

  /**
   * Test repository access with a token
   *
   * @param token - GitHub PAT
   * @param repositoryUrl - Repository URL to test
   */
  private async testRepositoryAccess(token: string, repositoryUrl: string): Promise<void> {
    try {
      // Extract owner and repo from URL
      const url = new URL(repositoryUrl);
      const pathParts = url.pathname.split('/').filter(Boolean);

      if (pathParts.length < 2) {
        throw new Error('Invalid repository URL format');
      }

      const owner = pathParts[0];
      const repo = pathParts[1].replace(/\.git$/, '');

      // Try to access the repository
      await gitHttpClient.getAxiosInstance().get(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw {
          code: 'REPOSITORY_NOT_FOUND',
          message: 'Repository not found or you do not have access to it',
        };
      }

      if (error.response?.status === 403) {
        throw {
          code: 'PERMISSION_DENIED',
          message: 'Your token does not have permission to access this repository',
        };
      }

      throw error;
    }
  }

  /**
   * Get stored token for a provider
   *
   * @param provider - Git provider
   * @returns Stored token or null
   */
  async getToken(provider: 'github' | 'azure'): Promise<string | null> {
    try {
      return await credentialStore.getToken(provider);
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete stored token for a provider
   *
   * @param provider - Git provider
   */
  async deleteToken(provider: 'github' | 'azure'): Promise<void> {
    await credentialStore.deleteToken(provider);
  }
}

// Export singleton instance
export const authService = new AuthService();
