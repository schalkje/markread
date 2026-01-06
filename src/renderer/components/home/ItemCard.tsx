/**
 * ItemCard Component
 *
 * Displays a single recent or favorite item with delete button and tooltip.
 * Follows folder selector design patterns for visual consistency.
 *
 * Source: specs/001-home-recents-favorites/plan.md
 */

import React from 'react';
import type { RecentItem, Favorite } from '@shared/types/recents-favorites';

interface ItemCardProps {
  item: RecentItem | Favorite;
  onRemove: () => void;
  onClick: () => void;
  showRemoveButton?: boolean;
  onToggleFavorite?: () => void;
  isFavorited?: boolean;
}

/**
 * Card component for displaying a single item
 *
 * Features:
 * - Displays item display name
 * - Delete button (×) for manual removal
 * - Click handler for navigation
 * - Tooltip with full path and timestamp
 * - Star button: filled (★) for favorites, hollow (☆) for non-favorites
 */
export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onRemove,
  onClick,
  showRemoveButton = true,
  onToggleFavorite,
  isFavorited = false
}) => {
  // Determine if item is a RecentItem or Favorite
  const timestamp = 'lastOpened' in item
    ? item.lastOpened
    : 'dateAdded' in item
    ? item.dateAdded
    : Date.now();

  const timestampLabel = 'lastOpened' in item
    ? 'Last opened'
    : 'Added to favorites';

  // Format timestamp for tooltip
  const formattedTime = new Date(timestamp).toLocaleString();

  // Tooltip content: full path + timestamp
  const tooltipText = `${timestampLabel}: ${formattedTime}\nPath: ${item.path}`;

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onClick
    onRemove();
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onClick
    if (onToggleFavorite) {
      onToggleFavorite();
    }
  };

  return (
    <div
      className="item-card"
      onClick={onClick}
      title={tooltipText}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      <span className="item-name">{item.displayName}</span>
      <div className="item-actions">
        {/* Star button: filled for favorites, hollow for non-favorites */}
        {onToggleFavorite && (
          <button
            className={`item-favorite-btn ${isFavorited ? 'favorited' : ''}`}
            onClick={handleToggleFavorite}
            aria-label={isFavorited ? `Remove ${item.displayName} from favorites` : `Add ${item.displayName} to favorites`}
            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            type="button"
          >
            {isFavorited ? '★' : '☆'}
          </button>
        )}
        {showRemoveButton && (
          <button
            className="item-remove-btn"
            onClick={handleRemoveClick}
            aria-label={`Remove ${item.displayName}`}
            title="Remove from list"
            type="button"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
