/**
 * CategoryColumn Component
 *
 * Renders a column for a specific category (Files, Folders, or Repos & Branches).
 * Displays header, list of items using ItemCard, and empty state when no items.
 *
 * Source: specs/001-home-recents-favorites/plan.md
 */

import React from 'react';
import { ItemCard } from './ItemCard';
import type { RecentItem, Favorite } from '@shared/types/recents-favorites';

interface CategoryColumnProps {
  title: string;
  items: (RecentItem | Favorite)[];
  onItemClick: (item: RecentItem | Favorite) => void;
  onItemRemove: (item: RecentItem | Favorite) => void;
  emptyMessage?: string;
  showRemoveButtons?: boolean;
  onAddToFavorites?: (item: RecentItem | Favorite) => void;
  isFavorited?: (item: RecentItem | Favorite) => boolean;
}

/**
 * Column component for displaying items in a category
 *
 * Features:
 * - Header with category title
 * - List of ItemCard components
 * - Empty state with helpful message
 * - Consistent styling across columns
 * - T025: Add to favorites button support
 */
export const CategoryColumn: React.FC<CategoryColumnProps> = ({
  title,
  items,
  onItemClick,
  onItemRemove,
  emptyMessage = 'No items',
  showRemoveButtons = true,
  onAddToFavorites,
  isFavorited
}) => {
  return (
    <div className="category-column">
      <h3 className="category-header">{title}</h3>
      <div className="category-items">
        {items.length === 0 ? (
          <div className="empty-state">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          items.map((item) => (
            <ItemCard
              key={item.path}
              item={item}
              onClick={() => onItemClick(item)}
              onRemove={() => onItemRemove(item)}
              showRemoveButton={showRemoveButtons}
              onAddToFavorites={onAddToFavorites ? () => onAddToFavorites(item) : undefined}
              isFavorited={isFavorited ? isFavorited(item) : false}
            />
          ))
        )}
      </div>
    </div>
  );
};
