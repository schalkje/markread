/**
 * RepositoryGroup Component
 *
 * Displays a repository with its branches grouped together.
 * Similar to the repository history display in RepoConnectDialog.
 */

import React from 'react';
import type { RecentItem, Favorite } from '@shared/types/recents-favorites';

interface RepositoryGroupProps {
  url: string;
  displayName: string;
  branches: Array<{
    branch: string;
    item: RecentItem | Favorite;
  }>;
  onBranchClick: (item: RecentItem | Favorite) => void;
  onRemoveBranch: (item: RecentItem | Favorite) => void;
  onToggleFavorite?: (item: RecentItem | Favorite) => void;
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
  return { repo: displayName, branch: '' };
}

export const RepositoryGroup: React.FC<RepositoryGroupProps> = ({
  url,
  displayName,
  branches,
  onBranchClick,
  onRemoveBranch,
  onToggleFavorite
}) => {
  const { repo } = parseDisplayName(displayName);

  return (
    <div className="repo-group">
      <div className="repo-group__header">
        <div className="repo-group__name">{repo}</div>
        <div className="repo-group__url">{url}</div>
      </div>
      <div className="repo-group__branches">
        {branches.map(({ branch, item }) => {
          const isFavorited = 'dateAdded' in item;

          return (
            <div key={`${url}-${branch}`} className="repo-branch-item">
              <button
                type="button"
                className="repo-branch-item__button"
                onClick={() => onBranchClick(item)}
              >
                🌿 {branch}
              </button>
              <div className="repo-branch-item__actions">
                {onToggleFavorite && (
                  <button
                    className={`repo-branch-item__favorite ${isFavorited ? 'favorited' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(item);
                    }}
                    aria-label={isFavorited ? `Remove from favorites` : `Add to favorites`}
                    title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                    type="button"
                  >
                    {isFavorited ? '★' : '☆'}
                  </button>
                )}
                <button
                  className="repo-branch-item__remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBranch(item);
                  }}
                  aria-label="Remove from list"
                  title="Remove from list"
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
