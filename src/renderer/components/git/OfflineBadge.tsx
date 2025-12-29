/**
 * Offline Badge Component
 * Phase 3 - T051
 *
 * Displays connectivity status indicator with:
 * - Online/Offline visual indicator
 * - Last check timestamp
 * - Manual refresh button
 * - Automatic periodic checks
 */

import React, { useMemo } from 'react';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import './OfflineBadge.css';

export interface OfflineBadgeProps {
  /** Custom class name */
  className?: string;
  /** Whether to show detailed info (timestamp, refresh button) */
  detailed?: boolean;
  /** Whether to enable automatic connectivity checks */
  enableAutoCheck?: boolean;
  /** Check interval in milliseconds */
  checkIntervalMs?: number;
}

/**
 * T051: Offline Badge Component
 *
 * Usage:
 * ```typescript
 * // Simple badge
 * <OfflineBadge />
 *
 * // Detailed badge with auto-check
 * <OfflineBadge detailed enableAutoCheck checkIntervalMs={30000} />
 * ```
 */
export const OfflineBadge: React.FC<OfflineBadgeProps> = ({
  className = '',
  detailed = false,
  enableAutoCheck = true,
  checkIntervalMs = 30000,
}) => {
  const { isOnline, lastCheck, checkConnectivity } = useOfflineStatus({
    enabled: enableAutoCheck,
    intervalMs: checkIntervalMs,
  });

  /**
   * Format last check timestamp
   */
  const lastCheckText = useMemo(() => {
    if (!lastCheck) {
      return 'Never checked';
    }

    const now = Date.now();
    const diff = now - lastCheck;

    if (diff < 60000) {
      // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) {
      // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} min ago`;
    } else {
      // More than 1 hour
      const hours = Math.floor(diff / 3600000);
      return `${hours} hr ago`;
    }
  }, [lastCheck]);

  /**
   * Handle manual refresh
   */
  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await checkConnectivity();
  };

  // Simple badge (just status indicator)
  if (!detailed) {
    return (
      <div
        className={`offline-badge offline-badge--simple ${
          isOnline ? 'offline-badge--online' : 'offline-badge--offline'
        } ${className}`}
        title={isOnline ? 'Online' : 'Offline'}
      >
        <span className="offline-badge__indicator" />
        <span className="offline-badge__text">{isOnline ? 'Online' : 'Offline'}</span>
      </div>
    );
  }

  // Detailed badge (with timestamp and refresh button)
  return (
    <div
      className={`offline-badge offline-badge--detailed ${
        isOnline ? 'offline-badge--online' : 'offline-badge--offline'
      } ${className}`}
    >
      <div className="offline-badge__status">
        <span className="offline-badge__indicator" />
        <span className="offline-badge__text">{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      <div className="offline-badge__details">
        <span className="offline-badge__timestamp" title={lastCheck ? new Date(lastCheck).toLocaleString() : ''}>
          {lastCheckText}
        </span>

        <button
          className="offline-badge__refresh-btn"
          onClick={handleRefresh}
          type="button"
          aria-label="Refresh connectivity status"
          title="Check connectivity now"
        >
          ↻
        </button>
      </div>
    </div>
  );
};
