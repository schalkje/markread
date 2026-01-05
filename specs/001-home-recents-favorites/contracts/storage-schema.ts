/**
 * Storage Schema and IPC Contracts for Recents and Favorites
 *
 * This file defines the type-safe contracts for communication between
 * the Electron main and renderer processes for the recents/favorites feature.
 *
 * File location in implementation: src/shared/types/recents-favorites.ts
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Type of item that can be tracked in recents or favorites
 */
export enum ItemType {
  FILE = 'file',
  FOLDER = 'folder',
  REPO = 'repo'
}

/**
 * Represents a recently accessed file, folder, or repository
 */
export interface RecentItem {
  /**
   * Full absolute path to the item (unique identifier)
   * Normalized using path.normalize() for cross-platform consistency
   */
  path: string;

  /**
   * Type of item (file, folder, or repo)
   */
  type: ItemType;

  /**
   * Timestamp when item was last opened (milliseconds since epoch)
   * Used for sorting (most recent first) and LRU eviction
   */
  lastOpened: number;

  /**
   * Display name extracted from path (basename)
   */
  displayName: string;
}

/**
 * Represents a user-favorited file, folder, or repository
 */
export interface Favorite {
  /**
   * Full absolute path to the item (unique identifier)
   * Normalized using path.normalize() for cross-platform consistency
   */
  path: string;

  /**
   * Type of item (file, folder, or repo)
   */
  type: ItemType;

  /**
   * Timestamp when item was added to favorites (milliseconds since epoch)
   */
  dateAdded: number;

  /**
   * Display name extracted from path (basename)
   */
  displayName: string;
}

// ============================================================================
// Storage Schemas (electron-store)
// ============================================================================

/**
 * Storage schema for recents data
 */
export interface RecentsSchema {
  files: RecentItem[];
  folders: RecentItem[];
  repos: RecentItem[];
  version: number;
}

/**
 * Storage schema for favorites data
 */
export interface FavoritesSchema {
  files: Favorite[];
  folders: Favorite[];
  repos: Favorite[];
  version: number;
}

// ============================================================================
// IPC Contracts (Main ↔ Renderer Communication)
// ============================================================================

/**
 * IPC channel names for recents and favorites communication
 */
export const IPC_CHANNELS = {
  // Recents
  GET_RECENTS: 'recents:get',
  ADD_RECENT: 'recents:add',
  REMOVE_RECENT: 'recents:remove',
  CLEAR_RECENTS: 'recents:clear',
  HAS_RECENT: 'recents:has',

  // Favorites
  GET_FAVORITES: 'favorites:get',
  ADD_FAVORITE: 'favorites:add',
  REMOVE_FAVORITE: 'favorites:remove',
  IS_FAVORITE: 'favorites:is',
  GET_FAVORITES_COUNT: 'favorites:count',

  // Events
  RECENTS_UPDATED: 'recents:updated',
  FAVORITES_UPDATED: 'favorites:updated'
} as const;

/**
 * Request payload for getting recents by type
 */
export interface GetRecentsRequest {
  type: ItemType;
}

/**
 * Response payload for getting recents
 */
export interface GetRecentsResponse {
  items: RecentItem[];
}

/**
 * Request payload for adding a recent item
 */
export interface AddRecentRequest {
  item: RecentItem;
}

/**
 * Request payload for removing a recent item
 */
export interface RemoveRecentRequest {
  path: string;
  type: ItemType;
}

/**
 * Request payload for clearing recents
 */
export interface ClearRecentsRequest {
  type: ItemType;
}

/**
 * Request payload for checking if item exists in recents
 */
export interface HasRecentRequest {
  path: string;
  type: ItemType;
}

/**
 * Response payload for checking if item exists in recents
 */
export interface HasRecentResponse {
  exists: boolean;
}

/**
 * Request payload for getting favorites by type
 */
export interface GetFavoritesRequest {
  type: ItemType;
}

/**
 * Response payload for getting favorites
 */
export interface GetFavoritesResponse {
  items: Favorite[];
}

/**
 * Request payload for adding a favorite
 */
export interface AddFavoriteRequest {
  item: Favorite;
}

/**
 * Response payload for adding a favorite (includes success/error)
 */
export interface AddFavoriteResponse {
  success: boolean;
  error?: string; // e.g., "Maximum 10 favorites per category"
}

/**
 * Request payload for removing a favorite
 */
export interface RemoveFavoriteRequest {
  path: string;
  type: ItemType;
}

/**
 * Request payload for checking if item is favorited
 */
export interface IsFavoriteRequest {
  path: string;
  type: ItemType;
}

/**
 * Response payload for checking if item is favorited
 */
export interface IsFavoriteResponse {
  isFavorite: boolean;
}

/**
 * Request payload for getting favorites count
 */
export interface GetFavoritesCountRequest {
  type: ItemType;
}

/**
 * Response payload for getting favorites count
 */
export interface GetFavoritesCountResponse {
  count: number;
}

/**
 * Event payload for recents updated event
 */
export interface RecentsUpdatedEvent {
  type: ItemType;
  items: RecentItem[];
}

/**
 * Event payload for favorites updated event
 */
export interface FavoritesUpdatedEvent {
  type: ItemType;
  items: Favorite[];
}

// ============================================================================
// Preload API (exposed to renderer via contextBridge)
// ============================================================================

/**
 * API exposed to renderer process via preload script
 * This is the interface that components will use
 */
export interface RecentsFavoritesAPI {
  // Recents
  getRecents(type: ItemType): Promise<RecentItem[]>;
  addRecent(item: RecentItem): Promise<void>;
  removeRecent(path: string, type: ItemType): Promise<void>;
  clearRecents(type: ItemType): Promise<void>;
  hasRecent(path: string, type: ItemType): Promise<boolean>;

  // Favorites
  getFavorites(type: ItemType): Promise<Favorite[]>;
  addFavorite(item: Favorite): Promise<AddFavoriteResponse>;
  removeFavorite(path: string, type: ItemType): Promise<void>;
  isFavorite(path: string, type: ItemType): Promise<boolean>;
  getFavoritesCount(type: ItemType): Promise<number>;

  // Event listeners
  onRecentsUpdated(callback: (event: RecentsUpdatedEvent) => void): () => void;
  onFavoritesUpdated(callback: (event: FavoritesUpdatedEvent) => void): () => void;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Helper type for creating a new recent item (auto-generates lastOpened)
 */
export type NewRecentItem = Omit<RecentItem, 'lastOpened'>;

/**
 * Helper type for creating a new favorite (auto-generates dateAdded)
 */
export type NewFavorite = Omit<Favorite, 'dateAdded'>;

/**
 * Union type for all item types
 */
export type Item = RecentItem | Favorite;

/**
 * Type guard to check if item is a RecentItem
 */
export function isRecentItem(item: Item): item is RecentItem {
  return 'lastOpened' in item;
}

/**
 * Type guard to check if item is a Favorite
 */
export function isFavorite(item: Item): item is Favorite {
  return 'dateAdded' in item;
}

// ============================================================================
// Validation Schemas (using Zod for runtime validation)
// ============================================================================

/**
 * NOTE: These will be implemented in the actual code using Zod
 * Included here for documentation purposes
 */

/*
import { z } from 'zod';

export const ItemTypeSchema = z.enum(['file', 'folder', 'repo']);

export const RecentItemSchema = z.object({
  path: z.string().min(1),
  type: ItemTypeSchema,
  lastOpened: z.number().int().positive(),
  displayName: z.string().min(1)
});

export const FavoriteSchema = z.object({
  path: z.string().min(1),
  type: ItemTypeSchema,
  dateAdded: z.number().int().positive(),
  displayName: z.string().min(1)
});

export const RecentsSchemaValidator = z.object({
  files: z.array(RecentItemSchema).max(10),
  folders: z.array(RecentItemSchema).max(10),
  repos: z.array(RecentItemSchema).max(10),
  version: z.number().int().positive()
});

export const FavoritesSchemaValidator = z.object({
  files: z.array(FavoriteSchema).max(10),
  folders: z.array(FavoriteSchema).max(10),
  repos: z.array(FavoriteSchema).max(10),
  version: z.number().int().positive()
});
*/

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum number of items per category
 */
export const MAX_ITEMS_PER_CATEGORY = 10;

/**
 * Storage version for migrations
 */
export const STORAGE_VERSION = 1;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  FAVORITES_LIMIT_REACHED: 'Maximum 10 favorites per category. Please remove an existing favorite first.',
  ITEM_NOT_FOUND: 'Item no longer exists at the specified path.',
  INVALID_PATH: 'Invalid path provided.',
  STORAGE_ERROR: 'Failed to save data. Please try again.'
} as const;

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example: Renderer process using the API
 */
/*
// In React component
const handleAddRecent = async (filePath: string) => {
  const item: NewRecentItem = {
    path: filePath,
    type: ItemType.FILE,
    displayName: path.basename(filePath)
  };

  const fullItem: RecentItem = {
    ...item,
    lastOpened: Date.now()
  };

  await window.api.recentsFavorites.addRecent(fullItem);
};

// In React component
const handleAddFavorite = async (filePath: string) => {
  const item: NewFavorite = {
    path: filePath,
    type: ItemType.FILE,
    displayName: path.basename(filePath)
  };

  const fullItem: Favorite = {
    ...item,
    dateAdded: Date.now()
  };

  const result = await window.api.recentsFavorites.addFavorite(fullItem);

  if (!result.success) {
    showToast(result.error || 'Failed to add favorite');
  }
};

// Subscribe to updates
useEffect(() => {
  const unsubscribe = window.api.recentsFavorites.onRecentsUpdated((event) => {
    console.log('Recents updated:', event.type, event.items);
    // Update local state
  });

  return unsubscribe;
}, []);
*/
