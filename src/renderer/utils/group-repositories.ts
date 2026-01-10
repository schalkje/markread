/**
 * Utility functions for grouping repository items by URL
 */

import type { RecentItem, Favorite } from '@shared/types/recents-favorites';

export interface GroupedRepository {
  url: string;
  displayName: string;
  branches: Array<{
    branch: string;
    item: RecentItem | Favorite;
  }>;
  mostRecentTimestamp: number;
}

/**
 * Extract repository name and branch from display name
 * Format: "repoName (branchName)"
 */
function parseDisplayName(displayName: string): { repo: string; branch: string } {
  const match = displayName.match(/^(.+?)\s*\((.+?)\)$/);
  if (match) {
    return { repo: match[1], branch: match[2] };
  }
  return { repo: displayName, branch: displayName };
}

/**
 * Get timestamp from item (works for both RecentItem and Favorite)
 */
function getTimestamp(item: RecentItem | Favorite): number {
  if ('lastOpened' in item) {
    return item.lastOpened;
  }
  if ('dateAdded' in item) {
    return item.dateAdded;
  }
  return 0;
}

/**
 * Group repository items by URL
 * Multiple branches of the same repo are grouped together
 */
export function groupRepositories(items: (RecentItem | Favorite)[]): GroupedRepository[] {
  const groupedMap = new Map<string, GroupedRepository>();

  for (const item of items) {
    // Extract base URL without branch fragment (path format: url#branch)
    const baseUrl = item.path.split('#')[0];
    const { repo, branch } = parseDisplayName(item.displayName);
    const timestamp = getTimestamp(item);

    const existing = groupedMap.get(baseUrl);

    if (existing) {
      // Add this branch to existing repository
      existing.branches.push({
        branch,
        item,
      });
      // Update most recent timestamp if this item is newer
      if (timestamp > existing.mostRecentTimestamp) {
        existing.mostRecentTimestamp = timestamp;
      }
    } else {
      // Create new repository group
      groupedMap.set(baseUrl, {
        url: baseUrl,
        displayName: repo,
        branches: [
          {
            branch,
            item,
          },
        ],
        mostRecentTimestamp: timestamp,
      });
    }
  }

  // Convert to array and sort by most recent timestamp
  const grouped = Array.from(groupedMap.values());
  grouped.sort((a, b) => b.mostRecentTimestamp - a.mostRecentTimestamp);

  // Sort branches within each repository by timestamp
  for (const repo of grouped) {
    repo.branches.sort((a, b) => getTimestamp(b.item) - getTimestamp(a.item));
  }

  return grouped;
}
