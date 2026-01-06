/**
 * Recents Section Component
 *
 * Displays recent items across all three categories (Files, Folders, Repos).
 * Integrates with useRecentsFavorites hook for state management.
 *
 * Source: specs/001-home-recents-favorites/plan.md
 */

import React, { useEffect, useState } from 'react';
import { CategoryColumn } from './CategoryColumn';
import { Toast } from '../common/Toast';
import { useRecentsFavorites } from '../../hooks/useRecentsFavorites';
import type { RecentItem, Favorite } from '@shared/types/recents-favorites';
import { ERROR_MESSAGES } from '@shared/types/recents-favorites';

interface RecentsSectionProps {
  onItemClick: (item: RecentItem | Favorite) => void;
  onItemRemove: (item: RecentItem | Favorite) => void;
}

/**
 * Component for displaying all recent items
 *
 * Features:
 * - Three columns for Files, Folders, and Repos
 * - Auto-loads recents on mount
 * - Handles item navigation and removal
 * - T025: Add to favorites button
 * - T026: Favorites limit enforcement
 * - T028: Duplicate prevention (filter out favorited items)
 */
export const RecentsSection: React.FC<RecentsSectionProps> = ({
  onItemClick,
  onItemRemove
}) => {
  const { recents, loadAll, loading, addFavorite, isFavorite } = useRecentsFavorites();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load recents on mount
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // T025, T026: Handle add to favorites with limit enforcement
  const handleAddToFavorites = async (item: RecentItem | Favorite) => {
    try {
      setErrorMessage(null);
      const result = await addFavorite({
        path: item.path,
        type: item.type,
        displayName: item.displayName
      });

      if (!result.success && result.error) {
        setErrorMessage(result.error);
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } catch (error) {
      console.error('Failed to add favorite:', error);
      setErrorMessage(ERROR_MESSAGES.STORAGE_ERROR);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="recents-favorites-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading recents...</p>
        </div>
      </div>
    );
  }

  // T028: Filter out items that are already in favorites (duplicate prevention)
  const filterNonFavorited = (items: RecentItem[]) => {
    return items.filter(item => !isFavorite(item.path, item.type));
  };

  return (
    <>
      {/* T034: Error message display with Toast */}
      {errorMessage && (
        <Toast
          message={errorMessage}
          type="error"
          onClose={() => setErrorMessage(null)}
        />
      )}
      <div className="recents-favorites-container">
        <CategoryColumn
          title="Files"
          items={filterNonFavorited(recents.file || [])}
          onItemClick={onItemClick}
          onItemRemove={onItemRemove}
          emptyMessage="No recent files"
          showRemoveButtons={true}
          onAddToFavorites={handleAddToFavorites}
          isFavorited={(item) => isFavorite(item.path, item.type)}
        />
        <CategoryColumn
          title="Folders"
          items={filterNonFavorited(recents.folder || [])}
          onItemClick={onItemClick}
          onItemRemove={onItemRemove}
          emptyMessage="No recent folders"
          showRemoveButtons={true}
          onAddToFavorites={handleAddToFavorites}
          isFavorited={(item) => isFavorite(item.path, item.type)}
        />
        <CategoryColumn
          title="Repos & Branches"
          items={filterNonFavorited(recents.repo || [])}
          onItemClick={onItemClick}
          onItemRemove={onItemRemove}
          emptyMessage="No repositories opened yet"
          showRemoveButtons={true}
          onAddToFavorites={handleAddToFavorites}
          isFavorited={(item) => isFavorite(item.path, item.type)}
        />
      </div>
    </>
  );
};
