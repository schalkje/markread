/**
 * Zustand Store: Theme
 * Manages theme application and system theme detection
 */

import { create } from 'zustand';
import type { Theme, ThemeType } from '@shared/types/entities';

interface ThemeState {
  currentTheme: Theme | null;
  systemTheme: ThemeType;

  // Actions
  initializeTheme: () => void;
  applyTheme: (themeType: ThemeType) => void;
  detectSystemTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: null,
  systemTheme: 'light',

  detectSystemTheme: () => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    set({ systemTheme: isDark ? 'dark' : 'light' });
  },

  initializeTheme: () => {
    const { detectSystemTheme, applyTheme } = get();
    detectSystemTheme();

    // Watch for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      set({ systemTheme: e.matches ? 'dark' : 'light' });
    });

    applyTheme('light'); // Default theme
  },

  applyTheme: (themeType) => {
    // Basic theme application - will be expanded in Phase 8
    console.log('Applying theme:', themeType);
  },
}));
