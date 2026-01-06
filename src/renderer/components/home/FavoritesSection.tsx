/**
 * Favorites Section Component
 *
 * Displays favorite items across all three categories (Files, Folders, Repos).
 * Favorites are shown above recents and sorted alphabetically.
 *
 * Source: specs/001-home-recents-favorites/plan.md
 */

import React, { useEffect } from 'react';
import { CategoryColumn } from './CategoryColumn';
import { useRecentsFavorites } from '../../hooks/useRecentsFavorites';
import type { RecentItem, Favorite } from '@shared/types/recents-favorites';

interface FavoritesSectionProps {
  onItemClick: (item: RecentItem | Favorite) => void;
  onItemRemove: (item: RecentItem | Favorite) => void;
}

/**
 * Component for displaying all favorite items
 *
 * Features:
 * - Three columns for Files, Folders, and Repos
 * - Items sorted alphabetically by display name
 * - Displayed above recents section
 * - Max 10 items per category
 */
export const FavoritesSection: React.FC<FavoritesSectionProps> = ({
  onItemClick,
  onItemRemove
}) => {
  const { favorites, loadAll, loading } = useRecentsFavorites();

  // Load favorites on mount
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (loading) {
    return null; // Let RecentsSection show loading state
  }

  // Don't show section if no favorites
  const hasFavorites =
    (favorites.file?.length || 0) > 0 ||
    (favorites.folder?.length || 0) > 0 ||
    (favorites.repo?.length || 0) > 0;

  if (!hasFavorites) {
    return null;
  }

  return (
    <>
      <h2 className="section-label" style={{ marginLeft: '24px' }}>Favorites</h2>
      <div className="recents-favorites-container">
        <CategoryColumn
          title="Files"
          items={favorites.file || []}
          onItemClick={onItemClick}
          onItemRemove={onItemRemove}
          emptyMessage="No favorite files"
          showRemoveButtons={true}
        />
        <CategoryColumn
          title="Folders"
          items={favorites.folder || []}
          onItemClick={onItemClick}
          onItemRemove={onItemRemove}
          emptyMessage="No favorite folders"
          showRemoveButtons={true}
        />
        <CategoryColumn
          title="Repos & Branches"
          items={favorites.repo || []}
          onItemClick={onItemClick}
          onItemRemove={onItemRemove}
          emptyMessage="No favorite repositories"
          showRemoveButtons={true}
        />
      </div>
      <hr className="section-divider" style={{ margin: '24px' }} />
    </>
  );
};
