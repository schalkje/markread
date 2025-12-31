/**
 * Repository Connection History Manager
 *
 * Manages the history of connected repositories for quick reconnection.
 * Stores the last 10 connections with URL and branch information.
 */

export interface ConnectionHistoryEntry {
  url: string;
  branch: string;
  displayName: string;
  timestamp: number;
}

const STORAGE_KEY = 'markread-connection-history';
const MAX_HISTORY_ENTRIES = 10;
const DEFAULT_ENTRY: ConnectionHistoryEntry = {
  url: 'https://github.com/schalkje/markread',
  branch: 'main',
  displayName: 'schalkje/markread',
  timestamp: 0,
};

/**
 * Get connection history from localStorage
 * Returns last 10 connections, or default if empty
 */
export function getConnectionHistory(): ConnectionHistoryEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [DEFAULT_ENTRY];
    }

    const history: ConnectionHistoryEntry[] = JSON.parse(stored);

    // Return history if not empty, otherwise return default
    if (history.length === 0) {
      return [DEFAULT_ENTRY];
    }

    return history;
  } catch (error) {
    console.error('Error loading connection history:', error);
    return [DEFAULT_ENTRY];
  }
}

/**
 * Add a new connection to history
 * Maintains max 10 entries, most recent first
 */
export function addToConnectionHistory(
  url: string,
  branch: string,
  displayName: string
): void {
  try {
    const history = getConnectionHistory();

    // Remove default entry if it exists and we're adding a real entry
    const filteredHistory = history.filter(entry => entry.timestamp !== 0);

    // Remove any existing entry for this URL + branch combination
    const dedupedHistory = filteredHistory.filter(
      entry => !(entry.url === url && entry.branch === branch)
    );

    // Add new entry at the beginning
    const newEntry: ConnectionHistoryEntry = {
      url,
      branch,
      displayName,
      timestamp: Date.now(),
    };

    const updatedHistory = [newEntry, ...dedupedHistory].slice(0, MAX_HISTORY_ENTRIES);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error saving connection history:', error);
  }
}

/**
 * Clear all connection history
 */
export function clearConnectionHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing connection history:', error);
  }
}
