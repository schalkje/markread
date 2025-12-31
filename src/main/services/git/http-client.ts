/**
 * Git HTTP Client
 *
 * Axios-based HTTP client for Git API operations.
 * Provides auth token management, automatic retries, and error handling.
 *
 * Source: specs/001-git-repo-integration/research.md (Section 1)
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { rateLimiter } from './rate-limiter';

/**
 * HTTP client for Git API operations
 *
 * Features:
 * - Automatic auth token injection via interceptors
 * - 30s timeout (performance requirement)
 * - Error handling with status code mapping
 * - Integration with rate limiter
 * - User-Agent header for API compliance
 */
export class GitHttpClient {
  private client: AxiosInstance;
  private tokenProvider?: (url: string) => Promise<string | null>;

  constructor() {
    this.client = axios.create({
      timeout: 30000, // 30s per performance requirements (SC-001)
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'MarkRead-Git-Client'
      }
    });

    // Request interceptor for auth tokens
    this.client.interceptors.request.use(async (config) => {
      if (this.tokenProvider && config.url) {
        const token = await this.tokenProvider(config.url);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Response interceptor for error handling and rate limit tracking
    this.client.interceptors.response.use(
      (response) => {
        // Extract rate limit info from response headers
        if (response.headers) {
          const repositoryId = (response.config as any).repositoryId;
          if (repositoryId) {
            rateLimiter.updateFromHeaders(repositoryId, response.headers);
          }
        }
        return response;
      },
      async (error) => {
        // Handle 401 Unauthorized (token expired)
        if (error.response?.status === 401) {
          throw {
            code: 'AUTH_FAILED',
            message: 'Authentication failed. Please check your credentials.',
            statusCode: 401,
            retryable: false,
          };
        }

        // Handle 403 Forbidden (permission denied OR rate limit)
        if (error.response?.status === 403) {
          // Check if this is a rate limit error (GitHub specific)
          const rateLimitRemaining = error.response.headers['x-ratelimit-remaining'];
          const rateLimitReset = error.response.headers['x-ratelimit-reset'];

          if (rateLimitRemaining === '0' || rateLimitRemaining === 0) {
            // This is a rate limit error
            const resetTime = rateLimitReset ? parseInt(rateLimitReset, 10) : Date.now() / 1000 + 3600;
            const secondsUntilReset = Math.max(0, resetTime - Date.now() / 1000);

            throw {
              code: 'RATE_LIMIT',
              message: 'GitHub API rate limit exceeded. Please wait or authenticate to increase limits.',
              statusCode: 403,
              retryable: true,
              retryAfterSeconds: Math.ceil(secondsUntilReset),
              details: 'Unauthenticated requests are limited to 60 per hour. Consider authenticating with a Personal Access Token.',
            };
          }

          // This is a permission error
          throw {
            code: 'PERMISSION_DENIED',
            message: 'You do not have permission to access this resource.',
            statusCode: 403,
            retryable: false,
          };
        }

        // Handle 404 Not Found
        if (error.response?.status === 404) {
          throw {
            code: 'REPOSITORY_NOT_FOUND',
            message: 'Repository not found. Please check the URL and your access permissions.',
            statusCode: 404,
            retryable: false,
          };
        }

        // Handle 429 Rate Limit
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
          throw {
            code: 'RATE_LIMIT',
            message: 'Rate limit exceeded. Please wait before trying again.',
            statusCode: 429,
            retryable: true,
            retryAfterSeconds: retryAfter,
          };
        }

        // Handle timeout
        if (error.code === 'ECONNABORTED') {
          throw {
            code: 'TIMEOUT',
            message: 'The operation timed out. Please try again.',
            retryable: true,
          };
        }

        // Handle network errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw {
            code: 'NETWORK_ERROR',
            message: 'Network error. Please check your internet connection and try again.',
            retryable: true,
          };
        }

        // Generic error
        throw {
          code: 'UNKNOWN',
          message: error.message || 'An unexpected error occurred. Please try again.',
          retryable: false,
        };
      }
    );
  }

  /**
   * Set the token provider function
   * This function is called to retrieve the auth token for each request
   *
   * @param provider - Async function that returns a token given a URL
   */
  setTokenProvider(provider: (url: string) => Promise<string | null>): void {
    this.tokenProvider = provider;
  }

  /**
   * Execute GET request
   *
   * @param url - Request URL
   * @param config - Axios request config
   * @returns Response data
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * Execute POST request
   *
   * @param url - Request URL
   * @param data - Request body
   * @param config - Axios request config
   * @returns Response data
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Execute PUT request
   *
   * @param url - Request URL
   * @param data - Request body
   * @param config - Axios request config
   * @returns Response data
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Execute DELETE request
   *
   * @param url - Request URL
   * @param config - Axios request config
   * @returns Response data
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * Get the underlying axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}

// Export singleton instance
export const gitHttpClient = new GitHttpClient();
