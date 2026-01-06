/**
 * CategoryList Component
 *
 * Displays a single vertical list for a category (Files, Folders, or Repos).
 * Shows favorites at top, separator, then recents below.
 * The opener button acts as the header for the list.
 */

import React from 'react';
import { ItemCard } from './ItemCard';
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
  onRemoveFromFavorites
}) => {
  const hasFavorites = favorites.length > 0;
  const hasRecents = recents.length > 0;
  const hasItems = hasFavorites || hasRecents;

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
            {recents.map((item) => (
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
