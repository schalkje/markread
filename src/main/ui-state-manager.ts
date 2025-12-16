/**
 * UI State Manager
 * Task: T165
 *
 * Handles loading and saving UI state to disk.
 * FR-007, FR-018, FR-062
 */

import { app } from 'electron';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import type { UIState } from '@shared/types/entities.d.ts';

// Get UI state file path
function getUIStatePath(): string {
  const userDataPath = app.getPath('userData');
  return join(userDataPath, 'ui-state.json');
}

// Default UI state
function getDefaultUIState(): UIState {
  return {
    version: '1.0.0',
    windowBounds: {
      x: 100,
      y: 100,
      width: 1200,
      height: 800,
      isMaximized: false,
    },
    sidebarWidth: 250,
    activeFolder: null,
    folders: [],
    recentItems: [],
    splitLayouts: {},
  };
}

// T165: Load UI state from disk
export async function loadUIState(): Promise<UIState> {
  try {
    const filePath = getUIStatePath();
    const content = await readFile(filePath, 'utf-8');
    const state = JSON.parse(content) as UIState;

    // Validate and merge with defaults to handle version updates
    return {
      ...getDefaultUIState(),
      ...state,
    };
  } catch (error: any) {
    // If file doesn't exist or is corrupted, return defaults
    console.log('UI state file not found or corrupted, using defaults:', error.message);
    return getDefaultUIState();
  }
}

// T165: Save UI state to disk with debouncing
let saveTimeout: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 500;

export async function saveUIState(state: Partial<UIState>): Promise<void> {
  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Debounce saves
  return new Promise((resolve, reject) => {
    saveTimeout = setTimeout(async () => {
      try {
        const filePath = getUIStatePath();

        // Ensure directory exists
        const dir = dirname(filePath);
        await mkdir(dir, { recursive: true });

        // Load current state
        let currentState: UIState;
        try {
          currentState = await loadUIState();
        } catch {
          currentState = getDefaultUIState();
        }

        // Merge with new state
        const mergedState: UIState = {
          ...currentState,
          ...state,
        };

        // Save to disk
        await writeFile(filePath, JSON.stringify(mergedState, null, 2), 'utf-8');

        resolve();
      } catch (error) {
        reject(error);
      }
    }, SAVE_DEBOUNCE_MS);
  });
}

// Save UI state immediately without debouncing (for app quit)
export async function saveUIStateImmediate(state: Partial<UIState>): Promise<void> {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  try {
    const filePath = getUIStatePath();

    // Ensure directory exists
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });

    // Load current state
    let currentState: UIState;
    try {
      currentState = await loadUIState();
    } catch {
      currentState = getDefaultUIState();
    }

    // Merge with new state
    const mergedState: UIState = {
      ...currentState,
      ...state,
    };

    // Save to disk
    await writeFile(filePath, JSON.stringify(mergedState, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save UI state:', error);
  }
}
