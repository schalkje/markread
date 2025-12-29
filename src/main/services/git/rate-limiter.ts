/**
 * Rate Limiter
 *
 * Implements exponential backoff retry strategy for API rate limiting.
 * Protects against rate limit exhaustion from GitHub (5000 req/hr) and Azure DevOps.
 *
 * Source: specs/001-git-repo-integration/research.md (Section 5)
 */

interface RateLimit {
  remaining: number;
  resetTime: number;
}

/**
 * Rate limiter with exponential backoff
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Per-repository rate limit tracking
 * - Prevents rate limit exhaustion
 * - Respects Retry-After headers from API responses
 */
export class RateLimiter {
  private readonly limits: Map<string, RateLimit> = new Map();
  private readonly MAX_RETRIES = 5;
  private readonly BASE_RETRY_MS = 1000;

  /**
   * Execute a function with rate limiting and retry logic
   *
   * @param repositoryId - Repository identifier for rate limit tracking
   * @param fn - Async function to execute
   * @returns Result of the function
   * @throws {Error} If all retries are exhausted or non-rate-limit error occurs
   */
  async withRateLimit<T>(
    repositoryId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const limit = this.limits.get(repositoryId) || this.createLimit();

    // If rate limited, check if we need to wait
    if (limit.remaining === 0) {
      const waitMs = limit.resetTime - Date.now();
      if (waitMs > 0) {
        throw {
          code: 'RATE_LIMIT',
          retryAfterSeconds: Math.ceil(waitMs / 1000),
          message: `Rate limited. Retry after ${Math.ceil(waitMs / 1000)}s`,
        };
      }
    }

    let lastError: any;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const result = await fn();

        // Success - update rate limit if available
        this.limits.set(repositoryId, limit);

        return result;
      } catch (error: any) {
        lastError = error;

        // Check if this is a rate limit error
        const isRateLimit =
          error.code === 'RATE_LIMIT' ||
          error.status === 429 ||
          error.response?.status === 429;

        if (isRateLimit) {
          // Extract retry-after from error if available
          const retryAfter = error.retryAfterSeconds ||
                           error.response?.headers?.['retry-after'];

          // Calculate backoff with exponential increase
          const backoffMs = retryAfter
            ? retryAfter * 1000
            : this.BASE_RETRY_MS * Math.pow(2, attempt);

          console.warn(
            `[GitRateLimit] Attempt ${attempt + 1}/${this.MAX_RETRIES} failed. ` +
            `Retrying in ${backoffMs}ms`
          );

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, backoffMs));

          // Update rate limit tracker
          if (retryAfter) {
            limit.resetTime = Date.now() + (retryAfter * 1000);
            limit.remaining = 0;
          }
        } else {
          // Non-rate-limit error, fail immediately
          throw error;
        }
      }
    }

    // All retries exhausted
    throw lastError;
  }

  /**
   * Update rate limit info from API response headers
   *
   * @param repositoryId - Repository identifier
   * @param headers - Response headers from API
   */
  updateFromHeaders(repositoryId: string, headers: Record<string, string>): void {
    const remaining = parseInt(headers['x-ratelimit-remaining'] || headers['x-rate-limit-remaining'], 10);
    const reset = parseInt(headers['x-ratelimit-reset'] || headers['x-rate-limit-reset'], 10);

    if (!isNaN(remaining) && !isNaN(reset)) {
      this.limits.set(repositoryId, {
        remaining,
        resetTime: reset * 1000, // Convert to milliseconds
      });
    }
  }

  /**
   * Get current rate limit status for a repository
   *
   * @param repositoryId - Repository identifier
   * @returns Current rate limit info
   */
  getLimit(repositoryId: string): RateLimit {
    return this.limits.get(repositoryId) || this.createLimit();
  }

  /**
   * Create default rate limit for new repository
   */
  private createLimit(): RateLimit {
    return {
      remaining: 5000, // GitHub authenticated limit
      resetTime: Date.now() + 3600000 // 1 hour
    };
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();
