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
 * Abbreviate a path to fit within a constrained width
 * Shows start and end with "..." in the middle
 */
function abbreviatePath(path: string, maxLength: number = 40): string {
  if (path.length <= maxLength) {
    return path;
  }

  // Split by path separator (works for both Windows and Unix)
  const separator = path.includes('\\') ? '\\' : '/';
  const parts = path.split(separator);

  // If it's a simple path with few parts, just truncate
  if (parts.length <= 3) {
    const start = path.substring(0, maxLength / 2);
    const end = path.substring(path.length - maxLength / 2);
    return `${start}...${end}`;
  }

  // Build abbreviated path: show first part, ellipsis, and last 2-3 parts
  const firstPart = parts[0] || parts[1]; // Handle absolute paths starting with /
  const lastParts = parts.slice(-2).join(separator);
  const abbreviated = `${firstPart}${separator}...${separator}${lastParts}`;

  // If still too long, truncate further
  if (abbreviated.length > maxLength) {
    const start = abbreviated.substring(0, maxLength / 2);
    const end = abbreviated.substring(abbreviated.length - maxLength / 2);
    return `${start}...${end}`;
  }

  return abbreviated;
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

  // Abbreviate the path for display
  const displayPath = abbreviatePath(item.path, 35);

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
      <div className="item-content">
        <div className="item-name">{item.displayName}</div>
        <div className="item-path">{displayPath}</div>
      </div>
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
