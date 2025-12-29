/**
 * Offline Status Hook
 *
 * React hook for monitoring Git provider connectivity status.
 * Periodically checks connectivity and provides online/offline state.
 *
 * Phase 3 - T048
 */

import { useEffect, useCallback } from 'react';
import { useGitStore } from '../stores/git-store';
import type { CheckConnectivityRequest } from '../../shared/types/git-contracts';

const DEFAULT_CHECK_INTERVAL_MS = 30000; // 30 seconds

/**
 * Offline status monitoring hook
 *
 * Usage:
 * ```typescript
 * const { isOnline, lastCheck, checkConnectivity } = useOfflineStatus({
 *   enabled: true,
 *   intervalMs: 30000
 * });
 *
 * // Manually trigger connectivity check
 * await checkConnectivity();
 * ```
 */
export const useOfflineStatus = (options?: {
  enabled?: boolean;
  intervalMs?: number;
  provider?: 'github' | 'azure';
}) => {
  const {
    isOnline,
    lastConnectivityCheck,
    setIsOnline,
    setLastConnectivityCheck,
  } = useGitStore();

  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs ?? DEFAULT_CHECK_INTERVAL_MS;
  const provider = options?.provider;

  /**
   * Check connectivity to Git providers
   */
  const checkConnectivity = useCallback(async () => {
    try {
      const request: CheckConnectivityRequest = {
        provider,
        timeoutMs: 5000,
      };

      const response = await window.git.connectivity.check(request);

      if (response.success) {
        setIsOnline(response.data.isOnline);
        setLastConnectivityCheck(response.data.checkedAt);
      } else {
        // If check fails, assume offline
        setIsOnline(false);
        setLastConnectivityCheck(Date.now());
      }
    } catch (error) {
      // If check throws, assume offline
      setIsOnline(false);
      setLastConnectivityCheck(Date.now());
    }
  }, [provider, setIsOnline, setLastConnectivityCheck]);

  /**
   * Set up periodic connectivity checks
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Initial check
    checkConnectivity();

    // Set up interval
    const intervalId = setInterval(checkConnectivity, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, intervalMs, checkConnectivity]);

  /**
   * Listen for online/offline events from browser
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleOnline = () => {
      setIsOnline(true);
      checkConnectivity();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastConnectivityCheck(Date.now());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, checkConnectivity, setIsOnline, setLastConnectivityCheck]);

  return {
    isOnline,
    lastCheck: lastConnectivityCheck,
    checkConnectivity,
  };
};
