/**
 * Connectivity Service
 *
 * Checks network connectivity to Git providers (GitHub, Azure DevOps).
 * Provides lightweight API calls to validate service availability.
 *
 * Source: specs/001-git-repo-integration/research.md (Section 8)
 */

import axios from 'axios';
import type { GitProvider } from '@/shared/types/git';

/**
 * Connectivity check result
 */
export interface ConnectivityCheckResult {
  provider: GitProvider;
  isReachable: boolean;
  responseTimeMs?: number;
  error?: string;
}

/**
 * Connectivity service for Git providers
 *
 * Features:
 * - Lightweight API calls (no authentication required)
 * - 5s timeout for fast failure detection
 * - Measures response time for performance monitoring
 * - Supports both GitHub and Azure DevOps
 */
export class ConnectivityService {
  private readonly TIMEOUT_MS = 5000;

  /**
   * Check connectivity to GitHub
   *
   * Uses the GitHub Zen API endpoint (no auth required)
   *
   * @returns True if GitHub is reachable
   */
  async checkGitHub(): Promise<ConnectivityCheckResult> {
    const startTime = Date.now();
    try {
      // Lightweight API call to check connectivity
      const response = await axios.get('https://api.github.com/zen', {
        timeout: this.TIMEOUT_MS,
      });

      const responseTimeMs = Date.now() - startTime;

      return {
        provider: 'github',
        isReachable: response.status === 200,
        responseTimeMs,
      };
    } catch (error: any) {
      return {
        provider: 'github',
        isReachable: false,
        error: error.message || 'Connection failed',
      };
    }
  }

  /**
   * Check connectivity to Azure DevOps
   *
   * @returns True if Azure DevOps is reachable
   */
  async checkAzureDevOps(): Promise<ConnectivityCheckResult> {
    const startTime = Date.now();
    try {
      const response = await axios.get('https://dev.azure.com', {
        timeout: this.TIMEOUT_MS,
      });

      const responseTimeMs = Date.now() - startTime;

      return {
        provider: 'azure',
        isReachable: response.status === 200,
        responseTimeMs,
      };
    } catch (error: any) {
      return {
        provider: 'azure',
        isReachable: false,
        error: error.message || 'Connection failed',
      };
    }
  }

  /**
   * Check connectivity to a specific provider
   *
   * @param provider - Git provider to check
   * @returns Connectivity check result
   */
  async check(provider: GitProvider): Promise<ConnectivityCheckResult> {
    if (provider === 'github') {
      return this.checkGitHub();
    } else {
      return this.checkAzureDevOps();
    }
  }

  /**
   * Check connectivity to all supported providers
   *
   * @returns Array of connectivity check results
   */
  async checkAll(): Promise<ConnectivityCheckResult[]> {
    const [githubResult, azureResult] = await Promise.all([
      this.checkGitHub(),
      this.checkAzureDevOps(),
    ]);

    return [githubResult, azureResult];
  }
}

// Export singleton instance
export const connectivityService = new ConnectivityService();
