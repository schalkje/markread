/**
 * CategoryList Component
 *
 * Displays a single vertical list for a category (Files, Folders, or Repos).
 * Shows favorites at top, separator, then recents below.
 * The opener button acts as the header for the list.
 */

import React from 'react';
import { ItemCard } from './ItemCard';
import { RepositoryGroup } from './RepositoryGroup';
import { groupRepositories } from '../../utils/group-repositories';
import type { RecentItem, Favorite } from '@shared/types/recents-favorites';

interface CategoryListProps {
  // The opener button component (FileOpener, FolderOpener, or Open Repository button)
  openerButton: React.ReactNode;
  // Favorites for this category
  favorites: Favorite[];
  // Recents for this category
  recents: RecentItem[];
  // Event handlers
  onItemClick: (item: RecentItem | Favorite) => void;
  onItemRemove: (item: RecentItem | Favorite) => void;
  onAddToFavorites?: (item: RecentItem) => void;
  onRemoveFromFavorites?: (item: Favorite) => void;
  // Optional: specify if this is a repository list
  isRepositoryList?: boolean;
}

/**
 * Displays a category list with favorites above recents
 */
export const CategoryList: React.FC<CategoryListProps> = ({
  openerButton,
  favorites,
  recents,
  onItemClick,
  onItemRemove,
  onAddToFavorites,
  onRemoveFromFavorites,
  isRepositoryList = false
}) => {
  // Filter out items that are already in favorites (duplicate prevention)
  const favoritePaths = new Set(favorites.map(fav => fav.path));
  const filteredRecents = recents.filter(item => !favoritePaths.has(item.path));

  const hasFavorites = favorites.length > 0;
  const hasRecents = filteredRecents.length > 0;

  // For repository lists, group items by repository
  if (isRepositoryList) {
    const allRepos = [...favorites, ...filteredRecents];
    const groupedRepos = groupRepositories(allRepos);

    return (
      <div className="category-list">
        {/* Opener button acts as the header */}
        <div className="category-list-header">
          {openerButton}
        </div>

        {/* Repository groups */}
        <div className="category-list-items">
          {groupedRepos.map((repo) => (
            <RepositoryGroup
              key={repo.url}
              url={repo.url}
              displayName={repo.displayName}
              branches={repo.branches}
              onBranchClick={onItemClick}
              onRemoveBranch={onItemRemove}
              onToggleFavorite={(item) => {
                const isFavorited = 'dateAdded' in item;
                if (isFavorited && onRemoveFromFavorites) {
                  onRemoveFromFavorites(item as Favorite);
                } else if (!isFavorited && onAddToFavorites) {
                  onAddToFavorites(item as RecentItem);
                }
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Regular item list (for files and folders)
  return (
    <div className="category-list">
      {/* Opener button acts as the header */}
      <div className="category-list-header">
        {openerButton}
      </div>

      {/* Items container */}
      <div className="category-list-items">
        {/* Favorites section */}
        {hasFavorites && (
          <div className="favorites-list">
            {favorites.map((item) => (
              <ItemCard
                key={item.path}
                item={item}
                onClick={() => onItemClick(item)}
                onRemove={() => onItemRemove(item)}
                showRemoveButton={true}
                isFavorited={true}
                onToggleFavorite={onRemoveFromFavorites ? () => onRemoveFromFavorites(item) : undefined}
              />
            ))}
          </div>
        )}

        {/* Separator between favorites and recents */}
        {hasFavorites && hasRecents && (
          <hr className="section-divider" />
        )}

        {/* Recents section */}
        {hasRecents && (
          <div className="recents-list">
            {filteredRecents.map((item) => (
              <ItemCard
                key={item.path}
                item={item}
                onClick={() => onItemClick(item)}
                onRemove={() => onItemRemove(item)}
                showRemoveButton={true}
                isFavorited={false}
                onToggleFavorite={onAddToFavorites ? () => onAddToFavorites(item) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
